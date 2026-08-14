import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { agendaEvents, churchLocation, recurringSchedules } from '../src/data/agenda.ts';
import { AGENDA_TIME_ZONE, calculateNextRecurringOccurrence, formatEventDate, listUpcomingPublishedEvents } from '../src/domain/agenda.ts';
import { StaticAgendaRepository } from '../src/repositories/StaticAgendaRepository.ts';

const at = value => new Date(value);
const nextTitle = value => calculateNextRecurringOccurrence(recurringSchedules, at(value))?.schedule.title;
const nextIso = value => calculateNextRecurringOccurrence(recurringSchedules, at(value))?.startsAt.toISOString();

assert.equal(AGENDA_TIME_ZONE, 'America/Sao_Paulo');
assert.equal(recurringSchedules.length, 4, 'devem existir exatamente quatro atividades recorrentes');
assert.deepEqual(recurringSchedules.map(item => [item.weekday, item.startTime, item.title]), [
  [3, '18:00', 'Oração e Estudo'],
  [0, '09:00', 'EBD - Escola Bíblica Dominical'],
  [0, '10:00', 'Culto Matutino'],
  [0, '18:00', 'Culto Vespertino'],
]);
assert(recurringSchedules.every(item => item.active && item.endTime === undefined));
assert(recurringSchedules.every(item => item.location === churchLocation));

const inactive = { ...recurringSchedules[0], id: 'inativo', title: 'Não exibir', active: false };
const filterRepo = new StaticAgendaRepository([...recurringSchedules, inactive], []);
assert.equal((await filterRepo.listActiveRecurring()).length, 4, 'atividade inativa não deve aparecer');

assert.equal(nextTitle('2026-08-19T20:00:00Z'), 'Oração e Estudo', 'quarta antes das 18h');
assert.equal(nextTitle('2026-08-19T21:01:00Z'), 'EBD - Escola Bíblica Dominical', 'quarta depois das 18h');
assert.equal(nextTitle('2026-08-16T11:00:00Z'), 'EBD - Escola Bíblica Dominical', 'domingo antes das 9h');
assert.equal(nextTitle('2026-08-16T12:30:00Z'), 'Culto Matutino', 'domingo entre 9h e 10h');
assert.equal(nextTitle('2026-08-16T14:00:00Z'), 'Culto Vespertino', 'domingo entre 10h e 18h');
assert.equal(nextTitle('2026-08-16T21:01:00Z'), 'Oração e Estudo', 'domingo depois das 18h');
assert.equal(nextIso('2026-08-16T12:00:00Z'), '2026-08-16T12:00:00.000Z', 'o início exato ainda é o encontro atual');
assert.equal(nextIso('2026-08-16T11:00:00Z'), '2026-08-16T12:00:00.000Z', '09h em São Paulo deve corresponder a 12h UTC');

const single = { id: 'single', title: 'Evento real de teste', startDate: '2026-08-29', startTime: '19:00', location: churchLocation, status: 'published', source: { kind: 'manual' } };
const period = { id: 'period', title: 'Período real de teste', startDate: '2026-08-09', endDate: '2026-08-16', location: churchLocation, status: 'published', source: { kind: 'manual' } };
const draft = { ...single, id: 'draft', startDate: '2026-08-10', status: 'draft' };
const cancelled = { ...single, id: 'cancelled', startDate: '2026-08-11', status: 'cancelled' };
const upcoming = listUpcomingPublishedEvents([single, period, draft, cancelled], at('2026-08-01T12:00:00Z'));
assert.deepEqual(upcoming.map(event => event.id), ['period', 'single'], 'eventos devem ser cronológicos e somente publicados');
assert.equal(formatEventDate(single), '29 de agosto de 2026', 'evento de uma data');
assert.equal(formatEventDate(period), '09 de agosto de 2026 a 16 de agosto de 2026', 'evento com intervalo');
assert.equal(agendaEvents.length, 0, 'catálogo público de eventos especiais deve começar vazio');

const root = resolve(import.meta.dirname, '..');
const dataSource = await readFile(resolve(root, 'src/data/agenda.ts'), 'utf8');
assert.match(dataSource, /agendaEvents: AgendaEvent\[\] = \[\]/);
const home = await readFile(resolve(root, 'src/components/CalendarSection.astro'), 'utf8');
const agendaPage = await readFile(resolve(root, 'src/pages/agenda.astro'), 'utf8');
assert.match(home, /agendaRepository\.listActiveRecurring/);
assert.match(agendaPage, /agendaRepository\.listActiveRecurring/);
assert.match(home, /<NextMeeting/);
assert.match(agendaPage, /<NextMeeting/);
const publicSources = await Promise.all([
  readFile(resolve(root, 'src/components/CalendarSection.astro'), 'utf8'),
  readFile(resolve(root, 'src/pages/agenda.astro'), 'utf8'),
  readFile(resolve(root, 'src/data/agenda.ts'), 'utf8'),
]);
assert(!publicSources.join('\n').includes('calendar.google'), 'Agenda não pode depender do Google Calendar');
const nextMeeting = await readFile(resolve(root, 'src/components/NextMeeting.astro'), 'utf8');
assert.match(nextMeeting, /new Date\(\)/, 'cálculo deve usar o relógio do navegador');
assert.match(nextMeeting, /setInterval/, 'próximo encontro deve se atualizar com a página aberta');
assert.match(nextMeeting, /AGENDA_TIME_ZONE/);

console.log('Testes da Agenda: aprovados.');
