import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Database } from 'better-sqlite3';
import { NoteRepo } from '@opennote/db';
import type { NoteRow, SiteConfig } from '@opennote/core';
import { ALL_CSS } from '@opennote/ui/ssg';
import { renderHome } from './templates/home.js';
import { renderPost } from './templates/post.js';
import { renderFeed } from './templates/feed.js';
import { renderTagIndex, renderTagPage } from './templates/tag.js';
import { renderNotFound } from './templates/notfound.js';
import { renderAbout } from './templates/about.js';

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

  // 标签 → notes(从 tags 表 join,只保留 public)
  const byTag = new Map<string, NoteRow[]>();
  const tagRows = opts.db
    .prepare<unknown[], { slug: string; tag: string }>('SELECT slug, tag FROM tags')
    .all();
  const noteBySlug = new Map(publicNotes.map((n) => [n.slug, n]));
  for (const t of tagRows) {
    const note = noteBySlug.get(t.slug);
    if (!note) continue;
    if (!byTag.has(t.tag)) byTag.set(t.tag, []);
    byTag.get(t.tag)!.push(note);
  }

  // home — 取最近 N 条作为 feed,recentNotes 取最新 4 条
  const homeLimit = opts.config.home?.show_recent_posts ?? 12;
  const homePosts = publicNotes.slice(0, homeLimit);
  const recentNotes = visible.slice(0, 4);
  await writeFile(
    join(opts.out, 'index.html'),
    renderHome(
      {
        posts: homePosts,
        byTag,
        recentNotes,
        totalArticles: publicNotes.length,
        totalNotes: visible.length,
      },
      opts.config,
    ),
    'utf-8',
  );

  // posts — 每篇文章渲染时,计算同主标签下的 series
  for (const n of visible) {
    const primaryTag = primaryTagOf(byTag, n.slug);
    const series = primaryTag
      ? (byTag.get(primaryTag) ?? []).filter((s) => s.slug !== n.slug)
      : [];
    await writeFile(
      join(opts.out, 'posts', `${n.slug}.html`),
      renderPost({ note: n, byTag, series }, opts.config),
      'utf-8',
    );
  }

  // tag pages
  await writeFile(
    join(opts.out, 'tags', 'index.html'),
    renderTagIndex(byTag, opts.config),
    'utf-8',
  );
  for (const [tag, notes] of byTag) {
    await writeFile(
      join(opts.out, 'tags', `${encodeURIComponent(tag)}.html`),
      renderTagPage(tag, notes, byTag, opts.config),
      'utf-8',
    );
  }

  // about
  await writeFile(join(opts.out, 'about.html'), renderAbout(opts.config), 'utf-8');

  // 静态产物
  await writeFile(join(opts.out, 'feed.xml'), renderFeed(publicNotes, opts.config), 'utf-8');
  await writeFile(
    join(opts.out, 'sitemap.xml'),
    renderSitemap(publicNotes, [...byTag.keys()], opts.config),
    'utf-8',
  );
  await writeFile(
    join(opts.out, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${opts.config.site.url}/sitemap.xml\n`,
    'utf-8',
  );

  // 404 — 默认 missing 场景,带 popular_posts(取阅读时长最长的 3 篇)
  const popular = [...publicNotes].sort((a, b) => b.reading_minutes - a.reading_minutes).slice(0, 3);
  await writeFile(
    join(opts.out, '404.html'),
    renderNotFound({ reason: 'missing', popular }, opts.config),
    'utf-8',
  );

  await writeFile(join(opts.out, 'styles.css'), CSS, 'utf-8');
}

function primaryTagOf(byTag: Map<string, NoteRow[]>, slug: string): string | null {
  for (const [tag, notes] of byTag) {
    if (notes.some((n) => n.slug === slug)) return tag;
  }
  return null;
}

function renderSitemap(posts: NoteRow[], tags: string[], config: SiteConfig): string {
  const url = (path: string) => `<url><loc>${config.site.url}${path}</loc></url>`;
  const items = [
    url('/'),
    url('/about.html'),
    url('/tags/index.html'),
    ...posts.map((p) => url(`/posts/${p.slug}.html`)),
    ...tags.map((t) => url(`/tags/${encodeURIComponent(t)}.html`)),
  ].join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

/**
 * 公共站 CSS = ui 设计 token + primitives + 站点专属(article / shiki / katex / ws-a 模板)
 */
const APP_CSS = `
/* ---- legacy compat aliases for templates that reference older names ---- */
:root {
  --fg: var(--ink);
  --muted: var(--ink-3);
  --border: var(--line);
}

/* ---- typography for article body ---- */
a { color: var(--accent); }
.post-list { list-style: none; padding: 0; }
pre { background: var(--code-bg); padding: 16px; overflow: auto; border-radius: 6px; font-size: 13px; }
code { background: var(--code-bg); padding: 2px 5px; border-radius: 3px; font-size: 0.9em; font-family: var(--mono); }
pre code { background: none; padding: 0; font-size: 13px; }
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

/* ====================================================================== */
/* WS-A — public 内容页样式                                                  */
/* ====================================================================== */

/* hero blob animation (re-declared here so prototype-style classes work) */
@keyframes wsa-blob-a { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,-15px) scale(1.05)} 66%{transform:translate(-15px,12px) scale(.97)} }
@keyframes wsa-blob-b { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-22px,18px) scale(1.08)} }
.hf-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: .55;
  pointer-events: none;
}
.hf-divider { height: 1px; background: var(--line); border: 0; margin: 0; }
.hf-hover:hover { background: var(--bg-soft); }

