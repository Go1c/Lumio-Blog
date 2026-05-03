import type { Database } from 'better-sqlite3';

export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'spam';

export interface CommentRow {
  id: number;
  slug: string;
  author: string;
  email: string | null;
  website: string | null;
  body: string;
  status: CommentStatus;
  ip_hash: string | null;
  ua: string | null;
  created_at: string;
  moderated_at: string | null;
}

export interface CommentInsert {
  slug: string;
  author: string;
  email?: string | null;
  website?: string | null;
  body: string;
  ip_hash?: string | null;
  ua?: string | null;
}

export interface CommentListOpts {
  status?: CommentStatus;
  slug?: string;
  limit?: number;
}

export class CommentsRepo {
  constructor(private db: Database) {}

  insert(c: CommentInsert): CommentRow {
    const now = new Date().toISOString();
    const r = this.db
      .prepare(
        `INSERT INTO comments (slug, author, email, website, body, status, ip_hash, ua, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      )
      .run(
        c.slug,
        c.author,
        c.email ?? null,
        c.website ?? null,
        c.body,
        c.ip_hash ?? null,
        c.ua ?? null,
        now,
      );
    const id = Number(r.lastInsertRowid);
    return this.getById(id)!;
  }

  getById(id: number): CommentRow | undefined {
    return this.db
      .prepare<[number], CommentRow>('SELECT * FROM comments WHERE id = ?')
      .get(id);
  }

  list(opts: CommentListOpts = {}): CommentRow[] {
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (opts.status) {
      where.push('status = ?');
      params.push(opts.status);
    }
    if (opts.slug) {
      where.push('slug = ?');
      params.push(opts.slug);
    }
    const limit = Math.min(opts.limit ?? 200, 500);
    const sql = `SELECT * FROM comments
                 ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
                 ORDER BY created_at DESC
                 LIMIT ?`;
    return this.db.prepare<unknown[], CommentRow>(sql).all(...params, limit);
  }

  setStatus(id: number, status: CommentStatus): void {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE comments SET status = ?, moderated_at = ? WHERE id = ?')
      .run(status, now, id);
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  }

  /** 公开:仅 approved。按 slug 拉取,用于站点端展示。 */
  publicForSlug(slug: string, limit = 200): Pick<CommentRow, 'id' | 'author' | 'website' | 'body' | 'created_at'>[] {
    return this.db
      .prepare<[string, number], Pick<CommentRow, 'id' | 'author' | 'website' | 'body' | 'created_at'>>(
        `SELECT id, author, website, body, created_at
         FROM comments
         WHERE slug = ? AND status = 'approved'
         ORDER BY created_at ASC
         LIMIT ?`,
      )
      .all(slug, limit);
  }

  counts(): Record<CommentStatus, number> {
    const rows = this.db
      .prepare<unknown[], { status: CommentStatus; n: number }>(
        'SELECT status, COUNT(*) AS n FROM comments GROUP BY status',
      )
      .all();
    const out: Record<CommentStatus, number> = { pending: 0, approved: 0, rejected: 0, spam: 0 };
    for (const r of rows) out[r.status] = r.n;
    return out;
  }
}
