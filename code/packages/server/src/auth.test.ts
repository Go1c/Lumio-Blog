import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import type { SiteConfig } from '@opennote/core';
import { AuthService, hashPassword, verifyPasswordHash } from './auth.js';
import { buildApp } from './routes.js';
import { EventBus } from './events.js';

interface StoredSession {
  subject: string;
  expires_at: string;
  revoked_at: string | null;
}

class FakeDb {
  credentials = new Map<string, { password_hash: string; updated_at: string }>();
  sessions = new Map<string, StoredSession>();
  audit: unknown[][] = [];

  asDatabase(): Database {
    return this as unknown as Database;
  }

  exec(): void {
    // buildApp initializes optional route schemas. Auth tests only need the
    // credential/session/audit statements handled in prepare().
  }

  prepare(sql: string): { run: (...args: unknown[]) => { lastInsertRowid: number }; get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[] } {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return {
      run: (...args: unknown[]) => {
        if (normalized.startsWith('INSERT INTO admin_credentials')) {
          const subject = String(args[0]);
          this.credentials.set(subject, {
            password_hash: String(args[1]),
            updated_at: String(args[2]),
          });
        } else if (normalized.startsWith('INSERT INTO sessions')) {
          this.sessions.set(String(args[0]), {
            subject: String(args[1]),
            expires_at: String(args[3]),
            revoked_at: null,
          });
        } else if (normalized.startsWith('UPDATE sessions SET revoked_at = ? WHERE jti = ?')) {
          const row = this.sessions.get(String(args[1]));
          if (row) row.revoked_at = String(args[0]);
        } else if (normalized.startsWith('UPDATE sessions SET revoked_at = ? WHERE subject = ?')) {
          const revokedAt = String(args[0]);
          const subject = String(args[1]);
          const keepJti = String(args[2]);
          for (const [jti, row] of this.sessions.entries()) {
            if (row.subject === subject && !row.revoked_at && jti !== keepJti) row.revoked_at = revokedAt;
          }
        } else if (normalized.startsWith('INSERT INTO audit_log')) {
          this.audit.push(args);
        }
        return { lastInsertRowid: 1 };
      },
      get: (...args: unknown[]) => {
        if (normalized.startsWith('SELECT password_hash FROM admin_credentials')) {
          const row = this.credentials.get(String(args[0]));
          return row ? { password_hash: row.password_hash } : undefined;
        }
        if (normalized.startsWith('SELECT expires_at, revoked_at FROM sessions WHERE jti = ?')) {
          const row = this.sessions.get(String(args[0]));
          return row ? { expires_at: row.expires_at, revoked_at: row.revoked_at } : undefined;
        }
        return undefined;
      },
      all: () => [],
    };
  }
}

const config: SiteConfig = {
  site: { title: 'Lumio Blog', url: 'https://blog.lumio.games' },
  author: { name: 'Lumio' },
  paths: { vault: '', out: '', db: '' },
};

describe('admin auth password storage', () => {
  afterEach(() => {
    delete process.env.OPENNOTE_PASSWORD;
  });

  it('hashes and verifies admin passwords with scrypt', () => {
    const hash = hashPassword('correct horse battery staple');

    expect(hash).toMatch(/^scrypt\$/);
    expect(verifyPasswordHash('correct horse battery staple', hash)).toBe(true);
    expect(verifyPasswordHash('wrong password', hash)).toBe(false);
  });

  it('uses OPENNOTE_PASSWORD as bootstrap fallback until a stored password exists', () => {
    const fake = new FakeDb();
    process.env.OPENNOTE_PASSWORD = 'bootstrap-pass';
    const auth = new AuthService(fake.asDatabase());

    expect(auth.verifyPassword('bootstrap-pass')).toBe(true);
    expect(auth.hasStoredPassword()).toBe(false);

    auth.setPassword('stored-pass');
    expect(auth.hasStoredPassword()).toBe(true);
    expect(auth.verifyPassword('stored-pass')).toBe(true);
    expect(auth.verifyPassword('bootstrap-pass')).toBe(false);
  });

  it('lets an authenticated owner change the persisted admin password', async () => {
    const fake = new FakeDb();
    const db = fake.asDatabase();
    process.env.OPENNOTE_PASSWORD = 'bootstrap-pass';
    const auth = new AuthService(db);
    const session = auth.createSession();
    const sessionJti = createHash('sha256').update(session).digest('hex');
    const app = buildApp({
      db,
      config,
      bus: new EventBus(),
      triggerSync: async () => undefined,
    });

    const res = await app.request('/api/admin/auth/password', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `opennote_session=${session}`,
      },
      body: JSON.stringify({
        current_password: 'bootstrap-pass',
        new_password: 'stored-pass-123',
      }),
    });

    expect(res.status).toBe(200);
    expect(new AuthService(db).verifyPassword('stored-pass-123')).toBe(true);
    expect(new AuthService(db).verifyPassword('bootstrap-pass')).toBe(false);
    expect(fake.sessions.get(sessionJti)?.revoked_at).toBeNull();
    expect(fake.audit.length).toBeGreaterThan(0);
  });
});
