const NOTES_SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTES_FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const noteIndex=note=>({Cb:11,'B#':0,Eb:3,'D#':3,Fb:4,'E#':5,Gb:6,'F#':6,Ab:8,'G#':8,Bb:10,'A#':10}[note]??NOTES_SHARP.indexOf(note));
export const transposeNote=(note,semitones,preferFlats=/b/.test(note))=>{const index=noteIndex(note);return index<0?note:(preferFlats?NOTES_FLAT:NOTES_SHARP)[(index+semitones%12+12)%12]};
export const transposeChord=(chord,semitones)=>chord.replace(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/,(_,root,suffix,bass)=>`${transposeNote(root,semitones)}${suffix}${bass?`/${transposeNote(bass,semitones)}`:''}`);
export const normalizeSearch=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/(\d)([a-z])/g,'$1 $2').replace(/[^a-z0-9]+/g,' ').trim();
