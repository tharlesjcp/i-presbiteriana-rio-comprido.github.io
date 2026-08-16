import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { duplicateBulletin, normalizeBulletin } from '../src/domain/bulletin.ts';
import { agendaStatusForBulletin, D1BulletinAdminRepository } from '../src/repositories/D1BulletinAdminRepository.ts';
import { publicBulletinFromSnapshot } from '../src/repositories/D1BulletinRepository.ts';
import { bulletinExpectedVersion, normalizeBulletinAdminInput } from '../src/services/bulletinAdminValidation.ts';
import { renderRichTextHtml } from '../src/services/richTextPresentation.ts';
const root=resolve(import.meta.dirname,'..');

const rich = { version: 1, blocks: [{ type: 'paragraph', content: [{ text: ' Texto ', marks: ['bold'] }] }] };
const base = { number: 120, date: '2028-02-29', templateId: 'iprc-padrao', status: 'draft', pastoral: { title: '', body: rich }, announcements: [], monthActivities: [], birthdays: [], diaconalSchedule: [], weeklyReadings: [] };
const draft = normalizeBulletinAdminInput(base);
assert.equal(draft.pastoral.title, '', 'rascunho pode ser salvo antes do título pastoral');
assert.equal(draft.pastoral.body.blocks[0].content[0].text, ' Texto ', 'whitespace inline é conteúdo editorial e deve ser preservado');
const inlineBoundaries=normalizeBulletinAdminInput({...base,pastoral:{title:'Espaços',body:{version:1,blocks:[{type:'paragraph',content:[{text:'Simonton',marks:['bold']},{text:' chegou'},{text:' à igreja e '},{text:'pregou',marks:['italic']},{text:' a Palavra.'}]}]}}});
assert.equal(inlineBoundaries.pastoral.body.blocks[0].content.map(item=>item.text).join(''),'Simonton chegou à igreja e pregou a Palavra.','bold/normal/italic devem preservar espaços entre fragmentos');
assert.equal(inlineBoundaries.pastoral.body.blocks[0].content[1].text,' chegou','o espaço anterior ao fragmento normal não pode sofrer trim');
assert.throws(() => normalizeBulletinAdminInput({ ...base, date: '2026-02-29' }), /inválido/i);
assert.throws(() => normalizeBulletinAdminInput({ ...base, status: 'published' }), /inválido/i, 'publicação exige título');
assert.throws(() => bulletinExpectedVersion({ value: base }), /versão/i);
assert.equal(bulletinExpectedVersion({ value: base, expectedVersion: 'v1' }).version, 'v1');

const withAgenda = normalizeBulletinAdminInput({ ...base, monthActivities: [{ id: 'activity-1', text: 'Culto especial', sortOrder: 0, publishToAgenda: true, agendaEventDraft: { title: 'Culto especial', startDate: '2028-03-05', startTime: '19:00', location: { name: 'IPRC' } } }] });
assert.equal(withAgenda.monthActivities[0].agendaEventDraft.location.name, 'IPRC');
assert.throws(() => normalizeBulletinAdminInput({ ...base, monthActivities: [{ id: 'activity-1', text: 'Inválida', sortOrder: 0, publishToAgenda: true, agendaEventDraft: { title: '', startDate: '2026-02-29', location: { name: '' } } }] }), /Agenda/);
assert.equal(agendaStatusForBulletin('draft'), 'draft', 'autosave de rascunho não publica evento na Agenda');
assert.equal(agendaStatusForBulletin('published'), 'draft', 'edição de boletim publicado não altera implicitamente a Agenda');
assert.equal(agendaStatusForBulletin('trashed'), 'draft', 'despublicação não cria evento público');
const birthdayDefault = normalizeBulletinAdminInput({ ...base, birthdays: [{ id:'birthday-1', name:'Pessoa', date:'2028-03-01', source:'manual', sortOrder:0 }] });
assert.equal(birthdayDefault.birthdays[0].visibility, 'print', 'aniversariante deve iniciar somente na impressão');
const birthdayPublic = normalizeBulletinAdminInput({ ...base, birthdays: [{ id:'birthday-2', name:'Pessoa', date:'2028-03-01', source:'manual', visibility:'public', sortOrder:0 }] });
assert.equal(birthdayPublic.birthdays[0].visibility, 'public', 'editor pode liberar aniversariante para digital e impressão');

const normalized = normalizeBulletin({ ...base, id: 'source', slug: 'boletim-120-2028-02-29', pastoral: { title: 'Pastoral', body: rich }, announcements: [{ id: 'a1', title: 'Aviso', content: rich, sortOrder: 0, agendaEventId: 'event-1' }], monthActivities: [{ id: 'm1', text: 'Atividade', sortOrder: 0, agendaEventId: 'event-1' }] });
const copy = duplicateBulletin(normalized, [normalized]);
assert.equal(copy.status, 'draft'); assert.equal(copy.number, 121); assert.notEqual(copy.announcements[0].id, 'a1'); assert.equal(copy.announcements[0].agendaEventId, undefined); assert.equal(copy.monthActivities[0].agendaEventId, undefined);

