import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const workspace = resolve(import.meta.dirname, '../..');
const step = resolve(workspace, '.source-stepbible');
const oshb = resolve(workspace, '.source-oshb/wlc');
const output = resolve(workspace, 'dados/biblia/lexical-source');
const read = (path) => readFile(path, 'utf8');
const writeGzip = async (name, value) => writeFile(resolve(output, name), gzipSync(JSON.stringify(value), { level: 9 }));
const decode = (value) => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const bookCodes = {
  Gen:'GEN', Exod:'EXO', Lev:'LEV', Num:'NUM', Deut:'DEU', Josh:'JOS', Judg:'JDG', Ruth:'RUT', '1Sam':'1SA', '2Sam':'2SA', '1Kgs':'1KI', '2Kgs':'2KI', '1Chr':'1CH', '2Chr':'2CH', Ezra:'EZR', Neh:'NEH', Esth:'EST', Job:'JOB', Ps:'PSA', Prov:'PRO', Eccl:'ECC', Song:'SNG', Isa:'ISA', Jer:'JER', Lam:'LAM', Ezek:'EZK', Dan:'DAN', Hos:'HOS', Joel:'JOL', Amos:'AMO', Obad:'OBA', Jonah:'JON', Mic:'MIC', Nah:'NAM', Hab:'HAB', Zeph:'ZEP', Hag:'HAG', Zech:'ZEC', Mal:'MAL',
  Mat:'MAT', Mrk:'MRK', Luk:'LUK', Jhn:'JHN', Act:'ACT', Rom:'ROM', '1Co':'1CO', '2Co':'2CO', Gal:'GAL', Eph:'EPH', Php:'PHP', Col:'COL', '1Th':'1TH', '2Th':'2TH', '1Ti':'1TI', '2Ti':'2TI', Tit:'TIT', Phm:'PHM', Heb:'HEB', Jas:'JAS', '1Pe':'1PE', '2Pe':'2PE', '1Jn':'1JN', '2Jn':'2JN', '3Jn':'3JN', Jud:'JUD', Rev:'REV',
};

const parseLexicon = (text, language) => {
  const rows = new Map();
  for (const line of text.split(/\r?\n/)) {
    const fields = line.split('\t');
    if (!new RegExp(`^${language === 'greek' ? 'G' : 'H'}\\d`).test(fields[0] || '') || fields.length < 7) continue;
    const id = fields[2]?.trim() || fields[0].trim();
    const entry = { id, lemma:fields[3]?.trim() || null, transliteration:fields[4]?.trim() || null, partOfSpeech:fields[5]?.trim() || null, gloss:fields[6]?.trim() || null };
    rows.set(id, entry);
    if (!rows.has(fields[0].trim())) rows.set(fields[0].trim(), entry);
  }
  return rows;
};

const greekLexicon = parseLexicon(await read(resolve(step, 'Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt')), 'greek');
const hebrewLexicon = parseLexicon(await read(resolve(step, 'Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt')), 'hebrew');

const greek = {};
for (const filename of [
  'TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
  'TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt',
]) {
  const text = await read(resolve(step, 'Translators Amalgamated OT+NT', filename));
  for (const line of text.split(/\r?\n/)) {
    const fields = line.split('\t');
    const match = (fields[0] || '').match(/^([1-3]?[A-Za-z]{3})\.(\d+)\.(\d+)#([^=]+)=/);
    if (!match || !bookCodes[match[1]] || !(fields[5] || '').split('+').includes('TR')) continue;
    const formMatch = (fields[1] || '').trim().match(/^(.*?)\s+\(([^()]*)\)$/);
    const strongMorph = (fields[3] || '').split('=');
    const lemmaGloss = (fields[4] || '').split('=');
    const strong = strongMorph[0]?.trim() || null;
    const lexical = greekLexicon.get(strong) || null;
    const key = `${bookCodes[match[1]]}/${match[2]}/${match[3]}`;
    (greek[key] ||= []).push({
      id:`${match[1]}.${match[2]}.${match[3]}#${match[4]}`,
      form:(formMatch?.[1] || fields[1] || '').trim(),
      language:'grc', languageLabel:'Grego koiné',
      lemma:(lemmaGloss[0] || lexical?.lemma || '').trim() || null,
      transliteration:(formMatch?.[2] || lexical?.transliteration || '').trim() || null,
      strong, gloss:(fields[2] || lemmaGloss[1] || lexical?.gloss || '').trim() || null,
      morphology:strongMorph.slice(1).join('=').trim() || null,
      partOfSpeech:lexical?.partOfSpeech || null,
      source:'STEPBible TAGNT/TBESG', alignment:'TAGNT: token explicitamente marcado como pertencente à edição TR',
    });
  }
}

const verseMapText = await read(resolve(oshb, 'VerseMap.xml'));
const verseMap = new Map();
const unsafeMappings = new Set();
for (const match of verseMapText.matchAll(/<verse wlc="([^"]+)" kjv="([^"]+)" type="([^"]+)"\/>/g)) {
  const from = match[1].replace(/![ab]$/, ''), to = match[2].replace(/![ab]$/, '');
  if (match[3] === 'full') verseMap.set(from, to); else unsafeMappings.add(from);
}

