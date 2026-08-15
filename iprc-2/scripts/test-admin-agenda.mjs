import assert from 'node:assert/strict';
import { authenticateAccessRequest, clearAccessKeyCacheForTests } from '../src/worker/access.ts';
import { validateAdminOrigin } from '../src/worker/csrf.ts';
import { normalizeEventInput } from '../src/services/agendaAdminValidation.ts';
import { D1AgendaAdminRepository } from '../src/repositories/D1AgendaAdminRepository.ts';
import { AgendaConflictError } from '../src/repositories/AgendaAdminRepository.ts';
import { handleAdminApi } from '../src/worker/admin.ts';

const b64 = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
const pair = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk = await crypto.subtle.exportKey('jwk',pair.publicKey); jwk.kid='test-key';
const jwt = async payload => { const h=b64({alg:'RS256',kid:'test-key'}),p=b64(payload),sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(`${h}.${p}`)); return `${h}.${p}.${Buffer.from(sig).toString('base64url')}`; };
const oldFetch=globalThis.fetch; globalThis.fetch=async()=>new Response(JSON.stringify({keys:[jwk]})); clearAccessKeyCacheForTests();
const accessEnv={CF_ACCESS_TEAM_DOMAIN:'team.example',CF_ACCESS_AUD:'aud-admin'}; const now=Math.floor(Date.now()/1000);
await assert.rejects(()=>authenticateAccessRequest(new Request('https://admin.test'),accessEnv),/MISSING/);
await assert.rejects(()=>authenticateAccessRequest(new Request('https://admin.test',{headers:{'Cf-Access-Jwt-Assertion':'bad'}}),accessEnv),/INVALID/);
const validToken=await jwt({iss:'https://team.example',aud:['aud-admin'],email:'admin@example.com',sub:'actor-1',exp:now+300});
assert.deepEqual(await authenticateAccessRequest(new Request('https://admin.test',{headers:{'Cf-Access-Jwt-Assertion':validToken}}),accessEnv),{email:'admin@example.com',subject:'actor-1'});
globalThis.fetch=oldFetch;
assert.equal(validateAdminOrigin(new Request('https://admin.test/api',{method:'POST',headers:{Origin:'https://admin.test'}}),'https://admin.test'),true);
assert.equal(validateAdminOrigin(new Request('https://admin.test/api',{method:'POST',headers:{Origin:'https://evil.test'}}),'https://admin.test'),false);
assert.throws(()=>normalizeEventInput({title:'Inválido',startDate:'2026-02-29',location:{name:'IPRC'},status:'draft'}),/Revise/);
assert.equal(normalizeEventInput({title:'Bissexto',startDate:'2028-02-29',location:{name:'IPRC'},status:'draft'}).startDate,'2028-02-29');

