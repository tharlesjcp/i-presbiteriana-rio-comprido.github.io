# IPRC 2.0 — Fases 0, 1 e 2

Nova base do frontend da Igreja Presbiteriana do Rio Comprido, conforme a issue #5. Este diretório é isolado do site Legacy na raiz do repositório: nada aqui substitui a produção atual.

## Comandos

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
npm run validate
```

## Estrutura

- `src/layouts/BaseLayout.astro`: documento, metadados e shell global.
- `src/components/`: Header, Footer, Hero, cards e agenda.
- `src/pages/`: rotas Astro da Home e dos módulos já migrados.
- `src/data/`: fontes estáticas editoriais e links temporários para o Legacy.
- `src/styles/global.css`: tokens, design system e responsividade.
- `wrangler.example.jsonc`: referência não ativa para Static Assets.

## Estratégia de migração

- O site atual, assets, dados bíblicos, páginas e painel permanecem na raiz, sem alteração.
- A Home 2.0 não usa Firebase; os módulos migrados usam fontes estáticas versionadas e Repositories.
- A Agenda própria da IPRC é a fonte oficial; sua persistência futura será o Cloudflare D1.
- Recursos ainda não migrados apontam para o Netlify Legacy.
- D1, R2, Workers/API, Access, Turnstile, DNS e produção ficam fora deste escopo.
- A saída `dist/` é estática e compatível com Cloudflare Workers Static Assets. O adaptador server-side só deve ser avaliado quando a Fase 3 introduzir API/SSR.

## Inventário preservado

- páginas públicas HTML (`biblia`, `boletim`, `estudos`, `hinario`, `pedidos`, `sobre`);
- `dados/biblia/` e versões estáticas;
- `images/`, banners, logo e ícones sociais;
- includes e agenda legada, preservados apenas como inventário histórico;
- painel `adm/` apenas como referência para reconstrução futura;
- conteúdo e dados existentes no Firebase, sem nova dependência nesta Home.

## Fase 2 — Bíblia

`pnpm bible:build` lê as fontes preservadas em `../dados/biblia`, valida sua integridade e gera artefatos pequenos em `public/bible-data/<versão>/<livro>/<capítulo>.json`. A pasta gerada não é versionada e é reconstruída antes de desenvolvimento e build.

Fontes habilitadas: Bíblia Livre (CC BY 4.0), ARA herdada marcada obrigatoriamente como não verificada, Textus Receptus e WLC. A ACF permanece bloqueada. A camada lexical integra STEPBible TAGNT/TBESG para tokens explicitamente pertencentes ao TR e OSHB/TBESH para tokens do WLC identificados por ID e Strong. Não há matching por aparência: trechos sem correspondência verificável mantêm “Não disponível nesta fonte”. O OSHB identifica hebraico e aramaico por token, inclusive a transição em Daniel 2:4.

Os glosses dos arquivos STEPBible são preservados literalmente em `glossOriginal`. Uma camada editorial separada, `../dados/biblia/lexical-presentation-pt.json`, fornece `glossPt` somente quando existe uma equivalência curta segura; Strong/ID lexical tem precedência e o gloss normalizado funciona como fallback. Ela pode apresentar vários sentidos legítimos separados por `/`. Quando essa curadoria não cobre a entrada, a interface conserva o inglês e informa que a tradução portuguesa está indisponível. A camada PT-BR nunca é gravada nos artefatos-fonte comprimidos. O relatório de integridade mede separadamente cobertura por IDs distintos e cobertura ponderada pelas ocorrências dos tokens, no total e para grego e hebraico/aramaico, além de registrar as lacunas mais frequentes.

O leitor oferece URLs compartilháveis, última leitura local, comparação conjunta entre ARA, Bíblia Livre e o texto original apropriado, paralelo alinhado por versículo, hebraico/aramaico RTL, estudo lexical em dois níveis e previews navegáveis — inclusive intervalos — das referências OpenBible.info. Os IDs OpenBible originais permanecem nos dados e em `data-source` para rastreabilidade, enquanto todos os rótulos visíveis usam os nomes canônicos em português brasileiro. O aviso completo da ARA aparece uma vez por navegador; `ARA · legado` permanece consultável.

O relatório auditável fica em `reports/bible-integrity.json`. Atualmente registra 344.799 relações lidas, 251.822 importadas e 92.977 ignoradas pelo limite documentado de 12 referências por versículo, com 66 livros e 1.189 capítulos mapeados. `errors` são bloqueantes; o limite produz um `warning` informativo e não falha a build.

As fontes lexicais normalizadas e comprimidas ficam em `../dados/biblia/lexical-source`. O importador reprodutível é `scripts/import-bible-lexical-data.mjs`; a proveniência fixa os commits usados. O índice de ocorrências foi preparado conceitualmente por `strong`/identificador em cada token, mas sua geração foi adiada para evitar milhares de artefatos adicionais nesta rodada.

Continuação lexical planejada: investigar IDs frequentes sem `glossOriginal`; aproveitar relações de Extended Strong somente quando forem explicitamente fornecidas pelo STEPBible, sem correspondência inferida; e ampliar progressivamente o arquivo estático e revisável `lexical-presentation-pt.json`.

## Fase 3 — Hinário Novo Cântico

`pnpm hymnal:build` importa de forma reprodutível o repositório técnico `savioa/cifras-novo-cantico`, fixado no commit registrado no relatório, e gera um índice estático em `public/hymnal-data`. O parser separado em `scripts/hymnal-parser.mjs` reconhece os TXT, metadados ABC e variantes como `22-B`; a build registra pares, arquivos isolados, falhas, duplicidades, tonalidades e o estado de direitos em `reports/hymnal-import.json`.

A importação editorial usa um clone local em `../.source-hymnal`, que não é versionado para não republicar os arquivos-fonte. Em CI e no Deploy Preview, quando esse clone não existe, o script valida commit e contagem do catálogo estático já auditado antes de reutilizá-lo; divergências são bloqueantes.

A licença MIT do repositório técnico não é tratada como autorização para republicar letra, tradução, melodia, arranjo ou partitura. Até que cada conteúdo tenha base documental verificável, os 71 hinos ficam como `unverified`: número, título e metadados técnicos são pesquisáveis, mas letra, acordes e ABC não são emitidos nos JSON públicos. A página `/hinario/fontes-e-direitos` explica a distinção e mantém a procedência auditável.

As rotas `/hinario` e `/hinario/<número>` são geradas estaticamente. Busca tolerante a acentos, navegação anterior/próximo, controles de tom, modos Letra/Cifra/Partitura e o ponto de integração com ABCJS estão preparados sem depender de API externa em runtime. Os controles de conteúdo permanecem bloqueados enquanto o status de direitos não for `public-domain`, `authorized` ou `verified-open`.

Continuação planejada: documentar autorização por hino, liberar somente os conteúdos comprovados, integrar o ABCJS como dependência empacotada e validar visualmente cada partitura antes da publicação.

## Fase 4 — Estudos Bíblicos

O contrato de domínio está em `src/domain/study.ts`. `StudyInput` representa a entrada editorial humana: título, data, URL comum do YouTube, transcrição obrigatória, referências, status e, opcionalmente, ID, slug e resumo. `Study` é a entidade normalizada, com `slug` definitivo e `youtubeId` derivado automaticamente. A normalização valida os campos, descarta resumo vazio, gera ou valida o slug e extrai o ID do vídeo sem exigir que o editor o descubra. A transcrição usa um subconjunto seguro de Markdown (`##`, parágrafos, listas e citações), renderizado por componentes sem HTML arbitrário.

