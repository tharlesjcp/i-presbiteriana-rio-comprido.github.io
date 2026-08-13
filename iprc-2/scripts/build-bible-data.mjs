import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const out = resolve(import.meta.dirname, '../public/bible-data');
const auditOnly = process.argv.includes('--audit-only');
const codes = ['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL','MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'];
const ptNames = ['Gênesis','Êxodo','Levítico','Números','Deuteronômio','Josué','Juízes','Rute','1 Samuel','2 Samuel','1 Reis','2 Reis','1 Crônicas','2 Crônicas','Esdras','Neemias','Ester','Jó','Salmos','Provérbios','Eclesiastes','Cânticos','Isaías','Jeremias','Lamentações','Ezequiel','Daniel','Oseias','Joel','Amós','Obadias','Jonas','Miqueias','Naum','Habacuque','Sofonias','Ageu','Zacarias','Malaquias','Mateus','Marcos','Lucas','João','Atos','Romanos','1 Coríntios','2 Coríntios','Gálatas','Efésios','Filipenses','Colossenses','1 Tessalonicenses','2 Tessalonicenses','1 Timóteo','2 Timóteo','Tito','Filemom','Hebreus','Tiago','1 Pedro','2 Pedro','1 João','2 João','3 João','Judas','Apocalipse'];
const slugs = ptNames.map(n => n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'-'));
const report = { generatedAt:new Date().toISOString(), sources:{}, errors:[], warnings:[], artifacts:{ files:0, bytes:0 }, rules:['JSON válido','ordem e duplicidade','capítulos vazios','lacunas suspeitas','Unicode','correspondência canônica','tamanho dos artefatos'] };
const json = async name => JSON.parse(await readFile(resolve(root, `dados/biblia/${name}`),'utf8'));
const write = async (path,data) => { if(auditOnly)return; const target=resolve(out,path); await mkdir(dirname(target),{recursive:true}); const text=JSON.stringify(data); await writeFile(target,text); report.artifacts.files++; report.artifacts.bytes+=Buffer.byteLength(text); };
const groupFlat = (source,id,transform=v=>({number:v.verse,text:v.text})) => {
  const chapters=new Map(); const seen=new Set(); let previous='';
  for(const v of source.verses){ const code=codes[v.book-1]; const key=`${code}/${v.chapter}`; const verseKey=`${key}:${v.verse}`;
    if(!code){report.errors.push(`${id}: livro inválido ${v.book}`);continue} if(seen.has(verseKey))report.errors.push(`${id}: duplicado ${verseKey}`); seen.add(verseKey);
    if(previous && `${String(v.book).padStart(2,'0')}.${String(v.chapter).padStart(3,'0')}.${String(v.verse).padStart(3,'0')}`<previous) report.errors.push(`${id}: referência fora de ordem ${verseKey}`);
    previous=`${String(v.book).padStart(2,'0')}.${String(v.chapter).padStart(3,'0')}.${String(v.verse).padStart(3,'0')}`;
    if(!chapters.has(key))chapters.set(key,[]); chapters.get(key).push(transform(v));
  } return chapters;
};
const parseGreek = text => { const t=text.trim().split(/\s+/); const words=[]; for(let i=0;i<t.length;){const form=t[i++];const strongs=[];while(/^G\d+$/.test(t[i]||''))strongs.push(t[i++]);const morphology=t[i++]||'';words.push({form,strong:strongs[0]||null,lemma:strongs[0]||null,variants:strongs.slice(1),morphology,transliteration:form.normalize('NFD').replace(/[\u0300-\u036f]/g,'')});} return words; };

if(!auditOnly) await rm(out,{recursive:true,force:true});
if(!auditOnly){await mkdir(resolve(import.meta.dirname,'../public'),{recursive:true});await copyFile(resolve(root,'images/logoInicio.svg'),resolve(import.meta.dirname,'../public/logo-iprc.svg'));}
const ara=await json('almeida_ra.json'); const blivre=await json('blivre.json'); const greek=await json('trparsed.json'); const hebrew=await json('wlc.json');
const datasets=[
  ['ara-legacy',groupFlat(ara,'ara-legacy')],
  ['greek-tr',groupFlat(greek,'greek-tr',v=>({number:v.verse,text:v.text.replace(/ G\d+| [A-Z][A-Z0-9-]+/g,''),words:parseGreek(v.text)}))],
  ['hebrew-wlc',groupFlat(hebrew,'hebrew-wlc',v=>({number:v.verse,text:v.text,words:v.text.split(/\s+/).map(form=>({form,lemma:null,strong:null,morphology:null}))}))]
];
const blivreChapters=new Map(); for(const book of blivre.slice(1)){const index=Number(book.id)-1; const code=codes[index]; if(!code){report.errors.push(`blivre: livro inválido ${book.id}`);continue} book.capitulos.forEach((verses,i)=>blivreChapters.set(`${code}/${i+1}`,verses.map((text,j)=>({number:j+1,text}))));} datasets.push(['blivre',blivreChapters]);
for(const [id,chapters] of datasets){let verses=0,maxBytes=0;for(const [key,items] of chapters){if(!items.length)report.errors.push(`${id}: capítulo vazio ${key}`);items.forEach((v,i)=>{if(v.number!==i+1)report.warnings.push(`${id}: lacuna suspeita ${key}:${i+1}`)});const payload={version:id,book:key.split('/')[0],chapter:Number(key.split('/')[1]),verses:items};await write(`${id}/${key}.json`,payload);verses+=items.length;maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(payload)));}report.sources[id]={chapters:chapters.size,verses,maxChapterBytes:maxBytes};}

