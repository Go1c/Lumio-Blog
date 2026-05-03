import type { Database } from 'better-sqlite3';

export interface TagCount {
  tag: string;
  count: number;
}

export interface TaggedNote {
  slug: string;
  title: string;
  visibility: string;
  updated_at: string;
}

/**
 * 简单的 tags 视图(只读),不写表。tags 表本身在 NoteRepo.upsert
 * 中维护,这里仅做聚合 / 查询。
 */
export class TagsRepo {
  constructor(private db: Database) {}

  /** 每个 tag 的笔记数。按数量倒序 → 字母序排。 */
  list(): TagCount[] {
    return this.db
      .prepare<unknown[], TagCount>(
        `SELECT tag, COUNT(DISTINCT slug) AS count
         FROM tags
         GROUP BY tag
         ORDER BY count DESC, tag ASC`,
      )
      .all();
  }

  /** 单个 tag 下的笔记。 */
  notesForTag(tag: string, limit = 200): TaggedNote[] {
    return this.db
      .prepare<[string, number], TaggedNote>(
        `SELECT n.slug, n.title, n.visibility, n.updated_at
         FROM tags t
         JOIN notes n ON n.slug = t.slug
         WHERE t.tag = ?
         ORDER BY n.updated_at DESC
         LIMIT ?`,
      )
      .all(tag, limit);
  }
}
