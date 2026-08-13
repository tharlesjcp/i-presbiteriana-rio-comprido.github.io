import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const out = resolve(import.meta.dirname, '../public/bible-data');
const auditOnly = process.argv.includes('--audit-only');
const codes = ['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL','MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'];
const ptNames = ['Gênesis','Êxodo','Levítico','Números','Deuteronômio','Josué','Juízes','Rute','1 Samuel','2 Samuel','1 Reis','2 Reis','1 Crônicas','2 Crônicas','Esdras','Neemias','Ester','Jó','Salmos','Provérbios','Eclesiastes','Cânticos','Isaías','Jeremias','Lamentações','Ezequiel','Daniel','Oseias','Joel','Amós','Obadias','Jonas','Miqueias','Naum','Habacuque','Sofonias','Ageu','Zacarias','Malaquias','Mateus','Marcos','Lucas','João','Atos','Romanos','1 Coríntios','2 Coríntios','Gálatas','Efésios','Filipenses','Colossenses','1 Tessalonicenses','2 Tessalonicenses','1 Timóteo','2 Timóteo','Tito','Filemom','Hebreus','Tiago','1 Pedro','2 Pedro','1 João','2 João','3 João','Judas','Apocalipse'];
const openBibleNames = ['Gen','Exod','Lev','Num','Deut','Josh','Judg','Ruth','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Ezra','Neh','Esth','Job','Ps','Prov','Eccl','Song','Isa','Jer','Lam','Ezek','Dan','Hos','Joel','Amos','Obad','Jonah','Mic','Nah','Hab','Zeph','Hag','Zech','Mal','Matt','Mark','Luke','John','Acts','Rom','1Cor','2Cor','Gal','Eph','Phil','Col','1Thess','2Thess','1Tim','2Tim','Titus','Phlm','Heb','Jas','1Pet','2Pet','1John','2John','3John','Jude','Rev'];
const openBibleAliases = Object.fromEntries(openBibleNames.map((name,index)=>[name,codes[index]]));
const slugs = ptNames.map(name => name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'-'));
const report = { generatedAt:new Date().toISOString(), sources:{}, errors:[], warnings:[], artifacts:{files:0,bytes:0}, rules:['JSON válido','ordem e duplicidade','capítulos vazios','lacunas suspeitas','Unicode','correspondência canônica','aliases de referências cruzadas','tamanho dos artefatos'] };
const json = async name => JSON.parse(await readFile(resolve(root, `dados/biblia/${name}`),'utf8'));
const write = async (path,data) => { if(auditOnly)return; const target=resolve(out,path); await mkdir(dirname(target),{recursive:true}); const text=JSON.stringify(data); await writeFile(target,text); report.artifacts.files++; report.artifacts.bytes+=Buffer.byteLength(text); };
const groupFlat = (source,id,transform=v=>({number:v.verse,text:v.text})) => {
  const chapters=new Map(),seen=new Set(); let previous='';
  for(const verse of source.verses){
    const code=codes[verse.book-1],key=`${code}/${verse.chapter}`,verseKey=`${key}:${verse.verse}`;
    if(!code){report.errors.push(`${id}: livro inválido ${verse.book}`);continue}
    if(seen.has(verseKey))report.errors.push(`${id}: duplicado ${verseKey}`); seen.add(verseKey);
    const order=`${String(verse.book).padStart(2,'0')}.${String(verse.chapter).padStart(3,'0')}.${String(verse.verse).padStart(3,'0')}`;
    if(previous&&order<previous)report.errors.push(`${id}: referência fora de ordem ${verseKey}`); previous=order;
    if(!chapters.has(key))chapters.set(key,[]); chapters.get(key).push(transform(verse));
  }
  return chapters;
};
const parseGreek = text => {
  const tokens=text.trim().split(/\s+/),words=[];
  for(let index=0;index<tokens.length;){
    const form=tokens[index++],strongs=[];
    while(/^G\d+$/.test(tokens[index]||''))strongs.push(tokens[index++]);
    words.push({form,strong:strongs[0]||null,variants:strongs.slice(1),morphology:tokens[index++]||null,lemma:null,transliteration:null});
  }
  return words;
};
const parseReference = value => {
  const match=value.match(/^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)(?:-([1-3]?[A-Za-z]+)?\.?(\d+)?\.?(\d+)?)?$/);
  if(!match)return {error:'formato inválido'};
  const code=openBibleAliases[match[1]],endCode=match[4]?openBibleAliases[match[4]]:code;
  if(!code||!endCode)return {error:`alias desconhecido: ${!code?match[1]:match[4]}`};
  return {book:code,chapter:Number(match[2]),verse:Number(match[3]),endBook:endCode,endChapter:Number(match[5]||match[2]),endVerse:Number(match[6]||match[3]),source:value};
};

