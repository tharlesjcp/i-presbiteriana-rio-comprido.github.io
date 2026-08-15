import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { D1AgendaRepository } from '../src/repositories/D1AgendaRepository.ts';
import { D1BulletinRepository } from '../src/repositories/D1BulletinRepository.ts';
import { createAgendaRepository, createBulletinRepository } from '../src/repositories/repositoryFactory.ts';
import { StaticAgendaRepository } from '../src/repositories/StaticAgendaRepository.ts';
import { StaticBulletinRepository } from '../src/repositories/StaticBulletinRepository.ts';
import { R2MediaStorage } from '../src/storage/R2MediaStorage.ts';
import { mediaKeys } from '../src/storage/mediaKeys.ts';
import { handleRequest } from '../src/worker/index.ts';

const projectRoot = resolve(import.meta.dirname, '..');
const persistTo = mkdtempSync(join(tmpdir(), 'iprc-d1-test-'));
const runWrangler = (args, success = true) => {
  const result = spawnSync(process.execPath, [resolve(projectRoot, 'node_modules/wrangler/bin/wrangler.js'), ...args, '--persist-to', persistTo], { cwd: projectRoot, encoding: 'utf8', env: { ...process.env, CI: 'true' } });
  if (success && result.status !== 0) throw new Error(`${result.error?.message || ''}\n${result.stdout || ''}\n${result.stderr || ''}`);
  if (!success) assert.notEqual(result.status, 0, 'comando deveria falhar');
  return `${result.stdout}\n${result.stderr}`;
};
const queryJson = command => {
  const output = runWrangler(['d1', 'execute', 'DB', '--local', '--command', command]);
  const match = output.match(/(\[\s*\{[\s\S]*\}\s*\])\s*$/);
  assert(match, `resposta JSON do Wrangler não encontrada:\n${output}`);
  return JSON.parse(match[1])[0].results;
};

runWrangler(['d1', 'migrations', 'apply', 'DB', '--local']);
const expectedTables = ['recurring_schedules', 'agenda_events', 'bulletin_templates', 'bulletins', 'bulletin_announcements', 'bulletin_activities', 'bulletin_birthdays', 'bulletin_diaconal_schedule', 'bulletin_weekly_readings', 'bulletin_blocks', 'admin_audit_log'];
const tables = queryJson("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;").map(row => row.name);
for (const table of expectedTables) assert(tables.includes(table), `migration deve criar ${table}`);
assert.equal(queryJson('SELECT COUNT(*) AS total FROM recurring_schedules;')[0].total, 4);
runWrangler(['d1', 'execute', 'DB', '--local', '--file', resolve(projectRoot, 'migrations/0002_seed_recurring_schedules.sql')]);
assert.equal(queryJson('SELECT COUNT(*) AS total FROM recurring_schedules;')[0].total, 4, 'seed repetido não duplica horários');
const duplicate = runWrangler(['d1', 'execute', 'DB', '--local', '--command', `INSERT INTO bulletins (id, number, slug, date, template_id, status, pastoral_title, pastoral_body_json) VALUES ('unique-a', 90, 'unique-a', '2028-02-29', 'standard', 'draft', 'A', '{"version":1,"blocks":[]}'); INSERT INTO bulletins (id, number, slug, date, template_id, status, pastoral_title, pastoral_body_json, deleted_at) VALUES ('unique-b', 90, 'unique-b', '2028-03-01', 'standard', 'trashed', 'B', '{"version":1,"blocks":[]}', '2028-03-02T00:00:00Z');`], false);
assert.match(duplicate, /UNIQUE constraint failed: bulletins\.number/i, 'D1 protege o número inclusive para lixeira');

