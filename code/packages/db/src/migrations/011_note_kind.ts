/**
 * Migration 011 — notes.kind
 *
 * 区分笔记原文形态:markdown / canvas / html。
 * 老数据全部按 markdown 回填(它们都是 .md);新 sync pipeline 按文件扩展名写入。
 *
 * 用途:
 *  - web-public 渲染时给不同 kind 套不同 host wrapper(canvas / html embed)
 *  - 后续给 admin UI 一个筛选维度
 */

export const migration011NoteKind = {
  version: 11,
  name: 'note_kind',
  up: `
    ALTER TABLE notes ADD COLUMN kind TEXT NOT NULL DEFAULT 'markdown'
      CHECK (kind IN ('markdown', 'canvas', 'html'));

    -- 已有数据全是 .md → 已经默认 markdown,无需 backfill
    CREATE INDEX idx_notes_kind ON notes(kind);
  `,
} as const;
