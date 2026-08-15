export type AccessIdentity = { email:string; subject:string };
type AccessEnv = { CF_ACCESS_TEAM_DOMAIN?:string; CF_ACCESS_AUD?:string };
type JwtHeader = { alg?:string; kid?:string };
type JwtPayload = { aud?:string|string[]; email?:string; sub?:string; iss?:string; exp?:number; nbf?:number };
type Jwk = JsonWebKey & { kid:string };
const cache = new Map<string,{expires:number;keys:Jwk[]}>();
const decode = (part:string) => { const normalized=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'='); const binary=atob(normalized); return Uint8Array.from(binary,c=>c.charCodeAt(0)); };
const jsonPart = <T>(part:string):T => JSON.parse(new TextDecoder().decode(decode(part)));
const issuerFor = (team:string) => `https://${team.replace(/^https?:\/\//,'').replace(/\/$/,'')}`;
const keysFor = async (issuer:string) => { const existing=cache.get(issuer); if(existing&&existing.expires>Date.now()) return existing.keys; const response=await fetch(`${issuer}/cdn-cgi/access/certs`); if(!response.ok) throw new Error('Não foi possível consultar as chaves do Access.'); const body=await response.json() as {keys:Jwk[]}; cache.set(issuer,{keys:body.keys,expires:Date.now()+300_000}); return body.keys; };

export const authenticateAccessRequest = async (request:Request, env:AccessEnv):Promise<AccessIdentity> => {
  if(!env.CF_ACCESS_TEAM_DOMAIN||!env.CF_ACCESS_AUD) throw new Error('ACCESS_NOT_CONFIGURED');
  const token=request.headers.get('Cf-Access-Jwt-Assertion'); if(!token) throw new Error('ACCESS_TOKEN_MISSING');
  const parts=token.split('.'); if(parts.length!==3) throw new Error('ACCESS_TOKEN_INVALID');
  const header=jsonPart<JwtHeader>(parts[0]), payload=jsonPart<JwtPayload>(parts[1]);
  if(header.alg!=='RS256'||!header.kid) throw new Error('ACCESS_TOKEN_INVALID');
  const issuer=issuerFor(env.CF_ACCESS_TEAM_DOMAIN); const audiences=Array.isArray(payload.aud)?payload.aud:[payload.aud]; const now=Math.floor(Date.now()/1000);
  if(payload.iss!==issuer||!audiences.includes(env.CF_ACCESS_AUD)||!payload.exp||payload.exp<=now||(payload.nbf&&payload.nbf>now)||!payload.email||!payload.sub) throw new Error('ACCESS_TOKEN_INVALID');
  const jwk=(await keysFor(issuer)).find(key=>key.kid===header.kid); if(!jwk) throw new Error('ACCESS_TOKEN_INVALID');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if(!valid) throw new Error('ACCESS_TOKEN_INVALID'); return {email:payload.email,subject:payload.sub};
};

export const clearAccessKeyCacheForTests = () => cache.clear();
