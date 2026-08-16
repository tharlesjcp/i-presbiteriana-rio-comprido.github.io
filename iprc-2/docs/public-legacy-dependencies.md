# Dependências públicas do site legado

Auditoria realizada na Fase 8 sobre `LEGACY_BASE`, o domínio `dynamic-crisp-a60f33.netlify.app`, links `.html` e referências diretas às páginas antigas.

## Escopo auditado

O frontend IPRC 2.0 possuía sete links públicos em runtime para páginas legadas antes desta limpeza. O site HTML preservado na raiz do repositório também contém links internos `.html`, mas esses arquivos são inventário histórico e não são dependências introduzidas pelo frontend novo. Eles não devem ser alterados até sua retirada planejada.

`astro.config.mjs` usa o domínio Netlify como URL canônica do próprio Deploy Preview. Essa configuração de publicação não é um link para uma página antiga e permanece inalterada.

## Equivalentes já disponíveis

| Origem | Destino anterior | Destino IPRC 2.0 | Estado |
| --- | --- | --- | --- |
| Footer · Bíblia | `biblia.html` | `/biblia/joao/11` | corrigido |
| Footer · Hinário | `hinario.html` | `/hinario` | corrigido |
| Header, Home e módulos | rotas de Bíblia, Hinário, Agenda, Estudos e Boletins | rotas internas novas | já estavam corretos |

Agenda usa `/agenda`, Estudos usa `/estudos` e Boletins usa `/boletins`. Não foram encontrados links públicos legados dessas áreas no frontend novo.

## Dependências temporárias legítimas

Dois links públicos ainda usam `LEGACY_BASE` porque não existe experiência nova equivalente:

- Header · **Pedido de oração** → `pedidos.html`;
- Home · acesso rápido **Pedido de oração** → `pedidos.html`;

Os três destinos institucionais antes ligados a `sobre.html` foram substituídos pela página real `/sobre`: **Conheça a igreja**, **Planeje sua visita**, **Ver localização** e **Contato e localização** usam a rota interna conforme o contexto. Não existe mais dependência pública de `sobre.html` no frontend IPRC 2.0.

`LEGACY_BASE` deve permanecer enquanto esses destinos forem necessários. A meta da reconstrução continua sendo zero dependência dele.

## Próximas rotas públicas

### `/sobre` (concluída)

Concentra:

- planejamento da primeira visita;
- contato e localização;
- endereço e mapa;
- programação e horários reutilizados da Agenda;
- informações úteis para quem visita a igreja pela primeira vez.

### `/pedido-de-oracao`

Deverá substituir os dois links temporários para `pedidos.html` e oferecer:

- formulário público;
- nome opcional;
- contato opcional;
- pedido;
- informações de privacidade;
- persistência no Cloudflare D1;
- proteção Turnstile;
- área administrativa privada.

`/pedido-de-oracao` não foi criada. Os dois links temporários continuam explícitos e auditáveis até que finalidade, privacidade e responsáveis sejam definidos institucionalmente.
