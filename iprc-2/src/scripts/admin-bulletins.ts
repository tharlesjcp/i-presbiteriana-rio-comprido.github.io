export {};
type Json = Record<string, any>;
type RichDocument = { version: 1; blocks: Json[] };

const q = <T = HTMLElement>(selector: string) => document.querySelector(selector) as unknown as T;
const all = <T>(selector: string) => Array.from(document.querySelectorAll(selector)) as unknown as T[];
const add = (parent: any, ...children: any[]) => children.forEach(child => parent.appendChild(child));
const listView = q<HTMLElement>('#bulletin-list-view');
const editorView = q<HTMLElement>('#bulletin-editor-view');
const form = q<HTMLFormElement>('#bulletin-form');
const surface = q<HTMLDivElement>('#pastoral-body');
const feedback = q<HTMLDivElement>('#bulletin-feedback');
const editorFeedback = q<HTMLDivElement>('#editor-feedback');
const saveStatus = q<HTMLElement>('#save-status');
const preview = q<HTMLDialogElement>('#bulletin-preview');
let bulletins: Json[] = [];
let agendaEvents: Json[] = [];
let current: Json | null = null;
let statusFilter = 'all';
let autosave: number | undefined;
let loading = false;

const emptyDocument = (): RichDocument => ({ version: 1, blocks: [] });
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const text = (value: unknown) => typeof value === 'string' ? value : '';
const value = (selector: string) => q<HTMLInputElement | HTMLSelectElement>(selector).value;
const show = (target: HTMLElement, message: string, error = false) => {
  target.hidden = false; target.textContent = message; target.dataset.kind = error ? 'error' : 'success';
};
const clearMessage = (target: HTMLElement) => { target.hidden = true; target.textContent = ''; };
const api = async (path: string, options: RequestInit = {}) => {
  const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json() as Json;
  if (!response.ok) { const error = new Error(body.error?.message || 'Não foi possível concluir a operação.'); (error as any).status = response.status; throw error; }
  return body.data;
};
const formatDate = (date: string) => date ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)) : 'Sem data';
const inlineText = (items: Json[] = []) => items.map(item => text(item.text)).join('');
const documentText = (document: RichDocument) => document.blocks.map(block => block.type === 'list' ? block.items.map(inlineText).join(' · ') : inlineText(block.content)).join('\n');
const bibleAliases: Record<string, string> = { genesis:'genesis',exodo:'exodo',levitico:'levitico',numeros:'numeros',deuteronomio:'deuteronomio',josue:'josue',juizes:'juizes',rute:'rute','1 samuel':'1-samuel','2 samuel':'2-samuel','1 reis':'1-reis','2 reis':'2-reis','1 cronicas':'1-cronicas','2 cronicas':'2-cronicas',esdras:'esdras',neemias:'neemias',ester:'ester',jo:'jo',salmos:'salmos',proverbios:'proverbios',eclesiastes:'eclesiastes',cantares:'canticos',canticos:'canticos',isaias:'isaias',jeremias:'jeremias',lamentacoes:'lamentacoes',ezequiel:'ezequiel',daniel:'daniel',oseias:'oseias',joel:'joel',amos:'amos',obadias:'obadias',jonas:'jonas',miqueias:'miqueias',naum:'naum',habacuque:'habacuque',sofonias:'sofonias',ageu:'ageu',zacarias:'zacarias',malaquias:'malaquias',mateus:'mateus',marcos:'marcos',lucas:'lucas',joao:'joao',atos:'atos',romanos:'romanos','1 corintios':'1-corintios','2 corintios':'2-corintios',galatas:'galatas',efesios:'efesios',filipenses:'filipenses',colossenses:'colossenses','1 tessalonicenses':'1-tessalonicenses','2 tessalonicenses':'2-tessalonicenses','1 timoteo':'1-timoteo','2 timoteo':'2-timoteo',tito:'tito',filemom:'filemom',hebreus:'hebreus',tiago:'tiago','1 pedro':'1-pedro','2 pedro':'2-pedro','1 joao':'1-joao','2 joao':'2-joao','3 joao':'3-joao',judas:'judas',apocalipse:'apocalipse' };
const bibleBookLabels: Record<string, string> = Object.fromEntries(Object.entries(bibleAliases).map(([label, slug]) => [slug, label.replace(/(^|\s)\p{L}/gu, letter => letter.toLocaleUpperCase('pt-BR'))]));
const normalizeLetters = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const parseBibleReference = (raw: string) => { if (!raw.trim()) return undefined; const match = normalizeLetters(raw).match(/^(.+?)\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?$/); if (!match) return undefined; const book = bibleAliases[match[1].trim()]; return book ? { book, chapter: Number(match[2]), verseStart: Number(match[3]), ...(match[4] ? { verseEnd: Number(match[4]) } : {}) } : undefined; };