class Statement { constructor(db,sql){this.db=db;this.sql=sql;this.values=[]} bind(...v){this.values=v;return this} async all(){if(this.sql.includes('recurring_schedules'))return{results:[...this.db.schedules.values()]};if(this.sql.includes('agenda_events'))return{results:[...this.db.events.values()]};return{results:[]}} async first(){const id=this.values[0];if(this.sql.includes('recurring_schedules'))return this.db.schedules.get(id)||null;if(this.sql.includes('agenda_events'))return this.db.events.get(id)||null;return null} async run(){return this.db.execute(this)} }
class FakeD1 { schedules=new Map();events=new Map();audits=[];lastChanges=0;prepare(sql){return new Statement(this,sql)}async batch(statements){const results=[];for(const s of statements)results.push(await this.execute(s));return results}async execute(s){const v=s.values,previous=this.lastChanges;this.lastChanges=0;if(s.sql.startsWith('INSERT INTO recurring_schedules')){this.schedules.set(v[0],{id:v[0],title:v[1],weekday:v[2],start_time:v[3],end_time:v[4],location_name:v[5],location_address:v[6],description:v[7],active:v[8],sort_order:v[9],created_at:v[10],updated_at:v[11]});this.lastChanges=1}else if(s.sql.startsWith('UPDATE recurring_schedules')){const row=this.schedules.get(v[10]);if(row&&row.updated_at===v[11]){Object.assign(row,{title:v[0],weekday:v[1],start_time:v[2],end_time:v[3],location_name:v[4],location_address:v[5],description:v[6],active:v[7],sort_order:v[8],updated_at:v[9]});this.lastChanges=1}}else if(s.sql.startsWith('INSERT INTO agenda_events')){this.events.set(v[0],{id:v[0],title:v[1],start_date:v[2],end_date:v[3],start_time:v[4],end_time:v[5],location_name:v[6],location_address:v[7],summary:v[8],description:v[9],image_key:v[10],status:v[11],source_kind:'manual',bulletin_id:null,bulletin_item_id:null,created_at:v[12],updated_at:v[13]});this.lastChanges=1}else if(s.sql.startsWith('UPDATE agenda_events')){const row=this.events.get(v[12]);if(row&&row.updated_at===v[13]){Object.assign(row,{title:v[0],start_date:v[1],end_date:v[2],start_time:v[3],end_time:v[4],location_name:v[5],location_address:v[6],summary:v[7],description:v[8],image_key:v[9],status:v[10],updated_at:v[11]});this.lastChanges=1}}else if(s.sql.startsWith('INSERT INTO admin_audit_log')&&previous===1){this.audits.push({id:v[0],actor:v[1],action:v[2],entity_type:v[3],entity_id:v[4],timestamp:v[5],metadata_json:'{}'});this.lastChanges=1}return{success:true,meta:{changes:this.lastChanges},results:[],duration:0,lastRowId:null,changes:this.lastChanges};}}
const db=new FakeD1(),repo=new D1AgendaAdminRepository(db); const location={name:'IPRC'};
let schedule=await repo.createRecurring({title:'Teste',weekday:1,startTime:'19:00',location,active:true,sortOrder:5},'admin@example.com');
schedule=await repo.updateRecurring(schedule.id,{title:'Teste editado',weekday:1,startTime:'19:30',location,active:false,sortOrder:5},schedule.updatedAt,'admin@example.com');assert.equal(schedule.active,false);
await assert.rejects(()=>repo.updateRecurring(schedule.id,{...schedule,title:'Conflito'},'versao-antiga','admin@example.com'),AgendaConflictError);
let event=await repo.createEvent({title:'Fixture',startDate:'2028-02-29',location,status:'draft'},'admin@example.com');event=await repo.updateEvent(event.id,{title:'Fixture',startDate:'2028-02-29',location,status:'published'},event.updatedAt,'admin@example.com');event=await repo.updateEvent(event.id,{title:'Fixture',startDate:'2028-02-29',location,status:'cancelled'},event.updatedAt,'admin@example.com');
assert.deepEqual(db.audits.map(x=>x.action),['create','deactivate','create','publish','cancel']);assert(db.audits.every(x=>!JSON.stringify(x).includes(validToken)));
const env={DB:db,MEDIA:{},ASSETS:{},ADMIN_ORIGIN:'https://admin.test'};const auth=async()=>({email:'admin@example.com',subject:'actor-1'});
assert.equal((await handleAdminApi(new Request('https://admin.test/api/admin/agenda/recurring'),env,async()=>{throw new Error('ACCESS_TOKEN_MISSING')})).status,401);
assert.equal((await handleAdminApi(new Request('https://admin.test/api/admin/agenda/events',{method:'POST',headers:{Origin:'https://evil.test'},body:'{}'}),env,auth)).status,403);
assert.equal((await handleAdminApi(new Request('https://admin.test/api/admin/agenda/recurring'),env,auth)).status,200);
console.log('Admin Agenda: Access JWT, CSRF, validação, CRUD, concorrência e auditoria aprovados.');