/* 把 ui-public__main 的窄容器限制还原成宽容器,内容页要三栏 */
body.ui-public { background: var(--bg); }
.ui-public__main { max-width: none; padding: 0; margin: 0; }

/* override footer to be wider */
.ui-public__footer { max-width: 1280px; }

/* ---- prose for article body (h2 / h3 / blockquote / callout) ---- */
.hf-prose { font-size: 15px; line-height: 1.78; color: var(--ink); }
.hf-prose p { margin: 0 0 14px; }
.hf-prose h2 {
  font-size: 22px; font-weight: 700;
  margin: 32px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--line);
  scroll-margin-top: 80px;
}
.hf-prose h3 {
  font-size: 17px; font-weight: 700;
  margin: 24px 0 10px;
  scroll-margin-top: 80px;
}
.hf-prose code:not(.shiki code) {
  font-family: var(--mono); font-size: 13px;
  background: var(--bg-sunk);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--accent);
}
.hf-prose blockquote {
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  margin: 14px 0;
  padding: 10px 16px;
  color: var(--ink-2);
  border-radius: 0 6px 6px 0;
}
.hf-prose a {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

/* ---- HOME ---- */
.wsa-home { width: 100%; }
.wsa-hero {
  position: relative;
  padding: 64px 28px 48px;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
}
.wsa-hero__inner { position: relative; max-width: 920px; margin: 0 auto; }
.wsa-hero__blob-a {
  width: 360px; height: 360px;
  background: var(--accent);
  top: -80px; right: -40px;
  animation: wsa-blob-a 18s ease-in-out infinite;
}
.wsa-hero__blob-b {
  width: 260px; height: 260px;
  background: #a855f7;
  bottom: -60px; left: 200px;
  animation: wsa-blob-b 22s ease-in-out infinite;
}
.wsa-hero__pre { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.wsa-hero__title {
  font-size: 52px; font-weight: 900;
  line-height: 1.1; margin: 0;
  letter-spacing: -0.02em;
}
.wsa-hero__intro {
  font-size: 17px; color: var(--ink-3);
  max-width: 620px; margin-top: 16px;
  line-height: 1.65;
}
.wsa-hero__cta { display: flex; gap: 10px; margin-top: 24px; flex-wrap: wrap; }

.wsa-grid {
  display: grid;
  grid-template-columns: 220px 1fr 260px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 28px;
  gap: 0;
}

/* LEFT catalog */
.wsa-cat { padding-right: 24px; border-right: 1px solid var(--line); min-width: 0; }
.wsa-cat__head {
  color: var(--ink-4);
  text-transform: uppercase;
  margin-bottom: 10px;
  letter-spacing: .05em;
}
.wsa-cat__group { margin-bottom: 16px; }
.wsa-cat__title { font-weight: 700; font-size: 13px; margin-bottom: 6px; }
.wsa-cat__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }
.wsa-cat__row {
  display: flex; justify-content: space-between;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--ink-2);
  text-decoration: none;
  min-height: 32px;
  align-items: center;
}
.wsa-cat__row:hover { background: var(--bg-soft); color: var(--ink); }
.wsa-cat__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* MIDDLE feed */
.wsa-feed { padding: 0 24px; min-width: 0; }
.wsa-feed__head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; }
.wsa-feed__h { font-size: 22px; font-weight: 700; margin: 0; }
.wsa-empty { color: var(--ink-3); }

