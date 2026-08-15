import { D1AgendaRepository } from '../repositories/D1AgendaRepository.ts';
import { D1BulletinRepository } from '../repositories/D1BulletinRepository.ts';
import type { Env } from './env.ts';
import { serveMedia } from './media.ts';
import { apiError, apiSuccess } from './responses.ts';

const boundedLimit = (value: string | null, fallback = 8) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 50) : fallback;
};

const health = async (env: Env) => {
  const checks = { worker: true, d1: false, r2: false };
  try { checks.d1 = (await env.DB.prepare('SELECT 1 AS healthy').first<{ healthy: number }>())?.healthy === 1; } catch { checks.d1 = false; }
  try { await env.MEDIA.head('__iprc_healthcheck__'); checks.r2 = true; } catch { checks.r2 = false; }
  return checks.d1 && checks.r2 ? apiSuccess(checks) : apiError(503, 'DEPENDENCY_UNAVAILABLE', 'Uma dependência do serviço não está disponível.');
};

const publicApi = async (url: URL, env: Env) => {
  if (url.pathname === '/api/public/agenda') {
    const limit = boundedLimit(url.searchParams.get('limit'));
    const items = await new D1AgendaRepository(env.DB).listCombinedUpcoming(new Date(), limit);
    return apiSuccess(items.map(item => ({ ...item, startsAt: item.startsAt.toISOString() })), 200, 'public, max-age=60');
  }
  if (url.pathname === '/api/public/bulletins') {
    const bulletins = await new D1BulletinRepository(env.DB).listPublished();
    return apiSuccess(bulletins, 200, 'public, max-age=60');
  }
  const bulletinMatch = /^\/api\/public\/bulletins\/([a-z0-9-]+)$/.exec(url.pathname);
  if (bulletinMatch) {
    const bulletin = await new D1BulletinRepository(env.DB).findPublishedBySlug(bulletinMatch[1]);
    return bulletin ? apiSuccess(bulletin, 200, 'public, max-age=60') : apiError(404, 'BULLETIN_NOT_FOUND', 'Boletim não encontrado.');
  }
  return apiError(404, 'API_ROUTE_NOT_FOUND', 'Rota de API não encontrada.');
};

export const handleRequest = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD') return apiError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido.');
  try {
    if (url.pathname === '/api/health') return health(env);
    if (url.pathname.startsWith('/api/public/')) return publicApi(url, env);
    if (url.pathname.startsWith('/api/admin/')) {
      return apiError(501, 'ADMIN_API_NOT_IMPLEMENTED', 'A API administrativa será habilitada somente com Cloudflare Access e validação de identidade na borda.');
    }
    const mediaMatch = /^\/media\/(view|download)\/(.+)$/.exec(url.pathname);
    if (mediaMatch) return serveMedia(request, env, mediaMatch[1] as 'view' | 'download', mediaMatch[2]);
    return env.ASSETS.fetch(request);
  } catch (error) {
    console.error('Unhandled worker error', error instanceof Error ? error.message : 'unknown');
    return apiError(500, 'INTERNAL_ERROR', 'Não foi possível concluir a solicitação.');
  }
};

export default { fetch: handleRequest } satisfies ExportedHandler<Env>;
