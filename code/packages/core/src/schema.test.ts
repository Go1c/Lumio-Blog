import { describe, expect, it } from 'vitest';
import { siteConfigSchema } from './schema.js';

describe('siteConfigSchema', () => {
  it('preserves render-facing home, theme, and seo settings from config.yaml', () => {
    const parsed = siteConfigSchema.parse({
      site: { title: 'Lumio Blog', url: 'https://blog.lumio.games', description: 'desc' },
      author: { name: 'Lumio', bio: 'bio' },
      paths: { vault: '/vault', out: '/out', db: '/db.sqlite' },
      theme: { accent: '#0066ff' },
      seo: { twitter_card: 'summary_large_image' },
      home: { hero_title_md: 'Lumio dev notes', hero_cta_primary: '读最新文章' },
    });

    expect(parsed.theme?.accent).toBe('#0066ff');
    expect(parsed.seo?.twitter_card).toBe('summary_large_image');
    expect(parsed.home?.hero_title_md).toBe('Lumio dev notes');
  });

  it('preserves other renderer-facing config fields instead of stripping them', () => {
    const parsed = siteConfigSchema.parse({
      site: { title: 'Lumio Blog', url: 'https://blog.lumio.games', locale: 'zh-CN' },
      author: { name: 'Lumio', bio_md: '**maker** notes' },
      paths: { vault: '/vault', out: '/out', db: '/db.sqlite' },
      features: { post_summary: true },
    });

    expect(parsed.site.locale).toBe('zh-CN');
    expect(parsed.author.bio_md).toBe('**maker** notes');
    expect(parsed.features?.post_summary).toBe(true);
  });
});
