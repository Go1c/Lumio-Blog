import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { isoDate } from '../partials/shared.js';

/**
 * 全部标签索引页
 */
export function renderTagIndex(byTag: Map<string, NoteRow[]>, config: SiteConfig): string {
  const entries = [...byTag.entries()].sort((a, b) => b[1].length - a[1].length);
  const items = entries
    .map(([t, notes]) => {
      const hot = notes.length >= 5;
      return `<li><a class="ui-tag${hot ? ' ui-tag--accent' : ''}" href="/tags/${esc(encodeURIComponent(t))}.html" aria-label="标签 ${esc(t)},共 ${notes.length} 篇">#${esc(t)} <span class="hf-mono hf-faint" aria-hidden="true" style="margin-left:4px;font-size:11px">${notes.length}</span></a></li>`;
    })
    .join('');
  const body = `
    <div class="wsa-tagindex">
      <header class="wsa-tagindex__head">
        <h1 class="wsa-tagindex__title"><span style="color:var(--accent)">#</span> 所有标签</h1>
        <p class="hf-muted">共 ${entries.length} 个标签</p>
      </header>
      <ul class="wsa-tagindex__list" aria-label="所有标签">${items || '<li>暂无</li>'}</ul>
    </div>`;
  return layout({
    title: `标签 · ${config.site.title}`,
    description: '所有标签',
    config,
    body,
    active: 'tags',
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
