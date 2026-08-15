import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { duplicateBulletin, normalizeBulletin } from '../src/domain/bulletin.ts';
import { agendaStatusForBulletin, D1BulletinAdminRepository } from '../src/repositories/D1BulletinAdminRepository.ts';
import { bulletinExpectedVersion, normalizeBulletinAdminInput } from '../src/services/bulletinAdminValidation.ts';

const rich = { version: 1, blocks: [{ type: 'paragraph', content: [{ text: ' Texto ', marks: ['bold'] }] }] };
const base = { number: 120, date: '2028-02-29', templateId: 'iprc-padrao', status: 'draft', pastoral: { title: '', body: rich }, announcements: [], monthActivities: [], birthdays: [], diaconalSchedule: [], weeklyReadings: [] };
const draft = normalizeBulletinAdminInput(base);
assert.equal(draft.pastoral.title, '', 'rascunho pode ser salvo antes do título pastoral');
assert.equal(draft.pastoral.body.blocks[0].content[0].text, 'Texto', 'texto é normalizado sem HTML arbitrário');
assert.throws(() => normalizeBulletinAdminInput({ ...base, date: '2026-02-29' }), /inválido/i);
assert.throws(() => normalizeBulletinAdminInput({ ...base, status: 'published' }), /inválido/i, 'publicação exige título');
assert.throws(() => bulletinExpectedVersion({ value: base }), /versão/i);
assert.equal(bulletinExpectedVersion({ value: base, expectedVersion: 'v1' }).version, 'v1');

const withAgenda = normalizeBulletinAdminInput({ ...base, monthActivities: [{ id: 'activity-1', text: 'Culto especial', sortOrder: 0, publishToAgenda: true, agendaEventDraft: { title: 'Culto especial', startDate: '2028-03-05', startTime: '19:00', location: { name: 'IPRC' } } }] });
assert.equal(withAgenda.monthActivities[0].agendaEventDraft.location.name, 'IPRC');
assert.throws(() => normalizeBulletinAdminInput({ ...base, monthActivities: [{ id: 'activity-1', text: 'Inválida', sortOrder: 0, publishToAgenda: true, agendaEventDraft: { title: '', startDate: '2026-02-29', location: { name: '' } } }] }), /Agenda/);
assert.equal(agendaStatusForBulletin('draft'), 'draft', 'autosave de rascunho não publica evento na Agenda');
assert.equal(agendaStatusForBulletin('published'), 'published', 'boletim publicado pode criar evento publicado');
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
for (const route of ['/api/admin/bulletins','/duplicate']) assert(worker.includes(route));
assert(repositorySource.includes("status='published',updated_at=? WHERE bulletin_id=? AND source_kind='bulletin' AND status='draft'"), 'publicação promove apenas eventos criados pelo próprio boletim');
assert(!repositorySource.includes("status='draft',updated_at=? WHERE bulletin_id"), 'despublicação não rebaixa eventos implicitamente');
assert(repositorySource.includes('await this.db.batch([update,concurrencyGuard'), 'parent, filhos e auditoria devem compartilhar o mesmo batch transacional');

const parent = { id:'bulletin-atomic', number:120, slug:'boletim-120-2028-02-29', date:'2028-02-29', template_id:'iprc-padrao', status:'draft', pastoral_title:'Antes', pastoral_body_json:JSON.stringify(rich), bible_book:null, bible_chapter:null, bible_verse_start:null, bible_verse_end:null, published_at:null, deleted_at:null, pdf_storage_key:null, pdf_generated_at:null, pdf_page_count:null, created_at:'v0', updated_at:'v1' };
class Statement { constructor(db,sql){this.db=db;this.sql=sql;this.values=[];} bind(...values){this.values=values;return this;} async first(){return this.sql.startsWith('SELECT * FROM bulletins')?{...this.db.parent}:null;} }
class FailingD1 {
  constructor(){this.parent={...parent};}
  prepare(sql){return new Statement(this,sql);}
  async batch(statements){const snapshot={...this.parent};let changed=0;try{for(const statement of statements){if(statement.sql.startsWith('UPDATE bulletins SET')){if(this.parent.updated_at===statement.values.at(-1)){this.parent.pastoral_title=statement.values[5];this.parent.updated_at=statement.values[13];changed=1;}continue;}if(statement.sql.startsWith('SELECT CASE WHEN changes()')){if(changed!==1)throw new Error('malformed JSON');continue;}if(statement.sql.startsWith('INSERT INTO bulletin_announcements'))throw new Error('falha simulada ao gravar filho');}return statements.map(()=>({meta:{changes:1}}));}catch(error){this.parent=snapshot;throw error;}}
}
const failingDb = new FailingD1();
const atomicRepository = new D1BulletinAdminRepository(failingDb);
await assert.rejects(() => atomicRepository.update('bulletin-atomic',{...base,pastoral:{title:'Depois',body:rich},announcements:[{id:'a-fail',title:'Falha',content:rich,sortOrder:0}]},'v1','teste@iprc'),/falha simulada/);
assert.equal(failingDb.parent.pastoral_title,'Antes','falha nos filhos deve reverter atualização do parent');
assert.equal(failingDb.parent.updated_at,'v1','falha nos filhos não pode avançar a versão');

console.log('Admin Boletins: validação, Agenda em draft, atomicidade, autosave, editor seguro e rotas aprovados.');
