import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const attachmentRoot = resolve('C:/Users/tharl/.codex/attachments');

const studies = [
  { slug:'o-ser-de-deus-a-soberania-de-deus', id:'study-dr-d1Ou7oXk', attachmentId:'9e4dba55-05a1-471c-9e4b-92c7413e458c', timedMarker:/2\. Transcrição Completa com Minutagem \(Timestamps\)/i, continuousMarker:/1\. Texto Contínuo do Vídeo/i, summary:'A soberania de Deus abrange toda a criação e confirma que nada escapa ao seu governo. O estudo mostra como essa verdade conduz a igreja à adoração, à confiança e ao testemunho fiel.', references:[['atos',11,17,26],['jeremias',10,3],['josue',3,11,13],['salmos',24,1],['salmos',83,18],['zacarias',6,5]], headings:['Leitura e introdução','O Deus soberano','O Senhor de toda a terra','Soberania, justiça e misericórdia','Adoração e testemunho','Oração'] },
  { slug:'retidao-e-justica', id:'study-HXvHXFRYRAw', attachmentId:'d5a91f65-6b68-48ef-a27f-b873f5b61903', timedMarker:/Transcrição por Minutagem \[HH:MM:SS\]/i, continuousMarker:/Texto Completo \(Corrido\)/i, summary:'Uma exposição sobre a retidão e a justiça como atributos inseparáveis do caráter de Deus. Em Cristo, a justiça divina se torna fundamento da esperança e chama o povo de Deus a uma vida reta.', references:[['deuteronomio',32,4],['salmos',11,7]], headings:['Oração e leitura','O Deus reto e justo','A bondade e a justiça de Deus','A justiça revelada nas Escrituras','A esperança cristã em Cristo','Oração'] },
  { slug:'a-graca-de-deus', id:'study-5NqLcRsfTFM', attachmentId:'73e09bb3-4f08-49f2-ae51-b3e1c3661736', timedMarker:/Transcrição com Minutagem/i, continuousMarker:/Texto Completo \(Sem Minutagem\)/i, summary:'O estudo apresenta a graça como favor livre e imerecido de Deus, revelado plenamente em Cristo. A exposição relaciona graça, misericórdia e salvação, conduzindo à gratidão e à dependência do Senhor.', references:[['1-pedro',5,10],['salmos',15,1,5],['lamentacoes',3,22,23],['efesios',2,8,9]], headings:['Louvor, oração e leitura','O Deus de toda a graça','Graça e misericórdia','O favor que não merecemos','Salvação pela graça','Oração'] },
  { slug:'deus-e-paciente', id:'study-PCmLMkMWhcE', attachmentId:'a843e926-ade2-45c4-879c-e8614bc4f682', timedMarker:/Transcrição Completa com Minutagem/i, continuousMarker:/Texto Completo \(Sem Minutagem\)/i, summary:'A paciência e a longanimidade de Deus aparecem em seu trato misericordioso com pecadores e em seu chamado ao arrependimento. O estudo também aplica esse atributo à maneira como os cristãos tratam uns aos outros.', references:[['salmos',103,1,22],['1-timoteo',1,12,16],['romanos',15,5],['lamentacoes',3,32,33],['2-pedro',3,9]], headings:['Leitura e oração','Deus é paciente','A longanimidade revelada','Paciência e arrependimento','O chamado para sermos pacientes','Oração'] },
  { slug:'deus-e-amor', id:'study-UrgARjALi-4', attachmentId:'6b736aff-753d-443a-bfe9-592bf6f07f51', timedMarker:/Transcrição Completa com Minutagem Exata/i, continuousMarker:/Texto Completo da Mensagem/i, summary:'Deus é amor em plenitude, sem deixar de ser santo e justo. A exposição distingue as manifestações do amor divino e mostra em Cristo o amor pessoal, soberano e sacrificial dedicado ao seu povo.', references:[['joao',14,1,15],['1-joao',4,8],['salmos',145,8,9],['salmos',119,64],['romanos',1,7],['efesios',5,25]], headings:['Leitura e consolação em Cristo','Deus é amor','O amor e os demais atributos de Deus','O amor livre e soberano','O amor de Cristo por sua igreja','Oração'] },
  { slug:'a-verdade-de-deus', id:'study-9_PsQUdO7Uc', attachmentId:'66ca6322-fcc8-4611-a460-dfa24944f3d0', timedMarker:/Transcrição Completa com Minutagem Exata/i, continuousMarker:/Texto Completo \(Fala Contínua\)/i, summary:'A verdade de Deus é absoluta, firme e inseparável de sua fidelidade, de seu amor e de sua retidão. Por ser fiel à aliança e à sua própria natureza, Deus sustenta a fé e a esperança do seu povo.', references:[['deuteronomio',7,9],['salmos',31,5],['romanos',3,3],['2-timoteo',2,13],['lamentacoes',3,22,23]], headings:['A verdade em uma era de relativismo','Verdade, amor e retidão','A fidelidade de Deus','Deus não pode negar a si mesmo','A rocha firme da nossa esperança','Conclusão'] },
  { slug:'o-ser-de-deus', id:'study-tUglVULg8Vs', attachmentId:'e5a7b72c-3132-4ddb-8a5f-cac310ec051a', timedMarker:/Transcrição Completa com Minutagem/i, continuousMarker:/Texto Completo \(Fluxo Contínuo\)/i, summary:'Uma introdução ao estudo do ser, dos decretos e da aliança de Deus. A mensagem destaca que Deus se revela para ser conhecido e apresenta seu conhecimento perfeito, infinito e inseparável de sua sabedoria.', references:[['joao',17,3],['salmos',77,9],['romanos',11,34],['1-corintios',8,3],['galatas',4,9]], headings:['Oração e proposta do estudo','Conhecer o ser de Deus','Deus se revela a suas criaturas','O conhecimento perfeito de Deus','Conhecimento e sabedoria','Conclusão e oração'] },
];

