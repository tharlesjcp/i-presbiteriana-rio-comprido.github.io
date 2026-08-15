# Backend Cloudflare — operação e arquitetura

Esta fundação roda **em paralelo** ao deploy atual do Netlify. Não há mudança de DNS, domínio ou produção nesta fase. O Astro continua gerando o site público estaticamente; o Worker atende somente `/api/*` e `/media/*` quando for implantado em um ambiente Cloudflare separado.

## Componentes

- `wrangler.jsonc`: Worker, Static Assets e bindings declarativos.
- `src/worker/`: roteamento HTTP e respostas JSON consistentes.
- `migrations/`: única fonte de verdade do schema D1 e dos dados iniciais.
- `D1AgendaRepository` e `D1BulletinRepository`: leitura dinâmica compatível com os contratos públicos existentes.
- `repositoryFactory.ts`: seleção explícita entre implementação estática e D1.
- `MediaStorage` e `R2MediaStorage`: armazenamento privado de mídia.
- `src/pages/admin/`: shell estático, sem CRUD ou autenticação própria.

Bindings:

| Binding | Recurso | Uso |
| --- | --- | --- |
| `DB` | Cloudflare D1 | Agenda e Boletins |
| `MEDIA` | Cloudflare R2 | PDFs e imagens administrativas |
| `ASSETS` | Workers Static Assets | `dist/` gerado pelo Astro |

Os valores `replace-with-...` de `wrangler.jsonc` são deliberados. IDs reais são inseridos somente na configuração segura do ambiente/deploy apropriado. Tokens, Account ID, API keys e segredos não pertencem ao Git.

## Instalação e desenvolvimento local

Pré-requisitos: Node compatível com o projeto, pnpm e uma instalação limpa das dependências.

```bash
pnpm install --frozen-lockfile
pnpm cf:types
pnpm cf:migrate:local
pnpm build
pnpm cf:dev
```

`cf:migrate:local` e `cf:dev` usam recursos locais do Wrangler. Não precisam de credenciais e não escrevem no D1 de produção. `wrangler types` deve ser executado novamente quando os bindings mudarem; o resultado versionado é `worker-configuration.d.ts`.

O teste `pnpm cloudflare:test` cria um diretório temporário, aplica as migrations com o D1 local, verifica schema, seed e unicidade e usa fakes para adapters. Ele nunca acessa uma conta Cloudflare.

## Criação manual dos recursos Cloudflare

Estes passos exigem autorização explícita do responsável pela conta e **não foram executados nesta fase**:

```bash
pnpm exec wrangler login

pnpm exec wrangler d1 create iprc-2-preview
pnpm exec wrangler d1 create iprc-2-production

pnpm exec wrangler r2 bucket create iprc-2-media-preview
pnpm exec wrangler r2 bucket create iprc-2-media
```

Após a criação, registre cada `database_id` no ambiente correto de uma configuração de deploy segura. Antes de qualquer deploy, revise os nomes dos buckets e nunca reutilize o banco de produção no ambiente `preview`.

Aplicação das migrations:

```bash
# Local, sempre seguro para desenvolvimento
pnpm cf:migrate:local

# Preview remoto — requer login e IDs configurados
pnpm cf:migrate:preview

# Produção futura — executar somente durante o cutover aprovado
pnpm cf:migrate:production
```

O deploy futuro de preview poderá usar `pnpm build` seguido de `pnpm exec wrangler deploy --env preview`. Não há comando de deploy automático no pipeline atual, para impedir cutover acidental.

## Migrations e tabelas

`0001_initial.sql` cria:

- `recurring_schedules`;
- `agenda_events`;
- `bulletin_templates`;
- `bulletins`;
- `bulletin_announcements`;
- `bulletin_activities`;
- `bulletin_birthdays`;
- `bulletin_diaconal_schedule`;
- `bulletin_weekly_readings`;
- `bulletin_blocks`.

`bulletins.number` tem `UNIQUE`, independentemente do status. Enviar uma edição à lixeira não libera seu número. `status = 'trashed'` exige `deleted_at`; restauração futura preservará a mesma linha e ID.

