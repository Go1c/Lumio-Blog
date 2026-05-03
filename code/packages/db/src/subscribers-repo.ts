import type { Database } from 'better-sqlite3';

export interface SubscriberRow {
  email: string;
  source: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
  ip_hash: string | null;
}

export interface SubscriberInsert {
  email: string;
  source?: string;
  ip_hash?: string | null;
}

export class SubscribersRepo {
  constructor(private db: Database) {}

  /**
   * 订阅(幂等)。已存在且未退订 → 直接返回 already。
   * 已退订 → 重新激活(清空 unsubscribed_at,刷新 subscribed_at)。
   */
  subscribe(s: SubscriberInsert): { row: SubscriberRow; already: boolean } {
    const existing = this.getByEmail(s.email);
    const now = new Date().toISOString();
    if (existing && !existing.unsubscribed_at) {
      return { row: existing, already: true };
    }
    if (existing) {
      this.db
        .prepare('UPDATE subscribers SET unsubscribed_at = NULL, subscribed_at = ? WHERE email = ?')
        .run(now, s.email);
      return { row: this.getByEmail(s.email)!, already: false };
    }
    this.db
      .prepare(
        'INSERT INTO subscribers (email, source, subscribed_at, ip_hash) VALUES (?, ?, ?, ?)',
      )
      .run(s.email, s.source ?? 'web', now, s.ip_hash ?? null);
    return { row: this.getByEmail(s.email)!, already: false };
  }

  unsubscribe(email: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE subscribers SET unsubscribed_at = ? WHERE email = ?')
      .run(now, email);
  }

  delete(email: string): void {
    this.db.prepare('DELETE FROM subscribers WHERE email = ?').run(email);
  }

  getByEmail(email: string): SubscriberRow | undefined {
    return this.db
      .prepare<[string], SubscriberRow>('SELECT * FROM subscribers WHERE email = ?')
      .get(email);
  }

  list(opts: { activeOnly?: boolean; limit?: number } = {}): SubscriberRow[] {
    const limit = Math.min(opts.limit ?? 500, 2000);
    const where = opts.activeOnly ? 'WHERE unsubscribed_at IS NULL' : '';
    return this.db
      .prepare<[number], SubscriberRow>(
        `SELECT * FROM subscribers ${where} ORDER BY subscribed_at DESC LIMIT ?`,
      )
      .all(limit);
  }

  counts(): { total: number; active: number; unsubscribed: number } {
    const r = this.db
      .prepare<unknown[], { total: number; active: number; unsubscribed: number }>(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN unsubscribed_at IS NULL THEN 1 ELSE 0 END) AS active,
           SUM(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 ELSE 0 END) AS unsubscribed
         FROM subscribers`,
      )
      .get();
    return {
      total: r?.total ?? 0,
      active: r?.active ?? 0,
      unsubscribed: r?.unsubscribed ?? 0,
    };
  }
}
