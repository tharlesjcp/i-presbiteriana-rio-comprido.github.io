import { normalizeStudy,type StudyInput } from '../domain/study.ts';
export class StudyAdminValidationError extends Error{}
export const normalizeStudyAdminInput=(raw:unknown):StudyInput=>{try{if(!raw||typeof raw!=='object')throw new Error();return normalizeStudy(raw as StudyInput);}catch(error){throw new StudyAdminValidationError(error instanceof Error?error.message:'Dados do estudo inválidos.');}};
export const studyExpectedVersion=(raw:unknown)=>{const body=raw as {value?:unknown;expectedVersion?:unknown};if(!body||typeof body.expectedVersion!=='string'||!body.expectedVersion)throw new StudyAdminValidationError('A versão atual do estudo é obrigatória.');return{value:normalizeStudyAdminInput(body.value),version:body.expectedVersion};};
