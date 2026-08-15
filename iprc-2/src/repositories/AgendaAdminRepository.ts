import type { AgendaEventInput, RecurringScheduleInput, VersionedAgendaEntity, AgendaEvent, RecurringSchedule } from '../domain/agenda.ts';

export type AuditAction = 'create' | 'update' | 'publish' | 'cancel' | 'activate' | 'deactivate';
export class AgendaConflictError extends Error {}
export class AgendaNotFoundError extends Error {}

export interface AgendaAdminRepository {
  listRecurring(): Promise<VersionedAgendaEntity<RecurringSchedule>[]>;
  listEvents(): Promise<VersionedAgendaEntity<AgendaEvent>[]>;
  createRecurring(input: RecurringScheduleInput, actor: string): Promise<VersionedAgendaEntity<RecurringSchedule>>;
  updateRecurring(id: string, input: RecurringScheduleInput, expectedUpdatedAt: string, actor: string): Promise<VersionedAgendaEntity<RecurringSchedule>>;
  createEvent(input: AgendaEventInput, actor: string): Promise<VersionedAgendaEntity<AgendaEvent>>;
  updateEvent(id: string, input: AgendaEventInput, expectedUpdatedAt: string, actor: string): Promise<VersionedAgendaEntity<AgendaEvent>>;
}
