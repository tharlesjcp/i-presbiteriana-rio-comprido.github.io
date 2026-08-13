import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const report = await readJson('reports/bible-integrity.json');
const manifest = await readJson('public/bible-data/manifest.json');

assert.equal(report.status, 'passed', 'o relatório de integridade deve ser aprovado');
assert.equal(report.sources.crossrefs.aliasesMapped, 66, 'todos os 66 livros devem possuir alias OpenBible');
assert.equal(
  report.sources.crossrefs.relationsRead,
  report.sources.crossrefs.relationsImported + report.sources.crossrefs.relationsIgnored,
  'toda relação lida deve ser importada ou explicitamente ignorada',
);
assert.equal(
  Object.keys(report.sources.crossrefs.ignoredReasons).some((reason) => reason.includes('alias desconhecido')),
  false,
  'nenhum alias OpenBible pode ficar desconhecido',
);

const greek = manifest.versions.find((version) => version.id === 'greek-tr');
assert(greek.features.includes('strongs') && greek.features.includes('morphology'));
assert(!greek.features.includes('lemma') && !greek.features.includes('transliteration'));

const greekChapter = await readJson('public/bible-data/greek-tr/JHN/1.json');
const greekWord = greekChapter.verses.flatMap((verse) => verse.words ?? []).find((word) => word.strong);
assert(greekWord, 'o texto grego deve expor Strong quando presente na fonte');
assert.equal(greekWord.lemma, null, 'Strong não pode ser apresentado como lemma');
assert.equal(greekWord.transliteration, null, 'grego sem diacríticos não é transliteração');

const crossrefs = await readJson('public/bible-data/crossrefs/JHN/11.json');
const target = Object.values(crossrefs.references).flat()[0];
assert(target, 'João 11 deve possuir referências cruzadas importadas');
await access(resolve(root, `public/bible-data/blivre/${target.book}/${target.chapter}.json`));

console.log('Testes dos dados bíblicos: aprovados.');
