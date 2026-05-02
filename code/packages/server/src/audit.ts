import type { Database } from 'better-sqlite3';

export interface AuditEntry {
  actor: string;
  action: string;
  target?: string | null;
  diff?: string | null;
  ip?: string | null;
  ua?: string | null;
}

export interface AuditRow extends AuditEntry {
  id: number;
  ts: string;
}

/**
 * 极薄一层。所有写操作都应该走它，便于安全审计。
 * 失败不影响主流程——审计写不进 = 记 console，不抛错。
 */
export class AuditLog {
  constructor(private db: Database) {}

  write(e: AuditEntry): void {
    try {
      this.db
        .prepare(
          `INSERT INTO audit_log (ts, actor, action, target, diff, ip, ua)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          new Date().toISOString(),
          e.actor,
          e.action,
          e.target ?? null,
          e.diff ?? null,
          e.ip ?? null,
          e.ua ?? null,
        );
    } catch (err) {
      console.error('[audit] write failed', err);
    }
  }

  recent(limit = 50): AuditRow[] {
    return this.db
      .prepare<[number], AuditRow>(
        'SELECT * FROM audit_log ORDER BY id DESC LIMIT ?',
      )
      .all(limit);
  }
}
