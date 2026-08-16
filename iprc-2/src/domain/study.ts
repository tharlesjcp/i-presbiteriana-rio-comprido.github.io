export type StudyStatus = 'draft' | 'published' | 'archived';
export type BibleReference = { book: string; chapter: number; verseStart: number; verseEnd?: number; wholeChapter?: boolean };
export type BibleReferenceInputError = { line:number; value:string; reason:string; message:string };
export type StudyInput = { id?: string; slug?: string; title: string; studyDate?: string; publishedAt?: string; summary?: string; author: string; youtubeUrl: string; thumbnail?: string; durationSeconds?: number; editorialContent?: string; transcript?: string; transcriptSource?: string; transcriptStatus?: 'unavailable'|'raw'|'reviewed'; references: BibleReference[]; status: StudyStatus };
export type Study = Omit<StudyInput, 'id'|'slug'|'summary'|'publishedAt'|'thumbnail'|'transcript'|'editorialContent'> & { id: string; slug: string; summary?: string; publishedAt?: string; thumbnail: string; transcript: string; editorialContent: string; youtubeId: string; createdAt?: string; updatedAt?: string };
export type StudyPublication = { revision:number; sourceUpdatedAt:string; publishedAt:string; publishedBy:string; withdrawnAt?:string; withdrawnBy?:string };
export type VersionedStudy = Study & { publication?:StudyPublication; hasUnpublishedChanges:boolean };

const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;
export const extractYoutubeId = (value: string): string | null => {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    let candidate: string | null = null;
    if (host === 'youtu.be') candidate = url.pathname.split('/').filter(Boolean)[0] || null;
    if (['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      if (url.pathname === '/watch') candidate = url.searchParams.get('v');
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) candidate = url.pathname.split('/')[2] || null;
    }
    return candidate && youtubeIdPattern.test(candidate) ? candidate : null;
  } catch { return null; }
};

export const slugifyStudyTitle = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const isValidStudySlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

const bookEntries = [
  ['genesis','GEN','Gênesis'],['exodo','EXO','Êxodo'],['levitico','LEV','Levítico'],['numeros','NUM','Números'],['deuteronomio','DEU','Deuteronômio'],['josue','JOS','Josué'],['juizes','JDG','Juízes'],['rute','RUT','Rute'],['1-samuel','1SA','1 Samuel'],['2-samuel','2SA','2 Samuel'],['1-reis','1KI','1 Reis'],['2-reis','2KI','2 Reis'],['1-cronicas','1CH','1 Crônicas'],['2-cronicas','2CH','2 Crônicas'],['esdras','EZR','Esdras'],['neemias','NEH','Neemias'],['ester','EST','Ester'],['jo','JOB','Jó'],['salmos','PSA','Salmos'],['proverbios','PRO','Provérbios'],['eclesiastes','ECC','Eclesiastes'],['canticos','SNG','Cânticos'],['isaias','ISA','Isaías'],['jeremias','JER','Jeremias'],['lamentacoes','LAM','Lamentações'],['ezequiel','EZK','Ezequiel'],['daniel','DAN','Daniel'],['oseias','HOS','Oseias'],['joel','JOL','Joel'],['amos','AMO','Amós'],['obadias','OBA','Obadias'],['jonas','JON','Jonas'],['miqueias','MIC','Miqueias'],['naum','NAM','Naum'],['habacuque','HAB','Habacuque'],['sofonias','ZEP','Sofonias'],['ageu','HAG','Ageu'],['zacarias','ZEC','Zacarias'],['malaquias','MAL','Malaquias'],['mateus','MAT','Mateus'],['marcos','MRK','Marcos'],['lucas','LUK','Lucas'],['joao','JHN','João'],['atos','ACT','Atos'],['romanos','ROM','Romanos'],['1-corintios','1CO','1 Coríntios'],['2-corintios','2CO','2 Coríntios'],['galatas','GAL','Gálatas'],['efesios','EPH','Efésios'],['filipenses','PHP','Filipenses'],['colossenses','COL','Colossenses'],['1-tessalonicenses','1TH','1 Tessalonicenses'],['2-tessalonicenses','2TH','2 Tessalonicenses'],['1-timoteo','1TI','1 Timóteo'],['2-timoteo','2TI','2 Timóteo'],['tito','TIT','Tito'],['filemom','PHM','Filemom'],['hebreus','HEB','Hebreus'],['tiago','JAS','Tiago'],['1-pedro','1PE','1 Pedro'],['2-pedro','2PE','2 Pedro'],['1-joao','1JN','1 João'],['2-joao','2JN','2 João'],['3-joao','3JN','3 João'],['judas','JUD','Judas'],['apocalipse','REV','Apocalipse'],
] as const;
export const bibleBooks = Object.fromEntries(bookEntries.map(([slug, code, name]) => [slug, { slug, code, name }])) as Record<string,{slug:string;code:string;name:string}>;
export const bibleReferenceLabel = (reference: BibleReference) => `${bibleBooks[reference.book]?.name || reference.book} ${reference.chapter}${reference.wholeChapter?'':`:${reference.verseStart}${reference.verseEnd && reference.verseEnd !== reference.verseStart ? `–${reference.verseEnd}` : ''}`}`;
export const validateBibleReference = (reference: BibleReference) => Boolean(bibleBooks[reference.book] && Number.isInteger(reference.chapter) && reference.chapter > 0 && Number.isInteger(reference.verseStart) && reference.verseStart > 0 && (reference.verseEnd === undefined || Number.isInteger(reference.verseEnd) && reference.verseEnd >= reference.verseStart) && (!reference.wholeChapter || reference.verseStart===1 && reference.verseEnd===999));

