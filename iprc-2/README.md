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

## Fase 2 — Bíblia

`pnpm bible:build` lê as fontes preservadas em `../dados/biblia`, valida sua integridade e gera artefatos pequenos em `public/bible-data/<versão>/<livro>/<capítulo>.json`. A pasta gerada não é versionada e é reconstruída antes de desenvolvimento e build.

Fontes habilitadas: Bíblia Livre (CC BY 4.0), ARA herdada marcada obrigatoriamente como não verificada, Textus Receptus Parsed e WLC. A ACF permanece bloqueada no manifesto. O parser grego aceita um ou mais códigos Strong por token e não presume grupos fixos de três itens. Strong e morfologia são exibidos somente nos tokens que realmente os fornecem; lemma e transliteração permanecem explicitamente como “Não disponível nesta fonte”. Nenhum dataset STEPBible foi incorporado nesta etapa, pois uma importação parcial sem alinhamento verificável entre tokens criaria atribuições linguísticas inseguras.

O leitor oferece URLs compartilháveis, última leitura local, comparação conjunta entre ARA, Bíblia Livre e o original apropriado, paralelo português/original alinhado por versículo, hebraico RTL, estudo dos campos disponíveis, previews navegáveis das referências OpenBible.info, setas, teclado, Escape e swipe horizontal com limiar que preserva o scroll vertical. O relatório auditável fica em `reports/bible-integrity.json` e distingue relações cruzadas lidas, importadas e ignoradas, incluindo o motivo de cada descarte.
