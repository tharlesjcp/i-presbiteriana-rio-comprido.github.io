export {};
import { bibleBooks,bibleReferenceLabel } from '../domain/study';
type Json=Record<string,any>;
const slug=new URLSearchParams(location.search).get('slug')||location.pathname.split('/').filter(Boolean).at(-1)||'';
const q=(s:string)=>document.querySelector(s) as HTMLElement;
const format=(v:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',day:'2-digit',month:'long',year:'numeric'}).format(new Date(`${v.slice(0,10)}T00:00:00Z`));
const prose=(target:HTMLElement,value:string)=>target.replaceChildren(...value.split(/\n\n+/).filter(Boolean).map(text=>{const heading=text.match(/^##\s+(.+)/);const element=document.createElement(heading?'h2':'p');element.textContent=heading?heading[1]:text;return element}));
fetch(`/api/public/studies/${encodeURIComponent(slug)}`).then(async r=>{
  if(!r.ok)throw new Error();const s=(await r.json() as {data:Json}).data;
  q('[data-study-title]').textContent=s.title;q('[data-study-author]').textContent=s.author;const date=s.studyDate||s.publishedAt;q('[data-study-date]').textContent=format(date);q('[data-study-date]').setAttribute('datetime',date);q('[data-study-duration]').textContent=s.durationSeconds?` · ${Math.floor(s.durationSeconds/60)} min`:'';
  const iframe=q('[data-study-video]') as HTMLIFrameElement;iframe.src=`https://www.youtube-nocookie.com/embed/${s.youtubeId}`;iframe.title=`Vídeo: ${s.title}`;
  if(s.editorialContent){prose(q('[data-study-editorial]'),s.editorialContent);q('[data-study-editorial-section]').hidden=false;}
  if(s.transcript){prose(q('[data-study-transcript]'),s.transcript);q('[data-study-transcript-section]').hidden=false;if(s.transcriptSource){q('[data-study-transcript-source]').textContent=`Fonte: ${s.transcriptSource}`;q('[data-study-transcript-source]').hidden=false;}}
  if(!s.editorialContent&&!s.transcript)q('[data-study-text-pending]').hidden=false;
  const refs=q('[data-study-references]');for(const ref of s.references||[]){const book=bibleBooks[ref.book];if(!book)continue;const button=document.createElement('button');button.type='button';button.dataset.bibleReference='';button.dataset.book=book.slug;button.dataset.code=book.code;button.dataset.chapter=String(ref.chapter);button.dataset.start=String(ref.wholeChapter?1:ref.verseStart);button.dataset.end=String(ref.wholeChapter?999:(ref.verseEnd||ref.verseStart));button.dataset.wholeChapter=String(Boolean(ref.wholeChapter));button.dataset.label=bibleReferenceLabel(ref);button.textContent=button.dataset.label;refs.appendChild(button);}
  q('[data-study-references-section]').hidden=!refs.childElementCount;q('[data-study-detail]').hidden=false;q('[data-study-loading]').hidden=true;document.title=`${s.title} — Estudos IPRC`;
}).catch(()=>{q('[data-study-loading]').hidden=true;q('[data-study-error]').hidden=false;});
