import { describe, expect, it } from 'vitest';
import { defaultFeatures, platformPromoSchema, siteConfigSchema } from './schema.js';

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

  it('keeps platform_promo as-is so a bad promo config cannot break the site config', () => {
    const parsed = siteConfigSchema.parse({
      site: { title: 'Lumio Blog', url: 'https://blog.lumio.games' },
      author: { name: 'Lumio' },
      paths: { vault: '/vault', out: '/out', db: '/db.sqlite' },
      platform_promo: { enabled: true, sources: [{ kind: 'video' }] },
    });
    expect(parsed.platform_promo).toEqual({ enabled: true, sources: [{ kind: 'video' }] });
  });

  it('fills platform_promo defaults', () => {
    expect(platformPromoSchema.parse({ enabled: true, sources: [{ kind: 'game', blocked: ['g-vxidb3apsj'] }] })).toEqual({
      enabled: true,
      limit: 3,
      utm: { source: 'blog', medium: 'left_rail' },
      sources: [
        {
          kind: 'game',
          board: 'hot',
          pinned: [],
          blocked: ['g-vxidb3apsj'],
          link: 'detail',
          locale: 'zh-CN',
          base_url: 'https://lumiogames.cn',
          utm_campaign: 'platform_games',
        },
      ],
    });
  });

  it('defaults platform_promo sources to one game source and rejects unknown kinds', () => {
    expect(platformPromoSchema.parse({ enabled: true }).sources).toMatchObject([{ kind: 'game', board: 'hot' }]);
    expect(platformPromoSchema.safeParse({ sources: [{ kind: 'video' }] }).success).toBe(false);
  });

  it('defaults local workflow features to the CLI entrypoint only', () => {
    expect(defaultFeatures().workflow).toEqual({ cli_enabled: true });
    expect(defaultFeatures()).not.toHaveProperty('agent');
  });
});