function appendInline(parent: HTMLElement, item: Json) {
  let node: Node = document.createTextNode(text(item.text));
  for (const mark of item.marks || []) { const wrapper = document.createElement(mark === 'bold' ? 'strong' : mark === 'italic' ? 'em' : 'u'); add(wrapper, node); node = wrapper; }
  add(parent, node);
}
function renderRich(target: HTMLElement, rich: RichDocument = emptyDocument()) {
  target.replaceChildren();
  for (const block of rich.blocks || []) {
    if (block.type === 'list') { const list = document.createElement(block.style === 'numbered' ? 'ol' : 'ul'); for (const item of block.items || []) { const li = document.createElement('li'); item.forEach((part: Json) => appendInline(li, part)); add(list, li); } add(target, list); continue; }
    const element = document.createElement(block.type === 'heading' ? `h${block.level || 3}` : block.type === 'quote' ? 'blockquote' : 'p');
    (block.content || []).forEach((item: Json) => appendInline(element, item)); add(target, element);
  }
}
function serializeInline(element: HTMLElement) {
  const output: Json[] = [];
  const walk = (node: Node, marks: string[] = []) => {
    if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) output.push({ text: node.textContent, ...(marks.length ? { marks: [...new Set(marks)] } : {}) }); return; }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase(); const next = [...marks];
    if (tag === 'strong' || tag === 'b') next.push('bold'); if (tag === 'em' || tag === 'i') next.push('italic'); if (tag === 'u') next.push('underline');
    node.childNodes.forEach(child => walk(child, next));
  };
  element.childNodes.forEach(node => walk(node)); return output;
}
function serializeRich(target: HTMLElement): RichDocument {
  const blocks: Json[] = [];
  for (const node of target.children) {
    if (!(node instanceof HTMLElement)) continue;
    const tag = node.tagName.toLowerCase();
    if (tag === 'ul' || tag === 'ol') blocks.push({ type: 'list', style: tag === 'ol' ? 'numbered' : 'bullet', items: [...node.children].map(child => serializeInline(child as unknown as HTMLElement)) });
    else if (/^h[23]$/.test(tag)) blocks.push({ type: 'heading', level: Number(tag[1]), content: serializeInline(node) });
    else blocks.push({ type: tag === 'blockquote' ? 'quote' : 'paragraph', content: serializeInline(node) });
  }
  if (!blocks.length && target.textContent?.trim()) blocks.push(...target.textContent.split(/\n+/).map(line=>line.trim()).filter(Boolean).map(line=>({ type:'paragraph', content:[{ text:line }] })));
  return { version: 1, blocks };
}

