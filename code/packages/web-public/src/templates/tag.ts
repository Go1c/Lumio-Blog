import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { isoDate } from '../partials/shared.js';
import {
  LUMIO_RENDER_TAG_ARTICLES,
  LUMIO_TAGS,
  renderArticleCard,
  renderPageHead,
} from './lumio-design.js';

/**
 * 全部标签索引页
 */
export function renderTagIndex(byTag: Map<string, NoteRow[]>, config: SiteConfig): string {
  void byTag;
  const tagItems = LUMIO_TAGS
    .map((tag) => {
      const size = tag.size ? ` ${tag.size}` : '';
      const tone = tag.tone ? ` ${tag.tone}` : '';
      return `<a class="tag-pill${size}${tone}" href="/tags/${esc(encodeURIComponent(tag.name))}.html">${esc(tag.name)}<span class="tag-pill__n">${tag.count}</span></a>`;
    })
    .join('');
  const cards = LUMIO_RENDER_TAG_ARTICLES.map((article) => renderArticleCard(article)).join('');
  const body = `
    ${renderPageHead('Tags', '标签', '按主题快速找到你关心的内容,标签越大代表文章越多。')}
    <main class="page">
      <h2 class="section-title">热门标签</h2>
      <div class="tagcloud" aria-label="所有标签">${tagItems}</div>

      <h2 class="section-title" style="margin-top:34px;">#渲染 下的文章</h2>
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
  // 按年分组(降序)
  const byYear = new Map<string, NoteRow[]>();
  for (const n of notes) {
    const year = isoDate(n).slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(n);
  }
  const years = [...byYear.keys()].sort((a, b) => (a < b ? 1 : -1));

  const yearSections = years
    .map((y) => {
      const list = byYear.get(y)!;
      const rows = list
        .map((n) => {
          const iso = isoDate(n);
          const md = iso.length >= 10 ? iso.slice(5, 10) : iso;
          return `
            <article class="wsa-tag__row hf-hover">
              <time datetime="${esc(iso)}" class="wsa-tag__date hf-mono hf-tiny hf-faint">${esc(md)}</time>
              <div class="wsa-tag__main">
                <h3 class="wsa-tag__title"><a href="/posts/${esc(n.slug)}.html">${esc(n.title)}</a></h3>
                ${n.summary ? `<p class="wsa-tag__sum hf-tiny hf-muted">${esc(n.summary)}</p>` : ''}
              </div>
              <div class="wsa-tag__meta hf-mono hf-tiny hf-faint">
                <span aria-label="阅读时长 ${n.reading_minutes} 分钟">${n.reading_minutes} min</span>
              </div>
            </article>`;
        })
        .join('');
      return `
        <section class="wsa-tag__year" aria-labelledby="wsa-y-${esc(y)}">
          <header class="wsa-tag__year-head">
            <h2 id="wsa-y-${esc(y)}" class="wsa-tag__year-h">${esc(y)}</h2>
            <span class="hf-mono hf-tiny hf-faint">${list.length} 篇</span>
          </header>
          ${rows}
        </section>`;
    })
    .join('');

  // 相关标签 — 与当前 tag 共现的其他 tag,top 6
  const related = computeRelatedTags(tag, notes, byTag).slice(0, 6);
  const relatedHtml = related
    .map(
      ([t, c]) =>
        `<li><a class="ui-tag" href="/tags/${esc(encodeURIComponent(t))}.html" style="font-size:11px">#${esc(t)}<span class="hf-mono hf-faint" aria-hidden="true" style="margin-left:3px;font-size:10px">${c}</span></a></li>`,
    )
    .join('');

  // 标签下最热(按字数 / 阅读时长粗排)
  const top = [...notes].sort((a, b) => b.word_count - a.word_count).slice(0, 3);
  const topHtml = top
    .map(
      (n, i) => `
        <a class="wsa-tag__hot ${i ? 'wsa-tag__hot--bordered' : ''}" href="/posts/${esc(n.slug)}.html">
          <div class="wsa-tag__hot-title hf-sm">${esc(n.title)}</div>
          <div class="wsa-tag__hot-meta hf-mono hf-tiny hf-faint">${n.reading_minutes} min · ${n.word_count} 字</div>
        </a>`,
    )
    .join('');

  // 计算总字数 / 最近活跃
  const totalWords = notes.reduce((s, n) => s + n.word_count, 0);
  const lastUpdated = notes
    .map((n) => isoDate(n))
    .sort((a, b) => (a < b ? 1 : -1))[0];

  const description = `标签 ${tag} 下的所有文章和笔记。`;

  const body = `
    <div class="wsa-tag">
      <!-- header -->
      <header class="wsa-tag__head">
        <div class="hf-blob wsa-tag__blob" aria-hidden="true"></div>
        <div class="wsa-tag__head-inner">
          <div class="hf-mono hf-tiny hf-muted wsa-tag__crumbs"><a href="/tags/index.html">所有标签</a> /</div>
          <h1 class="wsa-tag__h"><span style="color:var(--accent)">#</span>${esc(tag)}</h1>
          <p class="wsa-tag__desc">${esc(description)}</p>
          <ul class="wsa-tag__stats" aria-label="统计">
            <li><b class="hf-mono">${notes.length}</b> 文章</li>
            <li aria-hidden="true">·</li>
            <li><b class="hf-mono">${totalWords.toLocaleString('en-US')}</b> 字</li>
            ${lastUpdated ? `<li aria-hidden="true">·</li><li>最近更新 <time datetime="${esc(lastUpdated)}" class="hf-mono">${esc(lastUpdated)}</time></li>` : ''}
            <li class="wsa-tag__stats-spacer" aria-hidden="true"></li>
            <li><a class="ui-btn ui-btn--sm" href="/feed.xml" aria-label="RSS 订阅">RSS</a></li>
          </ul>
        </div>
      </header>

      <div class="wsa-tag__grid">
        <main class="wsa-tag__main" aria-label="标签 ${esc(tag)} 下的文章">
          ${yearSections || '<p class="hf-muted">这个标签下暂时没有文章。</p>'}
        </main>

        <aside class="wsa-tag__side" aria-label="相关">
          ${
            relatedHtml
              ? `<div class="wsa-side__h hf-mono hf-tiny">▸ 相关标签</div>
                 <ul class="wsa-tag__related">${relatedHtml}</ul>`
              : ''
          }
          ${
            topHtml
              ? `<div class="wsa-side__h hf-mono hf-tiny">▸ 标签下最热</div>
                 <div class="wsa-tag__hot-list">${topHtml}</div>`
              : ''
          }
        </aside>
      </div>
    </div>`;

  return layout({
    title: `#${tag} · ${config.site.title}`,
    description,
    config,
    body,
    active: 'tags',
    path: `/tags/${encodeURIComponent(tag)}.html`,
  });
}

function computeRelatedTags(
  current: string,
  notes: NoteRow[],
  byTag: Map<string, NoteRow[]>,
): Array<[string, number]> {
  const slugs = new Set(notes.map((n) => n.slug));
  const counts = new Map<string, number>();
  for (const [t, list] of byTag) {
    if (t === current) continue;
    let n = 0;
    for (const note of list) if (slugs.has(note.slug)) n += 1;
    if (n > 0) counts.set(t, n);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
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