As páginas dependem da interface `src/repositories/StudyRepository.ts`, não da persistência. Nesta fase `StaticStudyRepository` recebe entradas `StudyInput` de `src/data/studies.ts` e entrega somente entidades `Study` normalizadas. Na arquitetura final, uma futura `D1StudyRepository` (ou outra implementação persistente sobre Cloudflare D1) poderá implementar o mesmo contrato sem refazer páginas ou componentes. A infraestrutura prevista é Cloudflare Workers + Static Assets, D1, R2 e Access; sua configuração, autenticação, painel e YouTube Data API não fazem parte desta fase.

Para adicionar temporariamente um estudo real e autorizado, inclua um objeto `StudyInput` em `src/data/studies.ts`, usando URL normal do YouTube, transcrição em Markdown seguro, referências com `book`, `chapter`, `verseStart` e `verseEnd`, e `status: 'published'`. `slug` e `summary` são opcionais; `youtubeId` não pertence à entrada editorial. Use `draft` para impedir publicação. Em seguida execute `pnpm study:test`, `pnpm check` e `pnpm build`. Não adicione fixtures ou conteúdo demonstrativo nesse arquivo.

O preview de referências carrega sob demanda os artefatos BLIVRE já gerados por capítulo em `public/bible-data`, sem duplicar textos. A busca local fica planejada para quando houver um acervo público real; não há interface de busca vazia ou implementação parcial nesta rodada.