const richText = JSON.stringify({ version: 1, blocks: [{ type: 'paragraph', content: [{ text: 'Conteúdo autorizado.' }] }] });
const schedules = [
  { id: 's1', title: 'Domingo', weekday: 0, start_time: '09:00', end_time: null, location_name: 'IPRC', location_address: null, description: null, active: 1, sort_order: 1 },
];
const events = [
  { id: 'event-published', title: 'Publicado', start_date: '2028-03-05', end_date: null, start_time: '10:00', end_time: null, location_name: 'IPRC', location_address: null, summary: null, description: null, image_key: null, status: 'published', source_kind: 'bulletin', bulletin_id: 'bulletin-published', bulletin_item_id: 'activity-1' },
  { id: 'event-draft', title: 'Rascunho', start_date: '2028-03-06', end_date: null, start_time: null, end_time: null, location_name: 'IPRC', location_address: null, summary: null, description: null, image_key: null, status: 'draft', source_kind: 'manual', bulletin_id: null, bulletin_item_id: null },
  { id: 'event-cancelled', title: 'Cancelado', start_date: '2028-03-07', end_date: null, start_time: null, end_time: null, location_name: 'IPRC', location_address: null, summary: null, description: null, image_key: null, status: 'cancelled', source_kind: 'manual', bulletin_id: null, bulletin_item_id: null },
];
const bulletinParents = [
  { id: 'bulletin-published', number: 8, slug: 'boletim-8-2028-03-05', date: '2028-03-05', template_id: 'standard', status: 'published', pastoral_title: 'Publicado', pastoral_body_json: richText, bible_book: null, bible_chapter: null, bible_verse_start: null, bible_verse_end: null, published_at: '2028-03-01T12:00:00Z', deleted_at: null, pdf_storage_key: null, pdf_generated_at: null, pdf_page_count: null },
  { id: 'bulletin-draft', number: 9, slug: 'boletim-9-2028-03-12', date: '2028-03-12', template_id: 'standard', status: 'draft', pastoral_title: 'Rascunho', pastoral_body_json: richText, bible_book: null, bible_chapter: null, bible_verse_start: null, bible_verse_end: null, published_at: null, deleted_at: null, pdf_storage_key: null, pdf_generated_at: null, pdf_page_count: null },
  { id: 'bulletin-trashed', number: 10, slug: 'boletim-10-2028-03-19', date: '2028-03-19', template_id: 'standard', status: 'trashed', pastoral_title: 'Lixeira', pastoral_body_json: richText, bible_book: null, bible_chapter: null, bible_verse_start: null, bible_verse_end: null, published_at: null, deleted_at: '2028-03-20T12:00:00Z', pdf_storage_key: null, pdf_generated_at: null, pdf_page_count: null },
];

class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async all() {
    if (this.sql.includes('recurring_schedules')) return { results: schedules.filter(row => row.active) };
    if (this.sql.includes('agenda_events')) return { results: events.filter(row => row.status === 'published') };
    if (this.sql.includes('FROM bulletins')) return { results: bulletinParents.filter(row => row.status === 'published' && row.deleted_at === null).sort((a, b) => b.number - a.number) };
    return { results: [] };
  }
  async first() {
    if (this.sql.includes('SELECT 1 AS healthy')) return { healthy: 1 };
    if (this.sql.includes('allowed FROM bulletins')) return { allowed: 1 };
    if (this.sql.includes('FROM bulletins')) {
      const publicRows = bulletinParents.filter(row => row.status === 'published' && row.deleted_at === null);
      if (this.sql.includes('slug = ?')) return publicRows.find(row => row.slug === this.values[0]) || null;
      if (this.sql.includes('number = ?')) return publicRows.find(row => row.number === this.values[0]) || null;
      return publicRows.sort((a, b) => b.number - a.number)[0] || null;
    }
    return null;
  }
}
class FakeD1 { prepare(sql) { return new FakeStatement(this, sql); } }
const fakeDb = new FakeD1();
const agendaRepository = new D1AgendaRepository(fakeDb);
assert.deepEqual((await agendaRepository.listPublishedEvents()).map(item => item.id), ['event-published']);
assert.deepEqual((await agendaRepository.listPublishedEvents())[0].source, { kind: 'bulletin', bulletinId: 'bulletin-published', bulletinItemId: 'activity-1' });
assert.equal((await agendaRepository.listActiveRecurring()).length, 1);
const bulletinRepository = new D1BulletinRepository(fakeDb);
assert.deepEqual((await bulletinRepository.listPublished()).map(item => item.number), [8], 'draft e trashed não são públicos');
assert.equal((await bulletinRepository.findLatestPublished())?.id, 'bulletin-published');
assert.equal(await bulletinRepository.findPublishedByNumber(9), null);
assert(createAgendaRepository({ kind: 'static' }) instanceof StaticAgendaRepository);
assert(createAgendaRepository({ kind: 'd1', db: fakeDb }) instanceof D1AgendaRepository);
assert(createBulletinRepository({ kind: 'static' }) instanceof StaticBulletinRepository);
assert(createBulletinRepository({ kind: 'd1', db: fakeDb }) instanceof D1BulletinRepository);

