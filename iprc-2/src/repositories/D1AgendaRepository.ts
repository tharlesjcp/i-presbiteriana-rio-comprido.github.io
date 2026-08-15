import {
  calculateNextRecurringOccurrence,
  calculateRecurringOccurrences,
  combineUpcomingAgenda,
  listUpcomingPublishedEvents,
  validateAgendaEvent,
  validateRecurringSchedule,
  type AgendaEvent,
  type RecurringSchedule,
  type Weekday,
} from '../domain/agenda.ts';
import type { AgendaRepository } from './AgendaRepository.ts';

type ScheduleRow = {
  id: string; title: string; weekday: number; start_time: string; end_time: string | null;
  location_name: string; location_address: string | null; description: string | null; active: number; sort_order: number;
};
type EventRow = {
  id: string; title: string; start_date: string; end_date: string | null; start_time: string | null; end_time: string | null;
  location_name: string; location_address: string | null; summary: string | null; description: string | null; image_key: string | null;
  status: AgendaEvent['status']; source_kind: AgendaEvent['source']['kind']; bulletin_id: string | null; bulletin_item_id: string | null;
};

const optional = <T>(value: T | null) => value === null ? undefined : value;
const mapSchedule = (row: ScheduleRow): RecurringSchedule => ({
  id: row.id, title: row.title, weekday: row.weekday as Weekday, startTime: row.start_time, endTime: optional(row.end_time),
  location: { name: row.location_name, address: optional(row.location_address) }, description: optional(row.description),
  active: row.active === 1, sortOrder: row.sort_order,
});
const mapEvent = (row: EventRow): AgendaEvent => ({
  id: row.id, title: row.title, startDate: row.start_date, endDate: optional(row.end_date), startTime: optional(row.start_time), endTime: optional(row.end_time),
  location: { name: row.location_name, address: optional(row.location_address) }, summary: optional(row.summary), description: optional(row.description),
  image: optional(row.image_key), status: row.status,
  source: { kind: row.source_kind, bulletinId: optional(row.bulletin_id), bulletinItemId: optional(row.bulletin_item_id) },
});

export class D1AgendaRepository implements AgendaRepository {
  private readonly db: D1Database;
  constructor(db: D1Database) { this.db = db; }

  async listActiveRecurring() {
    const { results } = await this.db.prepare('SELECT * FROM recurring_schedules WHERE active = 1 ORDER BY sort_order, weekday, start_time').all<ScheduleRow>();
    return results.map(mapSchedule).filter(validateRecurringSchedule);
  }

  async listPublishedEvents() {
    const { results } = await this.db.prepare("SELECT * FROM agenda_events WHERE status = 'published' ORDER BY start_date, COALESCE(start_time, '00:00'), id").all<EventRow>();
    return results.map(mapEvent).filter(validateAgendaEvent);
  }

  async listUpcomingEvents(now = new Date()) { return listUpcomingPublishedEvents(await this.listPublishedEvents(), now); }
  async calculateUpcomingRecurring(now = new Date(), limit = 8) { return calculateRecurringOccurrences(await this.listActiveRecurring(), now, limit); }
  async getNextMeeting(now = new Date()) { return calculateNextRecurringOccurrence(await this.listActiveRecurring(), now); }
  async listCombinedUpcoming(now = new Date(), limit = 8) { return combineUpcomingAgenda(await this.listActiveRecurring(), await this.listPublishedEvents(), now, limit); }
}
