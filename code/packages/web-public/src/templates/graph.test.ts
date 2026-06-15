import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('graph client contract', () => {
  it('keeps a visible empty state when /api/graph returns no nodes', () => {
    const source = readFileSync(new URL('../../public/graph.js', import.meta.url), 'utf-8');

    expect(source).toContain('function showEmptyGraph');
    expect(source).toContain('if (!nodes.length)');
    expect(source).toContain('暂无可显示的公开文章');
    expect(source).toContain('renderLegend([])');
  });
});
