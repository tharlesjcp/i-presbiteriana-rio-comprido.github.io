import { normalizeStudy,type BibleReference,type Study } from '../domain/study.ts';
import type { StudyRepository } from './StudyRepository.ts';

export type StudyRow={id:string;slug:string;title:string;summary:string|null;author:string;study_date:string|null;published_at:string|null;youtube_video_id:string;thumbnail:string;duration_seconds:number|null;editorial_content:string;transcript:string;transcript_source:string|null;transcript_status:'unavailable'|'raw'|'reviewed';references_json:string;status:'draft'|'published'|'archived';created_at:string;updated_at:string};
type PublicationSnapshotRow={snapshot_json:string};

export const studyFromRow=(r:StudyRow):Study=>({...normalizeStudy({id:r.id,slug:r.slug,title:r.title,summary:r.summary||undefined,author:r.author,studyDate:r.study_date||undefined,publishedAt:r.published_at||undefined,youtubeUrl:`https://www.youtube.com/watch?v=${r.youtube_video_id}`,thumbnail:r.thumbnail,durationSeconds:r.duration_seconds||undefined,editorialContent:r.editorial_content,transcript:r.transcript,transcriptSource:r.transcript_source||undefined,transcriptStatus:r.transcript_status,references:JSON.parse(r.references_json) as BibleReference[],status:r.status}),createdAt:r.created_at,updatedAt:r.updated_at});
export const publicStudyFromSnapshot=(row:PublicationSnapshotRow):Study=>normalizeStudy({...JSON.parse(row.snapshot_json),status:'published'} as Parameters<typeof normalizeStudy>[0]);

export class D1StudyRepository implements StudyRepository{
  private readonly db:D1Database;
  constructor(db:D1Database){this.db=db;}
  async listPublished(){const {results}=await this.db.prepare("SELECT p.snapshot_json FROM study_publications p JOIN studies s ON s.id=p.study_id WHERE p.withdrawn_at IS NULL AND s.status='published' ORDER BY COALESCE(s.study_date,s.published_at) DESC").all<PublicationSnapshotRow>();return results.map(publicStudyFromSnapshot);}
  async findPublishedBySlug(slug:string){const row=await this.db.prepare("SELECT p.snapshot_json FROM study_publications p JOIN studies s ON s.id=p.study_id WHERE s.slug=? AND s.status='published' AND p.withdrawn_at IS NULL LIMIT 1").bind(slug).first<PublicationSnapshotRow>();return row?publicStudyFromSnapshot(row):null;}
  async findLatestPublished(){return (await this.listPublished())[0]||null;}
}
