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

Cinco links públicos ainda usam `LEGACY_BASE` porque não existe experiência nova equivalente:

- Header · **Pedido de oração** → `pedidos.html`;
- Home · acesso rápido **Pedido de oração** → `pedidos.html`;
- Home · **Planeje sua visita** → `sobre.html`;
- Home · **Ver localização** → `sobre.html`;
- Footer · **Contato e localização** → `sobre.html`.

`LEGACY_BASE` deve permanecer enquanto esses destinos forem necessários. A meta da reconstrução continua sendo zero dependência dele.

## Próximas rotas públicas

### `/visite-nos`

Deverá substituir os três links temporários para `sobre.html` e concentrar:

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

Nenhuma dessas páginas foi criada nesta limpeza. Os links temporários continuam explícitos e auditáveis até que as experiências completas sejam implementadas.
