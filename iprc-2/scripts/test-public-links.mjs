import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [site, header, footer, home] = await Promise.all([
  read('src/data/site.ts'),
  read('src/components/Header.astro'),
  read('src/components/Footer.astro'),
  read('src/pages/index.astro'),
]);
const publicShell = `${site}\n${header}\n${footer}\n${home}`;

for (const route of ['/biblia/joao/11', '/hinario', '/agenda', '/estudos', '/boletins']) {
  assert.match(publicShell, new RegExp(route.replaceAll('/', '\\/')), `a rota nova ${route} deve permanecer disponível na navegação pública`);
}

assert.doesNotMatch(publicShell, /LEGACY_BASE}\/biblia\.html|dynamic-crisp-a60f33\.netlify\.app\/biblia\.html/);
assert.doesNotMatch(publicShell, /LEGACY_BASE}\/hinario\.html|dynamic-crisp-a60f33\.netlify\.app\/hinario\.html/);
assert.match(header, /LEGACY_BASE}\/pedidos\.html/, 'Pedido de oração permanece legado até existir a rota pública nova');
assert.match(footer, /LEGACY_BASE}\/sobre\.html/, 'Contato e localização permanece legado até existir /visite-nos');
assert.doesNotMatch(publicShell, /href=["']\/(?:visite-nos|pedido-de-oracao)["']/, 'rotas futuras não podem ser apresentadas antes de sua implementação');

console.log('Links públicos: módulos migrados usam rotas novas; pendências legadas continuam explícitas.');