const paragraphize = (value, headings) => {
  const sentences = value.replace(/\s+/g, ' ').trim().match(/.*?(?:[.!?](?=\s|$)|$)/g)?.map((item) => item.trim()).filter(Boolean) ?? [];
  const paragraphs = [];
  for (let index = 0; index < sentences.length; index += 5) paragraphs.push(sentences.slice(index, index + 5).join(' '));
  const slots = new Map(headings.map((heading,index)=>[Math.min(paragraphs.length-1,Math.round(index*(paragraphs.length-1)/(headings.length-1))),heading]));
  return paragraphs.map((paragraph,index)=>`${slots.has(index)?`## ${slots.get(index)}\n\n`:''}${paragraph}`).join('\n\n');
};

const report = [];
await mkdir(resolve(root, 'content/studies'), { recursive: true });

for (const study of studies) {
  const { slug, attachmentId, timedMarker, continuousMarker, headings } = study;
  const sourcePath = resolve(attachmentRoot, attachmentId, 'pasted-text.txt');
  const source = await readFile(sourcePath, 'utf8');
  const timedMatch = timedMarker.exec(source);
  if (!timedMatch) throw new Error(`Marcador minutado ausente em ${slug}.`);
  const timestampMatch = /\[\d{2}:\d{2}(?::\d{2})?[^\]]*\]/.exec(source.slice(timedMatch.index + timedMatch[0].length));
  if (!timestampMatch) throw new Error(`Primeira minutagem ausente em ${slug}.`);
  const transcriptStart = timedMatch.index + timedMatch[0].length + timestampMatch.index;
  const transcript = source.slice(transcriptStart).trim();

  const continuousMatch = continuousMarker.exec(source.slice(0, timedMatch.index));
  if (!continuousMatch) throw new Error(`Marcador contínuo ausente em ${slug}.`);
  const continuousStart = continuousMatch.index + continuousMatch[0].length;
  const continuous = source.slice(continuousStart, timedMatch.index).trim();
  if (continuous.length < 4_000 || transcript.length < 4_000) throw new Error(`Conteúdo inesperadamente curto em ${slug}.`);

  await writeFile(resolve(root, `content/studies/${slug}.transcript.txt`), transcript, 'utf8');
  const editorial = paragraphize(continuous, headings);
  await writeFile(resolve(root, `content/studies/${slug}.editorial.md`), editorial, 'utf8');
  report.push({ slug, attachmentId, sourceCharacters: source.length, transcriptCharacters: transcript.length, continuousCharacters: continuous.length, timestamps: (transcript.match(/\[\d{2}:\d{2}(?::\d{2})?[^\]]*\]/g) ?? []).length });
}

await writeFile(resolve(root, 'content/studies/remaining-study-source-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
const sql = (value) => `'${value.replaceAll("'", "''")}'`;
const referenceJson = (references) => references.map(([book,chapter,verseStart,verseEnd])=>({book,chapter,verseStart,...(verseEnd?{verseEnd}:{})}));
const statements = ['-- Fontes manuais fornecidas pelo usuário em 2026-08-16.','-- Atualiza somente entidades privadas; snapshots públicos permanecem intactos até Republicar.'];
for (const [index, study] of studies.entries()) {
  const transcript = await readFile(resolve(root, `content/studies/${study.slug}.transcript.txt`), 'utf8');
  const editorial = await readFile(resolve(root, `content/studies/${study.slug}.editorial.md`), 'utf8');
  const timestamp = `2026-08-16T${String(16+Math.floor(index/2)).padStart(2,'0')}:${index%2?'30':'00'}:00.000Z`;
  const version = `${timestamp}#manual-user-provided-${study.id.slice(6)}`;
  statements.push(`\nUPDATE studies SET summary=${sql(study.summary)}, editorial_content=${sql(editorial)}, transcript=${sql(transcript)}, transcript_source='manual_user_provided', transcript_status='raw', references_json=${sql(JSON.stringify(referenceJson(study.references)))}, updated_at=${sql(version)} WHERE id=${sql(study.id)};`);
  statements.push(`INSERT INTO admin_audit_log(id,actor,action,entity_type,entity_id,timestamp,metadata_json) VALUES(${sql(`audit-${study.id}-manual-final-source`)},'migration:0010','update','study',${sql(study.id)},${sql(timestamp)},${sql(JSON.stringify({source:'manual_user_provided',attachmentId:study.attachmentId,transcriptCharacters:transcript.length,publication:'pending'}))});`);
}
await writeFile(resolve(root, 'migrations/0010_remaining_study_manual_content.sql'), `${statements.join('\n')}\n`, 'utf8');
console.table(report);
