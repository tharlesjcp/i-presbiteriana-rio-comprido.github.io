import type { AgendaEvent, RecurringSchedule } from '../domain/agenda.ts';
import type { Bulletin, BulletinInput } from '../domain/bulletin.ts';

export interface AgendaAdminService {
  createEvent(input: Omit<AgendaEvent, 'id'>): Promise<AgendaEvent>;
  updateEvent(event: AgendaEvent): Promise<AgendaEvent>;
  publishEvent(id: string): Promise<void>;
  cancelEvent(id: string): Promise<void>;
  saveRecurringSchedule(schedule: RecurringSchedule): Promise<RecurringSchedule>;
}

export interface BulletinAdminService {
  create(input: BulletinInput): Promise<Bulletin>;
  update(bulletin: Bulletin): Promise<Bulletin>;
  publish(id: string): Promise<void>;
  trash(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  duplicate(id: string): Promise<Bulletin>;
}

export const createEntityId = (prefix: 'agenda' | 'bulletin') => `${prefix}-${crypto.randomUUID()}`;
