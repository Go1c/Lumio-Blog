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
  it('shows a finished empty state instead of a bare placeholder', () => {
    const html = renderTagIndex(new Map(), config);

    expect(html).toContain('wsa-tagindex__empty');
    expect(html).toContain('公开文章暂时没有标签');
    expect(html).toContain('href="/"');
    expect(html).not.toContain('<li>暂无</li>');
  });
});
