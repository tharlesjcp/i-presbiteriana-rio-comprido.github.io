import { bibleReferenceLabel, validateBibleReference, type BibleReference } from '../domain/study.ts';
type Verse={number:number;text:string};type Chapter={version:string;book:string;chapter:number;verses:Verse[]};
export const resolveBibleLivrePreview=(chapter:Chapter,reference:BibleReference)=>{
  if(!validateBibleReference(reference)||chapter.chapter!==reference.chapter)throw new Error('Referência incompatível com o capítulo.');
  const end=reference.verseEnd||reference.verseStart;const verses=chapter.verses.filter(verse=>verse.number>=reference.verseStart&&verse.number<=end);
  if(!verses.length)throw new Error('Versículos não encontrados.');
  return{label:bibleReferenceLabel(reference),version:'Bíblia Livre',verses};
};
