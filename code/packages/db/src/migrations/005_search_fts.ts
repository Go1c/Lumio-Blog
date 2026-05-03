/**
 * Migration 005 — Search FTS5 (WS-G2)
 *
 * 升级 `notes_fts`:
 * - 列扩展为 `slug, title, body_md, summary, tags`
 *   (body_md 实际从 notes.body_text 填充——最接近的可用文本字段)
 * - tokenizer: `unicode61 remove_diacritics 2`
 * - 用 contentless FTS5(`content=''`),用触发器 + 上层代码混合维护
 * - 触发器:notes 表 INSERT/UPDATE/DELETE → 同步 FTS;
 *   tags 表 INSERT/DELETE → 重写所属笔记的 tags 列
 * - 同时把现有 notes 行 populate 进新表
 *
 * 注意:`notes` 表的主键是 `slug` (TEXT),没有数值 `id` 列。
 * FTS5 的 `content_rowid` 必须是 INTEGER,所以这里用 contentless 模式,
 * rowid 自动生成,我们用 `slug` 作为外部主键 (UNINDEXED 列做 lookup)。
 */
export const migration005 = {
  version: 5,
  name: 'search_fts',
  up: `
    -- 1) 删旧的 (v1 创建的 notes_fts 只有 slug,title,body_text)
    DROP TABLE IF EXISTS notes_fts;

    -- 2) 新建 contentless FTS5
    CREATE VIRTUAL TABLE notes_fts USING fts5(
      slug UNINDEXED,
      title,
      body_md,
      summary,
      tags,
      tokenize = 'unicode61 remove_diacritics 2'
    );

    -- 3) 触发器:notes 写入时同步 FTS
    --    只索引 searchable=1 且 visibility != 'private' 的笔记
    CREATE TRIGGER notes_ai_fts
    AFTER INSERT ON notes
    WHEN NEW.searchable = 1 AND NEW.visibility != 'private'
    BEGIN
      INSERT INTO notes_fts (slug, title, body_md, summary, tags)
      VALUES (
        NEW.slug,
        NEW.title,
        COALESCE(NEW.body_text, ''),
        COALESCE(NEW.summary, ''),
        COALESCE((SELECT GROUP_CONCAT(tag, ' ') FROM tags WHERE slug = NEW.slug), '')
      );
    END;

    CREATE TRIGGER notes_au_fts
    AFTER UPDATE ON notes
    BEGIN
      DELETE FROM notes_fts WHERE slug = OLD.slug;
      INSERT INTO notes_fts (slug, title, body_md, summary, tags)
      SELECT
        NEW.slug,
        NEW.title,
        COALESCE(NEW.body_text, ''),
        COALESCE(NEW.summary, ''),
        COALESCE((SELECT GROUP_CONCAT(tag, ' ') FROM tags WHERE slug = NEW.slug), '')
      WHERE NEW.searchable = 1 AND NEW.visibility != 'private';
    END;

    CREATE TRIGGER notes_ad_fts
    AFTER DELETE ON notes
    BEGIN
      DELETE FROM notes_fts WHERE slug = OLD.slug;
    END;

    -- 4) 触发器:tags 改变时,同步对应笔记 FTS 行的 tags 列
    --    简单做法 — 删掉再插
    CREATE TRIGGER tags_ai_fts
    AFTER INSERT ON tags
    BEGIN
      DELETE FROM notes_fts WHERE slug = NEW.slug;
      INSERT INTO notes_fts (slug, title, body_md, summary, tags)
      SELECT
        n.slug,
        n.title,
        COALESCE(n.body_text, ''),
        COALESCE(n.summary, ''),
        COALESCE((SELECT GROUP_CONCAT(tag, ' ') FROM tags WHERE slug = n.slug), '')
      FROM notes n
      WHERE n.slug = NEW.slug
        AND n.searchable = 1
        AND n.visibility != 'private';
    END;

    CREATE TRIGGER tags_ad_fts
    AFTER DELETE ON tags
    BEGIN
      DELETE FROM notes_fts WHERE slug = OLD.slug;
      INSERT INTO notes_fts (slug, title, body_md, summary, tags)
      SELECT
        n.slug,
        n.title,
        COALESCE(n.body_text, ''),
        COALESCE(n.summary, ''),
        COALESCE((SELECT GROUP_CONCAT(tag, ' ') FROM tags WHERE slug = n.slug), '')
      FROM notes n
      WHERE n.slug = OLD.slug
        AND n.searchable = 1
        AND n.visibility != 'private';
    END;

    -- 5) Populate 现有数据(注意:此时 notes_fts 已是新 schema,旧数据已被 DROP)
    INSERT INTO notes_fts (slug, title, body_md, summary, tags)
    SELECT
      n.slug,
      n.title,
      COALESCE(n.body_text, ''),
      COALESCE(n.summary, ''),
      COALESCE((SELECT GROUP_CONCAT(t.tag, ' ') FROM tags t WHERE t.slug = n.slug), '')
    FROM notes n
    WHERE n.searchable = 1 AND n.visibility != 'private';
  `,
};
