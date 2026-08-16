import { normalizeBulletin, type Bulletin } from '../domain/bulletin.ts';
import type { BulletinRepository } from './BulletinRepository.ts';

type PublicationRow = { snapshot_json: string };
export const publicBulletinFromSnapshot = (row: PublicationRow): Bulletin => {
  const snapshot = JSON.parse(row.snapshot_json) as Bulletin;
  return normalizeBulletin({ ...snapshot, status: 'published', deletedAt: undefined, birthdays: snapshot.birthdays.filter(item => item.visibility === 'public') });
};

export class D1BulletinRepository implements BulletinRepository {
  private readonly db: D1Database;
  constructor(db: D1Database) { this.db = db; }

  private async findSnapshot(where: 'slug' | 'number', value: string | number) {
    return this.db.prepare(`SELECT p.snapshot_json FROM bulletin_publications p JOIN bulletins b ON b.id=p.bulletin_id WHERE p.withdrawn_at IS NULL AND b.${where}=? LIMIT 1`).bind(value).first<PublicationRow>();
  }

  async listPublished() {
    const { results } = await this.db.prepare('SELECT p.snapshot_json FROM bulletin_publications p JOIN bulletins b ON b.id=p.bulletin_id WHERE p.withdrawn_at IS NULL ORDER BY b.number DESC,b.date DESC').all<PublicationRow>();
    return results.map(publicBulletinFromSnapshot);
  }
  async findLatestPublished() {
    const row = await this.db.prepare('SELECT p.snapshot_json FROM bulletin_publications p JOIN bulletins b ON b.id=p.bulletin_id WHERE p.withdrawn_at IS NULL ORDER BY b.number DESC,b.date DESC LIMIT 1').first<PublicationRow>();
    return row ? publicBulletinFromSnapshot(row) : null;
  }
  async findPublishedBySlug(slug: string) { const row = await this.findSnapshot('slug', slug); return row ? publicBulletinFromSnapshot(row) : null; }
  async findPublishedByNumber(number: number) { const row = await this.findSnapshot('number', number); return row ? publicBulletinFromSnapshot(row) : null; }
}
