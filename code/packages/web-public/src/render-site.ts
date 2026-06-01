import { mkdir, writeFile, copyFile, access, readFile, readdir, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from 'better-sqlite3';
import { NoteRepo } from '@opennote/db';
import type { NoteRow, SiteConfig } from '@opennote/core';
import { ALL_CSS } from '@opennote/ui/ssg';
import { CANVAS_RUNTIME_JS, HTML_EMBED_RUNTIME_JS } from '@opennote/obsidian';
import { renderHome } from './templates/home.js';
import { renderPost } from './templates/post.js';
import { buildNeighborhood } from './partials/backlinks-graph.js';
import { renderFeed } from './templates/feed.js';
import { renderTagIndex, renderTagPage } from './templates/tag.js';
import { renderFolderIndex, renderFolderPage } from './templates/folder.js';
import { renderNotFound } from './templates/notfound.js';
import { renderAbout } from './templates/about.js';
import { renderRssReader, RSS_READER_CSS } from './templates/rss-reader.js';
import { renderCliDocs } from './templates/cli-docs.js';
import { renderSearch } from './templates/search.js';
import { renderGraph } from './templates/graph.js';
import { renderNewsletter } from './templates/newsletter.js';
import { HOME_MOBILE_CSS } from './templates/home.js';
import { POST_MOBILE_CSS } from './templates/post.js';
import { TAG_MOBILE_CSS } from './templates/tag.js';
import { HF_AD_CSS } from './partials/hf-ad.js';

export interface RenderOptions {
  db: Database;
  out: string;
  config: SiteConfig;
}

export const STATIC_ASSETS = ['feed.xsl', 'search.js', 'graph.js', 'comments.js', 'favicon.ico'] as const;
export const HTML_ALIAS_FILES = [
  { source: 'about.html', alias: 'about/index.html' },
  { source: 'feed.xml', alias: 'rss.xml' },
] as const;

export async function renderSite(opts: RenderOptions): Promise<void> {
  const repo = new NoteRepo(opts.db);
  const all = repo.listAll();
  const visible = all.filter((n) => n.visibility !== 'private');

  await mkdir(opts.out, { recursive: true });
  await mkdir(join(opts.out, 'posts'), { recursive: true });
  await mkdir(join(opts.out, 'tags'), { recursive: true });
  await mkdir(join(opts.out, 'feed'), { recursive: true });

  const publicNotes = visible.filter((n) => n.visibility === 'public');
  await removeStaleHtmlFiles(
    join(opts.out, 'posts'),
    new Set(visible.map((n) => `${n.slug}.html`)),
  );

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

  // 从 source_path 提取顶层文件夹(只统计 public 文章)
  const folderCountMap = new Map<string, number>();
  for (const n of publicNotes) {
    const slash = n.source_path.indexOf('/');
    if (slash > 0) {
      const folder = n.source_path.slice(0, slash);
      folderCountMap.set(folder, (folderCountMap.get(folder) ?? 0) + 1);
    }
  }
  const folders = [...folderCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  await writeFile(
    join(opts.out, 'index.html'),
    renderHome(
      {
        posts: homePosts,
        byTag,
        recentNotes,
        totalArticles: publicNotes.length,
        totalNotes: visible.length,
        folders,
      },
      opts.config,
    ),
    'utf-8',
  );

  // posts — 每篇文章渲染时,计算同主标签下的 series + 1-hop 邻居图
  const visibleSlugSet = new Set(visible.map((n) => n.slug));
  for (const n of visible) {
    const primaryTag = primaryTagOf(byTag, n.slug);
    const series = primaryTag
      ? (byTag.get(primaryTag) ?? []).filter((s) => s.slug !== n.slug)
      : [];
    // 1-hop 邻居:backlinks ∪ outlinks(只保留可见笔记,不暴露 private)
    const backlinksRaw = repo.backlinks(n.slug);
    const outlinksRaw = repo.outlinks(n.slug);
    const neighborhood = buildNeighborhood({
      slug: n.slug,
      title: n.title,
      backlinks: backlinksRaw.filter((b) => visibleSlugSet.has(b.src_slug)),
      outlinks: outlinksRaw
        .filter((o) => o.dst_slug && visibleSlugSet.has(o.dst_slug))
        .map((o) => ({ dst_slug: o.dst_slug, title: o.title })),
    });
    await writeFile(
      join(opts.out, 'posts', `${n.slug}.html`),
      renderPost({ note: n, byTag, series, neighborhood }, opts.config),
      'utf-8',
    );
  }

  // tag pages
  await writeFile(
    join(opts.out, 'tags', 'index.html'),
    renderTagIndex(byTag, opts.config),
    'utf-8',
  );
  await removeStaleHtmlFiles(
    join(opts.out, 'tags'),
    new Set(['index.html', ...[...byTag.keys()].map((t) => `${encodeURIComponent(t)}.html`)]),
  );
  for (const [tag, notes] of byTag) {
    await writeFile(
      join(opts.out, 'tags', `${encodeURIComponent(tag)}.html`),
      renderTagPage(tag, notes, byTag, opts.config),
      'utf-8',
    );
  }

  // folder pages — public 笔记按 vault 顶层文件夹归档(home 左栏 “📁 文件夹” 跳转目标)
  await mkdir(join(opts.out, 'folders'), { recursive: true });
  await writeFile(
    join(opts.out, 'folders', 'index.html'),
    renderFolderIndex(folders, opts.config),
    'utf-8',
  );
  await removeStaleHtmlFiles(
    join(opts.out, 'folders'),
    new Set(['index.html', ...folders.map((f) => `${encodeURIComponent(f.name)}.html`)]),
  );
  for (const f of folders) {
    const items = publicNotes.filter((n) => {
      const slash = n.source_path.indexOf('/');
      return slash > 0 && n.source_path.slice(0, slash) === f.name;
    });
    await writeFile(
      join(opts.out, 'folders', `${encodeURIComponent(f.name)}.html`),
      renderFolderPage(f.name, items, folders, opts.config),
      'utf-8',
    );
  }

  // about
  await writeFile(join(opts.out, 'about.html'), renderAbout(opts.config), 'utf-8');

  // WS-B — search / graph / newsletter
  await mkdir(join(opts.out, 'search'), { recursive: true });
  await writeFile(
    join(opts.out, 'search', 'index.html'),
    renderSearch(opts.config),
    'utf-8',
  );
  if (opts.config.features?.graph !== false) {
    await mkdir(join(opts.out, 'graph'), { recursive: true });
    await writeFile(
      join(opts.out, 'graph', 'index.html'),
      renderGraph(opts.config),
      'utf-8',
    );
  }
  if (opts.config.features?.newsletter !== false) {
    await mkdir(join(opts.out, 'newsletter'), { recursive: true });
    await writeFile(
      join(opts.out, 'newsletter', 'index.html'),
      renderNewsletter(opts.config),
      'utf-8',
    );
  }

  // CLI docs (WS-H) — /cli/index.html
  await mkdir(join(opts.out, 'cli'), { recursive: true });
  await writeFile(
    join(opts.out, 'cli', 'index.html'),
    renderCliDocs(opts.config),
    'utf-8',
  );

  // RSS 美化阅读页(WS-C)
  await writeFile(
    join(opts.out, 'feed', 'index.html'),
    renderRssReader(opts.config),
    'utf-8',
  );

  // 静态产物 — RSS 用 rss_includable=1 维度过滤;sitemap 用 seo_indexable=1。
  // 老库未跑 migration 时,这两列都不存在 → 回退到 publicNotes(由 backfill 把 searchable
  // 复制过来,语义和 v0.6 之前一致)。
  const rssNotes = publicNotes.filter((n) => (n.rss_includable ?? 1) === 1);
  const seoNotes = publicNotes.filter((n) => (n.seo_indexable ?? 1) === 1);
  await writeFile(join(opts.out, 'feed.xml'), renderFeed(rssNotes, opts.config), 'utf-8');
  await copyHtmlAliases(opts.out);

  // 复制 public/feed.xsl(WS-C — 浏览器直接打开 feed.xml 时美化渲染)
  await copyStaticAssets(opts.out);
  await writeFile(
    join(opts.out, 'sitemap.xml'),
    renderSitemap(seoNotes, [...byTag.keys()], opts.config),
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

  // CSS = ui token + 站点 CSS + obsidian.css(运行时 readFile,避免 build 时 inline)
  const obsidianCss = await readObsidianCss();
  await writeFile(join(opts.out, 'styles.css'), CSS + '\n' + obsidianCss, 'utf-8');

  // 注入 obsidian 客户端运行时(canvas panzoom + html-embed iframe 自适应)
  await writeFile(
    join(opts.out, 'obsidian-runtime.js'),
    `${CANVAS_RUNTIME_JS}\n${HTML_EMBED_RUNTIME_JS}`,
    'utf-8',
  );
}

async function copyHtmlAliases(out: string): Promise<void> {
  for (const item of HTML_ALIAS_FILES) {
    const target = join(out, item.alias);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(out, item.source), target);
  }
}

export async function removeStaleHtmlFiles(dir: string, expected: Set<string>): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.html') && !expected.has(entry.name))
      .map((entry) => unlink(join(dir, entry.name))),
  );
}

