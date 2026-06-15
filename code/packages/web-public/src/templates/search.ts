import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { renderHotTags } from './lumio-design.js';

export interface SearchTemplateData {
  byTag?: Map<string, NoteRow[]>;
  posts?: NoteRow[];
}

/**
 * 搜索结果页 — Lumio 搜索壳 + 客户端真实 API 请求。
 * 客户端 JS 行为(/search.js):
 *  - input 200ms debounce → GET /api/search/suggest?q=
 *  - submit / Enter → GET /api/search?q=
 *  - 结果渲染为最新设计稿的 .arow 行列表
 */
export function renderSearch(config: SiteConfig, data: SearchTemplateData = {}): string {
  const hotTags = buildHotTags(data.byTag);
  const suggestions = buildSuggestions(hotTags, data.posts);
  const tagOptions = hotTags.length
    ? hotTags.map((tag) => `<option value="${esc(tag.name)}">${esc(tag.name)}</option>`).join('')
    : '';
  const suggestionHtml = suggestions.length
    ? suggestions.map((item) => `
                  <a class="suggest__item" href="/search/index.html?q=${esc(encodeURIComponent(item))}">
                    ${searchIcon()}${esc(item)}
                  </a>`).join('')
    : '<p class="rank__empty">暂无搜索建议</p>';
  const body = `
    <div class="lumio-search" data-component="search">
      <header class="page-head">
        <div class="page-head__grid" aria-hidden="true"></div>
        <div class="page-head__eyebrow">Search</div>
        <h1 class="page-head__title">搜索结果:<span id="wsb-search-query">输入关键词</span></h1>
        <p class="page-head__sub result-count" id="wsb-search-status" aria-live="polite">输入关键词开始搜索</p>
      </header>

      <main class="page">
        <ul id="wsb-search-suggest" class="wsb-search__suggest" role="listbox" aria-label="搜索建议" hidden></ul>
        <div class="layout">
          <div>
            <div id="wsb-search-results" aria-busy="false">
              <div class="lumio-empty" data-empty>
                <p>输入关键词开始搜索</p>
              </div>
              <div class="alist" data-results hidden></div>
            </div>
          </div>
          <aside>
            <form class="side-card wsb-search__filters" data-search-filters aria-label="搜索筛选">
              <div class="side-card__title">筛选</div>

              <fieldset class="wsb-search__facet">
                <legend class="wsb-search__facet-h">类型</legend>
                <div class="wsb-search__facet-list">
                  ${renderTypeFilter('', '全部')}
                  ${renderTypeFilter('post', '文章')}
                  ${renderTypeFilter('note', '笔记')}
                </div>
              </fieldset>

              <fieldset class="wsb-search__facet">
                <legend class="wsb-search__facet-h">时间</legend>
                <label class="wsb-search__field">
                  <span>从</span>
                  <input type="date" data-filter-from>
                </label>
                <label class="wsb-search__field">
                  <span>到</span>
                  <input type="date" data-filter-to>
                </label>
              </fieldset>

              <label class="wsb-search__facet">
                <span class="wsb-search__facet-h">标签</span>
                <select class="wsb-search__select" data-filter-tags ${hotTags.length ? '' : 'disabled'}>
                  <option value="">全部标签</option>
                  ${tagOptions}
                </select>
              </label>

              <div class="wsb-search__filter-actions">
                <button type="button" class="ui-btn ui-btn--sm" data-filter-clear>清除筛选</button>
              </div>
            </form>

            <div class="side-card">
              <div class="side-card__title">搜索建议</div>
              <div class="suggest">
                ${suggestionHtml}
              </div>
            </div>

            <div class="side-card">
              <div class="side-card__title">热门标签</div>
              <div class="rank">${renderHotTags(hotTags, 5, 'empty')}</div>
            </div>
          </aside>
        </div>
      </main>
    </div>
    <script src="/search.js" defer></script>`;

  return layout({
    title: `搜索 · ${config.site.title}`,
    description: '搜索文章、笔记、标签',
    config,
    body,
    active: '',
    path: '/search/index.html',
  });
}

function searchIcon(): string {
  return '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"></circle><path d="m10.5 10.5 3 3"></path></svg>';
}

function renderTypeFilter(value: string, label: string): string {
  return `<label class="wsb-search__facet-item">
    <input type="radio" name="type" value="${esc(value)}" ${value ? '' : 'checked'}>
    <span>${esc(label)}</span>
  </label>`;
}

function buildHotTags(byTag?: Map<string, NoteRow[]>): Array<{ name: string; count: number }> {
  if (!byTag) return [];
  return [...byTag.entries()]
    .filter(([, notes]) => notes.length > 0)
    .map(([name, notes]) => ({ name, count: notes.length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

function buildSuggestions(tags: Array<{ name: string; count: number }>, posts?: NoteRow[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [
    ...tags.map((tag) => tag.name),
    ...(posts ?? []).slice(0, 5).map((post) => post.title),
  ]) {
    const value = item.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= 5) break;
  }
  return out;
}
