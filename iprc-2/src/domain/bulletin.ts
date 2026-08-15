import { validateAgendaEvent, type AgendaEvent, type AgendaLocation } from './agenda.ts';
import { isValidCivilDate } from './civil-date.ts';
import { validateBibleReference, type BibleReference } from './study.ts';

export type BulletinStatus = 'draft' | 'published' | 'trashed';
export type TextAlignment = 'left' | 'center' | 'right';
export type TextMark = 'bold' | 'italic' | 'underline';
export type RichTextInline = { text: string; marks?: TextMark[] };
export type RichTextBlock =
  | { type: 'paragraph' | 'quote'; alignment?: TextAlignment; content: RichTextInline[] }
  | { type: 'heading'; level: 2 | 3; alignment?: TextAlignment; content: RichTextInline[] }
  | { type: 'list'; style: 'bullet' | 'numbered'; items: RichTextInline[][] };
export type RichTextDocument = { version: 1; blocks: RichTextBlock[] };

export type PastoralContent = { title: string; bibleReference?: BibleReference; body: RichTextDocument };
export type BulletinAnnouncement = { id: string; title: string; content: RichTextDocument; image?: string; sortOrder: number; agendaEventId?: string };
export type AgendaEventDraft = {
  title: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location: AgendaLocation;
  summary?: string;
  description?: string;
  image?: string;
};
export type BulletinActivity = {
  id: string;
  text: string;
  startDate?: string;
  endDate?: string;
  sortOrder: number;
  agendaEventId?: string;
  publishToAgenda?: boolean;
  agendaEventDraft?: AgendaEventDraft;
};
export type WeeklyReading = { id: string; day: string; referenceText: string; reference?: BibleReference; sortOrder: number };
export type DiaconalScheduleItem = { id: string; date: string; responsible: string[]; sortOrder: number };
export type BirthdayEntry = { id: string; name: string; date: string; source: 'manual' | 'member'; memberId?: string; sortOrder: number };
export type BulletinTemplate = {
  id: string;
  name: string;
  kind: 'annual' | 'special';
  coverAsset?: string;
  backCoverAsset?: string;
  styleKey: string;
  active: boolean;
};
export type BulletinPdfReference = { storageKey: string; generatedAt: string; pageCount: 2 };

export type BulletinInput = {
  id?: string;
  slug?: string;
  number: number;
  date: string;
  templateId: string;
  status: BulletinStatus;
  pastoral: PastoralContent;
  announcements: BulletinAnnouncement[];
  monthActivities: BulletinActivity[];
  birthdays: BirthdayEntry[];
  diaconalSchedule: DiaconalScheduleItem[];
  weeklyReadings: WeeklyReading[];
  additionalBlocks?: RichTextDocument[];
  publishedAt?: string;
  deletedAt?: string;
  pdf?: BulletinPdfReference;
};
export type Bulletin = Omit<BulletinInput, 'id' | 'slug'> & { id: string; slug: string };
export type BulletinFit = { status: 'within-limit' | 'near-limit' | 'over-limit'; estimatedUnits: number; limit: number };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const marks = new Set<TextMark>(['bold', 'italic', 'underline']);
const alignments = new Set<TextAlignment>(['left', 'center', 'right']);

export const emptyRichText = (): RichTextDocument => ({ version: 1, blocks: [] });
const validateInline = (inline: RichTextInline) => typeof inline.text === 'string' && (!inline.marks || inline.marks.every(mark => marks.has(mark)));
export const validateRichText = (document: RichTextDocument) => Boolean(document?.version === 1 && Array.isArray(document.blocks) && document.blocks.every(block => {
  if (block.type === 'list') return ['bullet', 'numbered'].includes(block.style) && block.items.every(item => item.every(validateInline));
  return (!block.alignment || alignments.has(block.alignment)) && block.content.every(validateInline)
    && (block.type !== 'heading' || [2, 3].includes(block.level));
}));

const validOptionalCivilDate = (value?: string) => !value || isValidCivilDate(value);
export const slugifyBulletin = (number: number, date: string) => `boletim-${number}-${date}`;

export const validateBulletinInput = (input: BulletinInput) => Boolean(
  Number.isInteger(input.number) && input.number > 0 && isValidCivilDate(input.date) && input.templateId.trim()
  && ['draft', 'published', 'trashed'].includes(input.status)
  && input.pastoral.title.trim() && validateRichText(input.pastoral.body)
  && (!input.pastoral.bibleReference || validateBibleReference(input.pastoral.bibleReference))
  && input.announcements.every(item => item.id.trim() && item.title.trim() && validateRichText(item.content))
  && input.monthActivities.every(item => item.id.trim() && item.text.trim() && validOptionalCivilDate(item.startDate) && validOptionalCivilDate(item.endDate) && (!item.endDate || !item.startDate || item.endDate >= item.startDate))
  && input.weeklyReadings.every(item => item.id.trim() && item.day.trim() && item.referenceText.trim() && (!item.reference || validateBibleReference(item.reference)))
  && input.diaconalSchedule.every(item => item.id.trim() && isValidCivilDate(item.date) && item.responsible.length > 0 && item.responsible.every(Boolean))
  && input.birthdays.every(item => item.id.trim() && item.name.trim() && isValidCivilDate(item.date) && (item.source === 'manual' || Boolean(item.memberId)))
  && (!input.deletedAt || !Number.isNaN(Date.parse(input.deletedAt))) && (input.status !== 'trashed' || Boolean(input.deletedAt))
  && (!input.additionalBlocks || input.additionalBlocks.every(validateRichText)),
);

