import { D1AgendaAdminRepository } from '../repositories/D1AgendaAdminRepository.ts';
import { AgendaConflictError, AgendaNotFoundError } from '../repositories/AgendaAdminRepository.ts';
import { AgendaValidationError, expectedVersion, normalizeEventInput, normalizeRecurringInput } from '../services/agendaAdminValidation.ts';
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
  const url=new URL(request.url), repo=new D1AgendaAdminRepository(env.DB);
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
    return apiError(404,'ADMIN_ROUTE_NOT_FOUND','Rota administrativa não encontrada.');
  } catch(error) {
    if(error instanceof AgendaValidationError) return apiError(400,'VALIDATION_ERROR',error.message);
    if(error instanceof AgendaConflictError) return apiError(409,'UPDATE_CONFLICT',error.message);
    if(error instanceof AgendaNotFoundError) return apiError(404,'AGENDA_NOT_FOUND',error.message);
    console.error('Admin API error',error instanceof Error?error.message:'unknown'); return apiError(500,'INTERNAL_ERROR','Não foi possível concluir a operação.');
  }
};
