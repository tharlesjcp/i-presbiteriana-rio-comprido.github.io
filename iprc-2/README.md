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

Fontes habilitadas: Bíblia Livre (CC BY 4.0), ARA herdada marcada obrigatoriamente como não verificada, Textus Receptus e WLC. A ACF permanece bloqueada. A camada lexical integra STEPBible TAGNT/TBESG para tokens explicitamente pertencentes ao TR e OSHB/TBESH para tokens do WLC identificados por ID e Strong. Não há matching por aparência: trechos sem correspondência verificável mantêm “Não disponível nesta fonte”. O OSHB identifica hebraico e aramaico por token, inclusive a transição em Daniel 2:4.

Os glosses dos arquivos STEPBible são preservados literalmente em `glossOriginal`. Uma camada editorial separada, `../dados/biblia/lexical-presentation-pt.json`, fornece `glossPt` somente quando existe uma equivalência curta segura; ela pode apresentar vários sentidos legítimos separados por `/`. Quando essa curadoria não cobre o gloss, a interface conserva o inglês e informa que a tradução portuguesa está indisponível. A camada PT-BR nunca é gravada nos artefatos-fonte comprimidos.

O leitor oferece URLs compartilháveis, última leitura local, comparação conjunta entre ARA, Bíblia Livre e o texto original apropriado, paralelo alinhado por versículo, hebraico/aramaico RTL, estudo lexical em dois níveis e previews navegáveis — inclusive intervalos — das referências OpenBible.info. Os IDs OpenBible originais permanecem nos dados e em `data-source` para rastreabilidade, enquanto todos os rótulos visíveis usam os nomes canônicos em português brasileiro. O aviso completo da ARA aparece uma vez por navegador; `ARA · legado` permanece consultável.

O relatório auditável fica em `reports/bible-integrity.json`. Atualmente registra 344.799 relações lidas, 251.822 importadas e 92.977 ignoradas pelo limite documentado de 12 referências por versículo, com 66 livros e 1.189 capítulos mapeados. `errors` são bloqueantes; o limite produz um `warning` informativo e não falha a build.

As fontes lexicais normalizadas e comprimidas ficam em `../dados/biblia/lexical-source`. O importador reprodutível é `scripts/import-bible-lexical-data.mjs`; a proveniência fixa os commits usados. O índice de ocorrências foi preparado conceitualmente por `strong`/identificador em cada token, mas sua geração foi adiada para evitar milhares de artefatos adicionais nesta rodada.
