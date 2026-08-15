export const validateAdminOrigin = (request:Request, expectedOrigin?:string) => {
  if(['GET','HEAD','OPTIONS'].includes(request.method)) return true;
  if(!expectedOrigin) return false;
  const origin=request.headers.get('Origin');
  return origin === new URL(expectedOrigin).origin;
};
