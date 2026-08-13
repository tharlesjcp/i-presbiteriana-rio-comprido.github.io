import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const readGzipJson = async (path) => JSON.parse(gunzipSync(await readFile(resolve(root, path))));
const report = await readJson('reports/bible-integrity.json');
const manifest = await readJson('public/bible-data/manifest.json');

assert.equal(report.status, 'passed', 'o relatório de integridade deve ser aprovado');
assert.equal(report.errors.length, 0, 'erros são bloqueantes e devem permanecer zerados');
assert.equal(report.informationalWarnings.length, 1, 'o limite de referências deve permanecer como aviso informativo');
assert.equal(report.sources.crossrefs.aliasesMapped, 66, 'todos os 66 livros devem possuir alias OpenBible');
assert.equal(
  report.sources.crossrefs.relationsRead,
  report.sources.crossrefs.relationsImported + report.sources.crossrefs.relationsIgnored,
  'toda relação lida deve ser importada ou explicitamente ignorada',
);
const ptCoverage = report.sources.lexical.presentationPt;
assert(ptCoverage.distinctLexicalIds > 10000, 'o relatório deve auditar todos os identificadores lexicais usados');
assert(ptCoverage.withOriginalGloss > 10000, 'o relatório deve contar entradas com gloss original');
assert(ptCoverage.withPtTranslation > 0 && ptCoverage.coveragePercent > 0, 'o relatório deve informar cobertura PT positiva');
assert.equal(ptCoverage.withPtTranslation + ptCoverage.withoutPtTranslation, ptCoverage.distinctLexicalIds, 'toda entrada deve estar classificada quanto à tradução PT');
assert(ptCoverage.mostFrequentWithoutTranslation.length > 0, 'o relatório deve listar lacunas priorizadas por frequência');
assert.equal(
  Object.keys(report.sources.crossrefs.ignoredReasons).some((reason) => reason.includes('alias desconhecido')),
  false,
  'nenhum alias OpenBible pode ficar desconhecido',
);

const greek = manifest.versions.find((version) => version.id === 'greek-tr');
assert(greek.features.includes('strongs') && greek.features.includes('morphology'));
assert(greek.features.includes('lemma') && greek.features.includes('transliteration'));
assert(greek.features.includes('gloss-original') && greek.features.includes('gloss-pt-presentation'));
assert.equal(greek.languageLabel, 'Grego koiné');
const semitic = manifest.versions.find((version) => version.id === 'hebrew-wlc');
assert.equal(semitic.direction, 'rtl');
assert.match(semitic.languageLabel, /Hebraico bíblico.*Aramaico bíblico/);

const greekChapter = await readJson('public/bible-data/greek-tr/JHN/1.json');
const greekWord = greekChapter.verses.flatMap((verse) => verse.words ?? []).find((word) => word.alignment === 'verified' && word.strong && word.lemma && word.transliteration);
assert(greekWord, 'o texto grego deve expor dados lexicais alinhados quando presentes');
assert.notEqual(greekWord.lemma, greekWord.strong, 'Strong nunca pode ser apresentado como lemma');
assert.match(greekWord.transliteration, /^[A-Za-z]/, 'transliteração grega deve usar alfabeto latino');
assert.notEqual(greekWord.transliteration, greekWord.form.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), 'transliteração não pode ser apenas a forma sem diacríticos');
const greekSource = await readGzipJson('../dados/biblia/lexical-source/greek-tagnt-tbesg.json.gz');
const localizedGreekWord = greekChapter.verses.flatMap((verse) => verse.words ?? []).find((word) => word.glossPt);
assert(localizedGreekWord, 'ao menos um gloss grego coberto deve receber apresentação PT-BR');
const originalGreekWord = Object.values(greekSource).flat().find((word) => word.id === localizedGreekWord.id);
assert(originalGreekWord, 'o token publicado deve permanecer rastreável ao artefato-fonte');
assert.equal(localizedGreekWord.glossOriginal, originalGreekWord.glossOriginal, 'o gloss inglês deve permanecer idêntico ao valor da fonte');
assert.equal('glossPt' in originalGreekWord, false, 'a camada portuguesa não pode contaminar o artefato-fonte');
assert.equal('gloss' in localizedGreekWord, false, 'o campo genérico antigo não pode ocultar a origem do gloss');
assert.notEqual(localizedGreekWord.glossPt, localizedGreekWord.glossOriginal, 'a apresentação PT-BR deve permanecer separada do original');
const matthew = await readJson('public/bible-data/greek-tr/MAT/2.json');
const was = matthew.verses.flatMap((verse) => verse.words ?? []).find((word) => word.glossOriginal === 'was');
assert.equal(was?.glossPt, 'ser / estar / existir', 'a curadoria por Strong deve preceder o fallback textual “was”');
assert.equal(was?.glossOriginal, 'was', 'a precedência do Strong não pode alterar o gloss flexionado original');
const lazarusChapter = await readJson('public/bible-data/greek-tr/JHN/11.json');
const lazarus = lazarusChapter.verses.flatMap((verse) => verse.words ?? []).find((word) => word.strong === 'G2976H');
assert.equal(lazarus?.glossPt, 'Lázaro', 'nome próprio inequívoco deve usar a forma bíblica portuguesa por Strong');
assert.match(lazarus?.glossOriginal ?? '', /Lazarus/i, 'o gloss inglês de Lázaro deve permanecer preservado');
for (const [strong,expected] of [['G0963','Betânia'],['G3137J','Maria'],['G3136','Marta']]) {
  const properName=lazarusChapter.verses.flatMap((verse) => verse.words ?? []).find((word) => word.strong === strong);
  assert.equal(properName?.glossPt, expected, `${strong} deve usar o nome bíblico português consagrado`);
  assert(properName?.glossOriginal, `${strong} deve preservar o nome original inglês`);
}
const presentation = await readJson('../dados/biblia/lexical-presentation-pt.json');
assert.equal(presentation.strong.G3056, 'palavra / discurso / mensagem');
assert.equal(presentation.gloss.word, 'palavra / discurso / mensagem');
assert.match(await readFile(resolve(root, 'scripts/build-bible-data.mjs'), 'utf8'), /lexicalPresentationPt\.strong\[strong\] \|\| glossPtByOriginal/, 'Strong deve preceder o fallback textual');
const untranslated = Object.values(greekSource).flat().find((word) => word.glossOriginal && !presentation.strong[word.strong] && !presentation.gloss[word.glossOriginal.trim().toLowerCase().replace(/[.,:;!?]+$/g, '')]);
assert(untranslated, 'deve existir uma entrada lexical sem tradução segura para validar o fallback honesto');