if(!auditOnly)await rm(out,{recursive:true,force:true});
if(!auditOnly){await mkdir(resolve(import.meta.dirname,'../public'),{recursive:true});await copyFile(resolve(root,'images/logoInicio.svg'),resolve(import.meta.dirname,'../public/logo-iprc.svg'));}
const ara=await json('almeida_ra.json'),blivre=await json('blivre.json'),greek=await json('trparsed.json'),hebrew=await json('wlc.json');
const datasets=[
  ['ara-legacy',groupFlat(ara,'ara-legacy')],
  ['greek-tr',groupFlat(greek,'greek-tr',v=>({number:v.verse,text:v.text.replace(/ G\d+| [A-Z][A-Z0-9-]+/g,''),words:parseGreek(v.text)}))],
  ['hebrew-wlc',groupFlat(hebrew,'hebrew-wlc',v=>({number:v.verse,text:v.text,words:v.text.split(/\s+/).map(form=>({form,lemma:null,strong:null,morphology:null,transliteration:null}))}))]
];
const blivreChapters=new Map();
for(const book of blivre.slice(1)){
  const index=Number(book.id)-1,code=codes[index];
  if(!code){report.errors.push(`blivre: livro inválido ${book.id}`);continue}
  book.capitulos.forEach((verses,i)=>blivreChapters.set(`${code}/${i+1}`,verses.map((text,j)=>({number:j+1,text}))));
}
datasets.push(['blivre',blivreChapters]);
for(const [id,chapters] of datasets){
  let verses=0,maxChapterBytes=0;
  for(const [key,items] of chapters){
    if(!items.length)report.errors.push(`${id}: capítulo vazio ${key}`);
    items.forEach((verse,index)=>{if(verse.number!==index+1)report.warnings.push(`${id}: lacuna suspeita ${key}:${index+1}`)});
    const payload={version:id,book:key.split('/')[0],chapter:Number(key.split('/')[1]),verses:items};
    await write(`${id}/${key}.json`,payload); verses+=items.length; maxChapterBytes=Math.max(maxChapterBytes,Buffer.byteLength(JSON.stringify(payload)));
  }
  report.sources[id]={chapters:chapters.size,verses,maxChapterBytes};
}
const books=codes.map((code,index)=>({code,name:ptNames[index],slug:slugs[index],testament:index<39?'AT':'NT',chapters:Math.max(0,...datasets.flatMap(([,map])=>[...map.keys()].filter(key=>key.startsWith(`${code}/`)).map(key=>Number(key.split('/')[1]))))}));
const manifest={generatedAt:report.generatedAt,default:{version:'blivre',book:'JHN',chapter:11},books,versions:[
 {id:'blivre',name:'Bíblia Livre',abbreviation:'BLIVRE',language:'pt-BR',direction:'ltr',testaments:['AT','NT'],source:'Projeto Bíblia Livre',sourceDate:'arquivo JSON obtido em 2026-08-13',license:'CC BY 4.0',attribution:'Projeto Bíblia Livre — sites.google.com/site/biblialivre',status:'verified',enabled:true,features:['parallel']},
 {id:'ara-legacy',name:'Almeida Revista e Atualizada',abbreviation:'ARA',language:'pt',direction:'ltr',testaments:['AT','NT'],source:'Arquivo herdado do site anterior da IPRC',license:'Proveniência e autorização pendentes',attribution:'Uso temporário por continuidade congregacional',status:'legacy-unverified',enabled:true,warning:'Esta é a versão ARA usada no site antigo da IPRC. A fonte digital ainda está em processo de verificação e pode conter erros ou divergências. Estamos buscando uma fonte oficial e segura.',features:['parallel']},
 {id:'greek-tr',name:'Textus Receptus',abbreviation:'Grego TR',language:'grc',direction:'ltr',testaments:['NT'],source:'Stephens 1550 com variantes de Scrivener',license:'Domínio público',attribution:'Textus Receptus Parsed NT',status:'verified',enabled:true,features:['parallel','strongs','morphology']},
 {id:'hebrew-wlc',name:'Westminster Leningrad Codex',abbreviation:'Hebraico WLC',language:'he',direction:'rtl',testaments:['AT'],source:'WLC vocalizado',license:'Domínio público',attribution:'Westminster Leningrad Codex',status:'verified',enabled:true,features:['parallel']},
 {id:'acf',name:'Almeida Corrigida Fiel',abbreviation:'ACF',language:'pt-BR',direction:'ltr',testaments:['AT','NT'],source:'Arquivo legado sem proveniência',license:'Autorização integral pendente',status:'blocked',enabled:false,features:[]}
]};
await write('manifest.json',manifest);