.wsa-pinned {
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 10px;
  margin-bottom: 16px;
  background: linear-gradient(180deg, var(--bg) 0%, var(--bg-soft) 100%);
  position: relative;
}
.wsa-pinned__badge { position: absolute; top: 12px; right: 12px; }
.wsa-pinned__tags {
  display: flex; gap: 6px; flex-wrap: wrap;
  margin: 0 0 8px; padding: 0; list-style: none;
}
.wsa-pinned__title { font-size: 22px; font-weight: 700; line-height: 1.3; margin: 0; }
.wsa-pinned__title a { color: inherit; text-decoration: none; }
.wsa-pinned__title a:hover { color: var(--accent); }
.wsa-pinned__sum { color: var(--ink-3); font-size: 14px; line-height: 1.6; margin: 8px 0 12px; }
.wsa-pinned__meta { display: flex; gap: 12px; color: var(--ink-4); flex-wrap: wrap; }

.wsa-row {
  padding: 16px 4px;
  border-bottom: 1px solid var(--line);
  display: grid;
  grid-template-columns: 60px 1fr auto;
  gap: 16px;
  align-items: start;
}
.wsa-row__date { padding-top: 4px; }
.wsa-row__title { font-size: 15px; font-weight: 600; margin: 0; line-height: 1.4; }
.wsa-row__title a { color: inherit; text-decoration: none; }
.wsa-row__title a:hover { color: var(--accent); }
.wsa-row__sum { color: var(--ink-3); font-size: 13px; margin: 6px 0 0; line-height: 1.6; }
.wsa-row__tags { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0 0; padding: 0; list-style: none; }
.wsa-row__meta { padding-top: 4px; text-align: right; line-height: 1.5; }

/* RIGHT side */
.wsa-side { padding-left: 24px; border-left: 1px solid var(--line); min-width: 0; }
.wsa-side__profile { text-align: center; }
.wsa-side__avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #a855f7);
  margin: 0 auto 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-family: var(--mono); font-size: 22px; font-weight: 700;
}
.wsa-side__name { font-weight: 700; font-size: 15px; }
.wsa-side__bio { margin-top: 2px; }
.wsa-side__social {
  display: flex; justify-content: center; gap: 6px;
  margin: 10px 0 0; padding: 0; list-style: none; flex-wrap: wrap;
}
.wsa-side__section { margin-top: 24px; }
.wsa-side__h {
  color: var(--ink-3);
  text-transform: uppercase;
  margin: 0 0 10px;
  letter-spacing: .05em;
  font-size: 11px;
  font-weight: 700;
}
.wsa-side__notes { display: flex; flex-direction: column; gap: 10px; list-style: none; padding: 0; margin: 0; }
.wsa-side__note {
  display: block;
  padding: 8px 10px;
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
}
.wsa-side__note-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
.wsa-side__note-title { font-weight: 500; line-height: 1.4; }
.wsa-side__cloud { display: flex; flex-wrap: wrap; gap: 5px; list-style: none; padding: 0; margin: 0; }

/* ---- POST ---- */
.wsa-post { width: 100%; position: relative; }
.wsa-progress {
  position: sticky;
  top: 56px;
  z-index: 9;
  height: 2px;
  background: transparent;
}
.wsa-progress__bar {
  height: 2px;
  width: 0%;
  background: var(--accent);
  transition: width .15s;
}
.wsa-post__grid {
  display: grid;
  grid-template-columns: 200px 1fr 280px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 32px 24px;
  gap: 20px;
}
.wsa-post__left { min-width: 0; }
.wsa-series, .wsa-outline {
  list-style: none; padding: 0;
  margin: 0 0 24px;
  display: flex; flex-direction: column; gap: 2px;
}
.wsa-series__row {
  display: block;
  padding: 5px 10px; border-radius: 4px;
  font-size: 13px; color: var(--ink-2);
  border-left: 2px solid transparent;
  text-decoration: none;
}
.wsa-series__row:hover { background: var(--bg-soft); color: var(--ink); }
.wsa-outline__item { padding: 0; }
.wsa-outline__item a {
  display: block;
  padding: 4px 10px;
  border-left: 2px solid var(--line);
  color: var(--ink-3);
  font-size: 12px;
  text-decoration: none;
}
.wsa-outline__item a:hover { color: var(--accent); }
.wsa-outline__item--3 a { padding-left: 22px; font-size: 11px; }

