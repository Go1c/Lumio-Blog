import type { Database } from 'better-sqlite3';
import type { LinkEdge, NoteRow, ShortLink, Visibility } from '@opennote/core';

export class NoteRepo {
  constructor(private db: Database) {}

  upsert(note: NoteRow, tags: string[], links: LinkEdge[]): void {
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO notes (
            slug, title, summary, body_html, body_text, visibility, searchable,
            short_id, source_path, created_at, updated_at, published_at, scheduled_at,
            word_count, reading_minutes, cover, hash
          ) VALUES (
            @slug, @title, @summary, @body_html, @body_text, @visibility, @searchable,
            @short_id, @source_path, @created_at, @updated_at, @published_at, @scheduled_at,
            @word_count, @reading_minutes, @cover, @hash
          )
          ON CONFLICT(slug) DO UPDATE SET
            title = excluded.title,
            summary = excluded.summary,
            body_html = excluded.body_html,
            body_text = excluded.body_text,
            visibility = excluded.visibility,
            searchable = excluded.searchable,
            short_id = excluded.short_id,
            source_path = excluded.source_path,
            updated_at = excluded.updated_at,
            published_at = excluded.published_at,
            scheduled_at = excluded.scheduled_at,
            word_count = excluded.word_count,
            reading_minutes = excluded.reading_minutes,
            cover = excluded.cover,
            hash = excluded.hash`,
        )
        .run(note);

      this.db.prepare('DELETE FROM tags WHERE slug = ?').run(note.slug);
      const insertTag = this.db.prepare('INSERT INTO tags (slug, tag) VALUES (?, ?)');
      for (const t of tags) insertTag.run(note.slug, t);

      this.db.prepare('DELETE FROM links WHERE src_slug = ?').run(note.slug);
      const insertLink = this.db.prepare(
        'INSERT INTO links (src_slug, dst_slug, raw_target) VALUES (?, ?, ?)',
      );
      for (const l of links) insertLink.run(l.src_slug, l.dst_slug, l.raw_target);

      // FTS：searchable 决定要不要进搜索索引
      this.db.prepare('DELETE FROM notes_fts WHERE slug = ?').run(note.slug);
      if (note.searchable === 1 && note.visibility !== 'private') {
        this.db
          .prepare('INSERT INTO notes_fts (slug, title, body_text) VALUES (?, ?, ?)')
          .run(note.slug, note.title, note.body_text);
      }
    });
    tx();
  }

  getBySlug(slug: string): NoteRow | undefined {
    return this.db.prepare<[string], NoteRow>('SELECT * FROM notes WHERE slug = ?').get(slug);
  }

  getByShortId(shortId: string): NoteRow | undefined {
    return this.db
      .prepare<[string], NoteRow>(
        `SELECT n.* FROM notes n
         JOIN short_links s ON s.slug = n.slug
         WHERE s.short_id = ? AND s.tombstoned_at IS NULL`,
      )
      .get(shortId);
  }

  listPublic(limit = 50, offset = 0): NoteRow[] {
    return this.db
      .prepare<[number, number], NoteRow>(
        `SELECT * FROM notes
         WHERE visibility = 'public'
         ORDER BY COALESCE(published_at, updated_at) DESC
         LIMIT ? OFFSET ?`,
      )
      .all(limit, offset);
  }

  listAll(): NoteRow[] {
    return this.db
      .prepare<unknown[], NoteRow>('SELECT * FROM notes ORDER BY updated_at DESC')
      .all();
  }

  delete(slug: string): void {
    this.db.prepare('DELETE FROM notes WHERE slug = ?').run(slug);
    this.db.prepare('DELETE FROM notes_fts WHERE slug = ?').run(slug);
    // short_links 留墓碑
    this.db
      .prepare(
        `UPDATE short_links SET tombstoned_at = ?
         WHERE slug = ? AND tombstoned_at IS NULL`,
      )
      .run(new Date().toISOString(), slug);
  }

  patchMeta(
    slug: string,
    patch: Partial<Pick<NoteRow, 'visibility' | 'searchable' | 'published_at' | 'scheduled_at'>>,
  ): void {
    const fields = Object.keys(patch);
    if (fields.length === 0) return;
    const set = fields.map((f) => `${f} = @${f}`).join(', ');
    this.db
      .prepare(`UPDATE notes SET ${set}, updated_at = @updated_at WHERE slug = @slug`)
      .run({ ...patch, slug, updated_at: new Date().toISOString() });
  }

  search(q: string, limit = 30): { slug: string; title: string; snippet: string }[] {
    return this.db
      .prepare<[string, number], { slug: string; title: string; snippet: string }>(
        `SELECT slug, title, snippet(notes_fts, 2, '<mark>', '</mark>', '…', 32) AS snippet
         FROM notes_fts WHERE notes_fts MATCH ?
         ORDER BY rank LIMIT ?`,
      )
      .all(q, limit);
  }

  countByVisibility(): Record<Visibility, number> {
    const rows = this.db
      .prepare<unknown[], { visibility: Visibility; n: number }>(
        'SELECT visibility, COUNT(*) AS n FROM notes GROUP BY visibility',
      )
      .all();
    const out: Record<Visibility, number> = {
      public: 0,
      unlisted: 0,
      'link-only': 0,
      private: 0,
    };
    for (const r of rows) out[r.visibility] = r.n;
    return out;
  }

  /**
   * 增量同步用：拿全量 source_path → slug 映射，给 wikilink 解析建表。
   * 数据量级是 vault 大小，全量加载没问题（每行 ~80B，1 万条 < 1MB）。
   */
  allSourceMappings(): { slug: string; source_path: string }[] {
    return this.db
      .prepare<unknown[], { slug: string; source_path: string }>(
        'SELECT slug, source_path FROM notes',
      )
      .all();
  }

  /** 按 source_path 反查 slug —— 增量删除/重命名时用。 */
  getBySourcePath(sourcePath: string): NoteRow | undefined {
    return this.db
      .prepare<[string], NoteRow>('SELECT * FROM notes WHERE source_path = ?')
      .get(sourcePath);
  }

  /**
   * 找 dst_slug = 此 slug 的 src_slug 列表 —— 单文件改动后，
   * 引用它的笔记可能要重渲染（如果它被新建/删除导致 wikilink 解析结果变了）。
   */
  inboundSrcSlugs(slug: string): string[] {
    return this.db
      .prepare<[string], { src_slug: string }>(
        'SELECT DISTINCT src_slug FROM links WHERE dst_slug = ?',
      )
      .all(slug)
      .map((r) => r.src_slug);
  }

  /**
   * 找 raw_target 匹配但 dst_slug = NULL（未解析）的 src_slug 列表 ——
   * 新增笔记时，原本断的 wikilink 现在可能能解析了。
   */
  unresolvedReferers(rawTargets: string[]): string[] {
    if (rawTargets.length === 0) return [];
    const placeholders = rawTargets.map(() => '?').join(',');
    return this.db
      .prepare<string[], { src_slug: string }>(
        `SELECT DISTINCT src_slug FROM links
         WHERE dst_slug IS NULL AND raw_target IN (${placeholders})`,
      )
      .all(...rawTargets)
      .map((r) => r.src_slug);
  }

  backlinks(slug: string): { src_slug: string; title: string }[] {
    return this.db
      .prepare<[string], { src_slug: string; title: string }>(
        `SELECT l.src_slug, n.title
         FROM links l JOIN notes n ON n.slug = l.src_slug
         WHERE l.dst_slug = ?`,
      )
      .all(slug);
  }
}

export class ShortLinkRepo {
  constructor(private db: Database) {}

  exists(shortId: string): boolean {
    return (
      this.db
        .prepare<[string], { c: number }>('SELECT COUNT(*) AS c FROM short_links WHERE short_id = ?')
        .get(shortId)?.c ?? 0
    ) > 0;
  }

  create(link: ShortLink): void {
    this.db
      .prepare(
        `INSERT INTO short_links (short_id, slug, created_at, tombstoned_at)
         VALUES (@short_id, @slug, @created_at, @tombstoned_at)`,
      )
      .run(link);
  }

  getActive(slug: string): ShortLink | undefined {
    return this.db
      .prepare<[string], ShortLink>(
        `SELECT * FROM short_links WHERE slug = ? AND tombstoned_at IS NULL`,
      )
      .get(slug);
  }

  tombstone(shortId: string): void {
    this.db
      .prepare('UPDATE short_links SET tombstoned_at = ? WHERE short_id = ?')
      .run(new Date().toISOString(), shortId);
  }
}
