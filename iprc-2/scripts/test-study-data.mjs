import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  bibleReferenceLabel,
  extractYoutubeId,
  isValidStudySlug,
  normalizeStudy,
  parseBibleReferencesInput,
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
const realReferences='Atos 11:17-26\r\nJeremias 10:3-8\r\nIsaías 6:1\r\nJosué 3:11-13\r\nSalmo 24:1-2\r\nSalmo 83:18\r\nZacarias 6:5\r\nDaniel 4:35\r\nGênesis 1\r\nRomanos 2';
const realParsed=parseBibleReferencesInput(realReferences);
assert.equal(realParsed.errors.length,0,'as dez referências reais devem ser aceitas individualmente');
assert.equal(realParsed.references.length,10);
assert.deepEqual(realParsed.references[4],{book:'salmos',chapter:24,verseStart:1,verseEnd:2},'Salmo singular deve mapear para o livro interno salmos');
assert.deepEqual(realParsed.references[8],{book:'genesis',chapter:1,verseStart:1,verseEnd:999,wholeChapter:true});
assert.equal(bibleReferenceLabel(realParsed.references[8]),'Gênesis 1');
const abbreviated=parseBibleReferencesInput('At 11:17-26\nJr 10:3-8\nIs 6:1\nJs 3:11-13\nSl 24:1-2\nZc 6:5\nDn 4:35');
assert.equal(abbreviated.errors.length,0);assert.equal(abbreviated.references.length,7);
const invalid=parseBibleReferencesInput('Atos 11:17-26\nLivro inventado 2:3\n\nSalmo 24:2-1');
assert.equal(invalid.references.length,1,'linhas válidas devem continuar identificadas quando outra falhar');
assert.equal(invalid.errors[0].message,'Linha 2 — “Livro inventado 2:3”: livro ou abreviação não reconhecida.');
assert.equal(invalid.errors[1].line,4,'linhas vazias devem ser ignoradas sem alterar a numeração original');
const preview = resolveBibleLivrePreview(
  { version: 'blivre', book: 'ROM', chapter: 8, verses: [{ number: 28, text: 'Texto 28' }, { number: 29, text: 'Texto 29' }, { number: 30, text: 'Texto 30' }] },
  { book: 'romanos', chapter: 8, verseStart: 28, verseEnd: 30 },
);
assert.equal(preview.version, 'Bíblia Livre');
assert.equal(preview.verses.length, 3);
const chapterPreview=resolveBibleLivrePreview({version:'blivre',book:'GEN',chapter:1,verses:[{number:1,text:'Um'},{number:2,text:'Dois'}]},realParsed.references[8]);
assert.equal(chapterPreview.verses.length,2,'preview de capítulo inteiro deve devolver todos os versículos disponíveis');

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
assert.doesNotMatch(detail, /data-study-summary/, 'página individual não deve renderizar o resumo');
assert.match(detail, /headerMode="solid"/, 'detalhe deve usar a variante compartilhada de cabeçalho legível');
assert.match(detail, /A versão em texto deste estudo ainda está sendo preparada/, 'detalhe sem texto deve apresentar fallback editorial honesto');
const migration = await readFile(resolve(root, 'migrations/0007_studies.sql'), 'utf8');
assert.equal((migration.match(/'study-[^']+'/g)||[]).length, 8, 'migration deve cadastrar exatamente oito estudos reais');
assert.equal(migration.split('\n').filter(line=>line.startsWith("('study-")&&line.includes(",'published',")).length, 8, 'os oito estudos confirmados devem iniciar publicados');
assert.doesNotMatch(migration, /[?&]si=/, 'URLs canônicas não armazenam parâmetros de compartilhamento');
const sourceReport=JSON.parse(await readFile(resolve(root,'content/studies/remaining-study-source-report.json'),'utf8'));
assert.equal(sourceReport.length,7,'sete fontes restantes devem estar auditadas');
for(const entry of sourceReport){
  const transcript=(await readFile(resolve(root,`content/studies/${entry.slug}.transcript.txt`),'utf8')).trim();
  const editorial=(await readFile(resolve(root,`content/studies/${entry.slug}.editorial.md`),'utf8')).trim();
  assert.equal(transcript.length,entry.transcriptCharacters,`${entry.slug}: transcript persistido deve equivaler à fonte extraída`);
  assert.equal((transcript.match(/\[\d{2}:\d{2}(?::\d{2})?[^\]]*\]/g)||[]).length,entry.timestamps,`${entry.slug}: todas as marcações devem ser preservadas`);
  assert(transcript.includes('Abre em uma nova janela')||entry.slug==='a-graca-de-deus',`${entry.slug}: resíduos existentes na fonte não devem ser limpos`);
  assert(editorial.length>8_000,`${entry.slug}: edição de leitura não pode ser um resumo`);
  assert((editorial.match(/^## /gm)||[]).length>=6,`${entry.slug}: edição deve ter estrutura temática`);
}
const publicScript=await readFile(resolve(root,'src/scripts/public-studies.ts'),'utf8');
assert.match(publicScript,/slice\(1\)/,'a lista deve destacar um estudo e carregar os demais sem múltiplos players');
assert.doesNotMatch(publicScript,/youtube-nocookie\.com\/embed/,'o índice não deve criar oito players');
const detailScript=await readFile(resolve(root,'src/scripts/public-study-detail.ts'),'utf8');
assert.match(detailScript,/youtube-nocookie\.com\/embed/);
assert.doesNotMatch(detailScript,/s\.summary/,'runtime individual não deve inserir resumo entre vídeo e leitura');
assert.match(detailScript,/!s\.editorialContent&&!s\.transcript/,'fallback só deve aparecer quando não houver nenhum texto útil');
const bibleReader = await readFile(resolve(root, 'public/scripts/bible-reader.js'), 'utf8');
assert.match(bibleReader, /id="v\$\{verse\.number\}"/, 'cada versículo precisa expor âncora navegável');
assert.match(bibleReader, /location\.hash\.match\(\/\^#v/, 'a Bíblia precisa posicionar a referência recebida');

console.log('Testes de Estudos: aprovados.');