const normalizeBookInput=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[.]/g,'').replace(/[-_\s]+/g,' ').trim();
const bibleBookAliases:Record<string,string>={};
for(const [slug,,name] of bookEntries){bibleBookAliases[normalizeBookInput(slug)]=slug;bibleBookAliases[normalizeBookInput(name)]=slug;}
Object.assign(bibleBookAliases,{
  salmo:'salmos',sl:'salmos',at:'atos',jr:'jeremias',is:'isaias',js:'josue',zc:'zacarias',dn:'daniel',
  gn:'genesis',rm:'romanos',mt:'mateus',mc:'marcos',lc:'lucas',jo:'joao',fp:'filipenses',tg:'tiago',
  '1 pe':'1-pedro','2 pe':'2-pedro','1 co':'1-corintios','2 co':'2-corintios',
});
export const parseBibleReferencesInput=(raw:string)=>{
  const references:BibleReference[]=[],errors:BibleReferenceInputError[]=[];
  raw.split(/\r?\n/).forEach((source,index)=>{
    const value=source.trim();if(!value)return;
    const match=value.match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?$/u);
    const fail=(reason:string)=>errors.push({line:index+1,value,reason,message:`Linha ${index+1} — “${value}”: ${reason}.`});
    if(!match){fail('formato não reconhecido');return;}
    const book=bibleBookAliases[normalizeBookInput(match[1])];if(!book){fail('livro ou abreviação não reconhecida');return;}
    const chapter=Number(match[2]);if(!Number.isInteger(chapter)||chapter<1){fail('capítulo inválido');return;}
    if(!match[3]){references.push({book,chapter,verseStart:1,verseEnd:999,wholeChapter:true});return;}
    const verseStart=Number(match[3]),verseEnd=match[4]?Number(match[4]):undefined;
    if(verseStart<1){fail('versículo inicial inválido');return;}
    if(verseEnd!==undefined&&verseEnd<verseStart){fail('o fim do intervalo é anterior ao início');return;}
    references.push({book,chapter,verseStart,...(verseEnd!==undefined?{verseEnd}:{})});
  });
  return{references,errors};
};

export const normalizeStudy = (input: StudyInput): Study => {
  const youtubeId = extractYoutubeId(input.youtubeUrl);
  const slug = input.slug || slugifyStudyTitle(input.title);
  if (!input.title.trim() || !input.author.trim()) throw new Error('Estudo com campos obrigatórios vazios.');
  if (!youtubeId) throw new Error('URL do YouTube inválida.');
  if (!isValidStudySlug(slug)) throw new Error('Slug inválido.');
  if (input.studyDate && Number.isNaN(Date.parse(`${input.studyDate}T00:00:00Z`))) throw new Error('Data do estudo inválida.');
  if (input.publishedAt && Number.isNaN(Date.parse(input.publishedAt))) throw new Error('Data de publicação inválida.');
  if (!['draft','published','archived'].includes(input.status)) throw new Error('Status inválido.');
  if (!input.references.every(validateBibleReference)) throw new Error('Referência bíblica inválida.');
  const summary = input.summary?.trim() || undefined;
  const id = input.id?.trim() || `study-${youtubeId}`;
  return { ...input, id, title:input.title.trim(), author:input.author.trim(), youtubeUrl:`https://www.youtube.com/watch?v=${youtubeId}`, thumbnail:input.thumbnail||`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`, transcript:input.transcript||'',editorialContent:input.editorialContent||'',transcriptStatus:input.transcriptStatus||'unavailable',slug, summary, youtubeId };
};

export const formatStudyDate = (value: string) => new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value.length===10?`${value}T00:00:00Z`:value));
export const formatStudyDuration=(seconds?:number)=>seconds?`${Math.floor(seconds/60)} min`:undefined;
