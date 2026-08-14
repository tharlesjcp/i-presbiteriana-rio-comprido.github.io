import type { Study } from '../domain/study.ts';
export interface StudyRepository {
  listPublished(): Promise<Study[]>;
  findPublishedBySlug(slug: string): Promise<Study | null>;
  findLatestPublished(): Promise<Study | null>;
}
