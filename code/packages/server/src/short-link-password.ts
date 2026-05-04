/**
 * Short-link password protection — primitives.
 *
 * Hash format: `scrypt$<saltB64>$<keyB64>` where key is 32 bytes from
 * Node's `crypto.scrypt(password, salt, 32, params)`. We don't drag in
 * bcryptjs/argon2 — `crypto.scrypt` is built in and memory-hard; for a
 * "did the visitor type the right shared secret?" check it's plenty.
 *
 * Per-short-link unlock cookie: `opennote_sl_<shortId>` carries the HMAC
 * of `(short_id, password_hash)` — invalidated automatically when the
 * owner changes the password (the hash changes → HMAC no longer matches).
 */
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const HASH_TAG = 'scrypt';
const KEY_LEN = 32;
const SALT_LEN = 16;
/** Per-short-link unlock cookie validity. Short on purpose — link owner
 *  expects "give them the password once, they read once". */
const UNLOCK_TTL_SECONDS = 60 * 60 * 24; // 24h

export async function hashShortLinkPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await scrypt(password, salt, KEY_LEN);
  return `${HASH_TAG}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyShortLinkPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== HASH_TAG) return false;
  const saltStr = parts[1];
  const expectedStr = parts[2];
  if (!saltStr || !expectedStr) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltStr, 'base64');
    expected = Buffer.from(expectedStr, 'base64');
  } catch {
    return false;
  }
  if (expected.length !== KEY_LEN) return false;
  const got = await scrypt(password, salt, KEY_LEN);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}

/** Cookie name dedicated to one short-link unlock token. */
export function unlockCookieName(shortId: string): string {
  // Strip non-cookie-safe chars defensively. short_ids are [a-zA-Z0-9] in practice.
  const safe = shortId.replace(/[^a-zA-Z0-9]/g, '');
  return `opennote_sl_${safe}`;
}

/** HMAC-derived unlock token. Server-side secret is the password_hash itself. */
export function unlockToken(shortId: string, passwordHash: string): string {
  return createHmac('sha256', passwordHash).update(shortId).digest('base64url');
}

export function hasValidUnlockCookie(
  c: Context,
  shortId: string,
  passwordHash: string,
): boolean {
  const cookie = getCookie(c, unlockCookieName(shortId));
  if (!cookie) return false;
  const expected = unlockToken(shortId, passwordHash);
  const a = Buffer.from(cookie);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function setUnlockCookie(
  c: Context,
  shortId: string,
  passwordHash: string,
): void {
  setCookie(c, unlockCookieName(shortId), unlockToken(shortId, passwordHash), {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: UNLOCK_TTL_SECONDS,
  });
}

export function passwordChallengeHtml(opts: {
  shortId: string;
  error?: string;
}): string {
  const safeId = opts.shortId.replace(/[^a-zA-Z0-9_-]/g, '');
  const errBlock = opts.error
    ? `<p role="alert" style="color:#c0392b;margin:0 0 12px 0">${escapeHtml(opts.error)}</p>`
    : '';
  return `<!doctype html><meta charset=utf-8>
<title>需要密码 · ${safeId}</title>
<meta name="robots" content="noindex,nofollow">
<style>
  body { font: 16px/1.6 system-ui; max-width: 420px; margin: 80px auto; padding: 24px; color: #1a1a1a; }
  h1 { margin: 0 0 8px; font-size: 22px; }
  p { color: #555; }
  form { margin-top: 16px; display: flex; gap: 8px; flex-direction: column; }
  input[type=password] { padding: 10px 12px; font-size: 15px; border: 1px solid #ccc; border-radius: 6px; }
  button { padding: 10px 14px; font-size: 15px; background: #2563eb; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }
  button:hover { background: #1d4ed8; }
</style>
<h1>需要密码</h1>
<p>这条短链 <code>/n/${safeId}</code> 受密码保护。请输入访问密码:</p>
${errBlock}
<form method="POST" action="/n/${safeId}">
  <input type="password" name="password" autocomplete="current-password" autofocus required aria-label="访问密码" />
  <button type="submit">解锁</button>
</form>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
