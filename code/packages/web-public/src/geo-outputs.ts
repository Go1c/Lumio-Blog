import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NoteRow, SiteConfig } from '@opennote/core';

/**
 * 面向生成式引擎 / Agent 的静态产物:
 * llms.txt、llms-full.txt、posts/<slug>.md、robots.txt、sitemap.xml。
 *
 * 这些文件是给机器读的,不进 HTML 管线,所以不做 HTML 转义,只做 markdown 结构。
 */

/** 主流 AI 抓取 / 训练 / 接地令牌。显式列出是为了压过中间层默认拒绝,并表明授权意图。 */
export const AI_CRAWLER_TOKENS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'Baiduspider',
  'Amazonbot',
  'meta-externalagent',
  'DuckAssistBot',
  'YandexBot',
] as const;

/** 对所有 UA 都关闭的路径 */
const DISALLOWED_PATHS = ['/admin/', '/api/', '/n/'] as const;

function siteBase(config: SiteConfig): string {
  return (config.site.url ?? '').trim().replace(/\/+$/, '');
}

function abs(config: SiteConfig, path: string): string {
  return `${siteBase(config)}${path.startsWith('/') ? path : `/${path}`}`;
}

/** 只有 markdown 笔记有可读原文;canvas / html 没有,跳过而不是导出乱码。 */
export function isMarkdownNote(note: Pick<NoteRow, 'kind'>): boolean {
  return (note.kind ?? 'markdown') === 'markdown';
}

/** YYYY-MM-DD */
function dateOnly(raw: string | null | undefined): string {
  return (raw ?? '').slice(0, 10);
}

/** sitemap / lastmod 用的 W3C datetime */
export function w3cDate(raw: string | null | undefined): string {
  if (!raw) return '';
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toISOString();
}

function newestTimestamp(notes: NoteRow[]): string {
  let best = 0;
  for (const n of notes) {
    const ms = Date.parse(n.updated_at || n.published_at || n.created_at || '');
    if (Number.isFinite(ms) && ms > best) best = ms;
  }
  return best ? new Date(best).toISOString() : '';
}

/** 顶层 vault 文件夹,用作 llms.txt 的分区名 */
function folderOf(note: NoteRow): string {
  const slash = (note.source_path ?? '').indexOf('/');
  return slash > 0 ? note.source_path.slice(0, slash) : '';
}

export function tagsOf(byTag: Map<string, NoteRow[]>, slug: string): string[] {
  const out: string[] = [];
  for (const [tag, notes] of byTag) {
    if (notes.some((n) => n.slug === slug)) out.push(tag);
  }
  return out;
}

// ---------------------------------------------------------------- llms.txt

/**
 * llms.txt — 按 llmstxt.org 约定:H1 站名 + blockquote 摘要 + 说明段 + H2 分区链接清单。
 * 分区按 vault 顶层文件夹划分,与站点 /folders/ 导航一致。
 */
export function renderLlmsTxt(notes: NoteRow[], config: SiteConfig): string {
  const lines: string[] = [];
  lines.push(`# ${config.site.title}`);
  lines.push('');
  if (config.site.description) {
    lines.push(`> ${config.site.description}`);
    lines.push('');
  }
  lines.push(
    `作者 ${config.author.name}。每篇文章都有纯 Markdown 版本,把链接里的 \`/posts/<slug>.html\` 换成 \`/posts/<slug>.md\` 即可直接取正文,无需解析 HTML。`,
  );
  lines.push('');

  const groups = new Map<string, NoteRow[]>();
  for (const note of notes) {
    const key = folderOf(note) || '文章';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(note);
  }
  const sections = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [name, items] of sections) {
    lines.push(`## ${name}`);
    lines.push('');
    for (const note of items) {
      const url = abs(config, `/posts/${note.slug}.html`);
      const summary = (note.summary ?? '').replace(/\s+/g, ' ').trim();
      lines.push(`- [${note.title}](${url})${summary ? `: ${summary}` : ''}`);
    }
    lines.push('');
  }

  lines.push('## 可选');
  lines.push('');
  lines.push(`- [全文合集](${abs(config, '/llms-full.txt')}): 全部公开文章的 Markdown 正文,单文件`);
  lines.push(`- [RSS](${abs(config, '/feed.xml')}): 更新订阅`);
  lines.push(`- [Sitemap](${abs(config, '/sitemap.xml')}): 全站可索引 URL`);
  lines.push('');
  return lines.join('\n');
}

// ----------------------------------------------------------- posts/<slug>.md

/** 剥掉 YAML frontmatter */
export function stripFrontmatter(raw: string): string {
  return raw.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?/, '').trimStart();
}

