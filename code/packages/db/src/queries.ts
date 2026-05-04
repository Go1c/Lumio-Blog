import type { Database } from 'better-sqlite3';
import type {
  GraphData,
  GraphEdge,
  GraphNode,
  LinkEdge,
  NoteRow,
  SearchHit,
  ShortLink,
  Visibility,
} from '@opennote/core';

export class NoteRepo {
  constructor(private db: Database) {}

  upsert(note: NoteRow, tags: string[], links: LinkEdge[]): void {
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO notes (
            slug, title, summary, body_html, body_text, visibility, searchable,
            seo_indexable, rss_includable, featured_on_home,
            short_id, source_path, created_at, updated_at, published_at, scheduled_at,
            word_count, reading_minutes, cover, hash
          ) VALUES (
            @slug, @title, @summary, @body_html, @body_text, @visibility, @searchable,
            @seo_indexable, @rss_includable, @featured_on_home,
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
            seo_indexable = excluded.seo_indexable,
            rss_includable = excluded.rss_includable,
            featured_on_home = excluded.featured_on_home,
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

      // FTS 同步由 migration 005 的触发器(notes_ai_fts / notes_au_fts /
      // tags_ai_fts / tags_ad_fts)负责,无需手动 INSERT。
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

  setShortId(slug: string, shortId: string | null): void {
    this.db
      .prepare('UPDATE notes SET short_id = ?, updated_at = ? WHERE slug = ?')
      .run(shortId, new Date().toISOString(), slug);
  }

  patchMeta(
    slug: string,
    patch: Partial<
      Pick<
        NoteRow,
        | 'visibility'
        | 'searchable'
        | 'seo_indexable'
        | 'rss_includable'
        | 'featured_on_home'
        | 'published_at'
        | 'scheduled_at'
      >
    >,
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
         WHERE l.dst_slug = ?
         ORDER BY n.title COLLATE NOCASE, l.src_slug`,
      )
      .all(slug);
  }

  outlinks(slug: string): { dst_slug: string; title: string }[] {
    return this.db
      .prepare<[string], { dst_slug: string; title: string }>(
        `SELECT l.dst_slug, COALESCE(n.title, l.dst_slug) AS title
         FROM links l LEFT JOIN notes n ON n.slug = l.dst_slug
         WHERE l.src_slug = ?
         ORDER BY title COLLATE NOCASE, l.dst_slug`,
      )
      .all(slug);
  }

  // -------------------------------------------------------------------
  // WS-G2 — Search FTS5 + Graph
  // -------------------------------------------------------------------

  /**
   * 全文检索 (FTS5 + BM25 排序)。
   *
   * 行为:
   * - 仅命中 `searchable=1 且 visibility != 'private'` 的笔记 (FTS 表内即如此)
   * - 公共端点 *额外* 排除 `link-only`、`unlisted`,只露 `public`
   * - 高亮:title 用 col-1 snippet,body 用 col-2 snippet,只 `<mark>` 标签
   * - 中文降级:若 FTS MATCH 0 命中,再做一次 LIKE 取并集(对 title/body_text/summary)
   *
   * 返回 SearchHit[](符合 contracts/data-model.md)。
   */
  searchFTS(
    q: string,
    opts: {
      type?: 'post' | 'note' | 'tag' | 'media';
      tags?: string[];
      fromDate?: string; // ISO,published_at >= fromDate
      toDate?: string;   // ISO,published_at <= toDate
      limit?: number;
      offset?: number;
      visibility?: Visibility[]; // 默认 ['public']
    } = {},
  ): SearchHit[] {
    const trimmed = q.trim();
    if (!trimmed) return [];

    const limit = Math.min(opts.limit ?? 30, 100);
    const offset = Math.max(opts.offset ?? 0, 0);
    const allowedVis = opts.visibility ?? ['public'];

    const visPlaceholders = allowedVis.map(() => '?').join(',');
    const filters: string[] = [`n.visibility IN (${visPlaceholders})`];
    const filterParams: unknown[] = [...allowedVis];

    if (opts.fromDate) {
      filters.push('COALESCE(n.published_at, n.updated_at) >= ?');
      filterParams.push(opts.fromDate);
    }
    if (opts.toDate) {
      filters.push('COALESCE(n.published_at, n.updated_at) <= ?');
      filterParams.push(opts.toDate);
    }
    if (opts.tags && opts.tags.length > 0) {
      const tp = opts.tags.map(() => '?').join(',');
      filters.push(`n.slug IN (SELECT slug FROM tags WHERE tag IN (${tp}))`);
      filterParams.push(...opts.tags);
    }
    const whereExtra = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    type FtsRow = {
      slug: string;
      n_title: string;
      title_hl: string;
      body_hl: string;
      score: number;
      visibility: Visibility;
      updated_at: string;
    };

    const ftsRows = this.runFtsMatch(trimmed, whereExtra, filterParams, limit, offset);
    const seen = new Set<string>(ftsRows.map((r) => r.slug));

    // 中文降级 — FTS unicode61 对 CJK 不友好,再跑一次 LIKE 补充
    let fallbackRows: FtsRow[] = [];
    if (this.shouldRunLikeFallback(trimmed)) {
      fallbackRows = this.runLikeFallback(
        trimmed,
        whereExtra,
        filterParams,
        limit,
        offset,
      ).filter((r) => !seen.has(r.slug));
    }

    const merged = [...ftsRows, ...fallbackRows].slice(0, limit);

    // 拉一次 tags
    const slugs = merged.map((r) => r.slug);
    const tagsBySlug = this.tagsForSlugs(slugs);

    // type 过滤(我们目前只有 'note',post 是 alias —— treat them equivalent)
    const filtered = opts.type
      ? merged.filter(() => opts.type === 'post' || opts.type === 'note')
      : merged;

    return filtered.map((r) => ({
      type: 'note' as const,
      slug: r.slug,
      title: r.n_title,
      snippets: [r.title_hl, r.body_hl].filter((s) => s && s.length > 0),
      score: r.score,
      visibility: r.visibility,
      tags: tagsBySlug.get(r.slug) ?? [],
      updated_at: r.updated_at,
    }));
  }

  /** FTS prefix-token 联想 (用于 /api/search/suggest)。 */
  searchSuggest(prefix: string, limit = 10): string[] {
    const p = prefix.trim();
    if (!p) return [];
    // FTS5 prefix:`word*`。需要清理特殊字符。
    const cleaned = p.replace(/["'*()]/g, '').trim();
    if (!cleaned) return [];
    const matchExpr = `${cleaned}*`;

    type Row = { title: string };
    const rows = this.db
      .prepare<[string, string, number], Row>(
        `SELECT n.title AS title
         FROM notes_fts f
         JOIN notes n ON n.slug = f.slug
         WHERE notes_fts MATCH ?
           AND n.visibility = ?
         ORDER BY bm25(notes_fts)
         LIMIT ?`,
      )
      .all(matchExpr, 'public', Math.min(limit, 50));

    // 去重(同 title)
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of rows) {
      if (!seen.has(r.title)) {
        seen.add(r.title);
        out.push(r.title);
      }
    }
    return out;
  }

  /** 列出所有 (resolved) 链接(用于 graph 渲染)。 */
  listLinks(): { src: string; dst: string; kind: GraphEdge['kind'] }[] {
    type Row = { src_slug: string; dst_slug: string };
    const rows = this.db
      .prepare<unknown[], Row>(
        `SELECT src_slug, dst_slug
         FROM links
         WHERE dst_slug IS NOT NULL`,
      )
      .all();
    // 当前 schema 没有 kind 列,默认 'wikilink'
    return rows.map((r) => ({ src: r.src_slug, dst: r.dst_slug, kind: 'wikilink' as const }));
  }

  /**
   * 全图(只含 public + unlisted 节点)。
   * - nodes:含 degree(无向邻居数)、cluster(主标签)
   * - edges:src/dst 均存在的 resolved link
   */
  getGraph(): GraphData {
    type NoteLite = { slug: string; title: string; visibility: Visibility };
    const visibleNotes = this.db
      .prepare<unknown[], NoteLite>(
        `SELECT slug, title, visibility FROM notes
         WHERE visibility IN ('public','unlisted')
         ORDER BY slug`,
      )
      .all();
    const visibleSet = new Set(visibleNotes.map((n) => n.slug));

    const allLinks = this.listLinks();
    const edges: GraphEdge[] = allLinks.filter(
      (l) => visibleSet.has(l.src) && visibleSet.has(l.dst),
    );

    const tagsBySlug = this.tagsForSlugs(visibleNotes.map((n) => n.slug));

    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.src, (degree.get(e.src) ?? 0) + 1);
      degree.set(e.dst, (degree.get(e.dst) ?? 0) + 1);
    }

    const nodes: GraphNode[] = visibleNotes.map((n) => {
      const tags = tagsBySlug.get(n.slug) ?? [];
      return {
        id: n.slug,
        title: n.title,
        tags,
        degree: degree.get(n.slug) ?? 0,
        cluster: tags[0] ?? null,
      };
    });

    return { nodes, edges };
  }

  // -------- 内部 helpers --------

  private runFtsMatch(
    q: string,
    whereExtra: string,
    filterParams: unknown[],
    limit: number,
    offset: number,
  ): {
    slug: string;
    n_title: string;
    title_hl: string;
    body_hl: string;
    score: number;
    visibility: Visibility;
    updated_at: string;
  }[] {
    type Row = {
      slug: string;
      n_title: string;
      title_hl: string;
      body_hl: string;
      score: number;
      visibility: Visibility;
      updated_at: string;
    };
    try {
      return this.db
        .prepare<unknown[], Row>(
          `SELECT
             f.slug AS slug,
             n.title AS n_title,
             snippet(notes_fts, 1, '<mark>', '</mark>', '...', 12) AS title_hl,
             snippet(notes_fts, 2, '<mark>', '</mark>', '...', 32) AS body_hl,
             bm25(notes_fts) AS score,
             n.visibility AS visibility,
             n.updated_at AS updated_at
           FROM notes_fts f
           JOIN notes n ON n.slug = f.slug
           WHERE notes_fts MATCH ?
             ${whereExtra}
           ORDER BY bm25(notes_fts)
           LIMIT ? OFFSET ?`,
        )
        .all(q, ...filterParams, limit, offset);
    } catch {
      // FTS MATCH 解析失败(用户输入了 FTS 特殊字符)
      return [];
    }
  }

  private shouldRunLikeFallback(q: string): boolean {
    // 含 CJK 字符,或 query 长度过短,FTS 命中率可能偏低
    return /[一-鿿぀-ヿ가-힯]/.test(q) || q.length < 2;
  }

  private runLikeFallback(
    q: string,
    whereExtra: string,
    filterParams: unknown[],
    limit: number,
    offset: number,
  ): {
    slug: string;
    n_title: string;
    title_hl: string;
    body_hl: string;
    score: number;
    visibility: Visibility;
    updated_at: string;
  }[] {
    type Row = {
      slug: string;
      n_title: string;
      title_hl: string;
      body_hl: string;
      score: number;
      visibility: Visibility;
      updated_at: string;
    };
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    return this.db
      .prepare<unknown[], Row>(
        `SELECT
           n.slug AS slug,
           n.title AS n_title,
           n.title AS title_hl,
           SUBSTR(COALESCE(n.body_text, ''), 1, 200) AS body_hl,
           0.0 AS score,
           n.visibility AS visibility,
           n.updated_at AS updated_at
         FROM notes n
         WHERE (n.title LIKE ? ESCAPE '\\'
             OR n.body_text LIKE ? ESCAPE '\\'
             OR COALESCE(n.summary, '') LIKE ? ESCAPE '\\')
           AND n.searchable = 1
           ${whereExtra}
         ORDER BY n.updated_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(like, like, like, ...filterParams, limit, offset);
  }

  private tagsForSlugs(slugs: string[]): Map<string, string[]> {
    const out = new Map<string, string[]>();
    if (slugs.length === 0) return out;
    const placeholders = slugs.map(() => '?').join(',');
    const rows = this.db
      .prepare<string[], { slug: string; tag: string }>(
        `SELECT slug, tag FROM tags WHERE slug IN (${placeholders})`,
      )
      .all(...slugs);
    for (const r of rows) {
      const arr = out.get(r.slug);
      if (arr) arr.push(r.tag);
      else out.set(r.slug, [r.tag]);
    }
    return out;
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
      .run({
        short_id: link.short_id,
        slug: link.slug,
        created_at: link.created_at,
        tombstoned_at: link.tombstoned_at,
      });
  }

  getActive(slug: string): ShortLink | undefined {
    return this.db
      .prepare<[string], ShortLink>(
        `SELECT * FROM short_links WHERE slug = ? AND tombstoned_at IS NULL`,
      )
      .get(slug);
  }

  /** 通过 short_id 拉一行(包含 password_hash / 计数等)。 */
  getByShortId(shortId: string): ShortLink | undefined {
    return this.db
      .prepare<[string], ShortLink>(
        `SELECT * FROM short_links WHERE short_id = ?`,
      )
      .get(shortId);
  }

  tombstone(shortId: string): void {
    this.db
      .prepare('UPDATE short_links SET tombstoned_at = ? WHERE short_id = ?')
      .run(new Date().toISOString(), shortId);
  }

  /** 统计 N 天没有访问过的活跃短链。 */
  countIdle(days: number): number {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const row = this.db
      .prepare<[string], { c: number }>(
        `SELECT COUNT(*) AS c FROM short_links
         WHERE tombstoned_at IS NULL
           AND COALESCE(last_accessed_at, created_at) < ?`,
      )
      .get(cutoff);
    return row?.c ?? 0;
  }

  /** 列出 N 天没有访问过的活跃短链(默认上限 20),按最老优先。 */
  listIdle(days: number, limit = 20): ShortLink[] {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    return this.db
      .prepare<[string, number], ShortLink>(
        `SELECT * FROM short_links
         WHERE tombstoned_at IS NULL
           AND COALESCE(last_accessed_at, created_at) < ?
         ORDER BY COALESCE(last_accessed_at, created_at) ASC, short_id ASC
         LIMIT ?`,
      )
      .all(cutoff, limit);
  }

  /** 命中短链时调用 — 计数 + 1 并刷新 last_accessed_at。 */
  recordAccess(shortId: string): void {
    this.db
      .prepare(
        `UPDATE short_links
         SET access_count = access_count + 1, last_accessed_at = ?
         WHERE short_id = ?`,
      )
      .run(new Date().toISOString(), shortId);
  }

  /** 设置 / 移除短链密码。null = 移除。 */
  setPasswordHash(shortId: string, hash: string | null): void {
    this.db
      .prepare('UPDATE short_links SET password_hash = ? WHERE short_id = ?')
      .run(hash, shortId);
  }
}
