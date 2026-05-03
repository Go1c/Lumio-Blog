import type { SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';

/**
 * 搜索结果页 — SSR 骨架 + 客户端 JS 联想/请求
 *
 * 设计稿:doc/prototype/hf-extras.jsx §3 HFSearchResults
 *
 * 无 JS 时:`<form action="/search/" method="get">` 仍可工作 — 用户提交后,
 * 页面 reload,query string `?q=xxx` 由客户端 JS 读取并触发首次请求(JS 启用时)。
 * 当 JS 关闭,服务端会 404 这个 query;在 web-public 静态站场景下,fallback
 * 是显示空骨架 + 引导用户使用其他方式(暂无后端 SSR 渲染)。
 *
 * 客户端 JS 行为(/search.js):
 *  - input 200ms debounce → GET /api/search/suggest?q=
 *  - submit / Enter → GET /api/search?q=&type=&from=&to=
 *  - facet 切换 → 重新请求
 */
export function renderSearch(config: SiteConfig): string {
  const body = `
    <div class="wsb-search" data-component="search">
      <!-- search bar prominent -->
      <div class="wsb-search__bar">
        <div class="wsb-search__bar-inner">
          <form class="wsb-search__form" action="/search/" method="get" role="search" aria-label="站内搜索">
            <span class="wsb-search__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4.5"/><path d="m11 11 3 3"/></svg>
            </span>
            <label for="wsb-search-input" class="sr-only">搜索关键词</label>
            <input
              id="wsb-search-input"
              class="wsb-search__input"
              type="search"
              name="q"
              autocomplete="off"
              spellcheck="false"
              placeholder="搜索文章 / 笔记 / 标签…"
              aria-controls="wsb-search-results"
              aria-describedby="wsb-search-status"
            >
            <span class="wsb-search__kbd hf-mono hf-tiny hf-faint" aria-hidden="true">↵ enter</span>
            <kbd class="hf-kbd" aria-hidden="true">esc</kbd>
          </form>
          <div id="wsb-search-status" class="hf-mono hf-tiny hf-muted wsb-search__status" aria-live="polite"></div>
          <ul id="wsb-search-suggest" class="wsb-search__suggest" role="listbox" aria-label="搜索建议" hidden></ul>
        </div>
      </div>

      <div class="wsb-search__grid">
        <!-- filters -->
        <aside class="wsb-search__filters" aria-label="筛选">
          <div class="wsb-search__facet" data-facet="type">
            <div class="wsb-search__facet-h hf-mono hf-tiny">▸ 类型</div>
            <div class="wsb-search__facet-list" role="radiogroup" aria-label="按类型筛选">
              ${renderFacet([
                ['', '全部'],
                ['post', '文章'],
                ['note', '笔记'],
                ['tag', '标签'],
              ])}
            </div>
          </div>

          <div class="wsb-search__facet" data-facet="time">
            <div class="wsb-search__facet-h hf-mono hf-tiny">▸ 时间</div>
            <div class="wsb-search__facet-list" role="radiogroup" aria-label="按时间筛选">
              ${renderFacet([
                ['', '全部时间'],
                ['7d', '近 7 天'],
                ['30d', '近 30 天'],
                ['1y', '近 1 年'],
              ])}
            </div>
          </div>
        </aside>

        <!-- results -->
        <main class="wsb-search__main" id="wsb-search-results" aria-busy="false">
          <div class="wsb-search__sort hf-mono hf-tiny hf-muted">排序: 相关度 ↓</div>
          <div class="wsb-search__empty" data-empty>
            <div class="wsb-search__empty-icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="4.5"/><path d="m11 11 3 3"/></svg>
            </div>
            <p class="hf-muted">输入关键词开始搜索</p>
            <p class="hf-tiny hf-faint">支持中文、英文、缩写;空格分隔多个词</p>
          </div>
          <ol class="wsb-search__list" data-results hidden></ol>
        </main>
      </div>
    </div>
    <script src="/search.js" defer></script>`;

  return layout({
    title: `搜索 · ${config.site.title}`,
    description: '搜索文章、笔记、标签',
    config,
    body,
    active: '',
  });
}

function renderFacet(items: Array<[string, string]>): string {
  return items
    .map(
      ([value, label], i) => `
      <label class="wsb-search__facet-item${i === 0 ? ' is-active' : ''}">
        <input type="radio" value="${esc(value)}" ${i === 0 ? 'checked' : ''}>
        <span>${esc(label)}</span>
        <span class="hf-mono hf-tiny hf-faint" data-count></span>
      </label>`,
    )
    .join('');
}