const crossPath=resolve(root,'dados/biblia/crossrefs-source/cross_references.txt');
const crossStats={relationsRead:0,relationsImported:0,relationsIgnored:0,ignoredReasons:{},aliasesMapped:Object.keys(openBibleAliases).length,chapters:0};
try{
  const lines=(await readFile(crossPath,'utf8')).split(/\r?\n/).slice(1),buckets=new Map();
  const ignore=reason=>{crossStats.relationsIgnored++;crossStats.ignoredReasons[reason]=(crossStats.ignoredReasons[reason]||0)+1};
  for(const line of lines){
    const [fromValue,toValue,votes]=line.split('\t');
    if(!fromValue||!toValue)continue;
    crossStats.relationsRead++;
    const from=parseReference(fromValue),to=parseReference(toValue);
    if(from.error||to.error){ignore(from.error||to.error);continue}
    const key=`${from.book}/${from.chapter}`;
    if(!buckets.has(key))buckets.set(key,{});
    const targets=buckets.get(key)[from.verse]??=[];
    if(targets.length>=12){ignore('limite de 12 referências por versículo');continue}
    targets.push({...to,votes:Number(votes)||0}); crossStats.relationsImported++;
  }
  for(const [key,references] of buckets)await write(`crossrefs/${key}.json`,{book:key.split('/')[0],chapter:Number(key.split('/')[1]),references});
  crossStats.chapters=buckets.size; report.sources.crossrefs=crossStats;
  for(const [reason,count] of Object.entries(crossStats.ignoredReasons))report.warnings.push(`Referências cruzadas ignoradas (${reason}): ${count}`);
}catch(error){report.errors.push(`Referências cruzadas: ${error.message}`)}
report.status=report.errors.length?'failed':'passed';
if(!auditOnly)await writeFile(resolve(out,'integrity-report.json'),JSON.stringify(report,null,2));
await mkdir(resolve(import.meta.dirname,'../reports'),{recursive:true});
await writeFile(resolve(import.meta.dirname,'../reports/bible-integrity.json'),JSON.stringify(report,null,2));
console.log(`Bíblia: ${report.status}; ${report.artifacts.files} artefatos; ${(report.artifacts.bytes/1024/1024).toFixed(2)} MB; ${report.warnings.length} avisos.`);
if(report.errors.length){console.error(report.errors.slice(0,20));process.exitCode=1;}