.wsa-actbar {
  display: flex; gap: 6px;
  padding: 8px;
  background: var(--bg-soft);
  border-radius: 8px;
  border: 1px solid var(--line);
}

.wsa-post__main { padding: 0 8px; min-width: 0; position: relative; }
.wsa-post__tags {
  display: flex; gap: 6px; flex-wrap: wrap;
  margin: 0 0 12px; padding: 0; list-style: none;
}
.wsa-post__title {
  font-size: 36px; font-weight: 800;
  line-height: 1.2; margin: 0;
  letter-spacing: -0.01em;
}
.wsa-post__summary { font-size: 18px; color: var(--ink-3); margin-top: 8px; font-weight: 400; line-height: 1.5; }
.wsa-post__meta { margin-top: 14px; display: flex; gap: 12px; color: var(--ink-4); flex-wrap: wrap; align-items: center; }
.wsa-post__divider { margin: 20px 0; }
.wsa-prose { min-width: 0; }

.wsa-cta {
  display: flex; gap: 14px;
  align-items: center;
  padding: 16px;
  background: var(--bg-soft);
  border-radius: 10px;
}
.wsa-cta__avatar {
  width: 50px; height: 50px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #a855f7);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-family: var(--mono); font-weight: 700; font-size: 18px;
  flex-shrink: 0;
}
.wsa-cta__name { font-weight: 700; }
.wsa-cta__sub { margin-top: 2px; }

.wsa-post__right { min-width: 0; }
.wsa-comments-stub {
  position: sticky; top: 80px;
  padding: 12px 14px;
  background: var(--bg-soft);
  border: 1px dashed var(--line-strong);
  border-radius: 8px;
}
.wsa-comments-stub__msg { margin: 8px 0 0; }

/* ---- TAG ---- */
.wsa-tag { width: 100%; }
.wsa-tag__head {
  padding: 40px 28px 20px;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
}
.wsa-tag__blob {
  width: 280px; height: 280px;
  background: var(--accent);
  top: -80px; right: 80px;
  animation: wsa-blob-a 18s ease-in-out infinite;
}
.wsa-tag__head-inner { position: relative; max-width: 1100px; margin: 0 auto; }
.wsa-tag__crumbs { margin-bottom: 6px; }
.wsa-tag__crumbs a { color: var(--ink-3); }
.wsa-tag__h {
  font-size: 44px; font-weight: 900;
  line-height: 1.1; margin: 0;
  letter-spacing: -0.02em;
}
.wsa-tag__desc {
  font-size: 15px; color: var(--ink-3);
  max-width: 600px; margin-top: 10px;
  line-height: 1.65;
}
.wsa-tag__stats {
  display: flex; gap: 14px;
  margin: 16px 0 0; padding: 0;
  list-style: none; align-items: center;
  font-size: 13px; color: var(--ink-3);
  flex-wrap: wrap;
}
.wsa-tag__stats b { color: var(--ink); font-family: var(--mono); }
.wsa-tag__stats-spacer { flex: 1; }

.wsa-tag__grid {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 28px;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
}
.wsa-tag__main { min-width: 0; }
.wsa-tag__year { margin-bottom: 32px; }
.wsa-tag__year-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.wsa-tag__year-h { font-size: 18px; font-weight: 700; margin: 0; }
.wsa-tag__row {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  gap: 14px;
  padding: 14px 6px;
  border-bottom: 1px solid var(--line);
  align-items: start;
}
.wsa-tag__date { padding-top: 3px; }
.wsa-tag__title { font-size: 15px; font-weight: 500; margin: 0; line-height: 1.4; }
.wsa-tag__title a { color: inherit; text-decoration: none; }
.wsa-tag__title a:hover { color: var(--accent); }
.wsa-tag__sum { margin: 4px 0 0; line-height: 1.5; }
.wsa-tag__meta { padding-top: 3px; text-align: right; }
.wsa-tag__side { min-width: 0; }
.wsa-tag__related { display: flex; flex-wrap: wrap; gap: 5px; list-style: none; padding: 0; margin: 0 0 24px; }
.wsa-tag__hot {
  display: block;
  padding: 8px 0;
  text-decoration: none;
  color: inherit;
}
.wsa-tag__hot--bordered { border-top: 1px solid var(--line); }
.wsa-tag__hot-title { font-weight: 500; line-height: 1.4; }
.wsa-tag__hot-meta { margin-top: 2px; }

