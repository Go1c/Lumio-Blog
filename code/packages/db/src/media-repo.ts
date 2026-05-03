import type { Database } from 'better-sqlite3';
import type { MediaItem, MediaListPage, MediaReference } from '@opennote/core';

/**
 * MediaRepo — media + media_refs 表的 CRUD。
 * 物理存储由 server/media-store.ts 负责,这里只管 metadata + ref。
 */

export type MediaRefKind = 'embed' | 'cover' | 'link';

export interface MediaInsertInput {
  id: string;
  filename: string;
  mime: string;
  bytes: number;
  url: string;
  uploaded_at: string;
  sha256: string | null;
}

export interface MediaRefInput {
  media_id: string;
  slug: string;
  kind: MediaRefKind;
}

export class MediaRepo {
  constructor(private db: Database) {}

  // ----- media -------------------------------------------------------

  insert(input: MediaInsertInput): void {
    this.db
      .prepare(
        `INSERT INTO media (id, filename, mime, bytes, url, uploaded_at, sha256)
         VALUES (@id, @filename, @mime, @bytes, @url, @uploaded_at, @sha256)
         ON CONFLICT(id) DO UPDATE SET
           filename = excluded.filename,
           mime = excluded.mime,
           bytes = excluded.bytes,
           url = excluded.url,
           uploaded_at = excluded.uploaded_at,
           sha256 = excluded.sha256`,
      )
      .run(input);
  }

  getById(id: string): MediaItem | undefined {
    const row = this.db
      .prepare<[string], Omit<MediaItem, 'reference_count'>>(
        `SELECT id, filename, mime, bytes, url, uploaded_at FROM media WHERE id = ?`,
      )
      .get(id);
    if (!row) return undefined;
    return { ...row, reference_count: this.countRefs(id) };
  }

  /** 按 sha256 找已存在的 media — 用来去重(同一文件别上传两次) */
  findBySha256(sha: string): MediaItem | undefined {
    const row = this.db
      .prepare<[string], Omit<MediaItem, 'reference_count'>>(
        `SELECT id, filename, mime, bytes, url, uploaded_at FROM media
         WHERE sha256 = ? LIMIT 1`,
      )
      .get(sha);
    if (!row) return undefined;
    return { ...row, reference_count: this.countRefs(row.id) };
  }

  /** 游标分页:cursor 是 uploaded_at|id 拼接,按 uploaded_at DESC 翻 */
  list(cursor: string | null, limit: number): MediaListPage {
    const lim = Math.max(1, Math.min(limit, 200));
    let rows: Omit<MediaItem, 'reference_count'>[];
    if (cursor) {
      const [ts, id] = decodeCursor(cursor);
      rows = this.db
        .prepare<[string, string, string, number], Omit<MediaItem, 'reference_count'>>(
          `SELECT id, filename, mime, bytes, url, uploaded_at FROM media
           WHERE (uploaded_at, id) < (?, ?)
             AND uploaded_at <= ?
           ORDER BY uploaded_at DESC, id DESC
           LIMIT ?`,
        )
        .all(ts, id, ts, lim + 1);
    } else {
      rows = this.db
        .prepare<[number], Omit<MediaItem, 'reference_count'>>(
          `SELECT id, filename, mime, bytes, url, uploaded_at FROM media
           ORDER BY uploaded_at DESC, id DESC LIMIT ?`,
        )
        .all(lim + 1);
    }
    const hasMore = rows.length > lim;
    const items = rows.slice(0, lim).map((r) => ({
      ...r,
      reference_count: this.countRefs(r.id),
    }));
    let next_cursor: string | null = null;
    if (hasMore) {
      const last = items[items.length - 1];
      if (last) next_cursor = encodeCursor(last.uploaded_at, last.id);
    }
    return { items, next_cursor };
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM media WHERE id = ?').run(id);
    // refs 由 ON DELETE CASCADE 自动清
  }

  countAll(): number {
    return (
      this.db.prepare<unknown[], { c: number }>('SELECT COUNT(*) AS c FROM media').get()?.c ?? 0
    );
  }

  // ----- refs --------------------------------------------------------

  countRefs(mediaId: string): number {
    return (
      this.db
        .prepare<[string], { c: number }>(
          'SELECT COUNT(*) AS c FROM media_refs WHERE media_id = ?',
        )
        .get(mediaId)?.c ?? 0
    );
  }

  /** 列出某 media 被哪些 note 引用(用于 UI 的"哪里在用我"列表) */
  listRefs(mediaId: string): MediaReference[] {
    return this.db
      .prepare<[string], MediaReference>(
        `SELECT r.slug AS slug, n.title AS title
         FROM media_refs r
         LEFT JOIN notes n ON n.slug = r.slug
         WHERE r.media_id = ?
         GROUP BY r.slug
         ORDER BY r.slug`,
      )
      .all(mediaId);
  }

  /**
   * 重建某 slug 的全部 ref —— 同步管线 hook 在每篇笔记渲染后调一次。
   * 传入笔记里检测到的 (media_id, kind) 列表,事务里删旧加新。
   */
  refreshRefsForSlug(slug: string, refs: { media_id: string; kind: MediaRefKind }[]): void {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM media_refs WHERE slug = ?').run(slug);
      const ins = this.db.prepare(
        `INSERT OR IGNORE INTO media_refs (media_id, slug, kind) VALUES (?, ?, ?)`,
      );
      for (const r of refs) {
        // 媒体不存在的 url 跳过(避免 FK 错误)
        const exists = this.db
          .prepare<[string], { c: number }>(
            'SELECT COUNT(*) AS c FROM media WHERE id = ?',
          )
          .get(r.media_id)?.c ?? 0;
        if (exists > 0) ins.run(r.media_id, slug, r.kind);
      }
    });
    tx();
  }
}

// -----------------------------------------------------------------------
// 游标编码:简单 base64(ts|id),解析失败返回 ['', '']
// -----------------------------------------------------------------------

function encodeCursor(ts: string, id: string): string {
  return Buffer.from(`${ts}|${id}`, 'utf-8').toString('base64url');
}

function decodeCursor(c: string): [string, string] {
  try {
    const decoded = Buffer.from(c, 'base64url').toString('utf-8');
    const idx = decoded.indexOf('|');
    if (idx < 0) return ['', ''];
    return [decoded.slice(0, idx), decoded.slice(idx + 1)];
  } catch {
    return ['', ''];
  }
}
