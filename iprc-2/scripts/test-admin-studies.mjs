import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { publicStudyFromSnapshot } from '../src/repositories/D1StudyRepository.ts';

const root=resolve(import.meta.dirname,'..');
const admin=await readFile(resolve(root,'src/scripts/admin-studies.ts'),'utf8');
const page=await readFile(resolve(root,'src/pages/admin/estudos.astro'),'utf8');
const styles=await readFile(resolve(root,'src/styles/admin-studies.css'),'utf8');
const repository=await readFile(resolve(root,'src/repositories/D1StudyAdminRepository.ts'),'utf8');
const publicRepository=await readFile(resolve(root,'src/repositories/D1StudyRepository.ts'),'utf8');
const migration=await readFile(resolve(root,'migrations/0009_first_study_manual_content.sql'),'utf8');

assert.match(page,/<dialog id="study-editor"/,'editor deve abrir em dialog acessível');
for(const section of ['Informações','Apresentação','Texto do estudo','Fonte'])assert(page.includes(section),`drawer deve organizar a seção ${section}`);
assert.match(styles,/width:min\(72vw,68rem\)/,'drawer desktop deve ocupar cerca de 72% da viewport');
assert.match(styles,/@media\(max-width:850px\).*width:100vw/s,'drawer deve ocupar a viewport no mobile');
assert.match(admin,/dialog\.addEventListener\('cancel'/,'Escape deve fechar o drawer');
assert.match(admin,/dialog\.addEventListener\('keydown'.*event\.key==='Escape'/,'Escape deve possuir tratamento explícito além do cancel nativo');
assert.match(admin,/setTimeout\(\(\)=>focusTarget\?\.focus\(\),50\)/,'fechamento deve restaurar o foco depois do ciclo nativo do dialog');
assert.doesNotMatch(admin,/current=null;render\(\);trigger\?\.focus/,'lista não deve invalidar o botão antes de restaurar o foco');
assert.match(admin,/Alterações não publicadas/,'editor deve sinalizar alterações pendentes');
assert.match(admin,/publish\.textContent=current\.hasUnpublishedChanges\?'Republicar'/,'ação explícita deve distinguir Republicar');
assert.match(repository,/INSERT INTO study_publications/,'publicação deve criar snapshot versionado');
assert.match(repository,/source_updated_at!==row\.updated_at/,'estado pendente deve comparar snapshot e entidade administrativa');
assert.match(publicRepository,/FROM study_publications/,'site público deve ler somente snapshots ativos');
assert.match(migration,/manual_user_provided/);assert.match(migration,/transcript_status='raw'/);assert.match(migration,/"book":"lucas","chapter":18,"verseStart":8/);

const oldPublic={id:'study-1',slug:'estudo',title:'Título público',author:'Autor',youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',thumbnail:'https://example.test/x.jpg',editorialContent:'',transcript:'',transcriptStatus:'unavailable',references:[],status:'published'};
const parsed=publicStudyFromSnapshot({snapshot_json:JSON.stringify(oldPublic)});
assert.equal(parsed.transcript,'','alteração administrativa não pode vazar para snapshot anterior');
assert.equal(parsed.title,'Título público');
console.log('Admin Estudos: drawer, foco, snapshots, republicação e conteúdo manual aprovados.');
