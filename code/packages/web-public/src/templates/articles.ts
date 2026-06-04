import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import {
  buildLumioArticles,
  categoryCounts,
  LUMIO_ARTICLE_TOTAL,
  LUMIO_CATEGORY_COUNTS,
  LUMIO_TAGS,
  renderArticleRow,
  renderHotTags,
  renderPageHead,
  renderRecentArticles,
} from './lumio-design.js';

export function renderArticles(
  posts: NoteRow[],
  byTag: Map<string, NoteRow[]>,
  config: SiteConfig,
): string {
  const articles = buildLumioArticles(posts, byTag);
  const hasPosts = posts.length > 0;
  const total = hasPosts ? articles.length : LUMIO_ARTICLE_TOTAL;
  const counts = hasPosts ? categoryCounts(articles) : LUMIO_CATEGORY_COUNTS;
  const chips = [
    `<button class="chip is-active" type="button" data-filter="全部" data-cat="全部">全部<span class="chip__n">${total}</span></button>`,
    ...counts.map(
      ({ name, count }) =>
        `<button class="chip" type="button" data-filter="${esc(name)}" data-cat="${esc(name)}">${esc(name)}<span class="chip__n">${count}</span></button>`,
    ),
  ].join('');
  const rows = articles.map((article) => renderArticleRow(article)).join('');
  const hotTags = hasPosts
    ? [...byTag.entries()]
        .filter(([, list]) => list.length > 0)
        .map(([name, list]) => ({ name, count: list.length }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'))
    : LUMIO_TAGS.map((tag) => ({ name: tag.name, count: tag.count }));

  const body = `
    ${renderPageHead('All Articles', '文章', '从渲染、性能到架构与工具链,系统沉淀的游戏开发技术干货。')}
    <main class="page">
      <div class="layout">
        <div>
          <div class="list-bar">
            <div class="chips" role="toolbar" aria-label="文章分类筛选">${chips}</div>
            <button class="sortbox" id="article-sort" type="button" aria-label="切换排序">
              <span id="article-sort-label">最新发布</span>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"></path></svg>
            </button>
          </div>
          <div class="alist" id="article-list">${rows}</div>
          <p class="lumio-empty" id="article-empty" hidden>该分类暂无文章</p>
        </div>
        <aside>
          <div class="side-card">
            <div class="side-card__title">热门标签</div>
            <div class="rank">${renderHotTags(hotTags, 8, hasPosts ? 'empty' : 'design')}</div>
          </div>
          <div class="side-card">
            <div class="side-card__title">最近更新</div>
            <div class="recent">${renderRecentArticles(articles)}</div>
          </div>
        </aside>
      </div>
    </main>
    <script>
      (function(){
        var chips = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
        var list = document.getElementById('article-list');
        var rows = Array.prototype.slice.call(document.querySelectorAll('#article-list .arow'));
        var empty = document.getElementById('article-empty');
        var sort = document.getElementById('article-sort');
        var sortLabel = document.getElementById('article-sort-label');
        var curCat = '全部';
        var curSort = 'new';
        function views(row){
          var raw = row.getAttribute('data-views') || '0';
          var n = parseFloat(raw);
          if (!isFinite(n)) return 0;
          return /k/i.test(raw) ? n * 1000 : n;
        }
        function render(){
          if (!list) return;
          var visible = 0;
          var sorted = rows.slice().sort(function(a, b){
            if (curSort === 'hot') return views(b) - views(a);
            return (b.getAttribute('data-date') || '').localeCompare(a.getAttribute('data-date') || '');
          });
          sorted.forEach(function(row){
            var show = curCat === '全部' || row.getAttribute('data-cat') === curCat;
            row.classList.toggle('is-filtered-out', !show);
            if (show) visible += 1;
            list.appendChild(row);
          });
          if (empty) empty.hidden = visible !== 0;
        }
        function apply(cat){
          curCat = cat;
          chips.forEach(function(chip){ chip.classList.toggle('is-active', chip.getAttribute('data-filter') === cat); });
          render();
        }
        chips.forEach(function(chip){
          chip.addEventListener('click', function(){ apply(chip.getAttribute('data-filter') || '全部'); });
        });
        if (sort) sort.addEventListener('click', function(){
          curSort = curSort === 'new' ? 'hot' : 'new';
          if (sortLabel) sortLabel.textContent = curSort === 'new' ? '最新发布' : '最多阅读';
          render();
        });
        var initial = new URLSearchParams(location.search).get('cat') || '全部';
        apply(initial);
      })();
    </script>`;

  return layout({
    title: `全部文章 · ${config.site.title}`,
    description: '全部文章',
    config,
    body,
    active: 'articles',
  });
}