/* ---- TAG INDEX ---- */
.wsa-tagindex { max-width: 1100px; margin: 0 auto; padding: 48px 28px; }
.wsa-tagindex__head { margin-bottom: 24px; }
.wsa-tagindex__title { font-size: 36px; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
.wsa-tagindex__list { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin: 0; }

/* ---- 404 ---- */
.wsa-404 {
  max-width: 720px; margin: 0 auto;
  padding: 64px 24px;
  text-align: center;
}
.wsa-404__visual { position: relative; display: inline-block; margin-bottom: 24px; }
.wsa-404__big {
  font-family: var(--mono); font-size: 140px; font-weight: 900;
  color: var(--ink); line-height: 1; letter-spacing: -0.05em;
}
.wsa-404__big--ghost {
  position: absolute; inset: 0;
  color: var(--accent); opacity: .35;
  mix-blend-mode: difference;
  transform: translate(3px, 2px);
}
.wsa-404__title {
  font-size: 28px; font-weight: 800;
  margin: 0; letter-spacing: -0.01em;
}
.wsa-404__sub {
  font-size: 15px; color: var(--ink-3);
  max-width: 480px; margin: 14px auto 0;
  line-height: 1.7;
}
.wsa-404__diag {
  margin: 32px auto 0; max-width: 480px; padding: 16px;
  background: var(--bg-soft);
  border: 1px solid var(--line);
  border-radius: 8px;
  text-align: left;
}
.wsa-404__diag .wsa-side__h { margin-bottom: 8px; }
.wsa-404__diag-body { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.wsa-404__diag-row { display: flex; gap: 8px; }
.wsa-404__diag-key { width: 100px; flex-shrink: 0; }
.wsa-404__cta { display: flex; gap: 10px; justify-content: center; margin-top: 28px; flex-wrap: wrap; }
.wsa-404__alts { margin-top: 40px; text-align: left; }
.wsa-404__alts-list { list-style: none; padding: 0; margin: 0; }
.wsa-404__alts-list li { border-top: 1px solid var(--line); }
.wsa-404__alt { display: block; padding: 10px 0; text-decoration: none; color: inherit; }
.wsa-404__alt-title { font-size: 14px; font-weight: 500; }
.wsa-404__alt-meta { margin-top: 2px; }

/* ---- ABOUT ---- */
.wsa-about { max-width: 760px; margin: 0 auto; padding: 56px 24px; }
.wsa-about__hero { display: flex; align-items: center; gap: 20px; margin-bottom: 28px; flex-wrap: wrap; }
.wsa-about__avatar {
  width: 88px; height: 88px; border-radius: 16px;
  background: linear-gradient(135deg, var(--accent), #a855f7);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--mono); font-weight: 800; font-size: 38px;
  box-shadow: 0 12px 32px rgba(0, 102, 255, .25);
  flex-shrink: 0;
}
.wsa-about__pre { margin-bottom: 4px; }
.wsa-about__title {
  font-size: 36px; font-weight: 900;
  margin: 0; letter-spacing: -0.02em;
  line-height: 1.1;
}
.wsa-about__sub { margin-top: 6px; }
.wsa-about__bio {
  font-size: 15px; line-height: 1.85; color: var(--ink-2);
  margin-bottom: 20px;
}
.wsa-about__bio p { margin: 0 0 14px; }
.wsa-about__sec-h { margin: 40px 0 14px; }
.wsa-about__card { padding: 18px; }
.wsa-about__contact { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.wsa-about__contact-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
}
.wsa-about__contact-platform { min-width: 100px; flex-shrink: 0; }
.wsa-about__contact-handle { color: var(--accent); font-weight: 500; }
.wsa-about__subscribe { display: flex; gap: 10px; flex-wrap: wrap; }

/* ---- responsive (粗略,详细 mobile 在 WS-C) ---- */
@media (max-width: 900px) {
  .wsa-grid { grid-template-columns: 1fr; }
  .wsa-cat, .wsa-side { padding: 0; border: 0; }
  .wsa-feed { padding: 0; }
  .wsa-post__grid { grid-template-columns: 1fr; }
  .wsa-tag__grid { grid-template-columns: 1fr; }
  .wsa-about__contact { grid-template-columns: 1fr; }
  .wsa-hero__title { font-size: 36px; }
  .wsa-post__title { font-size: 28px; }
}
`;

const CSS = ALL_CSS + '\n' + APP_CSS;
