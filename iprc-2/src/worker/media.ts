import { R2MediaStorage } from '../storage/R2MediaStorage.ts';
import type { Env } from './env.ts';
import { apiError } from './responses.ts';

const publicMediaExists = async (db: D1Database, key: string) => {
  const row = await db.prepare(`
    SELECT 1 AS allowed FROM bulletins WHERE status = 'published' AND deleted_at IS NULL AND pdf_storage_key = ?
    UNION ALL SELECT 1 FROM bulletin_announcements a JOIN bulletins b ON b.id = a.bulletin_id WHERE b.status = 'published' AND b.deleted_at IS NULL AND a.image_key = ?
    UNION ALL SELECT 1 FROM agenda_events WHERE status = 'published' AND image_key = ?
    UNION ALL SELECT 1 FROM bulletin_templates t JOIN bulletins b ON b.template_id = t.id WHERE b.status = 'published' AND b.deleted_at IS NULL AND (t.cover_key = ? OR t.back_cover_key = ?)
    LIMIT 1
  `).bind(key, key, key, key, key).first<{ allowed: number }>();
  return Boolean(row?.allowed);
};

const contentDisposition = (mode: 'view' | 'download', key: string) => {
  const filename = key.split('/').at(-1)?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'arquivo';
  return `${mode === 'download' ? 'attachment' : 'inline'}; filename="${filename}"`;
};

export const serveMedia = async (request: Request, env: Env, mode: 'view' | 'download', encodedKey: string) => {
  let key: string;
  try { key = decodeURIComponent(encodedKey); } catch { return apiError(400, 'INVALID_MEDIA_KEY', 'A chave do arquivo é inválida.'); }
  if (!key || key.startsWith('/') || key.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
    return apiError(400, 'INVALID_MEDIA_KEY', 'A chave do arquivo é inválida.');
  }
  if (!await publicMediaExists(env.DB, key)) return apiError(404, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado.');
  const object = await new R2MediaStorage(env.MEDIA).get(key);
  if (!object) return apiError(404, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado.');
  const headers = new Headers({
    'content-type': object.contentType,
    'content-length': String(object.size),
    'etag': object.etag,
    'content-disposition': contentDisposition(mode, key),
    'cache-control': 'public, max-age=300',
    'x-content-type-options': 'nosniff',
  });
  if (request.method === 'HEAD') return new Response(null, { headers });
  return new Response(object.body, { headers });
};
