import { isValidCivilDate } from './civil-date.ts';

export const AGENDA_TIME_ZONE = 'America/Sao_Paulo';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type AgendaLocation = { name: string; address?: string };
export type RecurringSchedule = {
  id: string;
  title: string;
  weekday: Weekday;
  startTime: string;
  endTime?: string;
  location: AgendaLocation;
  description?: string;
  active: boolean;
  sortOrder?: number;
};
export type VersionedAgendaEntity<T> = T & { updatedAt: string };
export type RecurringScheduleInput = Omit<RecurringSchedule, 'id'> & { id?: string };
export type AgendaEventStatus = 'draft' | 'published' | 'cancelled';
export type AgendaEventSource = {
  kind: 'manual' | 'bulletin';
  bulletinId?: string;
  bulletinItemId?: string;
};
export type AgendaEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location: AgendaLocation;
  summary?: string;
  description?: string;
  image?: string;
  status: AgendaEventStatus;
  source: AgendaEventSource;
};
export type AgendaEventInput = Omit<AgendaEvent, 'id' | 'source'> & { id?: string };
export type RecurringOccurrence = { schedule: RecurringSchedule; startsAt: Date };
export type AgendaItem =
  | { kind: 'recurring'; startsAt: Date; occurrence: RecurringOccurrence }
  | { kind: 'special'; startsAt: Date; event: AgendaEvent };

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const zonedFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: AGENDA_TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
});

const zonedParts = (date: Date) => {
  const parts = Object.fromEntries(zonedFormatter.formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
};

const zonedDateTimeToDate = (year: number, month: number, day: number, time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let instant = new Date(desired);
  for (let pass = 0; pass < 3; pass += 1) {
    const actual = zonedParts(instant);
    const difference = desired - Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    if (!difference) break;
    instant = new Date(instant.getTime() + difference);
  }
  return instant;
};

const addCalendarDays = (year: number, month: number, day: number, amount: number) => {
  const value = new Date(Date.UTC(year, month - 1, day + amount));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() };
};

export const validateRecurringSchedule = (schedule: RecurringSchedule) => Boolean(
  schedule.id.trim() && schedule.title.trim() && Number.isInteger(schedule.weekday) && schedule.weekday >= 0 && schedule.weekday <= 6
  && timePattern.test(schedule.startTime) && (!schedule.endTime || timePattern.test(schedule.endTime))
  && schedule.location.name.trim(),
);

export const validateRecurringScheduleInput = (input: RecurringScheduleInput) => validateRecurringSchedule({
  ...input,
  id: input.id || 'pending',
});

export const validateAgendaEvent = (event: AgendaEvent) => Boolean(
  event.id.trim() && event.title.trim() && isValidCivilDate(event.startDate)
  && (!event.endDate || isValidCivilDate(event.endDate) && event.endDate >= event.startDate)
  && (!event.startTime || timePattern.test(event.startTime)) && (!event.endTime || timePattern.test(event.endTime))
  && event.location.name.trim() && ['draft', 'published', 'cancelled'].includes(event.status)
  && ['manual', 'bulletin'].includes(event.source.kind),
);

export const validateAgendaEventInput = (input: AgendaEventInput) => validateAgendaEvent({
  ...input,
  id: input.id || 'pending',
  source: { kind: 'manual' },
});

export const calculateNextRecurringOccurrence = (schedules: RecurringSchedule[], now = new Date()): RecurringOccurrence | null => {
  const current = zonedParts(now);
  const currentWeekday = new Date(Date.UTC(current.year, current.month - 1, current.day)).getUTCDay();
  const occurrences = schedules.filter(schedule => schedule.active).map(schedule => {
    let daysAhead = (schedule.weekday - currentWeekday + 7) % 7;
    let target = addCalendarDays(current.year, current.month, current.day, daysAhead);
    let startsAt = zonedDateTimeToDate(target.year, target.month, target.day, schedule.startTime);
    if (startsAt.getTime() < now.getTime()) {
      daysAhead += 7;
      target = addCalendarDays(current.year, current.month, current.day, daysAhead);
      startsAt = zonedDateTimeToDate(target.year, target.month, target.day, schedule.startTime);
    }
    return { schedule, startsAt };
  });
  return occurrences.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || (a.schedule.sortOrder ?? 0) - (b.schedule.sortOrder ?? 0))[0] || null;
};

export const calculateRecurringOccurrences = (schedules: RecurringSchedule[], now = new Date(), limit = 8) => {
  const occurrences: RecurringOccurrence[] = [];
  let cursor = now;
  while (occurrences.length < limit) {
    const next = calculateNextRecurringOccurrence(schedules, cursor);
    if (!next) break;
    occurrences.push(next);
    cursor = new Date(next.startsAt.getTime() + 1);
  }
  return occurrences;
};

export const localDateKey = (date = new Date()) => {
  const value = zonedParts(date);
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
};

export const eventStartInstant = (event: AgendaEvent) => {
  const [year, month, day] = event.startDate.split('-').map(Number);
  return zonedDateTimeToDate(year, month, day, event.startTime || '00:00');
};

export const listUpcomingPublishedEvents = (events: AgendaEvent[], now = new Date()) => {
  const today = localDateKey(now);
  return events.filter(event => event.status === 'published' && validateAgendaEvent(event) && (event.endDate || event.startDate) >= today)
    .sort((a, b) => eventStartInstant(a).getTime() - eventStartInstant(b).getTime());
};

export const combineUpcomingAgenda = (schedules: RecurringSchedule[], events: AgendaEvent[], now = new Date(), limit = 8): AgendaItem[] => [
  ...calculateRecurringOccurrences(schedules, now, limit).map(occurrence => ({ kind: 'recurring' as const, startsAt: occurrence.startsAt, occurrence })),
  ...listUpcomingPublishedEvents(events, now).map(event => ({ kind: 'special' as const, startsAt: eventStartInstant(event), event })),
].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).slice(0, limit);

export const weekdayNames: Record<Weekday, string> = {
  0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado',
};

export const formatAgendaTime = (value?: string) => value ? `${Number(value.slice(0, 2))}h${value.slice(3) === '00' ? '' : value.slice(3)}` : '';
export const formatEventDate = (event: AgendaEvent) => {
  const format = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00Z`));
  return event.endDate && event.endDate !== event.startDate ? `${format(event.startDate)} a ${format(event.endDate)}` : format(event.startDate);
};
