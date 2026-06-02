import { describe, expect, it } from 'vitest';
import { renderTagIndex } from './tag.js';

const config = {
  site: {
    title: 'Lumio Blog',
    url: 'https://blog.lumio.games',
    description: 'Lumio notes',
    language: 'zh-CN',
  },
  author: { name: 'Lumio' },
  paths: { vault: '/vault', out: '/out', db: '/db.sqlite' },
} as const;

describe('renderTagIndex empty state', () => {
  it('shows the Lumio tag cloud from the design handoff', () => {
    const html = renderTagIndex(new Map(), config);

    expect(html).toContain('page-head');
    expect(html).toContain('tagcloud');
    expect(html).toContain('渲染<span class="tag-pill__n">6</span>');
    expect(html).toContain('#渲染 下的文章');
    expect(html).not.toContain('<li>暂无</li>');
  });
});