const books=codes.map((code,i)=>({code,name:ptNames[i],slug:slugs[i],testament:i<39?'AT':'NT',chapters:Math.max(0,...datasets.flatMap(([,m])=>[...m.keys()].filter(k=>k.startsWith(`${code}/`)).map(k=>Number(k.split('/')[1]))))}));
const manifest={generatedAt:report.generatedAt,default:{version:'blivre',book:'JHN',chapter:11},books,versions:[
 {id:'blivre',name:'Bíblia Livre',abbreviation:'BLIVRE',language:'pt-BR',direction:'ltr',testaments:['AT','NT'],source:'Projeto Bíblia Livre',sourceDate:'arquivo JSON obtido em 2026-08-13',license:'CC BY 4.0',attribution:'Projeto Bíblia Livre — sites.google.com/site/biblialivre',status:'verified',enabled:true,features:['parallel']},
 {id:'ara-legacy',name:'Almeida Revista e Atualizada',abbreviation:'ARA',language:'pt',direction:'ltr',testaments:['AT','NT'],source:'Arquivo herdado do site anterior da IPRC',license:'Proveniência e autorização pendentes',attribution:'Uso temporário por continuidade congregacional',status:'legacy-unverified',enabled:true,warning:'Esta é a versão ARA usada no site antigo da IPRC. A fonte digital ainda está em processo de verificação e pode conter erros ou divergências. Estamos buscando uma fonte oficial e segura.',features:['parallel']},
 {id:'greek-tr',name:'Textus Receptus',abbreviation:'Grego TR',language:'grc',direction:'ltr',testaments:['NT'],source:'Stephens 1550 com variantes de Scrivener',license:'Domínio público',attribution:'Textus Receptus Parsed NT',status:'verified',enabled:true,features:['parallel','strongs','morphology','lemma']},
 {id:'hebrew-wlc',name:'Westminster Leningrad Codex',abbreviation:'Hebraico WLC',language:'he',direction:'rtl',testaments:['AT'],source:'WLC vocalizado',license:'Domínio público',attribution:'Westminster Leningrad Codex',status:'verified',enabled:true,features:['parallel']},
 {id:'acf',name:'Almeida Corrigida Fiel',abbreviation:'ACF',language:'pt-BR',direction:'ltr',testaments:['AT','NT'],source:'Arquivo legado sem proveniência',license:'Autorização integral pendente',status:'blocked',enabled:false,features:[]}
]};
await write('manifest.json',manifest);

const crossPath=resolve(root,'dados/biblia/crossrefs-source/cross_references.txt'); let crossLines=0;
try{const lines=(await readFile(crossPath,'utf8')).split(/\r?\n/).slice(1);const buckets=new Map();for(const line of lines){const [from,to,votes]=line.split('\t');if(!from||!to)continue;crossLines++;const match=from.match(/^(.+?)\.(\d+)\.(\d+)/);if(!match)continue;const aliases={'Gen':'GEN','Exod':'EXO','Ps':'PSA','Matt':'MAT','Mark':'MRK','Luke':'LUK','John':'JHN','Acts':'ACT','Rom':'ROM','1Cor':'1CO','2Cor':'2CO','Rev':'REV','Isa':'ISA','Jer':'JER','Heb':'HEB','Jas':'JAS','1Pet':'1PE','2Pet':'2PE'};const code=aliases[match[1]]||match[1].toUpperCase();if(!codes.includes(code))continue;const key=`${code}/${match[2]}`;if(!buckets.has(key))buckets.set(key,{});const verse=buckets.get(key)[match[3]]??=[];if(verse.length<12)verse.push({reference:to,votes:Number(votes)||0});}for(const [key,refs] of buckets)await write(`crossrefs/${key}.json`,{book:key.split('/')[0],chapter:Number(key.split('/')[1]),references:refs});report.sources.crossrefs={relations:crossLines,chapters:buckets.size};}catch(error){report.warnings.push(`Referências cruzadas: ${error.message}`)}
report.status=report.errors.length?'failed':'passed'; if(!auditOnly)await writeFile(resolve(out,'integrity-report.json'),JSON.stringify(report,null,2)); await mkdir(resolve(import.meta.dirname,'../reports'),{recursive:true});await writeFile(resolve(import.meta.dirname,'../reports/bible-integrity.json'),JSON.stringify(report,null,2));
console.log(`Bíblia: ${report.status}; ${report.artifacts.files} artefatos; ${(report.artifacts.bytes/1024/1024).toFixed(2)} MB; ${report.warnings.length} avisos.`);if(report.errors.length){console.error(report.errors.slice(0,20));process.exitCode=1;}