export const normalizeBulletin = (input: BulletinInput): Bulletin => {
  if (!validateBulletinInput(input)) throw new Error('Boletim inválido. Revise número, data e blocos obrigatórios.');
  const slug = input.slug?.trim() || slugifyBulletin(input.number, input.date);
  if (!slugPattern.test(slug)) throw new Error('Slug de boletim inválido.');
  return {
    ...input,
    id: input.id?.trim() || `bulletin-${input.number}`,
    slug,
    announcements: [...input.announcements].sort((a, b) => a.sortOrder - b.sortOrder),
    monthActivities: [...input.monthActivities].sort((a, b) => a.sortOrder - b.sortOrder),
    weeklyReadings: [...input.weeklyReadings].sort((a, b) => a.sortOrder - b.sortOrder),
    diaconalSchedule: [...input.diaconalSchedule].sort((a, b) => a.sortOrder - b.sortOrder),
    birthdays: [...input.birthdays].sort((a, b) => a.sortOrder - b.sortOrder),
  };
};

export const assertUniqueBulletinNumbers = (inputs: BulletinInput[]) => {
  const seen = new Set<number>();
  for (const input of inputs) {
    if (seen.has(input.number)) throw new Error(`Número de boletim duplicado: ${input.number}.`);
    seen.add(input.number);
  }
};

export const suggestNextBulletinNumber = (inputs: Pick<BulletinInput, 'number'>[]) => Math.max(0, ...inputs.map(item => item.number)) + 1;
export const suggestNextSunday = (from: string | Date = new Date()) => {
  const date = typeof from === 'string' ? new Date(`${from}T12:00:00Z`) : new Date(from);
  const days = (7 - date.getUTCDay()) || 7;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const renewedId = (prefix: string, index: number, number: number) => `${prefix}-${number}-${index + 1}`;
export const duplicateBulletin = (source: Bulletin, history: BulletinInput[]): BulletinInput => {
  const number = suggestNextBulletinNumber(history);
  return {
    ...source,
    id: undefined,
    slug: undefined,
    number,
    date: suggestNextSunday(source.date),
    status: 'draft',
    publishedAt: undefined,
    deletedAt: undefined,
    pdf: undefined,
    announcements: source.announcements.map((item, index) => ({ ...item, id: renewedId('announcement', index, number), agendaEventId: undefined })),
    monthActivities: source.monthActivities.map((item, index) => ({ ...item, id: renewedId('activity', index, number), agendaEventId: undefined, publishToAgenda: false, agendaEventDraft: undefined })),
    weeklyReadings: source.weeklyReadings.map((item, index) => ({ ...item, id: renewedId('reading', index, number) })),
    diaconalSchedule: source.diaconalSchedule.map((item, index) => ({ ...item, id: renewedId('diaconal', index, number) })),
    birthdays: source.birthdays.map((item, index) => ({ ...item, id: renewedId('birthday', index, number) })),
  };
};

export const createAgendaEventFromActivity = (activity: BulletinActivity, bulletinId: string, agendaEventId: string): AgendaEvent => {
  if (!activity.publishToAgenda || !activity.agendaEventDraft) throw new Error('Atividade não está preparada para publicação na Agenda.');
  const event: AgendaEvent = { ...activity.agendaEventDraft, id: agendaEventId, status: 'draft', source: { kind: 'bulletin', bulletinId, bulletinItemId: activity.id } };
  if (!validateAgendaEvent(event)) throw new Error('Dados complementares da Agenda são inválidos.');
  return event;
};

const inlineLength = (items: RichTextInline[]) => items.reduce((total, item) => total + item.text.length, 0);
const richTextUnits = (document: RichTextDocument) => document.blocks.reduce((total, block) => total + (block.type === 'list' ? block.items.reduce((sum, item) => sum + inlineLength(item) + 20, 0) : inlineLength(block.content) + 30), 0);
export const estimateBulletinFit = (bulletin: Bulletin): BulletinFit => {
  const estimatedUnits = richTextUnits(bulletin.pastoral.body)
    + bulletin.announcements.reduce((sum, item) => sum + item.title.length + richTextUnits(item.content), 0)
    + bulletin.monthActivities.reduce((sum, item) => sum + item.text.length + 20, 0)
    + bulletin.weeklyReadings.length * 45 + bulletin.diaconalSchedule.length * 55 + bulletin.birthdays.length * 35;
  const limit = 7000;
  return { estimatedUnits, limit, status: estimatedUnits > limit ? 'over-limit' : estimatedUnits > limit * .82 ? 'near-limit' : 'within-limit' };
};

export const formatBulletinDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00Z`));
