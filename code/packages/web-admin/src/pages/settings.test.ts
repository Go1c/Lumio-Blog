import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { AdminSettings } from '@opennote/core';
import { pickPatch, validateSection } from './settings.js';

function baseSettings(fns: NonNullable<AdminSettings['fns']>): AdminSettings {
  return {
    site: { title: 'Lumio Blog', url: 'https://blog.lumio.games' },
    author: { name: 'Lumio' },
    theme: {},
    seo: {},
    home: {},
    features: {
      content: {
        comments: true,
        newsletter: true,
        rss: true,
        graph: true,
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
      workflow: {
        cli_enabled: true,
      },
      webhooks: [],
    },
    fns,
  };
}

describe('settings FNS token form helpers', () => {
  it('allows an existing server-side token to stay hidden and unchanged', () => {
    const draft = baseSettings({
      enabled: true,
      api_url: 'https://fastnode.example',
      token: '',
      token_set: true,
      vault: 'notes',
    });

    expect(validateSection('fns', draft)).not.toHaveProperty('fns.token');
    expect(pickPatch('fns', draft).fns).not.toHaveProperty('token');
  });

  it('sends a new token when the owner types one', () => {
    const draft = baseSettings({
      enabled: true,
      api_url: 'https://fastnode.example',
      token: 'new-token',
      token_set: true,
      vault: 'notes',
    });

    expect(pickPatch('fns', draft).fns).toMatchObject({ token: 'new-token' });
  });
});

describe('settings product copy', () => {
  it('does not expose the removed Blog CLI surface in admin settings copy', () => {
    const source = readFileSync(new URL('./settings.tsx', import.meta.url), 'utf-8');

    expect(source).toContain('本地预览 / 同步配置');
    expect(source).not.toContain('CLI / 本地预览');
    expect(source).not.toContain('CLI 用 wss://');
  });
});
