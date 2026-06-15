import { describe, expect, it } from 'vitest';
import { renderAbout } from './about.js';

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

describe('renderAbout stats', () => {
  it('renders real site stats when render-site provides them', () => {
    const html = renderAbout(config, {
      articles: 3,
      columns: 2,
      tags: 5,
      years: 1,
    });

    expect(html).toContain('<div class="stat__n">3</div><div class="stat__l">文章</div>');
    expect(html).toContain('<div class="stat__n">2</div><div class="stat__l">专栏</div>');
    expect(html).toContain('<div class="stat__n">5</div><div class="stat__l">标签</div>');
    expect(html).toContain('<div class="stat__n">1年</div><div class="stat__l">持续创作</div>');
    expect(html).not.toContain('128+');
    expect(html).not.toContain('15k+');
  });

  it('keeps the design fallback when no content stats are available', () => {
    const html = renderAbout(config);

    expect(html).toContain('128+');
    expect(html).toContain('24+');
    expect(html).toContain('15k+');
    expect(html).toContain('3年+');
    expect(html).toContain('href="https://blog.lumio.games"');
    expect(html).toContain('href="/feed.xml"');
    expect(html).not.toContain('${rssIcon()}');
  });

  it('renders configured author avatar, social links, and email on the about card', () => {
    const html = renderAbout({
      ...config,
      author: {
        name: 'Cui',
        email: 'cui@example.com',
        avatar: 'https://cdn.example.com/cui.png',
        social: [
          { platform: 'Mastodon', url: 'https://social.example/@cui' },
          { platform: 'GitHub', url: 'https://github.com/cui' },
        ],
      },
    });

    expect(html).toContain('src="https://cdn.example.com/cui.png"');
    expect(html).toContain('href="https://social.example/@cui"');
    expect(html).toContain('aria-label="Mastodon"');
    expect(html).toContain('href="https://github.com/cui"');
    expect(html).toContain('href="mailto:cui@example.com"');
    expect(html).not.toContain('https://github.com/Go1c');
    expect(html).not.toContain('mailto:hello@lumio.games');
  });

  it('presents the bottom email form as newsletter subscription instead of contact', () => {
    const html = renderAbout(config, {
      articles: 3,
      columns: 2,
      tags: 5,
      years: 1,
    });

    expect(html).toContain('action="/api/newsletter/subscribe"');
    expect(html).toContain('订阅更新');
    expect(html).not.toContain('联系我们');
    expect(html).not.toContain('合作、投稿或交流');
  });
});