const field = (className: string, label: string, type = 'text', value = '') => {
  const wrapper = document.createElement('label'); wrapper.className = className; add(wrapper, document.createTextNode(label));
  const input = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
  if (input instanceof HTMLInputElement) input.type = type; input.value = value; add(wrapper, input); return wrapper;
};
const choice = (className: string, label: string, selected: string, options: [string,string][]) => { const wrapper=document.createElement('label');wrapper.className=className;add(wrapper,document.createTextNode(label));const select=document.createElement('select');for(const [value,labelText] of options){const option=document.createElement('option');option.value=value;option.textContent=labelText;add(select,option);}select.value=selected;add(wrapper,select);return wrapper; };
const removeButton = () => { const button = document.createElement('button'); button.type = 'button'; button.className = 'item-remove'; button.textContent = 'Remover'; button.addEventListener('click', () => { button.closest('.collection-item')?.remove(); scheduleSave(); }); return button; };
const itemControls = () => { const controls=document.createElement('div');controls.className='item-controls';for(const [label,direction] of [['↑ Subir','up'],['↓ Descer','down']] as const){const button=document.createElement('button');button.type='button';button.className='admin-link-button';button.textContent=label;button.addEventListener('click',()=>{const row=button.closest('.collection-item');if(!row)return;if(direction==='up'&&row.previousElementSibling)row.parentElement?.insertBefore(row,row.previousElementSibling);if(direction==='down'&&row.nextElementSibling)row.parentElement?.insertBefore(row.nextElementSibling,row);scheduleSave();});add(controls,button);}add(controls,removeButton());return controls;};
const addItem = (collection: string, item: Json = {}) => {
  const row = document.createElement('article'); row.className = 'collection-item'; row.dataset.id = item.id || uid(collection.slice(0, -1));
  if (collection === 'announcements') { add(row, field('wide', 'Título', 'text', text(item.title)), field('wide', 'Conteúdo', 'textarea', documentText(item.content || emptyDocument()))); }
  if (collection === 'activities') {
    add(row, field('wide', 'Atividade', 'text', text(item.text)), field('', 'Data', 'date', text(item.startDate)), field('', 'Data final', 'date', text(item.endDate)), field('', 'Início', 'time', text(item.startTime)), field('', 'Fim', 'time', text(item.endTime)), field('', 'Local', 'text', text(item.locationName)), field('', 'Endereço', 'text', text(item.locationAddress)), field('wide', 'Descrição', 'textarea', text(item.description)));
    const agenda = document.createElement('label'); agenda.className = 'wide agenda-choice'; add(agenda, document.createTextNode('Integração com a Agenda'));
    const select = document.createElement('select'); const local = document.createElement('option'); local.value = 'bulletin'; local.textContent = 'Somente no boletim'; const create = document.createElement('option'); create.value = 'new'; create.textContent = 'Criar novo evento público na Agenda'; add(select, local); for (const event of agendaEvents) { const option = document.createElement('option'); option.value = `existing:${event.id}`; option.textContent = `Vincular: ${event.title} — ${formatDate(event.startDate)}`; add(select, option); } add(select, create); select.value = item.publishToAgenda ? 'new' : item.agendaEventId ? `existing:${item.agendaEventId}` : 'bulletin'; add(agenda, select); add(row, agenda);
  }
  if (collection === 'birthdays') add(row, field('wide', 'Nome', 'text', text(item.name)), field('', 'Data', 'date', text(item.date)), choice('', 'Visibilidade', item.visibility || 'print', [['hidden','Oculto'],['print','Somente impressão'],['public','Digital e impressão']]));
  if (collection === 'diaconal') add(row, field('', 'Data', 'date', text(item.date)), field('wide', 'Responsáveis (separados por vírgula)', 'text', (item.responsible || []).join(', ')));
  if (collection === 'readings') add(row, field('', 'Dia', 'text', text(item.day)), field('wide', 'Referência', 'text', text(item.referenceText)));
  add(row, itemControls()); add(q(`#${collection}-items`), row);
};
const rows = (collection: string) => all<HTMLElement>(`#${collection}-items .collection-item`);
const inputs = (row: HTMLElement) => Array.from(row.querySelectorAll('input,textarea,select')).map(input => (input as unknown as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value);
const plainRich = (content: string): RichDocument => ({ version: 1, blocks: content.trim() ? content.split(/\n+/).map(line => ({ type: 'paragraph', content: [{ text: line.trim() }] })) : [] });

function editorValue(): Json {
  const announcements = rows('announcements').map((row, sortOrder) => { const [title, content] = inputs(row); return { id: row.dataset.id, title, content: plainRich(content), sortOrder }; });
  const monthActivities = rows('activities').map((row, sortOrder) => { const [activityText, startDate, endDate, startTime, endTime, locationName, locationAddress, description, agendaMode] = inputs(row); return { id: row.dataset.id, text: activityText, startDate, endDate, startTime, endTime, locationName, locationAddress, description, sortOrder, ...(agendaMode.startsWith('existing:') ? { agendaEventId: agendaMode.slice(9) } : {}), publishToAgenda: agendaMode === 'new', ...(agendaMode === 'new' ? { agendaEventDraft: { title: activityText, startDate, endDate, startTime, endTime, location: { name: locationName, address: locationAddress }, description } } : {}) }; });
  const birthdays = rows('birthdays').map((row, sortOrder) => { const [name, date, visibility] = inputs(row); return { id: row.dataset.id, name, date, visibility: visibility || 'print', source: 'manual', sortOrder }; });
  const diaconalSchedule = rows('diaconal').map((row, sortOrder) => { const [date, responsible] = inputs(row); return { id: row.dataset.id, date, responsible: responsible.split(',').map((entry: string) => entry.trim()).filter(Boolean), sortOrder }; });
  const weeklyReadings = rows('readings').map((row, sortOrder) => { const [day, referenceText] = inputs(row); return { id: row.dataset.id, day, referenceText, sortOrder }; });
  const referenceText = value('#pastoral-reference'); const bibleReference = parseBibleReference(referenceText); if (referenceText.trim() && !bibleReference) throw new Error('Referência bíblica inválida. Use, por exemplo, João 3:16 ou João 3:16–18.');
  return { ...(current?.id ? { id: current.id, slug: current.slug } : {}), number: Number(value('#bulletin-number')), date: value('#bulletin-date'), templateId: value('#bulletin-template'), status: value('#bulletin-status'), pastoral: { title: value('#pastoral-title'), body: serializeRich(surface), ...(bibleReference ? { bibleReference } : {}) }, announcements, monthActivities, birthdays, diaconalSchedule, weeklyReadings, additionalBlocks: [], ...(value('#bulletin-status') === 'trashed' ? { deletedAt: current?.deletedAt || new Date().toISOString() } : {}) };
}
function fillEditor(item: Json) {
  current = item; q<HTMLInputElement>('#bulletin-number').value = String(item.number || ''); q<HTMLInputElement>('#bulletin-date').value = item.date || ''; q<HTMLSelectElement>('#bulletin-template').value = item.templateId || 'iprc-padrao'; q<HTMLSelectElement>('#bulletin-status').value = item.status || 'draft'; q<HTMLInputElement>('#pastoral-title').value = item.pastoral?.title || ''; q<HTMLInputElement>('#pastoral-reference').value = item.pastoral?.bibleReference ? `${bibleBookLabels[item.pastoral.bibleReference.book] || item.pastoral.bibleReference.book} ${item.pastoral.bibleReference.chapter}:${item.pastoral.bibleReference.verseStart}${item.pastoral.bibleReference.verseEnd ? `–${item.pastoral.bibleReference.verseEnd}` : ''}` : '';
  renderRich(surface, item.pastoral?.body || emptyDocument()); for (const name of ['announcements', 'activities', 'birthdays', 'diaconal', 'readings']) q(`#${name}-items`).replaceChildren();
  (item.announcements || []).forEach((entry: Json) => addItem('announcements', entry)); (item.monthActivities || []).forEach((entry: Json) => addItem('activities', entry)); (item.birthdays || []).forEach((entry: Json) => addItem('birthdays', entry)); (item.diaconalSchedule || []).forEach((entry: Json) => addItem('diaconal', entry)); (item.weeklyReadings || []).forEach((entry: Json) => addItem('readings', entry));
  q('#editor-heading').textContent = item.id ? `Boletim ${item.number}` : 'Novo boletim'; saveStatus.textContent = item.id ? 'Todas as alterações salvas' : 'Ainda não salvo'; clearMessage(editorFeedback);
}
function openEditor(item: Json) { fillEditor(item); listView.hidden = true; editorView.hidden = false; window.scrollTo({ top: 0 }); }
function renderList() {
  const target = q<HTMLDivElement>('#bulletin-list'); target.replaceChildren(); const visible = bulletins.filter(item => statusFilter === 'all' || item.status === statusFilter);
  if (!visible.length) { const empty = document.createElement('p'); empty.className = 'admin-empty'; empty.textContent = 'Nenhum boletim neste filtro.'; add(target, empty); return; }
  for (const item of visible) { const card = document.createElement('article'); card.className = 'bulletin-list-card'; const info = document.createElement('div'); const meta = document.createElement('p'); meta.className = 'admin-card-meta'; const changed = item.updatedAt ? ` · alterado ${new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(item.updatedAt.split('#')[0]))}` : ''; meta.textContent = `${formatDate(item.date)} · ${item.status === 'published' ? 'Publicado' : item.status === 'trashed' ? 'Lixeira' : 'Rascunho'}${changed}`; const title = document.createElement('h2'); title.textContent = `Boletim ${item.number}`; const pastoral = document.createElement('p'); pastoral.textContent = item.pastoral?.title || 'Pastoral ainda sem título'; add(info, meta, title, pastoral); const actions = document.createElement('div'); actions.className = 'bulletin-card-actions'; const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'admin-secondary'; edit.textContent = 'Editar'; edit.addEventListener('click', () => openEditor(item)); const view = document.createElement('button'); view.type='button'; view.className='admin-link-button'; view.textContent='Visualizar'; view.addEventListener('click',()=>{openEditor(item);renderPreview();}); const duplicate = document.createElement('button'); duplicate.type = 'button'; duplicate.className = 'admin-link-button'; duplicate.textContent = 'Duplicar'; duplicate.addEventListener('click', () => duplicateBulletin(item)); add(actions, edit, view, duplicate); if (item.status !== 'trashed') { const trash = document.createElement('button'); trash.type = 'button'; trash.className = 'admin-link-button danger'; trash.textContent = 'Mover para lixeira'; trash.addEventListener('click', () => trashBulletin(item)); add(actions, trash); } add(card, info, actions); add(target, card); }
}
async function load() { try { const [session, items, events] = await Promise.all([api('/api/admin/session'), api('/api/admin/bulletins'), api('/api/admin/agenda/events')]); q('#bulletin-session').textContent = `Acesso confirmado para ${session.email}`; bulletins = items; agendaEvents = events; renderList(); } catch (error) { show(feedback, error instanceof Error ? error.message : 'Falha ao carregar boletins.', true); q('#bulletin-session').textContent = 'Acesso não confirmado'; } }
async function save(manual = false) {
  if (loading) return; loading = true; window.clearTimeout(autosave); clearMessage(editorFeedback); saveStatus.textContent = 'Salvando…';
  try { const input = editorValue(); const isNew = !current?.id; const saved = current?.id ? await api(`/api/admin/bulletins/${encodeURIComponent(current.id)}`, { method: 'PUT', body: JSON.stringify({ value: input, expectedUpdatedAt: current.updatedAt }) }) : await api('/api/admin/bulletins', { method: 'POST', body: JSON.stringify(input) }); current = saved; if (isNew) fillEditor(saved); else { q('#editor-heading').textContent = `Boletim ${saved.number}`; clearMessage(editorFeedback); } await refreshList(); saveStatus.textContent = manual ? 'Salvo agora' : 'Alterações salvas automaticamente'; }
  catch (error) { const conflict = (error as any).status === 409; show(editorFeedback, conflict ? 'Este boletim foi alterado em outra sessão. Volte à lista e abra novamente antes de salvar.' : error instanceof Error ? error.message : 'Falha ao salvar.', true); saveStatus.textContent = 'Não foi possível salvar'; }
  finally { loading = false; }
}
const scheduleSave = () => { saveStatus.textContent = 'Alterações pendentes…'; window.clearTimeout(autosave); autosave = window.setTimeout(() => save(false), 1400); };
async function refreshList() { bulletins = await api('/api/admin/bulletins'); renderList(); }
async function newBulletin() { try { const suggestions = await api('/api/admin/bulletins/suggestions'); openEditor({ number: suggestions.number, date: suggestions.date, templateId: 'iprc-padrao', status: 'draft', pastoral: { title: '', body: emptyDocument() }, announcements: [], monthActivities: [], birthdays: [], diaconalSchedule: [], weeklyReadings: [] }); } catch (error) { show(feedback, error instanceof Error ? error.message : 'Falha ao preparar boletim.', true); } }
async function duplicateBulletin(item: Json) { try { const copy = await api(`/api/admin/bulletins/${encodeURIComponent(item.id)}/duplicate`, { method: 'POST', body: '{}' }); await refreshList(); openEditor(copy); show(editorFeedback, 'Cópia criada como rascunho. Revise número, data e conteúdo.'); } catch (error) { show(feedback, error instanceof Error ? error.message : 'Falha ao duplicar.', true); } }
async function trashBulletin(item: Json) { if (!confirm(`Mover o Boletim ${item.number} para a lixeira?`)) return; try { const payload = { ...item, status: 'trashed', deletedAt: new Date().toISOString() }; await api(`/api/admin/bulletins/${encodeURIComponent(item.id)}`, { method: 'PUT', body: JSON.stringify({ value: payload, expectedUpdatedAt: item.updatedAt }) }); await refreshList(); show(feedback, 'Boletim movido para a lixeira.'); } catch (error) { show(feedback, error instanceof Error ? error.message : 'Falha ao mover para a lixeira.', true); } }

function renderPreview() {
  const item = editorValue(); const digital = q('#digital-preview'); digital.replaceChildren(); const header = document.createElement('header'); const eyebrow = document.createElement('p'); eyebrow.textContent = `Boletim ${item.number} · ${formatDate(item.date)}`; const heading = document.createElement('h2'); heading.textContent = item.pastoral.title || 'Pastoral sem título'; add(header, eyebrow, heading); add(digital, header); const body = document.createElement('section'); renderRich(body, item.pastoral.body); add(digital, body);
  for (const [label, entries, describe] of [['Avisos', item.announcements, (entry: Json) => `${entry.title}: ${documentText(entry.content)}`], ['Atividades', item.monthActivities, (entry: Json) => entry.text], ['Aniversariantes', item.birthdays.filter((entry: Json) => entry.visibility === 'public'), (entry: Json) => `${entry.name} — ${formatDate(entry.date)}`], ['Escala diaconal', item.diaconalSchedule, (entry: Json) => `${formatDate(entry.date)} — ${entry.responsible.join(', ')}`], ['Leituras', item.weeklyReadings, (entry: Json) => `${entry.day}: ${entry.referenceText}`]] as any[]) { if (!entries.length) continue; const section = document.createElement('section'); const h = document.createElement('h3'); h.textContent = label; const ul = document.createElement('ul'); entries.forEach((entry: Json) => { const li = document.createElement('li'); li.textContent = describe(entry); add(ul, li); }); add(section, h, ul); add(digital, section); }
  const pastoralText=documentText(item.pastoral.body);const paragraphs=pastoralText.split('\n').filter(Boolean);const target=Math.ceil(pastoralText.length/2);let used=0,cut=0;while(cut<paragraphs.length&&used<target){used+=paragraphs[cut].length;cut++;}const first=paragraphs.slice(0,cut).join('\n\n'),second=paragraphs.slice(cut).join('\n\n');
  q('[data-print-cover]').textContent = `Boletim Dominical nº ${item.number}\n${formatDate(item.date)}`; q('[data-print-pastoral]').textContent = `${item.pastoral.title}\n${first}`; q('[data-print-pastoral-cont]').textContent = second; q('[data-print-announcements]').textContent = ['AVISOS',...item.announcements.map((entry: Json) => `${entry.title.toUpperCase()}\n${documentText(entry.content)}`),'PLANTÃO DIACONAL',...item.diaconalSchedule.map((entry: Json) => `${formatDate(entry.date)} · ${entry.responsible.join(' e ')}`)].join('\n\n'); const printableBirthdays=item.birthdays.filter((entry:Json)=>entry.visibility!=='hidden');q('[data-print-info]').textContent = ['ATIVIDADES DO MÊS',...item.monthActivities.map((entry: Json) => entry.text),'ANIVERSARIANTES',...printableBirthdays.map((entry:Json)=>`${entry.name} · ${formatDate(entry.date)}`),'LEITURAS BÍBLICAS DA SEMANA',...item.weeklyReadings.map((entry: Json) => `${entry.day}: ${entry.referenceText}`)].join('\n');
  const units = documentText(item.pastoral.body).length + item.announcements.reduce((sum: number, entry: Json) => sum + entry.title.length + documentText(entry.content).length, 0) + item.monthActivities.length * 40 + item.weeklyReadings.length * 45 + item.diaconalSchedule.length * 55 + item.birthdays.length * 35; const fit = units > 7000 ? 'Excede o espaço — reduza ou redistribua o conteúdo.' : units > 5740 ? 'Próximo do limite — revise antes de imprimir.' : 'Cabe no espaço estimado.'; q('#fit-indicator').textContent = fit; preview.showModal();
}

q('#new-bulletin').addEventListener('click', newBulletin); q('#back-to-bulletins').addEventListener('click', async () => { window.clearTimeout(autosave); if (value('#bulletin-number') && value('#bulletin-date')) await save(false); editorView.hidden = true; listView.hidden = false; current = null; }); q('#save-button').addEventListener('click', () => save(true)); q('#preview-button').addEventListener('click', renderPreview); q('#close-preview').addEventListener('click', () => preview.close());
all<HTMLButtonElement>('[data-filter]').forEach(button => button.addEventListener('click', () => { statusFilter = button.dataset.filter || 'all'; all<HTMLButtonElement>('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); renderList(); }));
all<HTMLButtonElement>('[data-command]').forEach(button => button.addEventListener('click', () => { surface.focus(); document.execCommand(button.dataset.command || ''); scheduleSave(); })); all<HTMLButtonElement>('[data-block]').forEach(button => button.addEventListener('click', () => { surface.focus(); document.execCommand('formatBlock', false, button.dataset.block); scheduleSave(); }));
surface.addEventListener('paste', event => { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') || ''); scheduleSave(); }); form.addEventListener('input', scheduleSave);
all<HTMLButtonElement>('[data-add]').forEach(button => button.addEventListener('click', () => { addItem(button.dataset.add || ''); scheduleSave(); }));
all<HTMLButtonElement>('[data-preview-tab]').forEach(button => button.addEventListener('click', () => { const print = button.dataset.previewTab === 'print'; q<HTMLElement>('#digital-preview').hidden = print; q<HTMLElement>('#print-preview').hidden = !print; all<HTMLButtonElement>('[data-preview-tab]').forEach(tab => tab.setAttribute('aria-selected', String(tab === button))); }));
load();
window.setInterval(() => { if (!current?.updatedAt || loading || saveStatus.textContent?.includes('pendente')) return; const minutes = Math.floor((Date.now() - new Date(current.updatedAt.split('#')[0]).getTime()) / 60000); if (minutes > 0) saveStatus.textContent = `Salvo há ${minutes} minuto${minutes === 1 ? '' : 's'}`; }, 30000);
