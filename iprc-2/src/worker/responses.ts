export type ApiError = { code: string; message: string };

const json = (payload: unknown, status = 200, cacheControl = 'no-store') => new Response(JSON.stringify(payload), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cacheControl },
});

export const apiSuccess = <T>(data: T, status = 200, cacheControl = 'no-store') => json({ ok: true, data }, status, cacheControl);
export const apiError = (status: number, code: string, message: string) => json({ ok: false, error: { code, message } satisfies ApiError }, status);
