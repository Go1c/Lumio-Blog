import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout } from './layout.js';
import {
  buildLumioArticles,
  renderAdSlot,
  renderArticleCard,
  renderHeroScene,
  renderSubscribe,
} from './lumio-design.js';

export interface FolderEntry {
  name: string;
  count: number;
}

export interface HomeData {
  posts: NoteRow[];
  byTag: Map<string, NoteRow[]>;
  recentNotes: NoteRow[];
  totalArticles: number;
  totalNotes: number;
  folders: FolderEntry[];
}

export function renderHome(data: HomeData, config: SiteConfig): string {
  const articles = buildLumioArticles(sortHomePosts(data.posts), data.byTag);
  const firstRow = articles.slice(0, 3).map((article) => renderArticleCard(article)).join('');
  const secondRow = articles.slice(3, 6).map((article) => renderArticleCard(article)).join('');

  const body = `
    <div class="body">
      <aside class="hero">
        <div class="hero__deco" aria-hidden="true"><div class="hero__grid"></div></div>
        <div class="hero__eyebrow">Lumio Dev Notes</div>
        <h1 class="hero__title"><em>Game</em><em>Tech Blog</em></h1>
        <p class="hero__sub"><b>技术文章</b><span class="dot"></span><b>游戏开发</b><span class="dot"></span><b>实践分享</b></p>
        <a class="btn-primary" href="/articles/index.html">
          阅读最新文章
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h9M8 4l4 4-4 4"></path></svg>
        </a>
        ${renderHeroScene()}
      </aside>

      <main class="content">
        <div class="sec-head">
          <h2 class="sec-title">最新文章</h2>
          <a class="sec-more" href="/articles/index.html">查看全部
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h9M8 4l4 4-4 4"></path></svg>
          </a>
        </div>
        <div class="grid">${firstRow}</div>
        ${renderAdSlot(config)}
        <div class="grid">${secondRow || articles.slice(0, 3).map((article) => renderArticleCard(article)).join('')}</div>
        ${renderSubscribe()}
      </main>
    </div>`;

  return layout({
    title: config.site.title,
    description: config.site.description ?? 'Lumio Game Tech Blog',
    config,
    body,
    active: 'home',
    path: '/',
  });
}

export const HOME_MOBILE_CSS = '';

function sortHomePosts(posts: NoteRow[]): NoteRow[] {
  return [...posts].sort((a, b) => {
    const quality = Number(isWeakHomePost(a)) - Number(isWeakHomePost(b));
    if (quality !== 0) return quality;
    const date = sortDateMs(b) - sortDateMs(a);
    if (date !== 0) return date;
    return a.slug.localeCompare(b.slug, 'zh-Hans-CN');
  });
}

function isWeakHomePost(n: NoteRow): boolean {
  const title = (n.title ?? '').trim();
  return !title || /^未命名(?:\s+\d+)?$/.test(title) || Number(n.word_count ?? 0) <= 0;
}

function sortDateMs(n: NoteRow): number {
  const raw = n.updated_at || n.published_at || n.created_at || '';
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}
