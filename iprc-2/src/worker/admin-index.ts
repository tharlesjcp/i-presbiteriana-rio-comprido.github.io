import { handleAdminApi } from './admin.ts';
import type { Env } from './env.ts';
import { apiError } from './responses.ts';

export const handleAdminRequest = async (request:Request,env:Env):Promise<Response> => {
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/admin/')) return handleAdminApi(request,env);
  if(url.pathname==='/') return Response.redirect(new URL('/admin/',url),302);
  if(url.pathname==='/admin'||url.pathname.startsWith('/admin/')) return env.ASSETS.fetch(request);
  return apiError(404,'ADMIN_ROUTE_NOT_FOUND','Esta origem serve somente a administração da IPRC.');
};
export default {fetch:handleAdminRequest} satisfies ExportedHandler<Env>;
