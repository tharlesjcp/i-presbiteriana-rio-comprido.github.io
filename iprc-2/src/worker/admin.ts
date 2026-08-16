import { D1AgendaAdminRepository } from '../repositories/D1AgendaAdminRepository.ts';
import { AgendaConflictError, AgendaNotFoundError } from '../repositories/AgendaAdminRepository.ts';
import { D1BulletinAdminRepository } from '../repositories/D1BulletinAdminRepository.ts';
import { BulletinAdminConflictError, BulletinAdminNotFoundError, BulletinNumberConflictError } from '../repositories/BulletinAdminRepository.ts';
import { AgendaValidationError, expectedVersion, normalizeEventInput, normalizeRecurringInput } from '../services/agendaAdminValidation.ts';
import { BulletinAdminValidationError, bulletinExpectedVersion, normalizeBulletinAdminInput } from '../services/bulletinAdminValidation.ts';
import { D1StudyAdminRepository } from '../repositories/D1StudyAdminRepository.ts';
import { StudyAdminConflictError,StudyAdminNotFoundError } from '../repositories/StudyAdminRepository.ts';
import { StudyAdminValidationError,normalizeStudyAdminInput,studyExpectedVersion } from '../services/studyAdminValidation.ts';
import { authenticateAccessRequest, type AccessIdentity } from './access.ts';
import { validateAdminOrigin } from './csrf.ts';
import type { Env } from './env.ts';
import { apiError, apiSuccess } from './responses.ts';

type Authenticator = (request:Request,env:Env)=>Promise<AccessIdentity>;
const readJson = async (request:Request) => { const text=await request.text(); if(text.length>64_000) throw new AgendaValidationError('O conteúdo enviado é muito grande.'); try{return JSON.parse(text);}catch{throw new AgendaValidationError('Não foi possível ler os dados enviados.');} };
const authError = (error:unknown) => error instanceof Error&&error.message==='ACCESS_NOT_CONFIGURED' ? apiError(503,'ACCESS_NOT_CONFIGURED','A proteção administrativa ainda não foi configurada.') : apiError(401,'ACCESS_DENIED','Acesso administrativo não autorizado.');

