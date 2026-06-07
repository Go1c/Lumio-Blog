import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { isoDate } from '../partials/shared.js';
import {
  buildLumioArticles,
  LUMIO_TAGS,
  renderArticleCard,
  renderArticleRow,
  renderEmptyState,
  renderPageHead,
  renderTagCloudPills,
} from './lumio-design.js';

/**
 * 全部标签索引页
 */
export function renderTagIndex(byTag: Map<string, NoteRow[]>, config: SiteConfig): string {
  const tags = buildTagCloud(byTag);

  if (tags.length === 0) {
    const body = `
    ${renderPageHead('Tags', '标签', '按主题快速找到你关心的内容,标签越大代表文章越多。')}
    <main class="page">
      ${renderEmptyState('暂无公开标签', '当前没有设为公开的笔记。把后台笔记可见性切回公开后,这里会重新显示标签。')}
    </main>`;
    return layout({
      title: `标签 · ${config.site.title}`,
      description: '所有标签',
      config,
      body,
      active: 'tags',
      path: '/tags/index.html',
    });
  }

  const tagItems = tags
    .map((tag) => renderTagPill(tag))
    .join('');
  const topTag = tags[0]!;
  const topTagNotes = byTag.get(topTag.name) ?? [];
  const topTagTitle = topTag.name;
  const topArticles = buildLumioArticles(sortTagNotes(topTagNotes), byTag).slice(0, 3);
  const cards = topArticles.map((article) => renderArticleCard(article)).join('');
  const body = `
    ${renderPageHead('Tags', '标签', '按主题快速找到你关心的内容,标签越大代表文章越多。')}
    <main class="page">
      <h2 class="section-title">热门标签</h2>
      <div class="tagcloud" aria-label="所有标签">${tagItems}</div>

      <h2 class="section-title" style="margin-top:34px;">#${esc(topTagTitle)} 下的文章</h2>
      <div class="grid-4">${cards}</div>
    </main>`;
  return layout({
    title: `标签 · ${config.site.title}`,
    description: '所有标签',
    config,
    body,
    active: 'tags',
    path: '/tags/index.html',
  });
}

function buildTagCloud(byTag: Map<string, NoteRow[]>): typeof LUMIO_TAGS {
  const entries = [...byTag.entries()]
    .filter(([, notes]) => notes.length > 0)
    .sort((a, b) => {
      const count = b[1].length - a[1].length;
      if (count !== 0) return count;
      return a[0].localeCompare(b[0], 'zh-Hans-CN');
    });
  if (!entries.length) return [];

  const tones = ['', 's-mint', 's-amber', 's-violet', 's-sky', 's-rose'];
  return entries.map(([name, notes], index) => {
    const tag: (typeof LUMIO_TAGS)[number] = { name, count: notes.length };
    if (index < 2) tag.size = 'is-big';
    else if (index < 6) tag.size = 'is-mid';
    const tone = tones[index % tones.length];
    if (tone) tag.tone = tone;
    return tag;
  });
}

function renderTagPill(tag: (typeof LUMIO_TAGS)[number]): string {
  const size = tag.size ? ` ${tag.size}` : '';
  const tone = tag.tone ? ` ${tag.tone}` : '';
  return `<a class="tag-pill${size}${tone}" href="/tags/${esc(encodeURIComponent(tag.name))}.html">${esc(tag.name)}<span class="tag-pill__n">${tag.count}</span></a>`;
}

function sortTagNotes(notes: NoteRow[]): NoteRow[] {
  return [...notes].sort((a, b) => {
    const date = sortDateMs(b) - sortDateMs(a);
    if (date !== 0) return date;
    return a.slug.localeCompare(b.slug, 'zh-Hans-CN');
  });
}

