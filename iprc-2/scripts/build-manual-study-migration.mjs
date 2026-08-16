import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const transcript=await readFile(resolve(root,'content/studies/a-fe-oportunidades-notaveis.transcript.txt'),'utf8');
const editorial=await readFile(resolve(root,'content/studies/a-fe-oportunidades-notaveis.editorial.md'),'utf8');
const sql=value=>`'${value.trim().replaceAll("'","''")}'`;
const summary='Um estudo sobre fé e dependência de Deus diante da ansiedade, das crises e das circunstâncias difíceis. A exposição mostra como a providência e as provações moldam, purificam e fortalecem a fé cristã.';
const references=[{book:'filipenses',chapter:4,verseStart:6},{book:'mateus',chapter:6,verseStart:25,verseEnd:34},{book:'1-pedro',chapter:1,verseStart:6,verseEnd:7},{book:'tiago',chapter:1,verseStart:2,verseEnd:4},{book:'lucas',chapter:18,verseStart:8}];
const stamp='2026-08-16T15:00:00.000Z#manual-user-provided-b8anLmQG6l0';
const migration=`-- Conteúdo fornecido manualmente pelo usuário para revisão editorial.\n-- Atualiza apenas a entidade administrativa; o snapshot público permanece inalterado até Republicar.\nUPDATE studies SET\n  summary=${sql(summary)},\n  editorial_content=${sql(editorial)},\n  transcript=${sql(transcript)},\n  transcript_source='manual_user_provided',\n  transcript_status='raw',\n  references_json=${sql(JSON.stringify(references))},\n  updated_at=${sql(stamp)}\nWHERE id='study-b8anLmQG6l0';\n\nINSERT INTO admin_audit_log(id,actor,action,entity_type,entity_id,timestamp,metadata_json) VALUES('audit-study-b8anLmQG6l0-manual-source','migration:0009','update','study','study-b8anLmQG6l0','2026-08-16T15:00:00.000Z','{"source":"manual_user_provided","publication":"pending"}');\n`;
await writeFile(resolve(root,'migrations/0009_first_study_manual_content.sql'),migration);
console.log(`Migration gerada: ${transcript.trim().length} caracteres de transcript e ${editorial.trim().length} editoriais.`);
