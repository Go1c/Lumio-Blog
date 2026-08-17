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

  it('only touches the extensions it is told about', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'opennote-render-ext-'));
    await writeFile(join(dir, 'stale.html'), 'stale');
    await writeFile(join(dir, 'stale.md'), 'stale');

    await removeStaleHtmlFiles(dir, new Set(), ['.md']);

    expect(await exists(join(dir, 'stale.html'))).toBe(true);
    expect(await exists(join(dir, 'stale.md'))).toBe(false);
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

describe('renderSite GEO outputs', () => {
  it('emits llms.txt, llms-full.txt and raw markdown sourced from the vault', async () => {
    const out = await mkdtemp(join(tmpdir(), 'opennote-geo-'));
    const vault = await mkdtemp(join(tmpdir(), 'opennote-geo-vault-'));
    await mkdir(join(vault, 'blog'), { recursive: true });
    await writeFile(
      join(vault, 'blog', 'from-vault.md'),
      '---\ntitle: 来自 vault\n---\n\n## 背景\n\n真正的 markdown 正文。\n',
      'utf-8',
    );

    await renderSite({
      db: fakeDb([
        note({
          slug: 'from-vault',
          title: '来自 vault',
          summary: '一句话摘要。',
          source_path: 'blog/from-vault.md',
        }),
        note({ slug: 'fallback', title: '回退正文', body_text: 'body text fallback' }),
      ]),
      out,
      config: { ...config, paths: { ...config.paths, vault } },
    });

    const llms = await readFile(join(out, 'llms.txt'), 'utf-8');
    expect(llms.startsWith('# Lumio Blog\n')).toBe(true);
    expect(llms).toContain('> Lumio notes');
    expect(llms).toContain(
      '- [来自 vault](https://blog.lumio.games/posts/from-vault.html): 一句话摘要。',
    );

    const raw = await readFile(join(out, 'posts', 'from-vault.md'), 'utf-8');
    expect(raw).toContain('# 来自 vault');
    expect(raw).toContain('- 来源: https://blog.lumio.games/posts/from-vault.html');
    expect(raw).toContain('## 背景\n\n真正的 markdown 正文。');
    expect(raw).not.toContain('title: 来自 vault');

    // vault 里没有对应文件时回退 body_text
    const fallback = await readFile(join(out, 'posts', 'fallback.md'), 'utf-8');
    expect(fallback).toContain('body text fallback');

    const full = await readFile(join(out, 'llms-full.txt'), 'utf-8');
    expect(full).toContain('共 2 篇');
    expect(full).toContain('真正的 markdown 正文。');
    expect(full).toContain('body text fallback');
  });

  it('skips raw markdown for canvas and html notes and for noindex notes', async () => {
    const out = await mkdtemp(join(tmpdir(), 'opennote-geo-kind-'));

    await renderSite({
      db: fakeDb([
        note({ slug: 'md', kind: 'markdown' }),
        note({ slug: 'board', kind: 'canvas' }),
        note({ slug: 'page', kind: 'html' }),
        note({ slug: 'hidden', seo_indexable: 0 }),
      ]),
      out,
      config,
    });

    expect(await exists(join(out, 'posts', 'md.md'))).toBe(true);
    expect(await exists(join(out, 'posts', 'board.md'))).toBe(false);
    expect(await exists(join(out, 'posts', 'page.md'))).toBe(false);
    expect(await exists(join(out, 'posts', 'hidden.md'))).toBe(false);
    // HTML 页面照常产出,只是没有 markdown 端点
    expect(await exists(join(out, 'posts', 'board.html'))).toBe(true);
  });

  it('removes orphaned markdown files left by deleted notes', async () => {
    const out = await mkdtemp(join(tmpdir(), 'opennote-geo-stale-'));
    await mkdir(join(out, 'posts'), { recursive: true });
    await writeFile(join(out, 'posts', 'gone.md'), 'stale markdown');

    await renderSite({ db: fakeDb([note({ slug: 'kept' })]), out, config });

    expect(await exists(join(out, 'posts', 'gone.md'))).toBe(false);
    expect(await exists(join(out, 'posts', 'kept.md'))).toBe(true);
  });

  it('writes a robots.txt that names the AI crawler tokens', async () => {
    const out = await mkdtemp(join(tmpdir(), 'opennote-geo-robots-'));

    await renderSite({ db: fakeDb([note({ slug: 'a' })]), out, config });

    const robots = await readFile(join(out, 'robots.txt'), 'utf-8');
    expect(robots).toContain('User-agent: GPTBot');
    expect(robots).toContain('User-agent: ClaudeBot');
    expect(robots).toContain('User-agent: PerplexityBot');
    expect(robots).toContain('Disallow: /admin/');
    expect(robots).toContain('Sitemap: https://blog.lumio.games/sitemap.xml');
  });

  it('honours a config.seo.robots override verbatim', async () => {
    const out = await mkdtemp(join(tmpdir(), 'opennote-geo-robots-override-'));

    await renderSite({
      db: fakeDb([note({ slug: 'a' })]),
      out,
      config: { ...config, seo: { robots: 'User-agent: *\nDisallow: /private/' } },
    });

    const robots = await readFile(join(out, 'robots.txt'), 'utf-8');
    expect(robots).toBe('User-agent: *\nDisallow: /private/\n');
  });

  it('gives every sitemap post entry a lastmod and can be turned off entirely', async () => {
    const out = await mkdtemp(join(tmpdir(), 'opennote-geo-sitemap-'));

    await renderSite({ db: fakeDb([note({ slug: 'a' })]), out, config });
    const sitemap = await readFile(join(out, 'sitemap.xml'), 'utf-8');
    expect(sitemap).toContain(
      '<url><loc>https://blog.lumio.games/posts/a.html</loc><lastmod>2026-06-01T00:00:00.000Z</lastmod></url>',
    );
    expect(sitemap).toContain('<loc>https://blog.lumio.games/folders/index.html</loc>');

    const off = await mkdtemp(join(tmpdir(), 'opennote-geo-sitemap-off-'));
    await renderSite({
      db: fakeDb([note({ slug: 'a' })]),
      out: off,
      config: { ...config, seo: { sitemap: false } },
    });
    expect(await exists(join(off, 'sitemap.xml'))).toBe(false);
    expect(await readFile(join(off, 'robots.txt'), 'utf-8')).not.toContain('Sitemap:');
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

  it('constrains body markdown images without touching the cover hero', () => {
    const styles = composeStyles('');

    // 正文 markdown 图片被约束
    const imgRule = styles.indexOf('.post-prose.hf-prose img {');
    expect(imgRule).toBeGreaterThan(-1);
    const imgBlock = styles.slice(imgRule, imgRule + 240);
    expect(imgBlock).toContain('max-width: min(100%, 860px)');
    expect(imgBlock).toContain('height: auto');
    expect(imgBlock).toContain('display: block');

    // 顶部 cover hero 仍然使用 object-fit: cover,未被正文图片样式影响
    expect(styles).toContain('.post-hero__img { width: 100%; height: 100%; object-fit: cover; display: block; }');
    expect(styles).not.toContain('.post-hero__img { display: block; max-width');
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
    ...(overrides.kind ? { kind: overrides.kind } : {}),
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
