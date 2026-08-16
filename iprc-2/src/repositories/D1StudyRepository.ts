import { normalizeStudy,type BibleReference,type Study } from '../domain/study.ts';
import type { StudyRepository } from './StudyRepository.ts';
export type StudyRow={id:string;slug:string;title:string;summary:string|null;author:string;study_date:string|null;published_at:string|null;youtube_video_id:string;thumbnail:string;duration_seconds:number|null;editorial_content:string;transcript:string;transcript_source:string|null;transcript_status:'unavailable'|'raw'|'reviewed';references_json:string;status:'draft'|'published'|'archived';created_at:string;updated_at:string};
export const studyFromRow=(r:StudyRow):Study=>({...normalizeStudy({id:r.id,slug:r.slug,title:r.title,summary:r.summary||undefined,author:r.author,studyDate:r.study_date||undefined,publishedAt:r.published_at||undefined,youtubeUrl:`https://www.youtube.com/watch?v=${r.youtube_video_id}`,thumbnail:r.thumbnail,durationSeconds:r.duration_seconds||undefined,editorialContent:r.editorial_content,transcript:r.transcript,transcriptSource:r.transcript_source||undefined,transcriptStatus:r.transcript_status,references:JSON.parse(r.references_json) as BibleReference[],status:r.status}),createdAt:r.created_at,updatedAt:r.updated_at});
export class D1StudyRepository implements StudyRepository{
 private readonly db:D1Database;
 constructor(db:D1Database){this.db=db;}
 async listPublished(){const {results}=await this.db.prepare("SELECT * FROM studies WHERE status='published' ORDER BY COALESCE(study_date,published_at) DESC").all<StudyRow>();return results.map(studyFromRow);}
 async findPublishedBySlug(slug:string){const row=await this.db.prepare("SELECT * FROM studies WHERE slug=? AND status='published'").bind(slug).first<StudyRow>();return row?studyFromRow(row):null;}
 async findLatestPublished(){return (await this.listPublished())[0]||null;}
}
