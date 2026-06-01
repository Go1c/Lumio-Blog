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

const SENSITIVE_KEY_RE =
  /(^|[_-])(token|secret|password|passphrase|authorization|api[_-]?key|access[_-]?key|private[_-]?key|jwt|session)([_-]|$)/i;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){1,2}\b/g;
const KEY_VALUE_SECRET_RE =
  /((?:token|secret|password|authorization|api[_-]?key|access[_-]?key|private[_-]?key|jwt|session)\s*[:=]\s*["']?)([^"',\s}]+)/gi;

type JsonLike = null | boolean | number | string | JsonLike[] | { [key: string]: JsonLike };

function scrubSecretText(value: string): string {
  return value
    .replace(JWT_RE, '[redacted]')
    .replace(KEY_VALUE_SECRET_RE, (_match, prefix: string) => `${prefix}[redacted]`);
}

function redactJson(value: JsonLike): JsonLike {
  if (typeof value === 'string') return scrubSecretText(value);
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redactJson);

  const out: { [key: string]: JsonLike } = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY_RE.test(key) ? '[redacted]' : redactJson(child);
  }
  return out;
}

export function redactAuditDiff(diff: string): string;
export function redactAuditDiff(diff: string | null | undefined): string | null;
export function redactAuditDiff(diff: string | null | undefined): string | null {
  if (diff == null) return null;
  try {
    return JSON.stringify(redactJson(JSON.parse(diff) as JsonLike));
  } catch {
    return scrubSecretText(diff);
  }
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
          redactAuditDiff(e.diff),
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
      .all(limit)
      .map((row) => ({ ...row, diff: redactAuditDiff(row.diff) }));
  }
}