function sortDateMs(n: NoteRow): number {
  const raw = n.published_at || n.updated_at || n.created_at || '';
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * 单标签详情页 — 按年分组、顶部描述、相关标签
 * 对应设计稿: doc/prototype/hf-extras.jsx §4 HFTagDetail
 */
export function renderTagPage(
  tag: string,
  notes: NoteRow[],
  byTag: Map<string, NoteRow[]>,
  config: SiteConfig,
): string {
  const sorted = sortTagNotes(notes);
  const articles = buildLumioArticles(sorted, byTag);
  const rows = articles.map((article) => renderArticleRow(article, { kind: '文章' })).join('');
  const tagCloud = renderTagCloudPills(buildTagCloud(byTag));
  const description = `与 ${tag} 相关的技术文章、工具与实践经验,共 ${notes.length} 篇。`;

  const body = `
    <main class="page">
      <nav class="crumb" aria-label="面包屑">
        <a href="/">首页</a>
        <span class="crumb__sep">/</span>
        <a href="/tags/index.html">标签</a>
        <span class="crumb__sep">/</span>
        <span class="crumb__cur">${esc(tag)}</span>
      </nav>

      <div class="layout">
        <div>
          <div class="tag-detail-head">
            <h1>标签:<em>${esc(tag)}</em></h1>
            <p>${esc(description)}</p>
          </div>
          <div class="tabs" role="tablist" aria-label="内容类型">
            <button class="tab is-active" type="button" data-kind="全部">全部</button>
            <button class="tab" type="button" data-kind="文章">文章</button>
            <button class="tab" type="button" data-kind="专栏">专栏</button>
          </div>
          <div class="alist" id="tag-list">${rows || '<p class="lumio-empty">暂无内容</p>'}</div>
          <p class="lumio-empty" id="tag-empty" hidden>暂无内容</p>
        </div>
        <aside>
          <div class="side-card">
            <div class="side-card__title">标签云</div>
            <div class="tagcloud">${tagCloud}</div>
          </div>
        </aside>
      </div>
    </main>
    <script>
      (function(){
        var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab[data-kind]'));
        var rows = Array.prototype.slice.call(document.querySelectorAll('#tag-list .arow'));
        var empty = document.getElementById('tag-empty');
        function apply(kind){
          var visible = 0;
          tabs.forEach(function(tab){ tab.classList.toggle('is-active', tab.getAttribute('data-kind') === kind); });
          rows.forEach(function(row){
            var rowKind = row.getAttribute('data-kind') || '文章';
            var show = kind === '全部' || rowKind === kind;
            row.classList.toggle('is-filtered-out', !show);
            if (show) visible += 1;
          });
          if (empty) empty.hidden = visible !== 0;
        }
        tabs.forEach(function(tab){
          tab.addEventListener('click', function(){ apply(tab.getAttribute('data-kind') || '全部'); });
        });
      })();
    </script>`;

  return layout({
    title: `#${tag} · ${config.site.title}`,
    description,
    config,
    body,
    active: 'tags',
    path: `/tags/${encodeURIComponent(tag)}.html`,
  });
}

/**
 * WS-C — Tag 索引页 + 单标签详情页 mobile-only CSS。
 */
export const TAG_MOBILE_CSS = `
/* ====================================================================== */
/* WS-C — Tag 移动端 (max-width: 768px)                                      */
/* ====================================================================== */
@media (max-width: 768px) {
  /* 标签详情页 */
  .wsa-tag__head { padding: 28px 16px 18px; }
  .wsa-tag__h { font-size: 32px; }
  .wsa-tag__desc { font-size: 14px; margin-top: 8px; }
  .wsa-tag__blob { display: none; }
  .wsa-tag__grid {
    grid-template-columns: 1fr;
    padding: 20px 16px;
    gap: 24px;
  }
  .wsa-tag__row {
    grid-template-columns: 52px 1fr;
    gap: 10px;
    padding: 12px 0;
  }
  .wsa-tag__meta {
    grid-column: 1 / -1;
    grid-row: 2;
    text-align: left;
    padding-top: 0;
    padding-left: 62px;
  }
  .wsa-tag__year-h { font-size: 16px; }

  /* 标签索引页 */
  .wsa-tagindex { padding: 32px 16px; }
  .wsa-tagindex__title { font-size: 28px; }

  /* About */
  .wsa-about { padding: 36px 16px; }
  .wsa-about__title { font-size: 28px; }
  .wsa-about__avatar { width: 72px; height: 72px; font-size: 30px; }

  /* 404 */
  .wsa-404 { padding: 48px 16px; }
  .wsa-404__big { font-size: 96px; }
  .wsa-404__title { font-size: 22px; }

  body, html { overflow-x: hidden; }
}
@media (max-width: 380px) {
  .wsa-tag__grid { padding-left: 14px; padding-right: 14px; }
  .wsa-tag__h { font-size: 28px; }
}
`;
