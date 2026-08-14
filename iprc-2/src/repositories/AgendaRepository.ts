import type { AgendaEvent, AgendaItem, RecurringOccurrence, RecurringSchedule } from '../domain/agenda.ts';

export interface AgendaRepository {
  listActiveRecurring(): Promise<RecurringSchedule[]>;
  listPublishedEvents(): Promise<AgendaEvent[]>;
  listUpcomingEvents(now?: Date): Promise<AgendaEvent[]>;
  calculateUpcomingRecurring(now?: Date, limit?: number): Promise<RecurringOccurrence[]>;
  getNextMeeting(now?: Date): Promise<RecurringOccurrence | null>;
  listCombinedUpcoming(now?: Date, limit?: number): Promise<AgendaItem[]>;
}
