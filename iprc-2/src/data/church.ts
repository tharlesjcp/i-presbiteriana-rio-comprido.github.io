import { recurringSchedules } from './agenda.ts';

export const churchSettings = {
  name: 'Igreja Presbiteriana do Rio Comprido',
  address: 'Rua Sampaio Viana, 185, Rio Comprido - RJ',
  contacts: [] as string[],
  socialLinks: [] as string[],
  leadership: [] as string[],
  bankDetails: undefined as string | undefined,
  weeklySchedule: recurringSchedules,
};
