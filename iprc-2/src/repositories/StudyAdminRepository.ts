import type { Study,StudyInput } from '../domain/study.ts';
export class StudyAdminNotFoundError extends Error{} export class StudyAdminConflictError extends Error{}
export interface StudyAdminRepository{list():Promise<Study[]>;find(id:string):Promise<Study>;create(value:StudyInput,actor:string):Promise<Study>;update(id:string,value:StudyInput,expected:string,actor:string):Promise<Study>;changeStatus(id:string,status:'published'|'draft'|'archived',expected:string,actor:string):Promise<Study>}
