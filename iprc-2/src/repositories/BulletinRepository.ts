import type { Bulletin } from '../domain/bulletin.ts';

export interface BulletinRepository {
  listPublished(): Promise<Bulletin[]>;
  findLatestPublished(): Promise<Bulletin | null>;
  findPublishedBySlug(slug: string): Promise<Bulletin | null>;
  findPublishedByNumber(number: number): Promise<Bulletin | null>;
}
