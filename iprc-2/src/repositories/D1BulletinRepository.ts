import { normalizeBulletin, type Bulletin, type BulletinInput, type RichTextDocument } from '../domain/bulletin.ts';
import type { BibleReference } from '../domain/study.ts';
import type { BulletinRepository } from './BulletinRepository.ts';

type ParentRow = {
  id: string; number: number; slug: string; date: string; template_id: string; status: Bulletin['status']; pastoral_title: string;
  pastoral_body_json: string; bible_book: string | null; bible_chapter: number | null; bible_verse_start: number | null; bible_verse_end: number | null;
  published_at: string | null; deleted_at: string | null; pdf_storage_key: string | null; pdf_generated_at: string | null; pdf_page_count: number | null;
};
type AnnouncementRow = { id: string; title: string; content_json: string; image_key: string | null; agenda_event_id: string | null; sort_order: number };
type ActivityRow = { id: string; text: string; start_date: string | null; end_date: string | null; agenda_event_id: string | null; sort_order: number };
type BirthdayRow = { id: string; name: string; date: string; source: 'manual' | 'member'; member_id: string | null; sort_order: number };
type DiaconalRow = { id: string; date: string; responsible_json: string; sort_order: number };
type ReadingRow = { id: string; day: string; reference_text: string; bible_book: string | null; bible_chapter: number | null; bible_verse_start: number | null; bible_verse_end: number | null; sort_order: number };
type BlockRow = { block_json: string; sort_order: number };

const optional = <T>(value: T | null) => value === null ? undefined : value;
const parseJson = <T>(value: string): T => JSON.parse(value) as T;
const bibleReference = (book: string | null, chapter: number | null, verseStart: number | null, verseEnd: number | null): BibleReference | undefined =>
  book && chapter !== null && verseStart !== null ? { book, chapter, verseStart, verseEnd: optional(verseEnd) } : undefined;

export class D1BulletinRepository implements BulletinRepository {
  private readonly db: D1Database;
  constructor(db: D1Database) { this.db = db; }

  private async hydrate(parent: ParentRow): Promise<Bulletin> {
    const queries = [
      this.db.prepare('SELECT id, title, content_json, image_key, agenda_event_id, sort_order FROM bulletin_announcements WHERE bulletin_id = ? ORDER BY sort_order, id').bind(parent.id).all<AnnouncementRow>(),
      this.db.prepare('SELECT id, text, start_date, end_date, agenda_event_id, sort_order FROM bulletin_activities WHERE bulletin_id = ? ORDER BY sort_order, id').bind(parent.id).all<ActivityRow>(),
      this.db.prepare('SELECT id, name, date, source, member_id, sort_order FROM bulletin_birthdays WHERE bulletin_id = ? ORDER BY sort_order, id').bind(parent.id).all<BirthdayRow>(),
      this.db.prepare('SELECT id, date, responsible_json, sort_order FROM bulletin_diaconal_schedule WHERE bulletin_id = ? ORDER BY sort_order, id').bind(parent.id).all<DiaconalRow>(),
      this.db.prepare('SELECT id, day, reference_text, bible_book, bible_chapter, bible_verse_start, bible_verse_end, sort_order FROM bulletin_weekly_readings WHERE bulletin_id = ? ORDER BY sort_order, id').bind(parent.id).all<ReadingRow>(),
      this.db.prepare('SELECT block_json, sort_order FROM bulletin_blocks WHERE bulletin_id = ? ORDER BY sort_order, id').bind(parent.id).all<BlockRow>(),
    ] as const;
    const [announcements, activities, birthdays, diaconal, readings, blocks] = await Promise.all(queries);
    const input: BulletinInput = {
      id: parent.id, number: parent.number, slug: parent.slug, date: parent.date, templateId: parent.template_id, status: parent.status,
      pastoral: {
        title: parent.pastoral_title,
        body: parseJson<RichTextDocument>(parent.pastoral_body_json),
        bibleReference: bibleReference(parent.bible_book, parent.bible_chapter, parent.bible_verse_start, parent.bible_verse_end),
      },
      announcements: announcements.results.map(row => ({ id: row.id, title: row.title, content: parseJson<RichTextDocument>(row.content_json), image: optional(row.image_key), agendaEventId: optional(row.agenda_event_id), sortOrder: row.sort_order })),
      monthActivities: activities.results.map(row => ({ id: row.id, text: row.text, startDate: optional(row.start_date), endDate: optional(row.end_date), agendaEventId: optional(row.agenda_event_id), sortOrder: row.sort_order })),
      birthdays: birthdays.results.map(row => ({ id: row.id, name: row.name, date: row.date, source: row.source, memberId: optional(row.member_id), sortOrder: row.sort_order })),
      diaconalSchedule: diaconal.results.map(row => ({ id: row.id, date: row.date, responsible: parseJson<string[]>(row.responsible_json), sortOrder: row.sort_order })),
      weeklyReadings: readings.results.map(row => ({ id: row.id, day: row.day, referenceText: row.reference_text, reference: bibleReference(row.bible_book, row.bible_chapter, row.bible_verse_start, row.bible_verse_end), sortOrder: row.sort_order })),
      additionalBlocks: blocks.results.map(row => parseJson<RichTextDocument>(row.block_json)),
      publishedAt: optional(parent.published_at), deletedAt: optional(parent.deleted_at),
      pdf: parent.pdf_storage_key && parent.pdf_generated_at && parent.pdf_page_count === 2 ? { storageKey: parent.pdf_storage_key, generatedAt: parent.pdf_generated_at, pageCount: 2 } : undefined,
    };
    return normalizeBulletin(input);
  }

  private async findParent(where: string, value: string | number) {
    return this.db.prepare(`SELECT * FROM bulletins WHERE status = 'published' AND deleted_at IS NULL AND ${where} = ? LIMIT 1`).bind(value).first<ParentRow>();
  }

  async listPublished() {
    const { results } = await this.db.prepare("SELECT * FROM bulletins WHERE status = 'published' AND deleted_at IS NULL ORDER BY number DESC, date DESC").all<ParentRow>();
    return Promise.all(results.map(row => this.hydrate(row)));
  }
  async findLatestPublished() {
    const parent = await this.db.prepare("SELECT * FROM bulletins WHERE status = 'published' AND deleted_at IS NULL ORDER BY number DESC, date DESC LIMIT 1").first<ParentRow>();
    return parent ? this.hydrate(parent) : null;
  }
  async findPublishedBySlug(slug: string) { const parent = await this.findParent('slug', slug); return parent ? this.hydrate(parent) : null; }
  async findPublishedByNumber(number: number) { const parent = await this.findParent('number', number); return parent ? this.hydrate(parent) : null; }
}
