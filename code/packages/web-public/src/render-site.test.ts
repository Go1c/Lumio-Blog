import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Database } from 'better-sqlite3';
import type { NoteRow, SiteConfig } from '@opennote/core';
import { describe, expect, it } from 'vitest';
import { composeStyles, HTML_ALIAS_FILES, removeStaleHtmlFiles, renderSite, STATIC_ASSETS } from './render-site.js';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('removeStaleHtmlFiles', () => {
  it('removes generated html files that are no longer expected', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'opennote-render-'));
    await mkdir(join(dir, 'nested'));
    await writeFile(join(dir, 'keep.html'), 'keep');
    await writeFile(join(dir, 'stale.html'), 'stale');
    await writeFile(join(dir, 'asset.txt'), 'asset');

    await removeStaleHtmlFiles(dir, new Set(['keep.html']));

    expect(await exists(join(dir, 'keep.html'))).toBe(true);
    expect(await exists(join(dir, 'stale.html'))).toBe(false);
    expect(await readFile(join(dir, 'asset.txt'), 'utf-8')).toBe('asset');
    expect(await exists(join(dir, 'nested'))).toBe(true);
  });
});

describe('renderSite visibility', () => {
  it('keeps private notes off the home page and static post output', async () => {
    const out = await mkdtemp(join(tmpdir(), 'opennote-render-site-'));
    await mkdir(join(out, 'posts'), { recursive: true });
    await writeFile(join(out, 'posts', 'private.html'), 'stale private');

    await renderSite({
      db: fakeDb([
        note({ slug: 'public', title: 'Public note', visibility: 'public' }),
        note({ slug: 'unlisted', title: 'Unlisted note', visibility: 'unlisted' }),
        note({ slug: 'link-only', title: 'Link-only note', visibility: 'link-only' }),
        note({ slug: 'private', title: 'Private note', visibility: 'private' }),
      ]),
      out,
      config,
    });

    const home = await readFile(join(out, 'index.html'), 'utf-8');
    expect(home).toContain('Public note');
    expect(home).not.toContain('Unlisted note');
    expect(home).not.toContain('Link-only note');
    expect(home).not.toContain('Private note');
    expect(await exists(join(out, 'posts', 'public.html'))).toBe(true);
    expect(await exists(join(out, 'posts', 'unlisted.html'))).toBe(true);
    expect(await exists(join(out, 'posts', 'link-only.html'))).toBe(true);
    expect(await exists(join(out, 'posts', 'private.html'))).toBe(false);
  });
});

describe('static assets', () => {
  it('includes a root favicon so browsers do not hit a 404', () => {
    expect(STATIC_ASSETS).toContain('favicon.ico');
  });

  it('publishes extensionless-friendly aliases for about and RSS URLs', () => {
    expect(HTML_ALIAS_FILES).toContainEqual({ source: 'about.html', alias: 'about/index.html' });
    expect(HTML_ALIAS_FILES).toContainEqual({ source: 'feed.xml', alias: 'rss.xml' });
  });
});

describe('composeStyles', () => {
  it('keeps Lumio text tokens scoped after global dark-mode fallback', () => {
    const styles = composeStyles('');
    const darkFallbackIndex = styles.indexOf('@media (prefers-color-scheme: dark)');
    const lumioBodyIndex = styles.indexOf('body.ui-public.lumio-public {\n  --primary: #7C8CFF;');

    expect(darkFallbackIndex).toBeGreaterThan(-1);
    expect(lumioBodyIndex).toBeGreaterThan(darkFallbackIndex);
    expect(styles.slice(lumioBodyIndex)).toContain('--ink: #1E2A3A;');
    expect(styles.slice(lumioBodyIndex)).toContain('color-scheme: light;');
  });

  it('appends Lumio article contrast overrides after Obsidian prose defaults', () => {
    const obsidianCss = '.hf-prose { color: var(--ob-text-normal); }';
    const styles = composeStyles(obsidianCss);
    const obsidianIndex = styles.indexOf(obsidianCss);
    const lumioIndex = styles.indexOf('body.ui-public.lumio-public .post-prose {');

    expect(obsidianIndex).toBeGreaterThan(-1);
    expect(lumioIndex).toBeGreaterThan(obsidianIndex);
    expect(styles).toContain('--ob-text-normal: #1E2A3A');
    expect(styles).toContain('body.ui-public.lumio-public .post-prose.hf-prose p');
    expect(styles).toContain('color: #1E2A3A');
  });
});

const config: SiteConfig = {
  site: {
    title: 'Lumio Blog',
    url: 'https://blog.lumio.games',
    description: 'Lumio notes',
    language: 'zh-CN',
  },
  author: { name: 'Lumio' },
  paths: { vault: '/vault', out: '/out', db: '/db.sqlite' },
};

function note(overrides: Partial<NoteRow> = {}): NoteRow {
  const now = '2026-06-01T00:00:00.000Z';
  return {
    slug: overrides.slug ?? 'slug',
    title: overrides.title ?? 'Title',
    summary: overrides.summary ?? '',
    body_html: overrides.body_html ?? '<p>Body</p>',
    body_text: overrides.body_text ?? 'Body',
    visibility: overrides.visibility ?? 'public',
    searchable: overrides.searchable ?? 1,
    seo_indexable: overrides.seo_indexable ?? 1,
    rss_includable: overrides.rss_includable ?? 1,
    featured_on_home: overrides.featured_on_home ?? 0,
    short_id: overrides.short_id ?? null,
    source_path: overrides.source_path ?? `Posts/${overrides.slug ?? 'slug'}.md`,
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
    published_at: overrides.published_at ?? now,
    scheduled_at: overrides.scheduled_at ?? null,
    word_count: overrides.word_count ?? 100,
    reading_minutes: overrides.reading_minutes ?? 1,
    cover: overrides.cover ?? null,
    hash: overrides.hash ?? 'hash',
  };
}

function fakeDb(notes: NoteRow[]): Database {
  return {
    prepare(sql: string) {
      return {
        all() {
          if (sql.includes('FROM notes') && sql.includes('ORDER BY updated_at')) return notes;
          return [];
        },
      };
    },
  } as unknown as Database;
}
