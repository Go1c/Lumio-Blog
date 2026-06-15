import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildTagTableRows, filterTagTableRows } from './tags.js';

describe('tag management table rows', () => {
  it('adds proportion, usage weight, and read-only trend status for synchronized tags', () => {
    const rows = buildTagTableRows([
      { tag: '渲染', count: 12 },
      { tag: 'AI', count: 4 },
      { tag: '周报', count: 1 },
    ]);

    expect(rows.map((row) => [row.tag, row.ratioLabel, row.weightLabel, row.trendLabel])).toEqual([
      ['渲染', '70.6%', '高频', '同步聚合'],
      ['AI', '23.5%', '中频', '同步聚合'],
      ['周报', '5.9%', '低频', '同步聚合'],
    ]);
    expect(rows[0]?.weightClass).toBe('is-big');
  });

  it('filters table rows by tag name without changing the original ordering', () => {
    const rows = buildTagTableRows([
      { tag: '渲染', count: 12 },
      { tag: 'AI', count: 4 },
      { tag: 'AI Agent', count: 3 },
    ]);

    expect(filterTagTableRows(rows, 'ai').map((row) => row.tag)).toEqual(['AI', 'AI Agent']);
    expect(filterTagTableRows(rows, '').map((row) => row.tag)).toEqual(['渲染', 'AI', 'AI Agent']);
  });

  it('keeps frontmatter-synchronized tags read-only while exposing design-aligned operation guidance', () => {
    const source = readFileSync(new URL('./tags.tsx', import.meta.url), 'utf-8');

    expect(source).toContain('frontmatter <code>tags:</code>');
    expect(source).toContain('标签来源说明');
    expect(source).toContain('<th scope="col">趋势</th>');
    expect(source).toContain('<th scope="col">操作</th>');
    expect(source).toContain('在 Obsidian 中维护');
    expect(source).not.toContain('explainFrontmatterAction');
    expect(source).not.toContain('新建标签');
    expect(source).not.toContain('重命名');
    expect(source).not.toContain('合并');
    expect(source).not.toContain('删除标签');
  });
});
