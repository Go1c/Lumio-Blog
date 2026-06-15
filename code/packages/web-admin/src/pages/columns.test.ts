import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { NoteSummary } from '../api.js';
import { columnDisplayMeta, groupNotesByColumn, publicColumnHref } from './columns.js';

function note(slug: string, sourcePath: string): NoteSummary {
  return {
    slug,
    title: slug,
    visibility: 'private',
    searchable: false,
    short_id: null,
    updated_at: '2026-06-01T00:00:00.000Z',
    word_count: 100,
    source_path: sourcePath,
  };
}

describe('columns grouping', () => {
  it('groups real notes by first source_path segment', () => {
    const columns = groupNotesByColumn([
      note('render-a', 'render/a.md'),
      note('render-b', 'render/b.md'),
      note('tools-a', 'tools/a.md'),
      note('root-a', 'root.md'),
    ]);

    expect(columns.map((c) => [c.label, c.notes.length])).toEqual([
      ['render', 2],
      ['tools', 1],
      ['未归档', 1],
    ]);
  });

  it('derives product-facing column metadata from the folder-backed summary', () => {
    const [column] = groupNotesByColumn([
      { ...note('render-a', 'render/a.md'), visibility: 'public', word_count: 2400 },
      { ...note('render-b', 'render/b.md'), visibility: 'unlisted', word_count: 1600 },
      { ...note('render-c', 'render/c.md'), visibility: 'private', word_count: 800 },
    ]);

    expect(column).toBeTruthy();
    const meta = columnDisplayMeta(column!);

    expect(meta.category).toBe('渲染');
    expect(meta.tone).toBe('blue');
    expect(meta.visibilityLabel).toBe('公开');
    expect(meta.includedCount).toBe(3);
    expect(meta.publicCount).toBe(1);
    expect(meta.limitedCount).toBe(1);
    expect(meta.privateCount).toBe(1);
    expect(meta).not.toHaveProperty('followersLabel');
    expect(meta).not.toHaveProperty('readsLabel');
    expect(meta.intro).toContain('render');
  });

  it('keeps folder-backed columns read-only instead of exposing fake column CRUD', () => {
    const source = readFileSync(new URL('./columns.tsx', import.meta.url), 'utf-8');

    expect(source).toContain('vault 一级目录驱动');
    expect(source).toContain('打开笔记库');
    expect(source).not.toContain('新建专栏');
    expect(source).not.toContain('管理专栏');
    expect(source).not.toContain('改名或新建专栏');
    expect(source).not.toContain('label="关注"');
    expect(source).not.toContain('label="阅读"');
  });

  it('links a folder-backed column to its public folder archive', () => {
    const [column] = groupNotesByColumn([
      note('render-a', 'render/a.md'),
      note('render-b', 'render/b.md'),
    ]);

    expect(publicColumnHref(column!)).toBe('/folders/render.html');
  });

  it('falls back to the public columns index for root-level notes without a folder archive', () => {
    const [column] = groupNotesByColumn([
      note('root-a', 'root.md'),
    ]);

    expect(publicColumnHref(column!)).toBe('/columns/index.html');
  });
});
