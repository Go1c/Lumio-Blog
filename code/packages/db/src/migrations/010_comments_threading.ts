/**
 * Migration 010 — Comments threading + anchor
 *
 * - parent_id: 楼中楼回复(NULL = 顶层)
 * - anchor:    JSON {mid, quote},把评论钉在正文某段被划线的句子上
 *
 * 旧行 parent_id 全 NULL,anchor 全 NULL → 行为完全兼容。
 */
export const migration010CommentsThreading = {
  version: 10,
  name: 'comments_threading',
  up: `
    ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;
    ALTER TABLE comments ADD COLUMN anchor    TEXT;

    CREATE INDEX idx_comments_parent_id ON comments(parent_id);
  `,
} as const;
