import { staticBulletins } from '../data/bulletins.ts';
import { assertUniqueBulletinNumbers, normalizeBulletin, type BulletinInput } from '../domain/bulletin.ts';
import type { BulletinRepository } from './BulletinRepository.ts';

export class StaticBulletinRepository implements BulletinRepository {
  private readonly records: BulletinInput[];
  constructor(records: BulletinInput[] = staticBulletins) { this.records = records; }
  private normalized() { assertUniqueBulletinNumbers(this.records); return this.records.map(normalizeBulletin); }
  async listPublished() { return this.normalized().filter(item => item.status === 'published' && !item.deletedAt).map(item => ({ ...item, birthdays: item.birthdays.filter(entry => entry.visibility === 'public') })).sort((a, b) => b.number - a.number || b.date.localeCompare(a.date)); }
  async findLatestPublished() { return (await this.listPublished())[0] || null; }
  async findPublishedBySlug(slug: string) { return (await this.listPublished()).find(item => item.slug === slug) || null; }
  async findPublishedByNumber(number: number) { return (await this.listPublished()).find(item => item.number === number) || null; }
}

export const bulletinRepository: BulletinRepository = new StaticBulletinRepository();