export const handleAdminApi = async (request:Request,env:Env,authenticate:Authenticator=authenticateAccessRequest):Promise<Response> => {
  let identity:AccessIdentity; try{identity=await authenticate(request,env);}catch(error){return authError(error);}
  if(!validateAdminOrigin(request,env.ADMIN_ORIGIN)) return apiError(403,'ORIGIN_DENIED','Origem da requisição não autorizada.');
  const url=new URL(request.url), repo=new D1AgendaAdminRepository(env.DB),bulletins=new D1BulletinAdminRepository(env.DB),studies=new D1StudyAdminRepository(env.DB);
  try {
    if(request.method==='GET'&&url.pathname==='/api/admin/session') return apiSuccess({email:identity.email});
    if(request.method==='GET'&&url.pathname==='/api/admin/agenda/recurring') return apiSuccess(await repo.listRecurring());
    if(request.method==='POST'&&url.pathname==='/api/admin/agenda/recurring') return apiSuccess(await repo.createRecurring(normalizeRecurringInput(await readJson(request)),identity.email),201);
    const recurring=/^\/api\/admin\/agenda\/recurring\/([^/]+)$/.exec(url.pathname);
    if(recurring&&request.method==='PUT'){const body=await readJson(request);const {value,version}=expectedVersion(body);return apiSuccess(await repo.updateRecurring(decodeURIComponent(recurring[1]),normalizeRecurringInput(value),version,identity.email));}
    if(request.method==='GET'&&url.pathname==='/api/admin/agenda/events') return apiSuccess(await repo.listEvents());
    if(request.method==='POST'&&url.pathname==='/api/admin/agenda/events') return apiSuccess(await repo.createEvent(normalizeEventInput(await readJson(request)),identity.email),201);
    const event=/^\/api\/admin\/agenda\/events\/([^/]+)$/.exec(url.pathname);
    if(event&&request.method==='PUT'){const body=await readJson(request);const {value,version}=expectedVersion(body);return apiSuccess(await repo.updateEvent(decodeURIComponent(event[1]),normalizeEventInput(value),version,identity.email));}
    if(request.method==='GET'&&url.pathname==='/api/admin/bulletins') return apiSuccess(await bulletins.list());
    if(request.method==='GET'&&url.pathname==='/api/admin/bulletins/suggestions') return apiSuccess(await bulletins.suggestions());
    if(request.method==='POST'&&url.pathname==='/api/admin/bulletins') return apiSuccess(await bulletins.create(normalizeBulletinAdminInput(await readJson(request)),identity.email),201);
    const bulletin=/^\/api\/admin\/bulletins\/([^/]+)$/.exec(url.pathname);
    if(bulletin&&request.method==='GET') return apiSuccess(await bulletins.find(decodeURIComponent(bulletin[1])));
    if(bulletin&&request.method==='PUT'){const {value,version}=bulletinExpectedVersion(await readJson(request));return apiSuccess(await bulletins.update(decodeURIComponent(bulletin[1]),value,version,identity.email));}
    const publication=/^\/api\/admin\/bulletins\/([^/]+)\/(publish|unpublish)$/.exec(url.pathname);
    if(publication&&request.method==='POST'){const body=await readJson(request) as {expectedVersion?:unknown};if(typeof body.expectedVersion!=='string'||!body.expectedVersion)throw new BulletinAdminValidationError('A versão atual do boletim é obrigatória.');const id=decodeURIComponent(publication[1]);return apiSuccess(publication[2]==='publish'?await bulletins.publish(id,body.expectedVersion,identity.email):await bulletins.unpublish(id,body.expectedVersion,identity.email));}
    const duplicate=/^\/api\/admin\/bulletins\/([^/]+)\/duplicate$/.exec(url.pathname);
    if(duplicate&&request.method==='POST') return apiSuccess(await bulletins.duplicate(decodeURIComponent(duplicate[1]),identity.email),201);
    if(request.method==='GET'&&url.pathname==='/api/admin/studies')return apiSuccess(await studies.list());
    if(request.method==='POST'&&url.pathname==='/api/admin/studies')return apiSuccess(await studies.create(normalizeStudyAdminInput(await readJson(request)),identity.email),201);
    const study=/^\/api\/admin\/studies\/([^/]+)$/.exec(url.pathname);
    if(study&&request.method==='GET')return apiSuccess(await studies.find(decodeURIComponent(study[1])));
    if(study&&request.method==='PUT'){const {value,version}=studyExpectedVersion(await readJson(request));return apiSuccess(await studies.update(decodeURIComponent(study[1]),value,version,identity.email));}
    const studyStatus=/^\/api\/admin\/studies\/([^/]+)\/(publish|unpublish|archive|restore)$/.exec(url.pathname);
    if(studyStatus&&request.method==='POST'){const body=await readJson(request) as {expectedVersion?:unknown};if(typeof body.expectedVersion!=='string')throw new StudyAdminValidationError('A versão atual do estudo é obrigatória.');const id=decodeURIComponent(studyStatus[1]);if(studyStatus[2]==='publish')return apiSuccess(await studies.publish(id,body.expectedVersion,identity.email));const target=studyStatus[2]==='archive'?'archived':'draft';return apiSuccess(await studies.changeStatus(id,target,body.expectedVersion,identity.email));}
    return apiError(404,'ADMIN_ROUTE_NOT_FOUND','Rota administrativa não encontrada.');
  } catch(error) {
    if(error instanceof AgendaValidationError) return apiError(400,'VALIDATION_ERROR',error.message);
    if(error instanceof AgendaConflictError) return apiError(409,'UPDATE_CONFLICT',error.message);
    if(error instanceof AgendaNotFoundError) return apiError(404,'AGENDA_NOT_FOUND',error.message);
    if(error instanceof BulletinAdminValidationError) return apiError(400,'BULLETIN_VALIDATION_ERROR',error.message);
    if(error instanceof BulletinAdminConflictError) return apiError(409,'UPDATE_CONFLICT',error.message);
    if(error instanceof BulletinNumberConflictError) return apiError(409,'BULLETIN_NUMBER_CONFLICT',error.message);
    if(error instanceof BulletinAdminNotFoundError) return apiError(404,'BULLETIN_NOT_FOUND',error.message);
    if(error instanceof StudyAdminValidationError)return apiError(400,'STUDY_VALIDATION_ERROR',error.message);
    if(error instanceof StudyAdminConflictError)return apiError(409,'UPDATE_CONFLICT',error.message);
    if(error instanceof StudyAdminNotFoundError)return apiError(404,'STUDY_NOT_FOUND',error.message);
    console.error('Admin API error',error instanceof Error?error.message:'unknown'); return apiError(500,'INTERNAL_ERROR','Não foi possível concluir a operação.');
  }
};
