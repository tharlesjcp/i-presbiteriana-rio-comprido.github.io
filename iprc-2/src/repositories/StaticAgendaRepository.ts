import { agendaEvents, recurringSchedules } from '../data/agenda.ts';
import {
  calculateNextRecurringOccurrence,
  calculateRecurringOccurrences,
  combineUpcomingAgenda,
  listUpcomingPublishedEvents,
  validateAgendaEvent,
  validateRecurringSchedule,
  type AgendaEvent,
  type RecurringSchedule,
} from '../domain/agenda.ts';
import type { AgendaRepository } from './AgendaRepository.ts';

export class StaticAgendaRepository implements AgendaRepository {
  private readonly schedules: RecurringSchedule[];
  private readonly events: AgendaEvent[];
  constructor(schedules: RecurringSchedule[] = recurringSchedules, events: AgendaEvent[] = agendaEvents) {
    this.schedules = schedules;
    this.events = events;
  }
  async listActiveRecurring() {
    return this.schedules.filter(schedule => schedule.active && validateRecurringSchedule(schedule))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
  }
  async listPublishedEvents() { return this.events.filter(event => event.status === 'published' && validateAgendaEvent(event)); }
  async listUpcomingEvents(now = new Date()) { return listUpcomingPublishedEvents(this.events, now); }
  async calculateUpcomingRecurring(now = new Date(), limit = 8) { return calculateRecurringOccurrences(await this.listActiveRecurring(), now, limit); }
  async getNextMeeting(now = new Date()) { return calculateNextRecurringOccurrence(await this.listActiveRecurring(), now); }
  async listCombinedUpcoming(now = new Date(), limit = 8) { return combineUpcomingAgenda(await this.listActiveRecurring(), await this.listPublishedEvents(), now, limit); }
}

export const agendaRepository: AgendaRepository = new StaticAgendaRepository();