const page = await readFile(resolve(import.meta.dirname, '../src/pages/admin/boletins.astro'), 'utf8');
const client = await readFile(resolve(import.meta.dirname, '../src/scripts/admin-bulletins.ts'), 'utf8');
const worker = await readFile(resolve(import.meta.dirname, '../src/worker/admin.ts'), 'utf8');
const repositorySource = await readFile(resolve(import.meta.dirname, '../src/repositories/D1BulletinAdminRepository.ts'), 'utf8');
for (const label of ['Novo boletim','Pastoral','Avisos','Atividades','Aniversariantes','Escala diaconal','Leituras bíblicas','Digital','Impressão']) assert(page.includes(label), `interface deve incluir ${label}`);
assert(page.includes("admin-bulletins.css?raw") && page.includes('set:html={bulletinStyles}'), 'estilos do editor protegido devem ser entregues inline');
assert(client.includes('setTimeout(() => save(false), 1400)'), 'autosave deve usar debounce');
assert(client.includes('expectedVersion: current.updatedAt'), 'autosave deve enviar a versão esperada pelo contrato do Worker');
assert(!client.includes('expectedUpdatedAt: current.updatedAt'), 'autosave não deve usar o nome de campo antigo da Agenda');
assert(client.includes('2-timoteo|2 Timóteo'), 'referência persistida deve voltar ao editor com nome canônico em português');
assert(!client.startsWith('import '), 'script inline do editor não deve depender de import relativo no navegador');
assert(client.includes("getData('text/plain')"), 'colagem deve descartar HTML externo');
assert(client.includes("existing:${event.id}"), 'atividade pode vincular evento existente');
assert(client.includes("agendaMode === 'new'"), 'atividade pode criar evento da Agenda');
assert(client.includes("entry.visibility === 'public'"), 'prévia digital deve omitir aniversariantes somente de impressão');
assert(client.includes("entry.visibility!=='hidden'"), 'prévia impressa deve respeitar visibilidade');
assert(worker.includes('/api/admin/bulletins'));for(const action of ['duplicate','publish','unpublish'])assert(worker.includes(action),`Worker deve expor ação ${action}`);
assert(client.includes("changePublication('publish')") && client.includes("changePublication('unpublish')"), 'publicação e despublicação devem exigir ações explícitas');
assert(client.includes('há alterações não publicadas'), 'editor deve distinguir rascunho editorial da versão pública');
assert(repositorySource.includes('bulletin_publications'), 'publicação deve manter snapshots versionados');
assert(repositorySource.includes("kind:firstPublication?'publish':'republish'"), 'histórico deve distinguir republicação nos metadados de auditoria');
assert(repositorySource.includes("status='published',updated_at=? WHERE bulletin_id=? AND source_kind='bulletin' AND status='draft'"), 'publicação promove apenas eventos criados pelo próprio boletim');
assert(!repositorySource.includes("status='draft',updated_at=? WHERE bulletin_id"), 'despublicação não rebaixa eventos implicitamente');
assert(repositorySource.includes('await this.db.batch([update,concurrencyGuard'), 'parent, filhos e auditoria devem compartilhar o mesmo batch transacional');

const publicV1=normalizeBulletin({...base,id:'public-1',slug:'boletim-120-2028-02-29',status:'published',publishedAt:'2028-02-29T12:00:00.000Z',pastoral:{title:'Versão pública original',body:rich},birthdays:[{id:'private',name:'Somente impresso',date:'2028-03-01',source:'manual',visibility:'print',sortOrder:0},{id:'public',name:'Publicável',date:'2028-03-02',source:'manual',visibility:'public',sortOrder:1}]});
const editorialChanged={...publicV1,pastoral:{...publicV1.pastoral,title:'Alteração ainda privada'}};
let activeSnapshot=JSON.stringify(publicV1);
assert.equal(publicBulletinFromSnapshot({snapshot_json:activeSnapshot}).pastoral.title,'Versão pública original','editar publicado não pode alterar snapshot público');
assert.equal(publicBulletinFromSnapshot({snapshot_json:activeSnapshot}).birthdays.length,1,'snapshot público deve excluir aniversários restritos à impressão');
activeSnapshot=JSON.stringify({...editorialChanged,status:'published',publishedAt:'2028-03-01T12:00:00.000Z'});
const republished=publicBulletinFromSnapshot({snapshot_json:activeSnapshot});
assert.equal(republished.pastoral.title,'Alteração ainda privada','republicação explícita atualiza o conteúdo público');
assert.equal(republished.slug,publicV1.slug,'republicação preserva slug');assert.equal(republished.number,publicV1.number,'republicação preserva número');
const richFlow={version:1,blocks:[{type:'paragraph',content:[{text:'Simonton',marks:['bold']},{text:' chegou à igreja e '},{text:'pregou',marks:['italic']},{text:' a Palavra.'}]}]};
const editorPayload=normalizeBulletinAdminInput({...base,pastoral:{title:'Integração de espaços',body:richFlow}});
const d1ParentJson=JSON.stringify(editorPayload.pastoral.body);
const publicationJson=JSON.stringify(normalizeBulletin({...editorPayload,id:'rich-flow',slug:'boletim-120-2028-02-29',status:'published',publishedAt:'2028-02-29T12:00:00.000Z',pastoral:{...editorPayload.pastoral,body:JSON.parse(d1ParentJson)}}));
const publicFromD1=publicBulletinFromSnapshot({snapshot_json:publicationJson});
const renderedPublic=renderRichTextHtml(publicFromD1.pastoral.body);
assert.match(renderedPublic,/> chegou à igreja e </,'fluxo editor → D1 → snapshot → render público deve preservar espaços nas fronteiras inline');
assert.equal(publicFromD1.pastoral.body.blocks[0].content.map(item=>item.text).join(''),'Simonton chegou à igreja e pregou a Palavra.','snapshot público não pode fundir palavras');