const genesis = await readJson('public/bible-data/hebrew-wlc/GEN/1.json');
assert(genesis.verses[0].words.some((word) => word.language === 'hbo' && word.alignment === 'verified'));
const daniel = await readJson('public/bible-data/hebrew-wlc/DAN/2.json');
assert(daniel.verses.find((verse) => verse.number === 4).words.some((word) => word.language === 'arc'), 'Daniel 2:4b deve identificar aramaico por token');
assert(daniel.verses.find((verse) => verse.number === 4).words.some((word) => word.language === 'hbo'), 'Daniel 2:4 deve preservar a mudança de idioma no versículo');
for (const [book, chapter, verse] of [['EZR',4,8],['EZR',7,12],['JER',10,11],['DAN',7,28]]) {
  const data = await readJson(`public/bible-data/hebrew-wlc/${book}/${chapter}.json`);
  assert(data.verses.find((item) => item.number === verse).words.some((word) => word.language === 'arc'), `${book} ${chapter}:${verse} deve ser aramaico`);
}
const danielHebrew = await readJson('public/bible-data/hebrew-wlc/DAN/8.json');
assert(danielHebrew.verses[0].words.every((word) => word.language === 'hbo'), 'Daniel 8 deve voltar ao hebraico');
for (const word of [...genesis.verses.flatMap((verse) => verse.words), ...daniel.verses.flatMap((verse) => verse.words)]) {
  if (word.lemma || word.transliteration || word.glossOriginal || word.glossPt) assert.equal(word.alignment, 'verified', 'nenhum dado lexical pode ser publicado sem alinhamento seguro');
}

const crossrefs = await readJson('public/bible-data/crossrefs/JHN/11.json');
const target = Object.values(crossrefs.references).flat()[0];
assert(target, 'João 11 deve possuir referências cruzadas importadas');
assert.match(target.source, /^[1-3]?[A-Za-z]+\.\d+\.\d+/, 'o identificador original OpenBible deve permanecer preservado');
await access(resolve(root, `public/bible-data/blivre/${target.book}/${target.chapter}.json`));
const interval = Object.values(crossrefs.references).flat().find((reference) => reference.endVerse > reference.verse || reference.endChapter > reference.chapter);
assert(interval, 'o dataset deve preservar referências em intervalo');

const reader = await readFile(resolve(root, 'public/scripts/bible-reader.js'), 'utf8');
assert.match(reader, /data-end-verse/, 'o preview deve receber o fim do intervalo');
assert.match(reader, /for\(const verse of data\.verses\.filter/, 'o preview deve percorrer todos os versículos recuperáveis');
assert.match(reader, /seen=localStorage\.getItem\('iprc-ara-warning-seen'\)==='true'/, 'o aceite da ARA deve impedir a reabertura do aviso completo');
assert.match(reader, /el\.legacyIndicator\.hidden=!legacy/, 'o indicador legado deve permanecer visível depois do aceite');
assert.match(reader, /Texto original/, 'comparação e paralelo devem nomear a camada original corretamente');
assert.match(reader, /const referenceLabel=ref=>/, 'referências devem possuir uma camada de localização própria');
assert.match(reader, /data-source="\$\{esc\(ref\.source\)\}"/, 'o identificador OpenBible deve continuar disponível para rastreabilidade');
assert.match(reader, /esc\(referenceLabel\(ref\)\)/, 'o rótulo visível deve usar a referência localizada em português');
assert.match(reader, /word\.glossPt\|\|'Tradução portuguesa indisponível'/, 'a interface deve priorizar a camada PT-BR sem inventar fallback');
assert.match(reader, /word\.glossOriginal\|\|unavailable/, 'a interface deve sempre preservar e exibir o gloss original separadamente');

const sourcesPage = await readFile(resolve(root, 'src/pages/biblia/[...path].astro'), 'utf8');
assert.match(sourcesPage, /STEPBible-Data/);
assert.match(sourcesPage, /Open Scriptures Hebrew Bible/);

console.log('Testes dos dados bíblicos: aprovados.');