## Fase 5 — Agenda própria da IPRC

A Agenda própria substitui o calendário externo como fonte oficial. Home e `/agenda` dependem de `AgendaRepository`; nenhuma delas conhece a persistência nem precisa de serviço externo para renderizar. `StaticAgendaRepository` usa `src/data/agenda.ts` nesta fase. A implementação futura será `D1AgendaRepository`, integrada por Cloudflare Workers ao D1, sem alterar os componentes públicos.

O domínio separa `RecurringSchedule`, para a rotina semanal, de `AgendaEvent`, para atividades públicas com data específica ou período. A primeira fonte contém somente os quatro horários confirmados; o catálogo de eventos especiais começa vazio e aceita `draft`, `published` e `cancelled`, mas somente publicados são expostos. `AgendaEvent.source` preserva a origem e IDs opcionais de boletim. Assim, um evento originado no editor de Boletins continuará sendo uma entidade própria da Agenda; no fluxo inverso, um futuro item de boletim poderá referenciar o ID de um evento já existente, sem duplicá-lo.

O próximo encontro não é gravado no HTML durante a build. `NextMeeting.astro` envia a programação recorrente ao navegador e chama o cálculo puro de `src/domain/agenda.ts` com o relógio real do visitante e timezone explícito `America/Sao_Paulo`. A apresentação é recalculada periodicamente enquanto a página permanece aberta, evitando que o destaque fique congelado entre deploys.

No futuro painel, **Agenda → Programação semanal** permitirá criar, editar, reordenar, ativar e desativar horários recorrentes; desativação será preferida quando for necessário preservar histórico. **Agenda → Eventos** permitirá criar, editar, publicar, manter como rascunho ou cancelar eventos, inclusive períodos, horários e imagens opcionais. Uma mudança como EBD de 09:00 para 09:30 será persistida no D1 pelo painel, sem GitHub. Exportação `.ics`, “Adicionar ao meu calendário” e sincronizações opcionais ficam explicitamente adiadas.

## Fase 6 — Gerador de Boletins

O contrato de domínio está em `src/domain/bulletin.ts`. `BulletinInput` representa a edição estruturada e `Bulletin` acrescenta ID e slug definitivos. O conteúdo pastoral e os avisos usam um documento rico seguro e limitado a parágrafos, títulos, citações, listas, alinhamento e marcas conhecidas; HTML arbitrário não é aceito. Uma futura experiência de colar texto deverá limpar a origem e converter somente para essa estrutura. Revisão assistida por IA poderá ser oferecida apenas como sugestão editorial transparente e nunca será aplicada automaticamente.

