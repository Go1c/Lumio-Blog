import { describe, expect, it } from 'vitest';
import type { Features, SiteConfig } from '@opennote/core';
import { applyRuntimeConfig } from './runtime-config.js';

const baseConfig: SiteConfig = {
  site: {
    title: 'Lumio Blog',
    url: 'https://old.example',
    description: 'old',
    language: 'zh-CN',
  },
  author: { name: 'Lumio' },
  paths: { vault: '/vault', out: '/out', db: '/db.sqlite' },
  features: { comments: true, newsletter: true, search: true, graph: true, post_summary: false },
};

const freshConfig: SiteConfig = {
  site: {
    title: 'Lumio Blog',
    url: 'https://blog.lumio.games',
    description: 'Lumio games, tools, and engineering notes.',
    language: 'zh-CN',
  },
  author: { name: 'Lumio', bio: 'builder' },
  paths: { vault: '/new-vault', out: '/new-out', db: '/new-db.sqlite' },
  home: { hero_cta_primary: '看最新文章' },
};

const features: Features = {
  content: {
    comments: false,
    newsletter: false,
    rss: true,
    graph: false,
    search: true,
    short_links: true,
    post_summary: true,
  },
  admin: {
    analytics: true,
    media_library: true,
    api_tokens: true,
    webhooks: true,
    og_generator: true,
  },
  agent: {
    cli_enabled: true,
    mcp_enabled: true,
    mcp_tools: ['blog_search'],
  },
  webhooks: [],
};

describe('applyRuntimeConfig', () => {
  it('refreshes render-facing config without changing resolved runtime paths', () => {
    const runtime = structuredClone(baseConfig);

    applyRuntimeConfig(runtime, freshConfig, features);

    expect(runtime.site.url).toBe('https://blog.lumio.games');
    expect(runtime.site.description).toBe('Lumio games, tools, and engineering notes.');
    expect(runtime.author.bio).toBe('builder');
    expect(runtime.home?.hero_cta_primary).toBe('看最新文章');
    expect(runtime.features).toMatchObject({
      comments: false,
      newsletter: false,
      graph: false,
      search: true,
      post_summary: true,
    });
    expect(runtime.paths).toEqual(baseConfig.paths);
  });
});
