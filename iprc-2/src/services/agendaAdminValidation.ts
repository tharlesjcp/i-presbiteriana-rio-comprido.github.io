import { validateAgendaEventInput, validateRecurringScheduleInput, type AgendaEventInput, type RecurringScheduleInput, type Weekday } from '../domain/agenda.ts';

export class AgendaValidationError extends Error {}
const text = (value:unknown, required=false) => { const result=typeof value==='string'?value.trim():''; if(required&&!result) throw new AgendaValidationError('Preencha todos os campos obrigatórios.'); return result || undefined; };
const bool = (value:unknown) => value === true;
const integer = (value:unknown) => Number.isInteger(Number(value)) ? Number(value) : NaN;
const object = (value:unknown):Record<string,unknown> => { if(!value||typeof value!=='object'||Array.isArray(value)) throw new AgendaValidationError('Dados inválidos.'); return value as Record<string,unknown>; };

export const normalizeRecurringInput = (raw:unknown):RecurringScheduleInput => {
  const value=object(raw), location=object(value.location);
  const result:RecurringScheduleInput={ title:text(value.title,true)!, weekday:integer(value.weekday) as Weekday, startTime:text(value.startTime,true)!, endTime:text(value.endTime), location:{name:text(location.name,true)!,address:text(location.address)}, description:text(value.description), active:bool(value.active), sortOrder:integer(value.sortOrder) };
  if(!validateRecurringScheduleInput(result)) throw new AgendaValidationError('Revise dia, horários, local e ordem da programação.');
  return result;
};

export const normalizeEventInput = (raw:unknown):AgendaEventInput => {
  const value=object(raw), location=object(value.location);
  const status=value.status;
  const result:AgendaEventInput={ title:text(value.title,true)!, startDate:text(value.startDate,true)!, endDate:text(value.endDate), startTime:text(value.startTime), endTime:text(value.endTime), location:{name:text(location.name,true)!,address:text(location.address)}, summary:text(value.summary), description:text(value.description), image:text(value.image), status:status==='draft'||status==='published'||status==='cancelled'?status:'draft' };
  if(!validateAgendaEventInput(result)) throw new AgendaValidationError('Revise datas, horários, local e situação do evento.');
  return result;
};

export const expectedVersion = (raw:unknown) => { const value=object(raw), version=text(value.expectedUpdatedAt,true); return { value, version:version! }; };