/**
 * 取原始 markdown 正文:优先读 vault 里的源文件,读不到回退 body_text。
 * 回退是必需的 —— 容器里 vault 挂载路径可能与 source_path 不一致。
 */
export async function readNoteMarkdown(note: NoteRow, vaultPath: string): Promise<string> {
  if (vaultPath && note.source_path) {
    try {
      const raw = await readFile(join(vaultPath, note.source_path), 'utf-8');
      const body = stripFrontmatter(raw).trim();
      if (body) return body;
    } catch {
      // 落到 body_text
    }
  }
  return (note.body_text ?? '').trim();
}

/** 人读的头部块 + 正文。给 Agent 直接消费的单篇产物。 */
export function renderPostMarkdown(
  note: NoteRow,
  config: SiteConfig,
  markdown: string,
  tags: string[],
): string {
  const lines: string[] = [];
  lines.push(`# ${note.title}`);
  lines.push('');
  if (note.summary) {
    lines.push(`> ${note.summary.replace(/\s+/g, ' ').trim()}`);
    lines.push('');
  }
  lines.push(`- 来源: ${abs(config, `/posts/${note.slug}.html`)}`);
  lines.push(`- 作者: ${config.author.name}`);
  const published = dateOnly(note.published_at ?? note.created_at);
  if (published) lines.push(`- 发布: ${published}`);
  const updated = dateOnly(note.updated_at);
  if (updated) lines.push(`- 更新: ${updated}`);
  if (tags.length) lines.push(`- 标签: ${tags.join(', ')}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(markdown);
  lines.push('');
  return lines.join('\n');
}

/** llms-full.txt — 全部文章的单篇产物按分隔线拼接 */
export function renderLlmsFullTxt(config: SiteConfig, documents: string[]): string {
  const head = [`# ${config.site.title} — 全文合集`, ''];
  if (config.site.description) head.push(`> ${config.site.description}`, '');
  head.push(
    `共 ${documents.length} 篇公开文章的 Markdown 正文。单篇见 ${abs(config, '/posts/')}<slug>.md,索引见 ${abs(config, '/llms.txt')}。`,
    '',
  );
  return [head.join('\n'), ...documents].join('\n---\n\n');
}

// ---------------------------------------------------------------- robots.txt

/**
 * robots.txt。config.seo.robots 有值时整体覆盖(后台设置直通),
 * 否则生成默认内容:通配 UA + 显式列出主流 AI 令牌 + Sitemap。
 */
export function renderRobotsTxt(config: SiteConfig, opts: { sitemap: boolean }): string {
  const override = config.seo?.robots?.trim();
  if (override) return override.endsWith('\n') ? override : `${override}\n`;

  const disallow = DISALLOWED_PATHS.map((p) => `Disallow: ${p}`).join('\n');
  const blocks: string[] = [];
  blocks.push(`# ${config.site.title}\n# llms.txt: ${abs(config, '/llms.txt')}`);
  blocks.push(`User-agent: *\nAllow: /\n${disallow}`);
  // AI 抓取 / 接地 / 训练令牌共用一组规则,显式授权全站正文。
  blocks.push(`${AI_CRAWLER_TOKENS.map((t) => `User-agent: ${t}`).join('\n')}\nAllow: /\n${disallow}`);
  if (opts.sitemap) blocks.push(`Sitemap: ${abs(config, '/sitemap.xml')}`);
  return `${blocks.join('\n\n')}\n`;
}

// --------------------------------------------------------------- sitemap.xml

export interface SitemapEntry {
  path: string;
  lastmod?: string;
}

export function renderSitemap(
  posts: NoteRow[],
  byTag: Map<string, NoteRow[]>,
  config: SiteConfig,
): string {
  const siteLastmod = newestTimestamp(posts);
  const entries: SitemapEntry[] = [
    { path: '/', lastmod: siteLastmod },
    { path: '/articles/index.html', lastmod: siteLastmod },
    { path: '/columns/index.html', lastmod: siteLastmod },
    { path: '/about.html' },
    { path: '/tags/index.html', lastmod: siteLastmod },
    { path: '/folders/index.html', lastmod: siteLastmod },
    { path: '/feed/', lastmod: siteLastmod },
    ...posts.map((p) => ({
      path: `/posts/${p.slug}.html`,
      lastmod: w3cDate(p.updated_at ?? p.published_at),
    })),
    ...[...byTag.entries()].map(([tag, notes]) => ({
      path: `/tags/${encodeURIComponent(tag)}.html`,
      lastmod: newestTimestamp(notes),
    })),
  ];

  const items = entries
    .map(({ path, lastmod }) => {
      const loc = `<loc>${abs(config, path)}</loc>`;
      return `<url>${loc}${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}
