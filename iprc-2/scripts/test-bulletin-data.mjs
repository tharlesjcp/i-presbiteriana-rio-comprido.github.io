import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  assertUniqueBulletinNumbers,
  createAgendaEventFromActivity,
  duplicateBulletin,
  estimateBulletinFit,
  normalizeBulletin,
  suggestNextBulletinNumber,
  suggestNextSunday,
  validateBulletinInput,
} from '../src/domain/bulletin.ts';
import { validateAgendaEvent } from '../src/domain/agenda.ts';
import { isValidCivilDate } from '../src/domain/civil-date.ts';
import { staticBulletins, bulletinTemplates } from '../src/data/bulletins.ts';
import { churchSettings } from '../src/data/church.ts';
import { recurringSchedules } from '../src/data/agenda.ts';
import { StaticBulletinRepository } from '../src/repositories/StaticBulletinRepository.ts';

const richText = (text = 'Texto pastoral autorizado.') => ({ version: 1, blocks: [{ type: 'paragraph', content: [{ text }] }] });
const input = (overrides = {}) => ({
  number: 12,
  date: '2026-08-16',
  templateId: 'standard',
  status: 'published',
  publishedAt: '2026-08-14T12:00:00Z',
  pastoral: { title: 'Pastoral semanal', body: richText(), bibleReference: { book: 'joao', chapter: 11, verseStart: 25, verseEnd: 26 } },
  announcements: [{ id: 'aviso-1', title: 'Aviso', content: richText('Informação.'), sortOrder: 1 }],
  monthActivities: [],
  birthdays: [],
  diaconalSchedule: [],
  weeklyReadings: [{ id: 'leitura-1', day: 'Segunda-feira', referenceText: 'João 11:25–26', reference: { book: 'joao', chapter: 11, verseStart: 25, verseEnd: 26 }, sortOrder: 1 }],
  ...overrides,
});

const normalized = normalizeBulletin(input());
assert.equal(normalized.slug, 'boletim-12-2026-08-16');
assert.equal(normalized.id, 'bulletin-12');
assert.equal(normalizeBulletin(input({ birthdays: [{ id:'birthday-default', name:'Pessoa', date:'2026-08-16', source:'manual', sortOrder:0 }] })).birthdays[0].visibility, 'print');
assert.equal(validateBulletinInput(input({ date: '' })), false, 'data é obrigatória');
assert.equal(validateBulletinInput(input({ number: 0 })), false, 'número positivo é obrigatório');
for (const date of ['2026-02-29', '2026-02-31', '2026-04-31', '2026-13-01', '2026-00-10']) {
  assert.equal(isValidCivilDate(date), false, `${date} deve ser uma data civil inválida`);
  assert.equal(validateBulletinInput(input({ date })), false, `${date} não pode ser data do boletim`);
}
assert.equal(isValidCivilDate('2028-02-29'), true, 'ano bissexto válido');
assert.equal(validateBulletinInput(input({ date: '2028-02-29' })), true, 'boletim aceita 29 de fevereiro em ano bissexto');
assert.equal(validateBulletinInput(input({ monthActivities: [{ id: 'atividade-invalida', text: 'Atividade', startDate: '2026-04-31', sortOrder: 1 }] })), false);
assert.equal(validateBulletinInput(input({ diaconalSchedule: [{ id: 'escala-invalida', date: '2026-02-29', responsible: ['Diácono'], sortOrder: 1 }] })), false);
assert.equal(validateBulletinInput(input({ birthdays: [{ id: 'aniversario-invalido', name: 'Pessoa', date: '2026-13-01', source: 'manual', sortOrder: 1 }] })), false);
assert.throws(() => assertUniqueBulletinNumbers([input(), input({ status: 'trashed', deletedAt: '2026-08-20T00:00:00Z' })]), /duplicado/, 'lixeira também reserva número');
assert.equal(suggestNextBulletinNumber([input(), input({ number: 30 })]), 31);
assert.equal(suggestNextSunday('2026-08-16'), '2026-08-23');

const draft = input({ number: 13, status: 'draft', publishedAt: undefined });
const trashed = input({ number: 14, status: 'trashed', publishedAt: undefined, deletedAt: '2026-08-18T00:00:00Z' });
const newer = input({ number: 15, date: '2026-08-30' });
const repository = new StaticBulletinRepository([draft, input(), trashed, newer]);
assert.deepEqual((await repository.listPublished()).map(item => item.number), [15, 12]);
assert.equal((await repository.findLatestPublished())?.number, 15);
assert.equal(await repository.findPublishedByNumber(14), null);
assert.deepEqual(await new StaticBulletinRepository([]).listPublished(), []);

const sourceWithActivity = normalizeBulletin(input({ monthActivities: [{ id: 'atividade-1', text: 'Encontro', startDate: '2026-08-22', sortOrder: 1, agendaEventId: 'agenda-old' }] }));
const copy = duplicateBulletin(sourceWithActivity, [sourceWithActivity]);
assert.equal(copy.status, 'draft');
assert.equal(copy.number, 13);
assert.equal(copy.publishedAt, undefined);
assert.equal(copy.pdf, undefined);
assert.equal(copy.monthActivities[0].agendaEventId, undefined);
assert.notEqual(copy.monthActivities[0].id, sourceWithActivity.monthActivities[0].id);

const agendaActivity = { id: 'atividade-agenda', text: 'Reunião', sortOrder: 1, publishToAgenda: true, agendaEventDraft: { title: 'Reunião', startDate: '2026-08-22', startTime: '18:00', location: { name: 'IPRC' } } };
const agendaEvent = createAgendaEventFromActivity(agendaActivity, normalized.id, 'agenda-1');
assert.equal(validateAgendaEvent(agendaEvent), true);
assert.deepEqual(agendaEvent.source, { kind: 'bulletin', bulletinId: normalized.id, bulletinItemId: agendaActivity.id });
assert.throws(() => createAgendaEventFromActivity({ ...agendaActivity, publishToAgenda: false }, normalized.id, 'agenda-2'));

assert.equal(estimateBulletinFit(normalized).status, 'within-limit');
const oversized = normalizeBulletin(input({ pastoral: { title: 'Pastoral', body: richText('a'.repeat(7100)) } }));
assert.equal(estimateBulletinFit(oversized).status, 'over-limit');
assert.equal(staticBulletins.length, 0, 'acervo público começa vazio, sem mocks');
assert.equal(bulletinTemplates.length, 1);
assert.equal(bulletinTemplates[0].coverAsset, undefined, 'template não inventa capa');
assert.equal(churchSettings.weeklySchedule, recurringSchedules, 'configurações reutilizam a Agenda');

const home = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const site = await readFile(new URL('../src/data/site.ts', import.meta.url), 'utf8');
const listing = await readFile(new URL('../src/pages/boletins/index.astro', import.meta.url), 'utf8');
const preview = await readFile(new URL('../src/components/BulletinPrintPreview.astro', import.meta.url), 'utf8');
assert.match(home, /bulletinRepository\.findLatestPublished/);
assert.doesNotMatch(home + site, /boletim\.html|Semana de 03 a 09 de agosto/);
assert.match(listing, /data-empty-bulletins/);
assert.equal((preview.match(/class="print-sheet"/g) || []).length, 2);
assert.equal((preview.match(/class="print-panel/g) || []).length, 6);
assert.doesNotMatch(preview, /Lorem ipsum|boletim fictício/i);

console.log('Boletins: domínio, repositório, Agenda, Home e prévia validados.');
