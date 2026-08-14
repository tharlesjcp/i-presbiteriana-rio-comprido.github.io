import { access, readFile, readdir, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { normalizeHymnNumber, parseHymnAbc, parseHymnTxt } from './hymnal-parser.mjs';

const root = resolve(import.meta.dirname, '../..');
const source = resolve(process.env.HYMNAL_SOURCE_DIR || resolve(root, '.source-hymnal'));
const out = resolve(import.meta.dirname, '../public/hymnal-data');
const SOURCE_COMMIT = '065041f7c817e535ecb629e76cf024c45f2cd5fd';
const SOURCE_COMMIT_DATE = '2025-09-05T08:30:50-03:00';
const fileNumber = (name) => normalizeHymnNumber(basename(name).replace(/\.(txt|abc)$/i, ''));
try {
  await Promise.all([access(resolve(source, 'txt')), access(resolve(source, 'abc'))]);
} catch {
  const manifest = JSON.parse(await readFile(resolve(out, 'manifest.json'), 'utf8'));
  if (manifest.source?.commit !== SOURCE_COMMIT || manifest.count !== 71) throw new Error('Fonte ausente e catálogo versionado incompatível. Execute a importação com o commit documentado.');
  console.log(`Hinário: fonte local ausente; usando catálogo estático verificado do commit ${SOURCE_COMMIT}.`);
  process.exit(0);
}
const txtFiles = (await readdir(resolve(source, 'txt'))).filter((name) => name.endsWith('.txt'));
const abcFiles = (await readdir(resolve(source, 'abc'))).filter((name) => name.endsWith('.abc'));
const ids = [...new Set([...txtFiles.map(fileNumber), ...abcFiles.map(fileNumber)].filter(Boolean))]
  .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
const report = {
  generatedAt: SOURCE_COMMIT_DATE,
  source: { repository: 'https://github.com/savioa/cifras-novo-cantico', commit: SOURCE_COMMIT, technicalLicense: 'MIT', underlyingRights: 'unverified' },
  txtFiles: txtFiles.length, abcFiles: abcFiles.length, pairs: 0, txtOnly: 0, abcOnly: 0,
  parseFailures: [], duplicateNumbers: [], missingTitles: [], keys: {},
  rightsStatus: { 'public-domain': 0, authorized: 0, 'verified-open': 0, unverified: 0, 'external-only': 0 }, hymns: 0,
};
const seen = new Set();
const hymns = [];
await rm(out, { recursive: true, force: true });
await mkdir(resolve(out, 'hymns'), { recursive: true });
for (const id of ids) {
  const txtName = txtFiles.find((name) => fileNumber(name) === id);
  const abcName = abcFiles.find((name) => fileNumber(name) === id);
  const txt = txtName ? parseHymnTxt(await readFile(resolve(source, 'txt', txtName), 'utf8')) : null;
  const abc = abcName ? parseHymnAbc(await readFile(resolve(source, 'abc', abcName), 'utf8')) : null;
  if (txtName && abcName) report.pairs++; else if (txtName) report.txtOnly++; else report.abcOnly++;
  if (txt?.error) report.parseFailures.push({ id, format: 'txt', error: txt.error });
  if (abc?.error) report.parseFailures.push({ id, format: 'abc', error: abc.error });
  if (seen.has(id)) report.duplicateNumbers.push(id);
  seen.add(id);
  const title = txt?.title || abc?.title || null;
  if (!title) report.missingTitles.push(id);
  if (abc?.key) report.keys[abc.key] = (report.keys[abc.key] || 0) + 1;
  const rights = {
    status: 'unverified',
    reason: 'A licença MIT cobre o código e a estrutura do repositório técnico, mas não comprova autorização para republicar letra, tradução, melodia, arranjo ou partitura subjacente.',
    officialUrl: 'https://www.editoraculturacrista.com.br/',
  };
  const hymn = {
    id, number: id, title, searchTitle: title, firstLine: null, originalKey: abc?.key || null, meter: abc?.meter || null,
    formats: { lyrics: Boolean(txt && !txt.error), chords: Boolean(txt && !txt.error), score: Boolean(abc && !abc.error) },
    rights, source: { commit: SOURCE_COMMIT, txtFile: txtName || null, abcFile: abcName || null }, content: null,
  };
  report.rightsStatus[rights.status]++;
  hymns.push(hymn);
  await writeFile(resolve(out, 'hymns', `${id.padStart(3, '0')}.json`), JSON.stringify(hymn));
}
report.hymns = hymns.length;
const manifest = { generatedAt: report.generatedAt, source: report.source, rightsPolicy: { publishable: ['public-domain', 'authorized', 'verified-open'], blocked: ['unverified', 'external-only'] }, count: hymns.length };
await writeFile(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(resolve(out, 'index.json'), JSON.stringify(hymns));
await writeFile(resolve(out, 'import-report.json'), JSON.stringify(report, null, 2));
await mkdir(resolve(import.meta.dirname, '../reports'), { recursive: true });
await writeFile(resolve(import.meta.dirname, '../reports/hymnal-import.json'), JSON.stringify(report, null, 2));
console.log(`Hinário: ${hymns.length} hinos; ${report.pairs} pares; ${report.parseFailures.length} falhas; direitos: ${report.rightsStatus.unverified} não verificados.`);
if (report.parseFailures.length) process.exitCode = 1;
