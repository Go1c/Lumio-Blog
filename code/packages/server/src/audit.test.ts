import { describe, expect, it } from 'vitest';
import { AuditLog, redactAuditDiff } from './audit.js';

const leakedJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.super-secret.payload';

describe('audit log redaction', () => {
  it('redacts sensitive token fields from historical JSON string diffs', () => {
    const diff = JSON.stringify({
      fns: {
        enabled: true,
        api_url: 'https://fast-note.zeabur.app',
        token: leakedJwt,
        vault: 'notes',
      },
    });

    const safe = redactAuditDiff(diff);

    expect(safe).toContain('"token":"[redacted]"');
    expect(safe).not.toContain(leakedJwt);
    expect(safe).not.toContain('eyJ');
  });

  it('redacts sensitive diffs both when writing and when reading old rows', () => {
    const inserted: unknown[] = [];
    const db = {
      prepare(sql: string) {
        if (sql.startsWith('INSERT INTO audit_log')) {
          return { run: (...args: unknown[]) => inserted.push(args) };
        }
        return {
          all: () => [
            {
              id: 9,
              ts: '2026-05-28T00:00:00.000Z',
              actor: 'owner',
              action: 'settings.patch',
              target: null,
              diff: JSON.stringify({ fns: { token: leakedJwt, vault: 'notes' } }),
              ip: null,
              ua: null,
            },
          ],
        };
      },
    } as any;
    const audit = new AuditLog(db);

    audit.write({ actor: 'owner', action: 'settings.patch', diff: JSON.stringify({ fns: { token: leakedJwt } }) });
    const rows = audit.recent(1);

    expect(JSON.stringify(inserted)).not.toContain(leakedJwt);
    expect(rows[0]?.diff).toContain('"token":"[redacted]"');
    expect(JSON.stringify(rows)).not.toContain(leakedJwt);
  });
});
