import type { MiddlewareHandler } from 'hono';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://data.lumio.games",
  "connect-src 'self' https://data.lumio.games",
].join('; ');

/** 后台与 API 不该被任何引擎收录,robots.txt 之外再加一层响应头。 */
const NOINDEX_PREFIXES = ['/admin', '/api'] as const;

export const MARKDOWN_CONTENT_TYPE = 'text/markdown; charset=utf-8';

export function isNoindexPath(path: string): boolean {
  return NOINDEX_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    c.header('Cross-Origin-Opener-Policy', 'same-origin');
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    c.header('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    const path = c.req.path;
    if (isNoindexPath(path)) c.header('X-Robots-Tag', 'noindex, nofollow');
    await next();
    // Hono 的 mime 表没有 .md,serveStatic 会回落到 application/octet-stream。
    // 叠加全局 nosniff 后抓取方会直接跳过,所以在这里改回 text/markdown。
    if (path.endsWith('.md')) c.header('Content-Type', MARKDOWN_CONTENT_TYPE);
  };
}