`BulletinRepository` isola as páginas da persistência. Nesta fase, `StaticBulletinRepository` lê `src/data/bulletins.ts`, que começa vazio para não publicar boletins fictícios. A implementação futura será `D1BulletinRepository`, exposta por Cloudflare Workers. A tabela deverá ter restrição `UNIQUE` para o número do boletim, incluindo o histórico na lixeira; exclusão será lógica, com retenção planejada de 30 dias. Rascunho automático e recuperação de versões ficam reservados ao painel futuro.

A Agenda e o boletim permanecem entidades independentes. Um item pode guardar `agendaEventId` para reutilizar um evento existente ou originar um rascunho de `AgendaEvent`; nesse caso, `AgendaEvent.source` registra `bulletinId` e `bulletinItemId`. Os horários semanais e dados institucionais são reutilizados por `src/data/church.ts`, sem cópias divergentes. Aniversários aceitam cadastro manual hoje e referência a membro quando esse módulo existir.

O template técnico em `/boletins/modelo-de-impressao` documenta duas páginas A4 horizontais com três painéis cada. O indicador atual estima capacidade a partir do conteúdo estruturado; a geração futura deverá medir o layout real e alertar o editor, sem reduzir texto até ficar ilegível. Capas e contracapas pertencem a templates anuais ou especiais e não são inventadas neste acervo vazio.

O site digital em `/boletins` é a publicação canônica. PDF não é uma segunda edição digital: no fluxo futuro, os mesmos dados aprovados no D1 serão renderizados em HTML/CSS, convertidos em PDF de impressão e armazenados no R2. Geração de PDF, D1, R2, autenticação, painel administrativo e IA não fazem parte desta fase.

## Fase 7 — Backend Cloudflare

A fundação dinâmica é um Worker separado em `src/worker`, configurado por `wrangler.jsonc`. O Astro permanece com `output: 'static'`: Bíblia, Hinário e as demais rotas continuam sendo pré-renderizadas, enquanto somente `/api/*` e `/media/*` passam primeiro pelo Worker em uma futura implantação Cloudflare. O deploy e a configuração do Netlify não foram removidos; não houve alteração de DNS ou cutover.

Os bindings oficiais são `DB` (D1), `MEDIA` (R2) e `ASSETS` (Static Assets). Migrations versionadas criam Agenda e Boletins, com tabelas filhas editoriais, soft delete e número de boletim protegido por `UNIQUE`. `D1AgendaRepository` e `D1BulletinRepository` implementam os mesmos contratos das versões estáticas, que continuam disponíveis e são selecionadas explicitamente por `repositoryFactory.ts`.

O shell `/admin` possui layout próprio e não apresenta CRUDs falsos. Não existe login caseiro: o painel e a futura `/api/admin/*` serão protegidos pelo Cloudflare Access, com validação do JWT na borda como defesa em profundidade. A API administrativa permanece desabilitada nesta fase.

R2 é privado e acessado por `R2MediaStorage`. O Worker só serve objetos referenciados por conteúdo publicado; visualização e download usam rotas e `Content-Disposition` distintos. Nenhum PDF é gerado agora.

Instruções completas de criação de recursos, migrations, desenvolvimento local, Access, object keys, atomicidade e transição estão em [`docs/cloudflare-backend.md`](docs/cloudflare-backend.md). Recursos remotos exigem autenticação manual e não são criados pelos testes.

## Fase 8 — Administração da Agenda

O Worker administrativo separado, a proteção Access/JWT, CSRF, concorrência otimista e auditoria estão documentados em [`docs/cloudflare-admin-agenda.md`](docs/cloudflare-admin-agenda.md). A configuração é exclusivamente de preview e reutiliza o D1/R2 existentes.

As dependências públicas temporárias do site anterior e as futuras rotas `/visite-nos` e `/pedido-de-oracao` estão inventariadas em [`docs/public-legacy-dependencies.md`](docs/public-legacy-dependencies.md). Bíblia, Hinário, Agenda, Estudos e Boletins já usam exclusivamente suas rotas novas; nenhuma página provisória foi criada para substituir experiências ainda não reconstruídas.
