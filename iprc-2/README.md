# IPRC 2.0 — Fases 0 e 1

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
- `src/pages/`: rotas Astro; nesta fase somente a Home.
- `src/data/site.ts`: mocks e links temporários para o Legacy.
- `src/styles/global.css`: tokens, design system e responsividade.
- `wrangler.example.jsonc`: referência não ativa para Static Assets.

## Estratégia de migração

- O site atual, assets, dados bíblicos, páginas e painel permanecem na raiz, sem alteração.
- A Home 2.0 não usa Firebase; estudos e boletim são mocks tipados.
- A agenda continua vindo do Google Calendar oficial.
- Recursos ainda não migrados apontam para o Netlify Legacy.
- D1, R2, Workers/API, Access, Turnstile, DNS e produção ficam fora deste escopo.
- A saída `dist/` é estática e compatível com Cloudflare Workers Static Assets. O adaptador server-side só deve ser avaliado quando a Fase 3 introduzir API/SSR.

## Inventário preservado

- páginas públicas HTML (`biblia`, `boletim`, `estudos`, `hinario`, `pedidos`, `sobre`);
- `dados/biblia/` e versões estáticas;
- `images/`, banners, logo e ícones sociais;
- includes e agenda atual;
- painel `adm/` apenas como referência para reconstrução futura;
- conteúdo e dados existentes no Firebase, sem nova dependência nesta Home.
