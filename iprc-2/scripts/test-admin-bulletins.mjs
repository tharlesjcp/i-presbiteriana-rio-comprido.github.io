import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { duplicateBulletin, normalizeBulletin } from '../src/domain/bulletin.ts';
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

const normalized = normalizeBulletin({ ...base, id: 'source', slug: 'boletim-120-2028-02-29', pastoral: { title: 'Pastoral', body: rich }, announcements: [{ id: 'a1', title: 'Aviso', content: rich, sortOrder: 0, agendaEventId: 'event-1' }], monthActivities: [{ id: 'm1', text: 'Atividade', sortOrder: 0, agendaEventId: 'event-1' }] });
const copy = duplicateBulletin(normalized, [normalized]);
assert.equal(copy.status, 'draft'); assert.equal(copy.number, 121); assert.notEqual(copy.announcements[0].id, 'a1'); assert.equal(copy.announcements[0].agendaEventId, undefined); assert.equal(copy.monthActivities[0].agendaEventId, undefined);

const page = await readFile(resolve(import.meta.dirname, '../src/pages/admin/boletins.astro'), 'utf8');
const client = await readFile(resolve(import.meta.dirname, '../src/scripts/admin-bulletins.ts'), 'utf8');
const worker = await readFile(resolve(import.meta.dirname, '../src/worker/admin.ts'), 'utf8');
for (const label of ['Novo boletim','Pastoral','Avisos','Atividades','Aniversariantes','Escala diaconal','Leituras bíblicas','Digital','Impressão']) assert(page.includes(label), `interface deve incluir ${label}`);
assert(client.includes('setTimeout(() => save(false), 1400)'), 'autosave deve usar debounce');
assert(client.includes("getData('text/plain')"), 'colagem deve descartar HTML externo');
assert(client.includes("existing:${event.id}"), 'atividade pode vincular evento existente');
assert(client.includes("agendaMode === 'new'"), 'atividade pode criar evento da Agenda');
for (const route of ['/api/admin/bulletins','/duplicate']) assert(worker.includes(route));
console.log('Admin Boletins: validação, duplicação, Agenda, autosave, editor seguro e rotas aprovados.');
