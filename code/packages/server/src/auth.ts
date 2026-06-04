import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

const SESSION_COOKIE = 'opennote_session';
const SESSION_TTL_DAYS = 30;
const ADMIN_SUBJECT = 'owner';
const PASSWORD_HASH_TAG = 'scrypt';
const PASSWORD_KEY_LEN = 32;
const PASSWORD_SALT_LEN = 16;

/**
 * v0.1 简化版 auth：
 * - 站长用环境变量 OPENNOTE_PASSWORD 登录（v0.5 换成 OAuth/magic-link）
 * - 登录成功 → 一个 64 字符 random session token，存 SQLite
 * - cookie httponly/samesite=lax
 *
 * 注：DevDoc/07 写的是 JWT + GitHub OAuth；v0.1 先用最朴素的 server session。
 */

export class AuthService {
  constructor(private db: Database) {}

  /** 校验明文密码 */
  verifyPassword(input: string): boolean {
    const stored = this.passwordHash();
    if (stored) return verifyPasswordHash(input, stored);

    const expected = process.env.OPENNOTE_PASSWORD;
    if (!expected) return false;
    const a = Buffer.from(input);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  setPassword(password: string): void {
    const hash = hashPassword(password);
    this.db
      .prepare(
        `INSERT INTO admin_credentials (subject, password_hash, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(subject) DO UPDATE SET
           password_hash = excluded.password_hash,
           updated_at = excluded.updated_at`,
      )
      .run(ADMIN_SUBJECT, hash, new Date().toISOString());
  }

  hasStoredPassword(): boolean {
    return !!this.passwordHash();
  }

  createSession(): string {
    const token = randomBytes(32).toString('base64url');
    const jti = createHash('sha256').update(token).digest('hex');
    const now = new Date();
    const exp = new Date(now.getTime() + SESSION_TTL_DAYS * 86400_000);
    this.db
      .prepare(
        `INSERT INTO sessions (jti, subject, created_at, expires_at) VALUES (?, ?, ?, ?)`,
      )
      .run(jti, ADMIN_SUBJECT, now.toISOString(), exp.toISOString());
    return token;
  }

  isValidSession(token: string): boolean {
    const jti = createHash('sha256').update(token).digest('hex');
    const row = this.db
      .prepare<[string], { expires_at: string; revoked_at: string | null }>(
        'SELECT expires_at, revoked_at FROM sessions WHERE jti = ?',
      )
      .get(jti);
    if (!row) return false;
    if (row.revoked_at) return false;
    if (new Date(row.expires_at) < new Date()) return false;
    return true;
  }

  revokeSession(token: string): void {
    const jti = createHash('sha256').update(token).digest('hex');
    this.db
      .prepare('UPDATE sessions SET revoked_at = ? WHERE jti = ?')
      .run(new Date().toISOString(), jti);
  }

  revokeOtherSessions(token: string): void {
    const keepJti = createHash('sha256').update(token).digest('hex');
    this.db
      .prepare(
        `UPDATE sessions
         SET revoked_at = ?
         WHERE subject = ? AND revoked_at IS NULL AND jti <> ?`,
      )
      .run(new Date().toISOString(), ADMIN_SUBJECT, keepJti);
  }

  private passwordHash(): string | null {
    try {
      const row = this.db
        .prepare<[string], { password_hash: string }>(
          'SELECT password_hash FROM admin_credentials WHERE subject = ?',
        )
        .get(ADMIN_SUBJECT);
      return row?.password_hash ?? null;
    } catch {
      return null;
    }
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(PASSWORD_SALT_LEN);
  const key = scryptSync(password, salt, PASSWORD_KEY_LEN);
  return `${PASSWORD_HASH_TAG}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== PASSWORD_HASH_TAG) return false;
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
  if (expected.length !== PASSWORD_KEY_LEN) return false;
  const got = scryptSync(password, salt, PASSWORD_KEY_LEN);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}

export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 86400,
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export function requireAuth(auth: AuthService): MiddlewareHandler {
  return async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token || !auth.isValidSession(token)) {
      return c.json({ error: { code: 'unauthorized' } }, 401);
    }
    return next();
  };
}

export function getSessionToken(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}
