import type { Database } from 'better-sqlite3';

export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'spam';

export interface CommentAnchor {
  /** 客户端生成的本地高亮 id(localStorage 里的 mid) */
  mid: string;
  /** 被划选的原句快照,便于刷新后回锚或降级展示引用 */
  quote: string;
}

export interface CommentRow {
  id: number;
  slug: string;
  parent_id: number | null;
  author: string;
  email: string | null;
  website: string | null;
  body: string;
  status: CommentStatus;
  anchor: string | null; // JSON: CommentAnchor | null
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
  parent_id?: number | null;
  anchor?: CommentAnchor | null;
  ip_hash?: string | null;
  ua?: string | null;
  /** 默认 'approved'(配置可改);保留 'pending' 用于触发审核 */
  status?: CommentStatus;
}

export interface CommentListOpts {
  status?: CommentStatus;
  slug?: string;
  limit?: number;
}

export interface PublicCommentRow {
  id: number;
  parent_id: number | null;
  author: string;
  website: string | null;
  body: string;
  anchor: CommentAnchor | null;
  created_at: string;
}

export class CommentsRepo {
  constructor(private db: Database) {}

  insert(c: CommentInsert): CommentRow {
    const now = new Date().toISOString();
    const status = c.status ?? 'approved';
    const anchorJson = c.anchor ? JSON.stringify(c.anchor) : null;
    const r = this.db
      .prepare(
        `INSERT INTO comments
         (slug, parent_id, author, email, website, body, status, anchor, ip_hash, ua, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        c.slug,
        c.parent_id ?? null,
        c.author,
        c.email ?? null,
        c.website ?? null,
        c.body,
        status,
        anchorJson,
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

  /** 公开:仅 approved。按 slug 拉取,带 parent_id + anchor,前端自行组树。 */
  publicForSlug(slug: string, limit = 200): PublicCommentRow[] {
    const rows = this.db
      .prepare<[string, number], CommentRow & { anchor: string | null }>(
        `SELECT id, parent_id, author, website, body, anchor, created_at
         FROM comments
         WHERE slug = ? AND status = 'approved'
         ORDER BY created_at ASC
         LIMIT ?`,
      )
      .all(slug, limit);
    return rows.map((r) => ({
      id: r.id,
      parent_id: r.parent_id ?? null,
      author: r.author,
      website: r.website ?? null,
      body: r.body,
      anchor: parseAnchor(r.anchor),
      created_at: r.created_at,
    }));
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

function parseAnchor(raw: string | null): CommentAnchor | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<CommentAnchor>;
    if (typeof j?.mid === 'string' && typeof j?.quote === 'string') {
      return { mid: j.mid, quote: j.quote };
    }
  } catch {
    // ignore
  }
  return null;
}