`0002_seed_recurring_schedules.sql` usa `INSERT OR IGNORE` com IDs estáveis e cadastra somente os quatro horários confirmados e o template estrutural padrão. Executá-la novamente não duplica registros.

Datas civis permanecem `YYYY-MM-DD`, timestamps usam ISO 8601 e cálculos da Agenda usam `America/Sao_Paulo`. Escritas futuras devem passar pela validação server-side existente, não apenas pela interface.

## Repositories e escrita futura

`D1AgendaRepository` mapeia linhas D1 para `RecurringSchedule` e `AgendaEvent`. Filtros de status são feitos na consulta; recorrência, próximo encontro e combinação continuam usando as funções puras de `domain/agenda.ts`, sem algoritmo de calendário duplicado em SQL.

`D1BulletinRepository` lê apenas edições `published` sem `deleted_at`, carrega as tabelas filhas e submete a entidade reconstruída a `normalizeBulletin`. Rich text continua estruturado e validado; HTML arbitrário não é armazenado nem renderizado.

`AgendaAdminService` e `BulletinAdminService` definem a fronteira futura de comandos. A implementação deve validar no servidor e usar IDs baseados em `crypto.randomUUID()`. Para operações relacionadas, use `DB.batch()` como unidade atômica D1. R2 não participa da transação: envie o objeto primeiro, confirme a transação D1 depois e remova o objeto órfão se a persistência falhar. Publicar um boletim e criar um evento associado devem compartilhar uma estratégia transacional explícita.

## R2 e object keys

O bucket não é público. `R2MediaStorage` é o único adapter e o Worker só serve uma chave vinculada a conteúdo publicado no D1.

Convenções:

```text
bulletins/{bulletin-id}/pdf/boletim-{number}.pdf
bulletins/{bulletin-id}/images/{filename}
bulletin-templates/{template-id}/cover/{filename}
bulletin-templates/{template-id}/back-cover/{filename}
agenda/{event-id}/{filename}
```

Visualização usa `/media/view/{key}` e `Content-Disposition: inline`. Download deliberado usa `/media/download/{key}` e `Content-Disposition: attachment`. Abrir a página pública nunca inicia download automaticamente. PDFs ainda não são gerados nesta fase.

## API inicial

Todas as respostas JSON usam `{ ok: true, data }` ou `{ ok: false, error: { code, message } }`.

- `GET /api/health`: confirma Worker, consulta mínima no D1 e disponibilidade do binding R2, sem IDs ou segredos.
- `GET /api/public/agenda?limit=8`: Agenda combinada.
- `GET /api/public/bulletins`: boletins publicados.
- `GET /api/public/bulletins/{slug}`: boletim publicado por slug.
- `/api/admin/*`: retorna `501` nesta fundação; nenhuma escrita incompleta é exposta.

## Cloudflare Access e defesa em profundidade

Não existe login próprio, senha administrativa no D1, Firebase Auth ou cookie caseiro. Antes de habilitar o painel em Cloudflare:

1. crie uma aplicação Self-hosted no Cloudflare Zero Trust;
2. proteja `/admin`, `/admin/*` e `/api/admin/*` com política allow-list para as identidades autorizadas;
3. mantenha o site e `/api/public/*` públicos;
4. no backend administrativo futuro, valide criptograficamente o JWT `Cf-Access-Jwt-Assertion`, incluindo emissor e `aud`, em vez de confiar apenas em headers encaminhados;
5. negue por padrão quando Access ou sua configuração não estiver disponível.

Esconder links não é controle de acesso. O shell atual não contém dados sensíveis nem comandos e a API administrativa permanece desabilitada.

## Estratégia de transição

- Netlify atual e Netlify Legacy permanecem intactos.
- DNS e domínio não foram alterados.
- Cloudflare é preparado e validado em paralelo.
- Bíblia e Hinário continuam arquivos/build estáticos; não usam D1.
- Estudos continuam no `StudyRepository` estático nesta fase.
- Um cutover futuro exigirá revisão específica de preview, Access, backups, migrations remotas, observabilidade e rollback.