/** 读 @opennote/obsidian 包的 obsidian.css。dev / build 两种 import.meta.url 都能命中。 */
async function readObsidianCss(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    // dev: <repo>/code/packages/web-public/src/render-site.ts → ../../obsidian/src/styles/obsidian.css
    join(here, '..', '..', 'obsidian', 'src', 'styles', 'obsidian.css'),
    // build: <repo>/code/packages/web-public/dist/render-site.js → ../../obsidian/src/styles/obsidian.css
    join(here, '..', '..', 'obsidian', 'src', 'styles', 'obsidian.css'),
    // node_modules link
    join(here, '..', 'node_modules', '@opennote', 'obsidian', 'src', 'styles', 'obsidian.css'),
  ];
  for (const p of candidates) {
    try {
      return await readFile(p, 'utf-8');
    } catch {
      continue;
    }
  }
  return '';
}

/**
 * 复制 public/ 下的静态资源:
 *  - feed.xsl    (WS-C)
 *  - search.js   (WS-B)
 *  - graph.js    (WS-B)
 *  - comments.js (WS-B)
 *
 * 容忍 dev 环境下 public/ 不存在(silent skip)。
 */
async function copyStaticAssets(out: string): Promise<void> {
  // 这个文件位于 src/ 或 dist/。public/ 是包根的兄弟目录。
  // import.meta.url -> .../packages/web-public/src/render-site.ts (开发) 或 .../dist/render-site.js (build)
  const here = dirname(fileURLToPath(import.meta.url));
  for (const name of STATIC_ASSETS) {
    const candidates = [
      join(here, '..', 'public', name),         // src/  -> ../public
      join(here, '..', '..', 'public', name),   // dist/ -> ../../public
    ];
    for (const src of candidates) {
      try {
        await access(src);
        await copyFile(src, join(out, name));
        break;
      } catch {
        // try next candidate
      }
    }
    // 没找到 → silent skip(build 仍然能跑通)
  }
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
    url('/feed/'),
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

/* ---- typography for article body — 主体 prose 在 obsidian.css 里 ---- */
a { color: var(--accent); }
.post-list { list-style: none; padding: 0; }
.opennote-broken-link { color: var(--ink-3); text-decoration: line-through dotted; cursor: help; }
.opennote-math-error { color: var(--error-fg); background: var(--error-bg); padding: 2px 6px; border-radius: 3px; }

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

/* ---- prose for article body — 由 @opennote/obsidian/styles/obsidian.css 提供 ---- */
/* (此处保留 host wrappers,obsidian.css 接管 .hf-prose / .ob-canvas / .ob-html-embed) */
.ob-canvas-host { padding: 0; margin: 0; }
.ob-html-host { padding: 0; margin: 0; }

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

/* PR-F — 文章左栏 1-hop backlinks 小图 (A-2) */
.wsa-minigraph {
  margin: 0 0 24px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg-soft);
}
.wsa-minigraph__svg {
  display: block;
  overflow: visible;
}
.wsa-minigraph__edge {
  stroke: var(--line-strong, var(--line));
  stroke-width: 1;
  opacity: 0.7;
}
.wsa-minigraph__node {
  fill: var(--bg);
  stroke: var(--line-strong, var(--line));
  stroke-width: 1.5;
  transition: fill .15s, stroke .15s, r .15s;
}
.wsa-minigraph__node--center {
  fill: var(--accent);
  stroke: var(--accent);
}
.wsa-minigraph__nodelink { cursor: pointer; }
.wsa-minigraph__nodelink:hover .wsa-minigraph__node--neighbor,
.wsa-minigraph__nodelink:focus-visible .wsa-minigraph__node--neighbor {
  fill: var(--accent);
  stroke: var(--accent);
}
.wsa-minigraph__nodelink:hover .wsa-minigraph__label,
.wsa-minigraph__nodelink:focus-visible .wsa-minigraph__label {
  fill: var(--accent);
}
.wsa-minigraph__label {
  font-family: var(--mono, ui-monospace, monospace);
  font-size: 10px;
  fill: var(--ink-3);
  pointer-events: none;
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

// ====================================================================== /
// WS-B — public 交互页样式(search / graph / comments / newsletter)         /
// ====================================================================== /
const WSB_CSS = `
/* ---- SEARCH ---- */
.wsb-search { width: 100%; }
.wsb-search__bar {
  padding: 24px 28px;
  border-bottom: 1px solid var(--line);
  background: var(--bg-soft);
}
.wsb-search__bar-inner { max-width: 1100px; margin: 0 auto; position: relative; }
.wsb-search__form {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: var(--bg);
  border: 1px solid var(--line-strong);
  border-radius: 8px;
}
.wsb-search__form:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.wsb-search__icon { color: var(--ink-3); display: inline-flex; }
.wsb-search__form:focus-within .wsb-search__icon { color: var(--accent); }
.wsb-search__input {
  flex: 1; min-width: 0;
  border: 0; outline: none;
  background: transparent;
  font: inherit; font-size: 16px;
  color: var(--ink);
}
.wsb-search__kbd { white-space: nowrap; }
.wsb-search__status { margin-top: 8px; min-height: 18px; }
.wsb-search__suggest {
  position: absolute; left: 0; right: 0; top: calc(100% + 4px);
  list-style: none; padding: 4px; margin: 0;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow-2, 0 8px 24px rgba(0,0,0,.08));
  z-index: 20;
  max-height: 320px; overflow: auto;
}
.wsb-search__suggest li {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  min-height: 32px;
  display: flex; align-items: center;
}
.wsb-search__suggest li:hover { background: var(--bg-soft); color: var(--accent); }

.wsb-search__grid {
  display: grid;
  grid-template-columns: 200px 1fr;
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 28px;
  gap: 24px;
}
.wsb-search__filters { min-width: 0; }
.wsb-search__facet { margin-bottom: 22px; }
.wsb-search__facet-h {
  color: var(--ink-4);
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: .05em;
}
.wsb-search__facet-list { display: flex; flex-direction: column; gap: 2px; }
.wsb-search__facet-item {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 10px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--ink-2);
  min-height: 28px;
}
.wsb-search__facet-item input {
  appearance: none; -webkit-appearance: none;
  width: 12px; height: 12px;
  border: 1.5px solid var(--line-strong);
  border-radius: 50%;
  display: inline-block;
  position: relative;
  flex-shrink: 0;
}
.wsb-search__facet-item input:checked { border-color: var(--accent); }
.wsb-search__facet-item input:checked::after {
  content: ''; position: absolute; inset: 2px;
  background: var(--accent); border-radius: 50%;
}
.wsb-search__facet-item.is-active {
  background: var(--accent-soft); color: var(--accent); font-weight: 600;
}
.wsb-search__facet-item span:nth-of-type(1) { flex: 1; }

.wsb-search__main { min-width: 0; }
.wsb-search__sort { margin-bottom: 12px; }
.wsb-search__empty {
  padding: 64px 24px; text-align: center;
}
.wsb-search__empty-icon { color: var(--ink-4); margin-bottom: 12px; opacity: .55; }
.wsb-search__list { list-style: none; padding: 0; margin: 0; }
.wsb-search__result {
  padding: 14px 0; border-bottom: 1px solid var(--line);
}
.wsb-search__result-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.wsb-search__result-title { font-size: 16px; font-weight: 600; margin: 0; line-height: 1.4; }
.wsb-search__result-title a { color: inherit; text-decoration: none; }
.wsb-search__result-title a:hover { color: var(--accent); }
.wsb-search__result-title em,
.wsb-search__result-excerpt em {
  font-style: normal;
  background: var(--accent-soft); color: var(--accent);
  padding: 0 2px; border-radius: 2px;
}
.wsb-search__result-excerpt { margin: 6px 0 8px; line-height: 1.6; }
.wsb-search__result-tags { display: flex; gap: 4px; flex-wrap: wrap; }

/* ---- GRAPH ---- */
.wsb-graph {
  width: 100%;
  height: calc(100vh - 56px);
  min-height: 500px;
  position: relative;
}
.wsb-graph__noscript {
  padding: 64px 24px; text-align: center; max-width: 720px; margin: 0 auto;
}
.wsb-graph__layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  height: 100%;
}
.wsb-graph__canvas {
  position: relative;
  background: radial-gradient(circle at 50% 50%, var(--bg-soft) 0%, var(--bg-sunk) 100%);
  overflow: hidden;
}
html[data-theme="dark"] .wsb-graph__canvas {
  background: radial-gradient(circle at 50% 50%, #0f0f0f 0%, #000 100%);
}
.wsb-graph__grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: .25;
  pointer-events: none;
}
.wsb-graph__svg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
}
.wsb-graph__node { cursor: pointer; }
.wsb-graph__node:focus { outline: none; }
.wsb-graph__node:focus-visible circle {
  stroke: var(--accent); stroke-width: 3px;
}
.wsb-graph__legend {
  position: absolute; top: 16px; left: 16px;
  padding: 10px 14px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow-2, 0 4px 12px rgba(0,0,0,.06));
  min-width: 200px;
}
.wsb-graph__legend-h {
  color: var(--ink-4);
  text-transform: uppercase;
  margin-bottom: 6px;
  letter-spacing: .05em;
}
.wsb-graph__legend-list { display: flex; flex-direction: column; gap: 4px; }
.wsb-graph__legend-row {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px;
  background: transparent; border: 0; padding: 4px 6px;
  text-align: left; cursor: pointer; color: inherit;
  border-radius: 4px;
  min-height: 24px;
}
.wsb-graph__legend-row:hover { background: var(--bg-soft); }
.wsb-graph__legend-row.is-off { opacity: .35; }
.wsb-graph__legend-dot {
  width: 10px; height: 10px; border-radius: 50%; display: inline-block;
  flex-shrink: 0;
}
.wsb-graph__legend-name { flex: 1; }
.wsb-graph__zoom {
  position: absolute; bottom: 16px; left: 16px;
  display: flex; flex-direction: column; gap: 4px;
  padding: 4px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 6px;
  box-shadow: var(--shadow-2, 0 4px 12px rgba(0,0,0,.06));
}
.wsb-graph__overlay {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.wsb-graph__side {
  border-left: 1px solid var(--line);
  overflow: auto;
  padding: 18px;
  background: var(--bg);
}
.wsb-graph__side-h {
  color: var(--ink-4);
  text-transform: uppercase;
  margin: 18px 0 8px;
  letter-spacing: .05em;
}
.wsb-graph__side-h:first-child { margin-top: 0; }
.wsb-graph__side-empty { padding: 24px 0; }
.wsb-graph__side-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.wsb-graph__side-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.wsb-graph__side-title { font-size: 16px; font-weight: 700; margin: 0; line-height: 1.3; }
.wsb-graph__side-meta { margin-bottom: 10px; }
.wsb-graph__side-desc { color: var(--ink-2); line-height: 1.6; margin-top: 0; }
.wsb-graph__side-actions { display: flex; gap: 6px; margin-top: 12px; }
.wsb-graph__side-actions > * { flex: 1; justify-content: center; }
.wsb-graph__neighbors { list-style: none; padding: 0; margin: 0; }
.wsb-graph__neighbor {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0; border-top: 1px solid var(--line);
  font-size: 12px;
}
.wsb-graph__neighbor:first-child { border-top: 0; }
.wsb-graph__neighbor a { flex: 1; color: inherit; text-decoration: none; }
.wsb-graph__neighbor a:hover { color: var(--accent); }

/* ---- ARTICLE COMMENTS (WS-B 替换 stub) ---- */
.wsb-comments { min-width: 0; }
.wsb-comments__sticky { position: sticky; top: 80px; }
.wsb-comments__head {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 12px;
}
.wsb-comments__title { font-size: 14px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 6px; }
.wsb-comments__hint {
  padding: 6px 10px;
  background: var(--bg-soft);
  border: 1px dashed var(--line-strong);
  border-radius: 6px;
  margin-bottom: 12px;
  line-height: 1.5;
}
.wsb-comments__list { list-style: none; padding: 0; margin: 0 0 12px; }
.wsb-comments__card {
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  margin-bottom: 8px;
  background: var(--bg);
}
.wsb-comments__card.is-active {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.wsb-comments__card-head {
  display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
}
.wsb-comments__avatar {
  width: 22px; height: 22px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff; font-family: var(--mono); font-weight: 700; font-size: 11px;
  flex-shrink: 0;
  background: var(--ink-3);
}
.wsb-comments__author { font-weight: 600; font-size: 12px; flex: 1; }
.wsb-comments__quote {
  border-left: 2px solid var(--accent);
  padding: 4px 8px;
  margin: 4px 0 6px;
  font-size: 12px;
  color: var(--ink-3);
  background: var(--accent-soft);
  border-radius: 0 4px 4px 0;
}
.wsb-comments__body { line-height: 1.6; color: var(--ink-2); }
.wsb-comments__empty { padding: 18px 0; text-align: center; }
.wsb-comments__compose {
  display: flex; align-items: center; gap: 6px;
  padding: 8px;
  background: var(--bg-soft);
  border-radius: 8px;
  border: 1px solid var(--line);
  flex-wrap: wrap;
}
.wsb-comments__input {
  flex: 1; min-width: 100px;
  border: 0; background: transparent; font: inherit;
  color: inherit; padding: 6px;
  outline: none;
  min-height: 24px;
}
.wsb-comments__input[aria-invalid="true"] { color: var(--danger-text, #b91c1c); }
.wsb-comments__error { color: var(--danger-text, #b91c1c); width: 100%; margin: 4px 0 0; }
.wsb-comments__foot { margin-top: 10px; text-align: right; }

/* reply button + nested replies */
.wsb-comments__card-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  margin-top: 6px;
}
.wsb-comments__reply-btn {
  background: transparent; border: 0;
  color: var(--ink-3);
  font: inherit; cursor: pointer;
  padding: 2px 6px; border-radius: 4px;
}
.wsb-comments__reply-btn:hover { background: var(--bg-soft); color: var(--accent); }
.wsb-comments__replies {
  list-style: none; padding: 0;
  margin: 6px 0 0 14px;
  border-left: 2px solid var(--line);
  padding-left: 8px;
}
.wsb-comments__card--reply { margin-bottom: 6px; }

/* highlight in article body */
.wsb-comments__hl {
  background: #fde68a;
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
  cursor: pointer;
  transition: background .15s;
}
html[data-theme="dark"] .wsb-comments__hl { background: rgba(253, 230, 138, .25); }
.wsb-comments__hl.is-active { background: var(--accent); color: #fff; }

/* selection bubble — 默认隐藏,只有去掉 [hidden] 才出现 */
.wsb-selbubble[hidden] { display: none !important; }
.wsb-selbubble {
  position: absolute; z-index: 50;
  display: flex; align-items: center; gap: 4px;
  padding: 6px 8px;
  background: #1f2937;
  color: #fff;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,.25);
  font-size: 12px;
}
.wsb-selbubble button {
  background: transparent; border: 0; color: inherit;
  font: inherit; padding: 4px 6px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px;
  min-height: 24px;
}
.wsb-selbubble button:hover { color: #93c5fd; }
.wsb-selbubble__sep { width: 1px; height: 14px; background: rgba(255,255,255,.2); }
.wsb-selbubble__swatch {
  width: 10px; height: 10px; border-radius: 2px;
  background: #fde68a; display: inline-block;
}

/* ---- NEWSLETTER ---- */
.wsb-news {
  max-width: 720px; margin: 0 auto;
  padding: 64px 24px;
}
.wsb-news__head { text-align: center; margin-bottom: 32px; }
.wsb-news__title {
  font-size: 44px; font-weight: 900;
  line-height: 1.1; margin: 12px 0 14px;
  letter-spacing: -0.02em;
}
.wsb-news__accent { color: var(--accent); }
.wsb-news__intro {
  font-size: 16px; color: var(--ink-3);
  max-width: 480px; margin: 0 auto;
  line-height: 1.65;
}
.wsb-news__intro b { color: var(--ink); }

.wsb-news__formwrap {
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--bg);
  margin-bottom: 24px;
}
.wsb-news__form {
  display: flex; gap: 8px; align-items: flex-start;
  flex-wrap: wrap;
}
.wsb-news__field {
  flex: 1; min-width: 220px; position: relative;
  display: flex; align-items: center;
}
.wsb-news__field-icon {
  position: absolute; left: 12px; top: 50%;
  transform: translateY(-50%);
  color: var(--ink-4);
  pointer-events: none;
}
.wsb-news__input {
  width: 100%;
  height: 42px;
  padding: 0 12px 0 36px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: var(--bg);
  font: inherit; font-size: 14px;
  color: var(--ink);
}
.wsb-news__input:focus {
  outline: none; border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.wsb-news__input[aria-invalid="true"] { border-color: var(--danger, #b91c1c); }
.wsb-news__submit { height: 42px; padding: 0 22px; font-size: 14px; }
.wsb-news__error {
  width: 100%;
  color: var(--danger-text, #b91c1c);
  margin: 6px 0 0;
}
.wsb-news__success {
  width: 100%;
  color: var(--ok-text, #16a34a);
  margin: 6px 0 0;
}
.wsb-news__check {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 12px;
  cursor: pointer;
  min-height: 24px;
}
.wsb-news__check input { width: 14px; height: 14px; }
.wsb-news__check b { color: var(--ink); }

.wsb-news__past-h {
  color: var(--ink-4); text-transform: uppercase;
  margin: 0 0 12px; letter-spacing: .05em;
  font-size: 11px; font-weight: 700;
}
.wsb-news__past-list { list-style: none; padding: 0; margin: 0; }
.wsb-news__past-row {
  border-bottom: 1px solid var(--line);
  border-radius: 8px;
}
.wsb-news__past-link {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 14px;
  text-decoration: none; color: inherit;
  border-radius: 8px;
}
.wsb-news__past-date { width: 60px; flex-shrink: 0; }
.wsb-news__past-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.wsb-news__past-title { font-size: 14px; font-weight: 500; }
.wsb-news__past-loading { padding: 12px 14px; }

/* responsive */
@media (max-width: 900px) {
  .wsb-search__grid { grid-template-columns: 1fr; }
  .wsb-graph__layout { grid-template-columns: 1fr; }
  .wsb-graph__side { border-left: 0; border-top: 1px solid var(--line); max-height: 200px; }
  .wsb-news__title { font-size: 32px; }
}
`;

// WS-C — 各模板携带的 mobile-only CSS 在末尾注入。不动 WS-A 桌面样式。
const CSS =
  ALL_CSS +
  '\n' +
  APP_CSS +
  '\n' +
  RSS_READER_CSS +
  '\n' +
  WSB_CSS +
  '\n' +
  HOME_MOBILE_CSS +
  '\n' +
  POST_MOBILE_CSS +
  '\n' +
  TAG_MOBILE_CSS +
  '\n' +
  HF_AD_CSS;
