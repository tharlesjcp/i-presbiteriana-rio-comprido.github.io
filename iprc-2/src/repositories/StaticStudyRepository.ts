import { staticStudies } from '../data/studies.ts';
import { normalizeStudy, type StudyInput } from '../domain/study.ts';
import type { StudyRepository } from './StudyRepository.ts';

export class StaticStudyRepository implements StudyRepository {
  private readonly records: StudyInput[];
  constructor(records: StudyInput[] = staticStudies) { this.records = records; }
  async listPublished() { return this.records.map(normalizeStudy).filter(study => study.status === 'published').sort((a,b) => Date.parse(b.publishedAt)-Date.parse(a.publishedAt)); }
  async findPublishedBySlug(slug: string) { return (await this.listPublished()).find(study => study.slug === slug) || null; }
  async findLatestPublished() { return (await this.listPublished())[0] || null; }
}
export const studyRepository: StudyRepository = new StaticStudyRepository();
