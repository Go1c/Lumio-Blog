import type { NoteRow, SiteConfig } from '@opennote/core';
import { esc, getPlatformGames, layout } from './layout.js';
import { renderHubCard, renderHubPlay } from '../partials/hub.js';
import { authorEntity, websiteNode } from '../partials/jsonld.js';
import {
  buildLumioArticles,
  renderAdSlot,
  renderArticleCard,
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
  const sorted = sortHomePosts(data.posts);
  const articles = buildLumioArticles(sorted, data.byTag);
  const cards = articles.map((article, i) => renderArticleCard(article, '', { pinned: sorted[i]?.featured_on_home === 1 }));
  // 所有公开文章都在首页:第一行之后插广告位,其余按行排下去
  const firstRow = cards.slice(0, 3).join('');
  const restRows = cards.slice(3).join('');
  const articleGrid = firstRow
    ? `<div class="grid">${firstRow}</div>`
    : renderHomeEmptyState();
  const secondGrid = restRows ? `<div class="grid">${restRows}</div>` : '';

  const body = `
    <div class="body">
      <aside class="home-hub" aria-label="Lumio 平台">
        <h1 class="home-hub__h1">${esc(config.site.title)}</h1>
        <div class="hub-rail home-hub__rail">
          ${renderHubCard('home_rail')}
          ${renderHubPlay(getPlatformGames(), 'home_rail')}
        </div>
      </aside>

      <main class="content">
        <div class="sec-head">
          <h2 class="sec-title">最新文章</h2>
          <a class="sec-more" href="/articles/index.html">查看全部
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h9M8 4l4 4-4 4"></path></svg>
          </a>
        </div>
        ${articleGrid}
        ${renderAdSlot(config)}
        ${secondGrid}
      </main>
    </div>`;

  return layout({
    title: config.site.title,
    description: config.site.description ?? '游戏系统、AI 工作流，以及独立开发里踩过的坑。来自 Lumio。',
    config,
    body,
    active: 'home',
    path: '/',
    jsonLd: [websiteNode(config), authorEntity(config)],
  });
}

/** 首页左栏:创作中心卡 + 平台游戏推荐(替换原来的装饰大图),与文章页左栏同一套组件 */
export const HOME_MOBILE_CSS = `
.body:has(.home-hub) { grid-template-columns: 246px minmax(0, 1fr); }
.home-hub { padding: 30px 0 30px 30px; min-width: 0; }
.home-hub__rail { position: sticky; top: 22px; }
.home-hub__h1 {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
@media (max-width: 900px) {
  .body:has(.home-hub) { grid-template-columns: minmax(0, 1fr); }
  .home-hub { display: none; }
}
`;

function renderHomeEmptyState(): string {
  return `
        <section class="home-empty" aria-label="最新文章空态">
          <h2>暂无公开文章</h2>
          <p>当前没有设为公开的笔记。把后台笔记可见性切回公开后,首页会重新显示文章。</p>
        </section>`;
}

function sortHomePosts(posts: NoteRow[]): NoteRow[] {
  return [...posts].sort((a, b) => {
    // 置顶的排最前
    const pinned = Number(b.featured_on_home === 1) - Number(a.featured_on_home === 1);
    if (pinned !== 0) return pinned;
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
