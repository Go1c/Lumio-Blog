export function rewriteAdminRequestPath(path: string): string {
  const rest = path.replace(/^\/admin/, '') || '/';
  if (rest === '/' || !rest.split('/').pop()?.includes('.')) return '/index.html';
  return rest;
}