class FakeR2 {
  objects = new Map();
  async put(key, value, options) { const text = String(value); const object = { key, size: new TextEncoder().encode(text).length, etag: `etag-${key}`, uploaded: new Date('2028-01-01T00:00:00Z'), httpMetadata: options.httpMetadata, body: new Blob([text]).stream() }; this.objects.set(key, object); return object; }
  async get(key) { return this.objects.get(key) || null; }
  async head(key) { const value = this.objects.get(key); return value ? { ...value, body: undefined } : null; }
  async delete(key) { this.objects.delete(key); }
}
const fakeR2 = new FakeR2();
const storage = new R2MediaStorage(fakeR2);
const pdfKey = mediaKeys.bulletinPdf('bulletin-uuid', 42);
assert.equal(pdfKey, 'bulletins/bulletin-uuid/pdf/boletim-42.pdf');
await storage.put(pdfKey, 'pdf-bytes', { contentType: 'application/pdf' });
assert.equal((await storage.head(pdfKey))?.contentType, 'application/pdf');
assert.equal(await new Response((await storage.get(pdfKey)).body).text(), 'pdf-bytes');
await storage.delete(pdfKey);
assert.equal(await storage.get(pdfKey), null);
assert.throws(() => mediaKeys.agendaImage('../private', 'image.jpg'), /inválido/);

await storage.put(pdfKey, 'pdf-bytes', { contentType: 'application/pdf' });
const workerEnv = { DB: fakeDb, MEDIA: fakeR2, ASSETS: { fetch: async () => new Response('static-asset') } };
const healthResponse = await handleRequest(new Request('https://example.test/api/health'), workerEnv);
assert.equal(healthResponse.status, 200);
assert.deepEqual((await healthResponse.json()).data, { worker: true, d1: true, r2: true });
const agendaResponse = await handleRequest(new Request('https://example.test/api/public/agenda?limit=2'), workerEnv);
assert.equal(agendaResponse.status, 200);
assert.equal((await agendaResponse.json()).ok, true);
const bulletinsResponse = await handleRequest(new Request('https://example.test/api/public/bulletins'), workerEnv);
assert.deepEqual((await bulletinsResponse.json()).data.map(item => item.number), [8]);
const adminResponse = await handleRequest(new Request('https://example.test/api/admin/agenda'), workerEnv);
assert.equal(adminResponse.status, 501, 'admin permanece desabilitado sem Access e CRUD real');
const viewResponse = await handleRequest(new Request(`https://example.test/media/view/${encodeURIComponent(pdfKey)}`), workerEnv);
assert.match(viewResponse.headers.get('content-disposition'), /^inline/);
const downloadResponse = await handleRequest(new Request(`https://example.test/media/download/${encodeURIComponent(pdfKey)}`), workerEnv);
assert.match(downloadResponse.headers.get('content-disposition'), /^attachment/);
const staticResponse = await handleRequest(new Request('https://example.test/'), workerEnv);
assert.equal(await staticResponse.text(), 'static-asset');

console.log('Cloudflare: migrations, D1 repositories, seleção de backend, R2 e API aprovados.');
