import { describe, expect, it } from 'vitest';
import { renderNewsletter } from './newsletter.js';

const config = {
  site: {
    title: 'Lumio Blog',
    url: 'https://blog.lumio.games',
    description: 'Game tech notes',
    language: 'zh-CN',
  },
  author: { name: 'Lumio' },
  paths: { vault: '/vault', out: '/out', db: '/db.sqlite' },
} as const;

describe('renderNewsletter API contract', () => {
  it('reads recent issues from the implemented /api/newsletter/recent response shape', () => {
    const html = renderNewsletter(config);

    expect(html).toContain("var items = data && Array.isArray(data.issues) ? data.issues : Array.isArray(data) ? data : [];");
    expect(html).toContain('(it && it.subject)');
    expect(html).toContain('(it && it.sent_at)');
    expect(html).toContain('(it && it.excerpt)');
    expect(html).not.toContain("var d = (it && it.date) || '';");
    expect(html).not.toContain("var t = (it && it.title) || '(未命名)';");
    expect(html).not.toContain("var sub = (it && it.summary) || '';");
  });
});
