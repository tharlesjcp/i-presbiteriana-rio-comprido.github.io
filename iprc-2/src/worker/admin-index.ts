import { handleAdminApi } from './admin.ts';
import type { Env } from './env.ts';
import { apiError } from './responses.ts';

export const handleAdminRequest = async (request:Request,env:Env):Promise<Response> => {
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/admin/')) return handleAdminApi(request,env);
  if(url.pathname==='/') return Response.redirect(new URL('/admin/',url),302);
  if(url.pathname==='/admin'||url.pathname.startsWith('/admin/')) return env.ASSETS.fetch(request);
  // Admin HTML references Astro bundles and shared visual assets from the root.
  // Keep the admin origin closed to public pages while allowing its own static files.
  if(request.method==='GET'||request.method==='HEAD'){
    if(url.pathname.startsWith('/_astro/')||url.pathname==='/logo-iprc.svg'||url.pathname==='/favicon.svg') return env.ASSETS.fetch(request);
  }
  return apiError(404,'ADMIN_ROUTE_NOT_FOUND','Esta origem serve somente a administração da IPRC.');
};
export default {fetch:handleAdminRequest} satisfies ExportedHandler<Env>;
