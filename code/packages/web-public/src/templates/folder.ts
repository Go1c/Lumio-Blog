import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { isoDate } from '../partials/shared.js';

/**
 * 文件夹归档页 — 列出该 vault 顶层文件夹下所有 public 笔记,按年分组。
 *
 * 路由:/folders/<encodeURIComponent(name)>.html
 *
 * 设计上是 tag.ts 的孪生页面;只是数据来源是 source_path 前缀,不是 tag 关联。
 * 复用 .wsa-tag__* CSS 类,语义上是同种「集合归档」。
 */
export function renderFolderPage(
  folder: string,
  notes: NoteRow[],
  allFolders: Array<{ name: string; count: number }>,
  config: SiteConfig,
): string {
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
                <p class="hf-mono hf-tiny hf-faint" style="margin:4px 0 0">📁 ${esc(n.source_path)}</p>
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

  // 兄弟文件夹(用于侧栏跳转)
  const others = allFolders.filter((f) => f.name !== folder);
  const othersHtml = others
    .map(
      (f) =>
        `<li><a class="ui-tag" href="/folders/${esc(encodeURIComponent(f.name))}.html" style="font-size:11px">📁 ${esc(f.name)}<span class="hf-mono hf-faint" aria-hidden="true" style="margin-left:3px;font-size:10px">${f.count}</span></a></li>`,
    )
    .join('');

  // 文件夹下最新 3 篇
  const top = [...notes]
    .sort((a, b) => (isoDate(a) < isoDate(b) ? 1 : -1))
    .slice(0, 3);
  const topHtml = top
    .map(
      (n, i) => `
        <a class="wsa-tag__hot ${i ? 'wsa-tag__hot--bordered' : ''}" href="/posts/${esc(n.slug)}.html">
          <div class="wsa-tag__hot-title hf-sm">${esc(n.title)}</div>
          <div class="wsa-tag__hot-meta hf-mono hf-tiny hf-faint">${n.reading_minutes} min · ${n.word_count} 字</div>
        </a>`,
    )
    .join('');

  const totalWords = notes.reduce((s, n) => s + n.word_count, 0);
  const lastUpdated = notes
    .map((n) => isoDate(n))
    .sort((a, b) => (a < b ? 1 : -1))[0];

  const description = `文件夹 ${folder} 下的所有公开笔记。`;

  const body = `
    <div class="wsa-tag">
      <header class="wsa-tag__head">
        <div class="hf-blob wsa-tag__blob" aria-hidden="true"></div>
        <div class="wsa-tag__head-inner">
          <div class="hf-mono hf-tiny hf-muted wsa-tag__crumbs"><a href="/">首页</a> / <a href="/folders/index.html">所有文件夹</a> /</div>
          <h1 class="wsa-tag__h"><span aria-hidden="true">📁</span> ${esc(folder)}</h1>
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
        <main class="wsa-tag__main" aria-label="文件夹 ${esc(folder)} 下的笔记">
          ${yearSections || '<p class="hf-muted">这个文件夹下暂时没有公开笔记。</p>'}
        </main>

        <aside class="wsa-tag__side" aria-label="相关">
          ${
            othersHtml
              ? `<div class="wsa-side__h hf-mono hf-tiny">▸ 其他文件夹</div>
                 <ul class="wsa-tag__related">${othersHtml}</ul>`
              : ''
          }
          ${
            topHtml
              ? `<div class="wsa-side__h hf-mono hf-tiny">▸ 最近更新</div>
                 <div class="wsa-tag__hot-list">${topHtml}</div>`
              : ''
          }
        </aside>
      </div>
    </div>`;

  return layout({
    title: `📁 ${folder} · ${config.site.title}`,
    description,
    config,
    body,
  });
}

/**
 * 文件夹索引页:列出全部文件夹。
 */
export function renderFolderIndex(
  folders: Array<{ name: string; count: number }>,
  config: SiteConfig,
): string {
  const items = [...folders]
    .sort((a, b) => b.count - a.count)
    .map(
      (f) => {
        const hot = f.count >= 5;
        return `<li><a class="ui-tag${hot ? ' ui-tag--accent' : ''}" href="/folders/${esc(encodeURIComponent(f.name))}.html" aria-label="文件夹 ${esc(f.name)},共 ${f.count} 篇">📁 ${esc(f.name)} <span class="hf-mono hf-faint" aria-hidden="true" style="margin-left:4px;font-size:11px">${f.count}</span></a></li>`;
      },
    )
    .join('');
  const body = `
    <div class="wsa-tagindex">
      <header class="wsa-tagindex__head">
        <h1 class="wsa-tagindex__title"><span aria-hidden="true">📂</span> 所有文件夹</h1>
        <p class="hf-muted">共 ${folders.length} 个文件夹</p>
      </header>
      <ul class="wsa-tagindex__list" aria-label="所有文件夹">${items || '<li>暂无</li>'}</ul>
    </div>`;
  return layout({
    title: `文件夹 · ${config.site.title}`,
    description: '所有文件夹',
    config,
    body,
  });
}
