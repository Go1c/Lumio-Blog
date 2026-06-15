import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { HfAdSettings } from '@opennote/core';
import { groupAdsBySlot, readAds, summarizeAds } from './ads.js';

describe('readAds', () => {
  it('does not seed demo ads when settings have no ads configured', () => {
    expect(readAds({})).toEqual([]);
  });

  it('keeps legacy single home ad compatibility', () => {
    const ads = readAds({
      ad: {
        enabled: true,
        variant: 'native',
        title: 'Legacy Home Ad',
        cta_href: 'https://example.com',
      },
    });

    expect(ads).toHaveLength(1);
    expect(ads[0]).toMatchObject({
      id: 'legacy-home-ad',
      slot: 'home',
      title: 'Legacy Home Ad',
    });
  });
});

describe('ads page slot summary', () => {
  const ads: HfAdSettings[] = [
    { id: 'home-a', enabled: true, variant: 'native', slot: 'home', title: 'Home A', clicks: 12 },
    { id: 'home-b', enabled: true, variant: 'native', slot: 'home', title: 'Home B', clicks: 8 },
    { id: 'home-off', enabled: false, variant: 'native', slot: 'home', title: 'Off', clicks: 50 },
    { id: 'article-a', enabled: true, variant: 'native', slot: 'article', title: 'Article', clicks: 4 },
  ];

  it('groups configured ads by the design slots used in the page', () => {
    expect(groupAdsBySlot(ads)).toMatchObject({
      home: [ads[0], ads[1], ads[2]],
      article: [ads[3]],
      column: [],
    });
  });

  it('counts active ads and home carousel slides without seeding fake data', () => {
    expect(summarizeAds(ads)).toEqual({
      total: 4,
      active: 3,
      homeActive: 2,
      clicks: 74,
    });
  });

  it('asks the admin shell to refresh sidebar badges after ad count changes are saved', () => {
    const source = readFileSync(new URL('./ads.tsx', import.meta.url), 'utf-8');

    expect(source).toContain('requestAdminMenuCountsRefresh');
    expect(source).toContain('removeAd');
    expect(source).toContain('await api.settings.patch');
  });
});