const oshbBooks = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal'];
const hebrew = {};
let unsafeVerses = 0;
for (const name of oshbBooks) {
  const text = await read(resolve(oshb, `${name}.xml`));
  for (const verseMatch of text.matchAll(/<verse osisID="([^"]+)">([\s\S]*?)<\/verse>/g)) {
    const sourceRef = verseMatch[1];
    if (unsafeMappings.has(sourceRef)) { unsafeVerses++; continue; }
    const mapped = verseMap.get(sourceRef) || sourceRef;
    const ref = mapped.match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/);
    if (!ref || !bookCodes[ref[1]]) continue;
    const words = [];
    for (const wordMatch of verseMatch[2].matchAll(/<w([^>]*)>([\s\S]*?)<\/w>/g)) {
      const attrs = wordMatch[1];
      if (/type="x-ketiv"/.test(attrs)) continue;
      const form = decode(wordMatch[2].replace(/<[^>]+>/g, '')).trim();
      const lemmaAttr = attrs.match(/lemma="([^"]+)"/)?.[1] || '';
      const morphology = attrs.match(/morph="([^"]+)"/)?.[1] || null;
      const sourceId = attrs.match(/id="([^"]+)"/)?.[1] || null;
      const ids = [...lemmaAttr.matchAll(/\d+(?:\s+[a-z])?/gi)].map(item => `H${item[0].replace(/\s+/g, '')}`);
      const primary = ids.at(-1) || null;
      const lexical = primary ? hebrewLexicon.get(primary) || hebrewLexicon.get(primary.replace(/[a-z]$/i, '')) : null;
      const languages = [...new Set((morphology || '').split('/').map(code => code[0] === 'A' ? 'arc' : code[0] === 'H' ? 'hbo' : null).filter(Boolean))];
      const language = languages.includes('arc') ? 'arc' : 'hbo';
      words.push({
        id:sourceId, form, language, languageLabel:language === 'arc' ? 'Aramaico bíblico' : 'Hebraico bíblico',
        lemma:lexical?.lemma || null, transliteration:lexical?.transliteration || null,
        strong:primary, lexicalIdentifiers:ids, gloss:lexical?.gloss || null,
        morphology, partOfSpeech:lexical?.partOfSpeech || null,
        source:'Open Scriptures Hebrew Bible + STEPBible TBESH', alignment:'OSHB token id + lemma/Strong explícito; TBESH ligado pelo identificador exato',
      });
    }
    const key = `${bookCodes[ref[1]]}/${ref[2]}/${ref[3]}`;
    hebrew[key] = words;
  }
}

await mkdir(output, { recursive:true });
await writeGzip('greek-tagnt-tbesg.json.gz', greek);
await writeGzip('hebrew-oshb-tbesh.json.gz', hebrew);
await writeFile(resolve(output, 'provenance.json'), JSON.stringify({
  generatedAt:new Date().toISOString(),
  sources:[
    {id:'STEPBible-Data',commit:'079db44a434e7f2bf5e33f95058e43d7437be92b',datasets:['TAGNT','TBESG','TEGMC','TBESH','TEHMC'],license:'CC BY 4.0',attribution:'STEP Bible — www.STEPBible.org'},
    {id:'OSHB',commit:'3d15126fb1ef74867fc1434be1942e837932691f',release:'2.2 lineage',datasets:['WLC text','lemma','morphology','token language'],license:'WLC public domain; lemma/morphology CC BY 4.0',attribution:'Open Scriptures Hebrew Bible Project'},
  ],
  alignment:{greek:'TAGNT tokens whose edition-membership field explicitly includes TR',hebrew:'OSHB token IDs and lemma attributes; full KJV verse mappings only',unsafeVersificationSegments:unsafeVerses},
}, null, 2));
console.log(`Importação lexical: ${Object.keys(greek).length} versos gregos; ${Object.keys(hebrew).length} versos hebraico/aramaicos; ${unsafeVerses} segmentos parciais deliberadamente não publicados.`);
