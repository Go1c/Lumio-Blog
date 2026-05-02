import { createHash, randomBytes } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { MiddlewareHandler } from 'hono';

export type Scope = 'read' | 'write' | 'admin';

interface TokenRow {
  id: number;
  name: string;
  token_hash: string;
  scope: Scope;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
}

export class TokenService {
  constructor(private db: Database) {}

  /** 创建：返回**明文 token**（一次性显示给用户） */
  create(name: string, scope: Scope, ttlDays: number | null): { id: number; token: string } {
    const raw = `tk_${randomBytes(24).toString('base64url')}`;
    const hash = createHash('sha256').update(raw).digest('hex');
    const expires = ttlDays ? new Date(Date.now() + ttlDays * 86400_000).toISOString() : null;
    const r = this.db
      .prepare(
        `INSERT INTO api_tokens (name, token_hash, scope, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(name, hash, scope, new Date().toISOString(), expires);
    return { id: r.lastInsertRowid as number, token: raw };
  }

  list(): Omit<TokenRow, 'token_hash'>[] {
    return this.db
      .prepare<unknown[], Omit<TokenRow, 'token_hash'>>(
        'SELECT id, name, scope, created_at, expires_at, last_used_at, revoked_at FROM api_tokens ORDER BY id DESC',
      )
      .all();
  }

  revoke(id: number): void {
    this.db.prepare('UPDATE api_tokens SET revoked_at = ? WHERE id = ?')
      .run(new Date().toISOString(), id);
  }

  /** 校验 bearer token，返回 scope 或 null */
  verify(raw: string): Scope | null {
    const hash = createHash('sha256').update(raw).digest('hex');
    const row = this.db
      .prepare<[string], TokenRow>('SELECT * FROM api_tokens WHERE token_hash = ?')
      .get(hash);
    if (!row) return null;
    if (row.revoked_at) return null;
    if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
    this.db.prepare('UPDATE api_tokens SET last_used_at = ? WHERE id = ?')
      .run(new Date().toISOString(), row.id);
    return row.scope;
  }
}

const SCOPE_RANK: Record<Scope, number> = { read: 0, write: 1, admin: 2 };

/** 中间件：要求 bearer token，scope 至少 minScope */
export function requireToken(svc: TokenService, minScope: Scope): MiddlewareHandler {
  return async (c, next) => {
    const auth = c.req.header('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return c.json({ error: { code: 'unauthorized' } }, 401);
    }
    const raw = auth.slice(7).trim();
    const scope = svc.verify(raw);
    if (!scope) return c.json({ error: { code: 'unauthorized' } }, 401);
    if (SCOPE_RANK[scope] < SCOPE_RANK[minScope]) {
      return c.json({ error: { code: 'forbidden' } }, 403);
    }
    c.set('tokenScope', scope);
    return next();
  };
}

declare module 'hono' {
  interface ContextVariableMap {
    tokenScope: Scope;
  }
}
