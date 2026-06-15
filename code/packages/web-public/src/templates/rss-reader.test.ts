import { describe, expect, it } from 'vitest';
import type { SiteConfig } from '@opennote/core';
import { renderRssReader } from './rss-reader.js';

describe('renderRssReader source-of-truth boundary', () => {
  it('only lists feed formats that are actually generated', () => {
    const html = renderRssReader(config());

    expect(html).toContain('/feed.xml');
    expect(html).toContain('RSS 2.0');
    expect(html).not.toContain('Atom 1.0');
    expect(html).not.toContain('JSON Feed');
    expect(html).not.toContain('atom.xml');
    expect(html).not.toContain('feed.json');
  });
});

function config(): SiteConfig {
  return {
    site: {
      title: 'Lumio Blog',
      url: 'https://blog.lumio.games',
      description: 'Game tech notes',
    },
    author: { name: 'Lumio' },
    paths: {
      vault: '/vault',
      out: '/out',
      db: '/tmp/opennote.db',
    },
  };
}
