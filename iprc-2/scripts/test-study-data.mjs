import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  bibleReferenceLabel,
  extractYoutubeId,
  isValidStudySlug,
  normalizeStudy,
  slugifyStudyTitle,
  validateBibleReference,
} from '../src/domain/study.ts';
import { StaticStudyRepository } from '../src/repositories/StaticStudyRepository.ts';
import { resolveBibleLivrePreview } from '../src/services/biblePreview.ts';

const fixture = (overrides = {}) => ({
  id: 'fixture-1',
  title: 'Estudo de teste',
  author: 'Presb. Maurício Buraseska',
  publishedAt: '2026-01-02',
  youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  transcript: '## Título\nTexto seguro.',
  references: [{ book: 'romanos', chapter: 8, verseStart: 28, verseEnd: 30 }],
  status: 'published',
  ...overrides,
});

assert.equal(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
assert.equal(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ?t=3'), 'dQw4w9WgXcQ');
assert.equal(extractYoutubeId('https://youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
assert.equal(extractYoutubeId('https://example.com/watch?v=dQw4w9WgXcQ'), null);
assert.equal(extractYoutubeId('inválida'), null);
assert.equal(slugifyStudyTitle('A Graça e a Vida Cristã'), 'a-graca-e-a-vida-crista');
assert(isValidStudySlug('a-graca-e-a-vida-crista'));
assert(!isValidStudySlug('Slug Inválido'));

const editorialInput = fixture({ id: undefined, summary: undefined });
assert(!('youtubeId' in editorialInput), 'a entrada editorial não deve exigir youtubeId');
const normalized = normalizeStudy(editorialInput);
assert.equal(normalized.slug, 'estudo-de-teste', 'slug deve ser derivado do título');
assert.equal(normalized.youtubeId, 'dQw4w9WgXcQ', 'youtubeId deve ser derivado da URL');
assert.equal(normalized.summary, undefined, 'estudo sem resumo deve permanecer válido');

const repo = new StaticStudyRepository([
  fixture({ id: 'old', slug: 'antigo', publishedAt: '2025-01-01' }),
  fixture({ id: 'draft', slug: 'rascunho', publishedAt: '2027-01-01', status: 'draft' }),
  fixture({ id: 'new', slug: 'recente', publishedAt: '2026-01-01', summary: 'Resumo real.' }),
]);
const published = await repo.listPublished();
assert.deepEqual(published.map(item => item.slug), ['recente', 'antigo']);
assert.equal((await repo.findLatestPublished())?.slug, 'recente');
assert.equal(await repo.findPublishedBySlug('rascunho'), null, 'drafts devem continuar invisíveis');

assert(validateBibleReference({ book: 'romanos', chapter: 8, verseStart: 28 }));
assert(validateBibleReference({ book: 'romanos', chapter: 8, verseStart: 28, verseEnd: 30 }));
assert(!validateBibleReference({ book: 'romanos', chapter: 8, verseStart: 30, verseEnd: 28 }));
assert.equal(bibleReferenceLabel({ book: 'romanos', chapter: 8, verseStart: 28 }), 'Romanos 8:28');
assert.equal(bibleReferenceLabel({ book: 'romanos', chapter: 8, verseStart: 28, verseEnd: 30 }), 'Romanos 8:28–30');
const preview = resolveBibleLivrePreview(
  { version: 'blivre', book: 'ROM', chapter: 8, verses: [{ number: 28, text: 'Texto 28' }, { number: 29, text: 'Texto 29' }, { number: 30, text: 'Texto 30' }] },
  { book: 'romanos', chapter: 8, verseStart: 28, verseEnd: 30 },
);
assert.equal(preview.version, 'Bíblia Livre');
assert.equal(preview.verses.length, 3);

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'src/data/studies.ts'), 'utf8');
assert.match(source, /staticStudies: StudyInput\[\] = \[\]/, 'fonte pública deve iniciar vazia');
assert.doesNotMatch(source, /youtubeId\s*:/, 'catálogo editorial não deve armazenar youtubeId');
const home = await readFile(resolve(root, 'src/pages/index.astro'), 'utf8');
assert.doesNotMatch(home, /mock-study|Uma fé que atravessa|Esperança em tempos/);
assert.match(home, /data-home-studies/);
assert.match(home, /public-home-studies/);
const modal = await readFile(resolve(root, 'public/scripts/study-reference-preview.js'), 'utf8');
assert.match(modal, /addEventListener\('cancel'/);
assert.match(modal, /trigger\?\.focus/);
assert.match(modal, /bible-data\/blivre/);
assert.match(modal, /showModal/);
const page = await readFile(resolve(root, 'src/pages/estudos/index.astro'), 'utf8');
assert.match(page, /data-study-feature/);
assert.match(page, /public-studies/);
const detail = await readFile(resolve(root, 'src/pages/estudos/ler.astro'), 'utf8');
assert.match(detail, /data-study-video/, 'detalhe deve reservar o player privado');
assert.match(detail, /data-study-summary[^>]*hidden/, 'resumo ausente não deve reservar espaço');
assert.match(detail, /headerMode="solid"/, 'detalhe deve usar a variante compartilhada de cabeçalho legível');
assert.match(detail, /A versão em texto deste estudo ainda está sendo preparada/, 'detalhe sem texto deve apresentar fallback editorial honesto');
const migration = await readFile(resolve(root, 'migrations/0007_studies.sql'), 'utf8');
assert.equal((migration.match(/'study-[^']+'/g)||[]).length, 8, 'migration deve cadastrar exatamente oito estudos reais');
assert.equal(migration.split('\n').filter(line=>line.startsWith("('study-")&&line.includes(",'published',")).length, 8, 'os oito estudos confirmados devem iniciar publicados');
assert.doesNotMatch(migration, /[?&]si=/, 'URLs canônicas não armazenam parâmetros de compartilhamento');
const publicScript=await readFile(resolve(root,'src/scripts/public-studies.ts'),'utf8');
assert.match(publicScript,/slice\(1\)/,'a lista deve destacar um estudo e carregar os demais sem múltiplos players');
assert.doesNotMatch(publicScript,/youtube-nocookie\.com\/embed/,'o índice não deve criar oito players');
const detailScript=await readFile(resolve(root,'src/scripts/public-study-detail.ts'),'utf8');
assert.match(detailScript,/youtube-nocookie\.com\/embed/);
assert.match(detailScript,/!s\.editorialContent&&!s\.transcript/,'fallback só deve aparecer quando não houver nenhum texto útil');
const bibleReader = await readFile(resolve(root, 'public/scripts/bible-reader.js'), 'utf8');
assert.match(bibleReader, /id="v\$\{verse\.number\}"/, 'cada versículo precisa expor âncora navegável');
assert.match(bibleReader, /location\.hash\.match\(\/\^#v/, 'a Bíblia precisa posicionar a referência recebida');

console.log('Testes de Estudos: aprovados.');
