import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Database } from 'better-sqlite3';
import { NoteRepo } from '@opennote/db';
import type { NoteRow, SiteConfig } from '@opennote/core';
import { ALL_CSS, publicLayout as publicLayoutFn } from '@opennote/ui/ssg';
import { renderHome } from './templates/home.js';
import { renderPost } from './templates/post.js';
import { renderFeed } from './templates/feed.js';
import { renderTagIndex, renderTagPage } from './templates/tag.js';

export interface RenderOptions {
  db: Database;
  out: string;
  config: SiteConfig;
}

export async function renderSite(opts: RenderOptions): Promise<void> {
  const repo = new NoteRepo(opts.db);
  const all = repo.listAll();
  const visible = all.filter((n) => n.visibility !== 'private');

  await mkdir(opts.out, { recursive: true });
  await mkdir(join(opts.out, 'posts'), { recursive: true });
  await mkdir(join(opts.out, 'tags'), { recursive: true });

  const publicNotes = visible.filter((n) => n.visibility === 'public');

  await writeFile(join(opts.out, 'index.html'), renderHome(publicNotes, opts.config), 'utf-8');

  for (const n of visible) {
    await writeFile(join(opts.out, 'posts', `${n.slug}.html`), renderPost(n, opts.config), 'utf-8');
  }

  // tag pages
  const byTag = new Map<string, NoteRow[]>();
  const tagRows = opts.db
    .prepare<unknown[], { slug: string; tag: string }>('SELECT slug, tag FROM tags').all();
  const noteBySlug = new Map(publicNotes.map((n) => [n.slug, n]));
  for (const t of tagRows) {
    const note = noteBySlug.get(t.slug);
    if (!note) continue;
    if (!byTag.has(t.tag)) byTag.set(t.tag, []);
    byTag.get(t.tag)!.push(note);
  }
  await writeFile(join(opts.out, 'tags', 'index.html'), renderTagIndex(byTag, opts.config), 'utf-8');
  for (const [tag, notes] of byTag) {
    await writeFile(
      join(opts.out, 'tags', `${encodeURIComponent(tag)}.html`),
      renderTagPage(tag, notes, opts.config), 'utf-8',
    );
  }

  await writeFile(join(opts.out, 'feed.xml'), renderFeed(publicNotes, opts.config), 'utf-8');
  await writeFile(join(opts.out, 'sitemap.xml'), renderSitemap(publicNotes, [...byTag.keys()], opts.config), 'utf-8');
  await writeFile(join(opts.out, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${opts.config.site.url}/sitemap.xml\n`, 'utf-8');
  await writeFile(join(opts.out, '404.html'), render404(opts.config), 'utf-8');
  await writeFile(join(opts.out, 'styles.css'), CSS, 'utf-8');
}

function renderSitemap(posts: NoteRow[], tags: string[], config: SiteConfig): string {
  const url = (path: string) => `<url><loc>${config.site.url}${path}</loc></url>`;
  const items = [
    url('/'),
    url('/tags/index.html'),
    ...posts.map((p) => url(`/posts/${p.slug}.html`)),
    ...tags.map((t) => url(`/tags/${encodeURIComponent(t)}.html`)),
  ].join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

function render404(config: SiteConfig): string {
  const body = `<h1>404</h1>
<p>你想找的页面不存在。它可能已被删除、设为私有、或地址敲错了。</p>
<p><a href="/">← 回首页</a></p>`;
  return publicLayoutFn({
    title: `404 · ${config.site.title}`,
    description: '页面未找到',
    config,
    body,
    noindex: true,
  });
}

/**
 * 公共站 CSS = ui 设计 token + primitives + 站点专属(article / shiki / katex / post-list 等)
 */
const APP_CSS = `
/* ---- legacy compat aliases for templates that reference older names ---- */
:root {
  --fg: var(--ink);
  --muted: var(--ink-3);
  --border: var(--line);
  --error-fg: #991b1b;
  --error-bg: #fee2e2;
}
html[data-theme="dark"] {
  --error-fg: #fca5a5;
  --error-bg: #450a0a;
}

/* ---- typography for article body ---- */
a { color: var(--accent); }
article h1 { font-size: 28px; margin-top: 0; }
article .meta { color: var(--ink-3); font-size: 14px; margin-bottom: 32px; }
article .meta .badge { display: inline-block; padding: 2px 8px; border: 1px solid var(--line); border-radius: 999px; margin-right: 8px; font-size: 12px; }
.post-list { list-style: none; padding: 0; }
.post-list li { padding: 16px 0; border-bottom: 1px solid var(--line); }
.post-list h2 { margin: 0 0 4px 0; font-size: 18px; }
.post-list h2 a { color: var(--ink); text-decoration: none; }
.post-list h2 a:hover { color: var(--accent); }
.post-list .summary { margin: 4px 0 0 0; color: var(--ink-3); font-size: 14px; }
.post-list .meta { color: var(--ink-3); font-size: 12px; margin-top: 4px; }
pre { background: var(--code-bg); padding: 16px; overflow: auto; border-radius: 6px; font-size: 13px; }
code { background: var(--code-bg); padding: 2px 5px; border-radius: 3px; font-size: 0.9em; font-family: var(--mono); }
pre code { background: none; padding: 0; font-size: 13px; }
blockquote { border-left: 3px solid var(--line); margin: 0; padding: 4px 16px; color: var(--ink-3); }
.opennote-broken-link { color: var(--ink-3); text-decoration: line-through dotted; cursor: help; }

/* shiki: keep auto light/dark via CSS variables produced at build */
.shiki { padding: 16px; border-radius: 6px; overflow: auto; font-size: 13px; }
.shiki code { background: none; padding: 0; }
html[data-theme="dark"] .shiki, html[data-theme="dark"] .shiki span {
  color: var(--shiki-dark) !important; background-color: var(--shiki-dark-bg) !important;
}
html[data-theme="light"] .shiki, html[data-theme="light"] .shiki span {
  color: var(--shiki-light) !important; background-color: var(--shiki-light-bg) !important;
}
@media (prefers-color-scheme: dark) {
  html:not([data-theme]) .shiki, html:not([data-theme]) .shiki span {
    color: var(--shiki-dark) !important; background-color: var(--shiki-dark-bg) !important;
  }
}
@media (prefers-color-scheme: light) {
  html:not([data-theme]) .shiki, html:not([data-theme]) .shiki span {
    color: var(--shiki-light) !important; background-color: var(--shiki-light-bg) !important;
  }
}

.mermaid { text-align: center; margin: 16px 0; }
.opennote-math-error { color: var(--error-fg); background: var(--error-bg); padding: 2px 6px; border-radius: 3px; }
.katex-display { overflow-x: auto; overflow-y: hidden; padding: 4px 0; }
`;

const CSS = ALL_CSS + '\n' + APP_CSS;
