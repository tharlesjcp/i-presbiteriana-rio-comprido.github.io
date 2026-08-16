import { bibleReferenceLabel, validateBibleReference, type BibleReference } from '../domain/study.ts';
type Verse={number:number;text:string};type Chapter={version:string;book:string;chapter:number;verses:Verse[]};
export const resolveBibleLivrePreview=(chapter:Chapter,reference:BibleReference)=>{
  if(!validateBibleReference(reference)||chapter.chapter!==reference.chapter)throw new Error('Referência incompatível com o capítulo.');
  const start=reference.wholeChapter?1:reference.verseStart,end=reference.wholeChapter?Number.POSITIVE_INFINITY:(reference.verseEnd||reference.verseStart);const verses=chapter.verses.filter(verse=>verse.number>=start&&verse.number<=end);
  if(!verses.length)throw new Error('Versículos não encontrados.');
  return{label:bibleReferenceLabel(reference),version:'Bíblia Livre',verses};
};
