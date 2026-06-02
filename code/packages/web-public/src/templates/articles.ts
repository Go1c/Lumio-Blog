import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import {
  buildLumioArticles,
  categoryCounts,
  renderArticleCard,
  renderFeatureArticle,
  renderPageHead,
} from './lumio-design.js';

export function renderArticles(
  posts: NoteRow[],
  byTag: Map<string, NoteRow[]>,
  config: SiteConfig,
): string {
  const articles = buildLumioArticles(posts, byTag);
  const counts = categoryCounts(articles);
  const chips = [
    `<button class="chip is-active" type="button" data-filter="全部">全部<span class="chip__n">${articles.length}</span></button>`,
    ...counts.map(
      ({ name, count }) =>
        `<button class="chip" type="button" data-filter="${esc(name)}">${esc(name)}<span class="chip__n">${count}</span></button>`,
    ),
  ].join('');
  const feature = renderFeatureArticle(articles[0]!);
  const cards = articles
    .map((article) => renderArticleCard(article, `data-cat="${esc(article.category)}"`))
    .join('');

  const body = `
    ${renderPageHead('All Articles', '全部文章', '从渲染、性能到架构与工具链,系统沉淀的游戏开发技术干货。')}
    <main class="page">
      <div class="chips" role="toolbar" aria-label="文章分类筛选">${chips}</div>
      ${feature}
      <div class="grid-4" id="article-grid">${cards}</div>
      <p class="lumio-empty" id="article-empty" hidden>该分类暂无文章</p>
    </main>
    <script>
      (function(){
        var chips = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
        var cards = Array.prototype.slice.call(document.querySelectorAll('#article-grid [data-cat]'));
        var empty = document.getElementById('article-empty');
        function apply(cat){
          var visible = 0;
          chips.forEach(function(chip){ chip.classList.toggle('is-active', chip.getAttribute('data-filter') === cat); });
          cards.forEach(function(card){
            var show = cat === '全部' || card.getAttribute('data-cat') === cat;
            card.classList.toggle('is-filtered-out', !show);
            if (show) visible += 1;
          });
          if (empty) empty.hidden = visible !== 0;
        }
        chips.forEach(function(chip){
          chip.addEventListener('click', function(){ apply(chip.getAttribute('data-filter') || '全部'); });
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
