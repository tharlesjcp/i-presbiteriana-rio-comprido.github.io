import type { AgendaEvent, AgendaLocation, RecurringSchedule } from '../domain/agenda.ts';

export const churchLocation: AgendaLocation = {
  name: 'Igreja Presbiteriana do Rio Comprido',
  address: 'Rua Sampaio Viana, 185, Rio Comprido - RJ',
};

export const recurringSchedules: RecurringSchedule[] = [
  { id: 'oracao-estudo-quarta', title: 'Oração e Estudo', weekday: 3, startTime: '18:00', location: churchLocation, active: true, sortOrder: 10 },
  { id: 'ebd-domingo', title: 'EBD - Escola Bíblica Dominical', weekday: 0, startTime: '09:00', location: churchLocation, active: true, sortOrder: 20 },
  { id: 'culto-matutino-domingo', title: 'Culto Matutino', weekday: 0, startTime: '10:00', location: churchLocation, active: true, sortOrder: 30 },
  { id: 'culto-vespertino-domingo', title: 'Culto Vespertino', weekday: 0, startTime: '18:00', location: churchLocation, active: true, sortOrder: 40 },
];

// Eventos especiais começam vazios. Adicione somente eventos reais e autorizados.
export const agendaEvents: AgendaEvent[] = [];
