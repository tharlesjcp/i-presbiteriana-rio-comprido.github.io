const root=document.querySelector('[data-reader]');
if(root){
  const $=selector=>root.querySelector(selector),$$=selector=>[...root.querySelectorAll(selector)];
  const interactive='a,button,input,select,textarea,summary,[contenteditable="true"],[role="button"],[role="link"]';
  let manifest,state,chapter,parallel=null,font=1,touch=null,selectedVerse=null;
  const el={book:$('[data-book]'),chapter:$('[data-chapter]'),version:$('[data-version]'),content:$('[data-content]'),reference:$('[data-reference]'),mobile:$('[data-mobile-reference]'),notice:$('[data-legacy]'),legacyIndicator:$('[data-legacy-indicator]'),dialog:$('[data-dialog]'),dialogContent:$('[data-dialog-content]')};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const currentBook=()=>manifest.books.find(book=>book.code===state.book);
  const bookByCode=code=>manifest.books.find(book=>book.code===code);
  const available=version=>version.enabled&&version.testaments.includes(currentBook().testament);
  const originalId=book=>book.testament==='NT'?'greek-tr':'hebrew-wlc';
  const languageLabel=verse=>verse?.languageLabel||manifest.versions.find(version=>version.id===originalId(currentBook()))?.languageLabel||'Texto original';
  const tokenLanguage=word=>({grc:'Grego koiné',hbo:'Hebraico bíblico',arc:'Aramaico bíblico'}[word.language]||'Não disponível nesta fonte');
  const initial=()=>{
    const path=location.pathname.split('/').filter(Boolean),saved=JSON.parse(localStorage.getItem('iprc-bible-last')||'null');
    const book=manifest.books.find(item=>item.slug===path[1])||bookByCode(saved?.book||manifest.default.book);
    const chapterNumber=Math.min(Number(path[2])||saved?.chapter||manifest.default.chapter,book.chapters);
    const requested=new URLSearchParams(location.search).get('versao');
    const version=manifest.versions.some(item=>item.enabled&&item.id===(requested||saved?.version))?(requested||saved.version):manifest.default.version;
    return{book:book.code,chapter:chapterNumber,version};
  };
  const populate=()=>{
    el.book.innerHTML=manifest.books.map(book=>`<option value="${book.code}">${esc(book.name)}</option>`).join('');el.book.value=state.book;
    el.chapter.innerHTML=Array.from({length:currentBook().chapters},(_,index)=>`<option>${index+1}</option>`).join('');el.chapter.value=state.chapter;
    el.version.innerHTML=manifest.versions.filter(available).map(version=>`<option value="${version.id}">${esc(version.abbreviation)}${version.status==='legacy-unverified'?' · legado':''}</option>`).join('');
    if(![...el.version.options].some(option=>option.value===state.version))state.version='blivre';el.version.value=state.version;
  };
  const fetchChapter=async(version=state.version,book=state.book,chapterNumber=state.chapter)=>{
    const response=await fetch(`/bible-data/${version}/${book}/${chapterNumber}.json`);
    if(!response.ok)throw Error('Capítulo não disponível');
    return response.json();
  };
  const textOf=verse=>verse?.text||verse?.words?.map(word=>word.form).join(' ')||'';
  const originalText=(verse,book=currentBook())=>`<p ${book.testament==='AT'?'dir="rtl"':''}>${verse?.words?verse.words.map((word,index)=>`<button class="word" data-word="${index}">${esc(word.form)}</button>`).join(' '):esc(textOf(verse))}</p>`;
  const verseCard=(verse,isOriginal=false)=>`<article class="verse${isOriginal?' original':''}" tabindex="0" data-select-verse data-verse="${verse.number}" aria-label="Selecionar versículo ${verse.number}"><span class="verse-number" aria-hidden="true">${verse.number}</span>${isOriginal?originalText(verse):`<p>${esc(textOf(verse))}</p>`}</article>`;
  const render=()=>{
    const version=manifest.versions.find(item=>item.id===state.version),reference=`${currentBook().name} ${state.chapter}`;
    el.reference.textContent=reference;el.mobile.textContent=reference;document.title=`${reference} — Bíblia IPRC`;
    if(parallel){
      const rows=chapter.verses.map(verse=>{
        const original=parallel.data.verses.find(item=>item.number===verse.number);
        return `<article class="parallel-verse" data-verse="${verse.number}"><button class="parallel-number" data-select-verse aria-label="Selecionar versículo ${verse.number}">${verse.number}</button><div class="parallel-portuguese" tabindex="0" data-select-verse><p>${esc(textOf(verse))}</p></div><div class="parallel-original" tabindex="0" data-select-verse>${originalText(original)}</div></article>`;
      }).join('');
      el.content.innerHTML=`<section class="parallel-chapter"><header><span><strong>${esc(version.abbreviation)}</strong> ${esc(version.name)}</span><span><strong>Texto original</strong> ${esc(languageLabel(parallel.data.verses[0]))}</span></header>${rows}</section>`;
    }else{
      const isOriginal=version.id==='greek-tr'||version.id==='hebrew-wlc';
      el.content.innerHTML=`<section class="version-column"><header><strong>${esc(version.abbreviation)}</strong><span>${esc(isOriginal?languageLabel(chapter.verses[0]):version.name)}</span></header>${chapter.verses.map(verse=>verseCard(verse,isOriginal)).join('')}</section>`;
    }
    el.content.style.setProperty('--reader-scale',font);root.querySelector('.reader-area').setAttribute('aria-busy','false');bindReading();
  };
  const load=async(push=true)=>{
    root.querySelector('.reader-area').setAttribute('aria-busy','true');el.content.innerHTML='<p class="loading">Carregando somente este capítulo…</p>';
    try{
      chapter=await fetchChapter();parallel=null;$('[data-parallel]').setAttribute('aria-pressed','false');
      const version=manifest.versions.find(item=>item.id===state.version);
      if(push)history.pushState({},'',`/biblia/${currentBook().slug}/${state.chapter}?versao=${state.version}`);
      localStorage.setItem('iprc-bible-last',JSON.stringify(state));
      const legacy=version.status==='legacy-unverified',seen=localStorage.getItem('iprc-ara-warning-seen')==='true';
      el.legacyIndicator.hidden=!legacy;el.notice.hidden=!legacy||seen;
      if(legacy){$('[data-warning]').textContent=version.warning;if(!seen)el.notice.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});}
      render();
    }catch(error){el.content.innerHTML=`<p class="reader-error">Não foi possível carregar o capítulo. ${esc(error.message)}</p>`;}
  };
  const move=delta=>{
    const index=manifest.books.findIndex(book=>book.code===state.book),book=manifest.books[index];
    if(state.chapter+delta>=1&&state.chapter+delta<=book.chapters)state.chapter+=delta;
    else{const next=manifest.books[index+(delta>0?1:-1)];if(!next)return;state.book=next.code;state.chapter=delta>0?1:next.chapters;}
    populate();load();scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  };
  const comparisonData=async number=>{
    const versions=manifest.versions.filter(available).filter(version=>version.language.startsWith('pt')||version.id===originalId(currentBook()));
    return Promise.all(versions.map(async version=>({version,data:await fetchChapter(version.id).catch(()=>null),number})));
  };
  const comparisonMarkup=items=>items.map(({version,data,number})=>{
    const verse=data?.verses.find(item=>item.number===number);if(!verse)return'';
    const original=version.id==='greek-tr'||version.id==='hebrew-wlc';
    return `<article class="comparison-version"><h3>${original?'Texto original':esc(version.abbreviation)}${version.status==='legacy-unverified'?' · legado':''}</h3>${original?`<p class="original-language">${esc(languageLabel(verse))}</p>${originalText(verse)}`:`<p>${esc(textOf(verse))}</p>`}</article>`;
  }).join('');
  const renderVerseDialog=async number=>{
    selectedVerse=number;
    const verse=chapter.verses.find(item=>item.number===number),comparisons=await comparisonData(number);
    let refs={references:{}};try{refs=await(await fetch(`/bible-data/crossrefs/${state.book}/${state.chapter}.json`)).json()}catch{}
    el.dialogContent.innerHTML=`<div data-verse-view><p class="eyebrow">${esc(currentBook().name)} ${state.chapter}:${number}</p><h2>Comparar versões</h2><section class="comparison">${comparisonMarkup(comparisons)}</section><div class="dialog-actions"><button data-copy>Copiar</button><button data-share>Compartilhar</button></div><h3>Referências cruzadas</h3><ul class="crossrefs">${(refs.references[number]||[]).map(ref=>`<li><button data-ref data-book="${ref.book}" data-chapter="${ref.chapter}" data-verse="${ref.verse}" data-end-book="${ref.endBook}" data-end-chapter="${ref.endChapter}" data-end-verse="${ref.endVerse}">${esc(ref.source)}</button></li>`).join('')||'<li>Nenhuma referência importada para este versículo.</li>'}</ul></div>`;
    bindDialog(verse,number);
    if(!el.dialog.open)el.dialog.showModal();
  };
  const showReference=async button=>{
    const book=bookByCode(button.dataset.book),chapterNumber=Number(button.dataset.chapter),verseNumber=Number(button.dataset.verse),endBook=bookByCode(button.dataset.endBook),endChapter=Number(button.dataset.endChapter),endVerse=Number(button.dataset.endVerse);
    const portuguese=manifest.versions.filter(version=>version.enabled&&version.language.startsWith('pt')&&version.testaments.includes(book.testament));
    let version=null,passages=[],missing=[];
    for(const candidate of portuguese){if(await fetchChapter(candidate.id,book.code,chapterNumber).catch(()=>null)){version=candidate;break}}
    if(version){
      const startIndex=manifest.books.findIndex(item=>item.code===book.code),endIndex=manifest.books.findIndex(item=>item.code===endBook.code);
      let visited=0;
      for(let bookIndex=startIndex;bookIndex<=endIndex&&visited<100;bookIndex++){
        const item=manifest.books[bookIndex],firstChapter=bookIndex===startIndex?chapterNumber:1,lastChapter=bookIndex===endIndex?endChapter:item.chapters;
        for(let currentChapter=firstChapter;currentChapter<=lastChapter&&visited<100;currentChapter++){
          const data=await fetchChapter(version.id,item.code,currentChapter).catch(()=>null);
          if(!data){missing.push(`${item.name} ${currentChapter}`);continue}
          const first=bookIndex===startIndex&&currentChapter===chapterNumber?verseNumber:1,last=bookIndex===endIndex&&currentChapter===endChapter?endVerse:Infinity;
          for(const verse of data.verses.filter(entry=>entry.number>=first&&entry.number<=last)){passages.push({book:item,chapter:currentChapter,verse});visited++;if(visited>=100)break}
        }
      }
      if(visited>=100)missing.push('intervalo truncado com segurança em 100 versículos');
    }
    const rangeLabel=book.code===endBook.code&&chapterNumber===endChapter?`${book.name} ${chapterNumber}:${verseNumber}${endVerse!==verseNumber?`–${endVerse}`:''}`:`${book.name} ${chapterNumber}:${verseNumber} – ${endBook.name} ${endChapter}:${endVerse}`;
    const preview=passages.length?passages.map(item=>`<p><strong>${item.book.name} ${item.chapter}:${item.verse.number}</strong> ${esc(textOf(item.verse))}</p>`).join(''):'<p>Trecho não disponível em uma versão portuguesa habilitada.</p>';
    const fallback=missing.length?`<p class="preview-warning">Não foi possível recuperar integralmente: ${esc(missing.join(', '))}.</p>`:'';
    el.dialogContent.innerHTML=`<section class="reference-preview"><button data-back>← Voltar ao versículo original</button><p class="eyebrow">Referência cruzada</p><h2>${esc(rangeLabel)}</h2><p class="preview-version">${esc(version?.abbreviation||'Versão portuguesa')}</p><blockquote>${preview}</blockquote>${fallback}<a class="button button-primary" href="/biblia/${book.slug}/${chapterNumber}?versao=${version?.id||'blivre'}">Ler capítulo inteiro</a></section>`;
    el.dialogContent.querySelector('[data-back]').addEventListener('click',()=>renderVerseDialog(selectedVerse));
  };
  const bindDialog=(verse,number)=>{
    el.dialogContent.querySelector('[data-copy]')?.addEventListener('click',()=>navigator.clipboard.writeText(`${currentBook().name} ${state.chapter}:${number} — ${textOf(verse)}`));
    el.dialogContent.querySelector('[data-share]')?.addEventListener('click',()=>navigator.share?.({title:`${currentBook().name} ${state.chapter}:${number}`,url:location.href})||navigator.clipboard.writeText(location.href));
    el.dialogContent.querySelectorAll('[data-ref]').forEach(button=>button.addEventListener('click',()=>showReference(button)));
  };
  const showWord=(verseNumber,wordIndex)=>{
    const verse=(parallel?.data||chapter).verses.find(item=>item.number===verseNumber),word=verse.words[wordIndex];
    const unavailable='Não disponível nesta fonte';
    el.dialogContent.innerHTML=`<section class="word-study"><p class="eyebrow">Estudo de palavra</p><h2 class="study-word" ${word.language==='arc'||word.language==='hbo'?'dir="rtl"':''}>${esc(word.form)}</h2><p class="study-transliteration">${esc(word.transliteration||unavailable)}</p><p class="study-language">${esc(tokenLanguage(word))}</p><p class="study-gloss">${esc(word.gloss||unavailable)}</p><p class="study-grammar"><strong>${esc(word.grammar?.summary||unavailable)}</strong>${word.grammar?.details?`<br>${esc(word.grammar.details)}`:''}</p><p class="study-strong">${word.strong?`Strong ${esc(word.strong)}`:unavailable}</p><details><summary>Detalhes linguísticos</summary><dl><dt>Lemma</dt><dd ${word.language==='arc'||word.language==='hbo'?'dir="rtl"':''}>${esc(word.lemma||unavailable)}</dd><dt>Morfologia completa</dt><dd>${esc(word.grammar?.summary||unavailable)}${word.grammar?.details?` · ${esc(word.grammar.details)}`:''}</dd><dt>Código morfológico</dt><dd><code>${esc(word.morphology||unavailable)}</code></dd><dt>Identificadores</dt><dd>${esc((word.lexicalIdentifiers||[word.strong]).filter(Boolean).join(', ')||unavailable)}</dd><dt>Fonte</dt><dd>${esc(word.source==='STEPBible'?'STEPBible TAGNT/TBESG':word.source==='OSHB/STEPBible'?'Open Scriptures Hebrew Bible + STEPBible TBESH':word.source||unavailable)}</dd><dt>Alinhamento</dt><dd>${word.alignment==='verified'?'Correspondência explícita e verificável por token/identificador':unavailable}</dd></dl></details><button type="button" disabled title="Índice de ocorrências planejado para a continuação da Fase 2">Ver ocorrências — em preparação</button><p>Somente dados com correspondência explícita na fonte são publicados.</p></section>`;
    el.dialog.showModal();
  };
  const showLegacyDetails=()=>{
    const version=manifest.versions.find(item=>item.id==='ara-legacy');
    el.dialogContent.innerHTML=`<section class="legacy-details"><p class="eyebrow">ARA · legado</p><h2>Texto não verificado</h2><p>${esc(version.warning)}</p><dl><dt>Origem</dt><dd>${esc(version.source)}</dd><dt>Situação</dt><dd>${esc(version.license)}</dd></dl><a class="button button-primary" href="/biblia/fontes-e-licencas">Fontes e Licenças</a></section>`;
    if(!el.dialog.open)el.dialog.showModal();
  };
  const bindReading=()=>{
    $$('[data-select-verse]').forEach(target=>{
      const choose=event=>{if(event.target.closest('.word'))return;const row=target.closest('[data-verse]')||target;renderVerseDialog(Number(row.dataset.verse));};
      target.addEventListener('click',choose);
      target.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&!event.target.closest('.word')){event.preventDefault();choose(event);}});
    });
    $$('.word').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();const row=button.closest('[data-verse]');showWord(Number(row.dataset.verse),Number(button.dataset.word));}));
  };
  fetch('/bible-data/manifest.json').then(response=>response.json()).then(async data=>{
    manifest=data;state=initial();populate();await load(false);
    el.book.onchange=()=>{state.book=el.book.value;state.chapter=1;populate();load()};
    el.chapter.onchange=()=>{state.chapter=Number(el.chapter.value);load()};
    el.version.onchange=()=>{state.version=el.version.value;load()};
    $$('[data-previous]').forEach(button=>button.onclick=()=>move(-1));$$('[data-next]').forEach(button=>button.onclick=()=>move(1));
    $('[data-font]').onclick=()=>{font=font>=1.3?.9:font+.1;render()};
    $('[data-parallel]').onclick=async event=>{const button=event.currentTarget;if(parallel){parallel=null;button.setAttribute('aria-pressed','false');render();return}const id=originalId(currentBook());parallel={meta:manifest.versions.find(version=>version.id===id),data:await fetchChapter(id)};button.setAttribute('aria-pressed','true');render()};
    $('[data-dismiss]').onclick=()=>{localStorage.setItem('iprc-ara-warning-seen','true');el.notice.hidden=true};
    el.legacyIndicator.onclick=showLegacyDetails;
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&el.dialog.open){el.dialog.close();return}if(el.dialog.open||event.target.closest(interactive))return;if(event.key==='ArrowLeft')move(-1);if(event.key==='ArrowRight')move(1)});
    const swipe=$('[data-swipe]');
    swipe.addEventListener('touchstart',event=>touch={x:event.touches[0].clientX,y:event.touches[0].clientY},{passive:true});
    swipe.addEventListener('touchend',event=>{if(!touch)return;const dx=event.changedTouches[0].clientX-touch.x,dy=event.changedTouches[0].clientY-touch.y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5)move(dx<0?1:-1);touch=null},{passive:true});
    window.onpopstate=()=>{state=initial();populate();load(false)};
  }).catch(()=>el.content.innerHTML='<p class="reader-error">Não foi possível iniciar o leitor.</p>');
}