const parent = { id:'bulletin-atomic', number:120, slug:'boletim-120-2028-02-29', date:'2028-02-29', template_id:'iprc-padrao', status:'draft', pastoral_title:'Antes', pastoral_body_json:JSON.stringify(rich), bible_book:null, bible_chapter:null, bible_verse_start:null, bible_verse_end:null, published_at:null, deleted_at:null, pdf_storage_key:null, pdf_generated_at:null, pdf_page_count:null, created_at:'v0', updated_at:'v1' };
class Statement { constructor(db,sql){this.db=db;this.sql=sql;this.values=[];} bind(...values){this.values=values;return this;} async first(){return this.sql.startsWith('SELECT * FROM bulletins')?{...this.db.parent}:null;} }
class FailingD1 {
  constructor(){this.parent={...parent};}
  prepare(sql){return new Statement(this,sql);}
  async batch(statements){const snapshot={...this.parent};let changed=0;try{for(const statement of statements){if(statement.sql.startsWith('UPDATE bulletins SET')){if(this.parent.updated_at===statement.values.at(-1)){this.parent.pastoral_title=statement.values[4];this.parent.updated_at=statement.values[11];changed=1;}continue;}if(statement.sql.startsWith('SELECT CASE WHEN changes()')){if(changed!==1)throw new Error('malformed JSON');continue;}if(statement.sql.startsWith('INSERT INTO bulletin_announcements'))throw new Error('falha simulada ao gravar filho');}return statements.map(()=>({meta:{changes:1}}));}catch(error){this.parent=snapshot;throw error;}}
}
const failingDb = new FailingD1();
const atomicRepository = new D1BulletinAdminRepository(failingDb);
await assert.rejects(() => atomicRepository.update('bulletin-atomic',{...base,pastoral:{title:'Depois',body:rich},announcements:[{id:'a-fail',title:'Falha',content:rich,sortOrder:0}]},'v1','teste@iprc'),/falha simulada/);
assert.equal(failingDb.parent.pastoral_title,'Antes','falha nos filhos deve reverter atualização do parent');
assert.equal(failingDb.parent.updated_at,'v1','falha nos filhos não pode avançar a versão');

const bulletinReader=await readFile(resolve(root,'src/scripts/public-bulletin-reader.ts'),'utf8');
assert.match(bulletinReader,/data\.bibleReference|dataset\.bibleReference/,'referências do boletim devem abrir o preview bíblico');
assert.match(bulletinReader,/parseReadingPart/,'leituras semanais textuais precisam ser transformadas em referências interativas');
assert.match(bulletinReader,/mt:'mateus'.*jo:'joao'.*sl:'salmos'/,'abreviações usadas no Boletim 172 devem ser normalizadas');
const referencePreview=await readFile(resolve(root,'public/scripts/study-reference-preview.js'),'utf8');
assert.match(referencePreview,/document\.addEventListener\('click'/,'preview reutilizável deve aceitar botões inseridos após o carregamento');
const bulletinStyles=await readFile(resolve(root,'src/styles/bulletins.css'),'utf8');
assert.match(bulletinStyles,/header\.bulletin-digital-header\{max-width:none\}/,'hero digital não pode herdar o limite antigo de 55rem');
assert.match(bulletinStyles,/text-align:justify;hyphens:none/,'Pastoral deve ser justificada sem hifenização automática em telas largas');
assert.match(bulletinStyles,/@media\(max-width:760px\)\{\.bulletin-digital-grid main \.rich-text>p\{text-align:left;hyphens:none\}\}/,'mobile deve voltar ao alinhamento à esquerda');

console.log('Admin Boletins: snapshots públicos, republicação, privacidade, Agenda em draft, atomicidade, autosave e rotas aprovados.');
