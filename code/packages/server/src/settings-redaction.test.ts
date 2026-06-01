import { describe, expect, it } from 'vitest';
import type { AdminSettings } from '@opennote/core';
import { redactSettingsPatch, sanitizeAdminSettingsForClient } from './routes/settings.js';

const settings: AdminSettings = {
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
    agent: {
      cli_enabled: true,
      mcp_enabled: true,
      mcp_tools: [],
    },
    webhooks: [],
  },
  fns: {
    enabled: true,
    api_url: 'https://fastnode.example',
    token: 'super-secret-token',
    vault: 'notes',
    last_status: 'connected',
  },
};

describe('settings redaction', () => {
  it('does not return the stored FNS token to admin clients', () => {
    const safe = sanitizeAdminSettingsForClient(settings);

    expect(safe.fns?.token).toBe('');
    expect(safe.fns?.token_set).toBe(true);
    expect(settings.fns?.token).toBe('super-secret-token');
  });

  it('redacts FNS token values before audit logging', () => {
    const redacted = redactSettingsPatch({
      fns: { enabled: true, token: 'new-secret-token', vault: 'notes' },
    });

    expect(redacted).toEqual({
      fns: { enabled: true, token: '[redacted]', vault: 'notes' },
    });
  });
});
