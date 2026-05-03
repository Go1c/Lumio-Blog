import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { isoDate, shortDate, tagsForSlug } from '../partials/shared.js';

export interface HomeData {
  posts: NoteRow[];
  byTag: Map<string, NoteRow[]>;
  recentNotes: NoteRow[];
  totalArticles: number;
  totalNotes: number;
}

/**
 * Home 页 — 三栏:左目录 220 / 中文章流 / 右作者+广告+标签云 260
 * 对应设计稿: doc/prototype/hf-home.jsx
 */
export function renderHome(data: HomeData, config: SiteConfig): string {
  const { posts, byTag, recentNotes, totalArticles, totalNotes } = data;
  const author = config.author;
  const heroTitle = config.home?.hero_title_md ?? config.site.title;
  const heroIntro = config.home?.hero_intro_md ?? (config.site.description ?? '');

  // 左目录:按标签分组取 top — 作为简化的 "目录树"
  const tagEntries = [...byTag.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 9);
  const halfPoint = Math.ceil(tagEntries.length / 2);
  const groupA = tagEntries.slice(0, halfPoint);
  const groupB = tagEntries.slice(halfPoint);

  const renderCategoryGroup = (
    title: string,
    emoji: string,
    items: Array<[string, NoteRow[]]>,
    gid: string,
  ): string => {
    if (!items.length) return '';
    const rows = items
      .map(
        ([tag, notes]) => `
          <li>
            <a class="wsa-cat__row" href="/tags/${esc(encodeURIComponent(tag))}.html">
              <span class="wsa-cat__name">${esc(tag)}</span>
              <span class="hf-mono hf-tiny hf-faint" aria-label="${notes.length} 篇">${notes.length}</span>
            </a>
          </li>`,
      )
      .join('');
    return `
      <div class="wsa-cat__group">
        <div class="wsa-cat__title" id="${gid}"><span aria-hidden="true">${emoji}</span> ${esc(title)}</div>
        <ul class="wsa-cat__list" aria-labelledby="${gid}">${rows}</ul>
      </div>`;
  };

  // 文章流
  const pinned = posts[0];
  const rest = posts.slice(1);

  const renderPinned = (n: NoteRow): string => {
    const iso = isoDate(n);
    const tags = tagsForSlug(byTag, n.slug).slice(0, 3);
    const tagChips = tags
      .map(
        (t) =>
          `<li><a class="ui-tag" href="/tags/${esc(encodeURIComponent(t))}.html" style="font-size:11px">#${esc(t)}</a></li>`,
      )
      .join('');
    return `
      <article class="wsa-pinned">
        <div class="wsa-pinned__badge">
          <span class="ui-tag ui-tag--accent" style="font-size:11px"><span aria-hidden="true">📌</span> <span aria-label="已置顶">置顶</span></span>
        </div>
        ${tagChips ? `<ul class="wsa-pinned__tags" aria-label="标签">${tagChips}</ul>` : ''}
        <h3 class="wsa-pinned__title"><a href="/posts/${esc(n.slug)}.html">${esc(n.title)}</a></h3>
        ${n.summary ? `<p class="wsa-pinned__sum">${esc(n.summary)}</p>` : ''}
        <div class="wsa-pinned__meta hf-mono hf-tiny">
          <time datetime="${esc(iso)}">${esc(iso)}</time>
          <span aria-hidden="true">·</span>
          <span aria-label="阅读时长 ${n.reading_minutes} 分钟">${n.reading_minutes} min</span>
          <span aria-hidden="true">·</span>
          <span aria-label="共 ${n.word_count} 字">${n.word_count} 字</span>
        </div>
      </article>`;
  };

  const renderRow = (n: NoteRow): string => {
    const iso = isoDate(n);
    const tags = tagsForSlug(byTag, n.slug).slice(0, 3);
    const tagChips = tags
      .map(
        (t) =>
          `<li><a class="ui-tag" href="/tags/${esc(encodeURIComponent(t))}.html" style="font-size:11px">#${esc(t)}</a></li>`,
      )
      .join('');
    return `
      <article class="wsa-row hf-hover">
        <time datetime="${esc(iso)}" class="wsa-row__date hf-mono hf-tiny hf-faint">${esc(shortDate(iso))}</time>
        <div class="wsa-row__main">
          <h3 class="wsa-row__title"><a href="/posts/${esc(n.slug)}.html">${esc(n.title)}</a></h3>
          ${tagChips ? `<ul class="wsa-row__tags" aria-label="标签">${tagChips}</ul>` : ''}
        </div>
        <div class="wsa-row__meta hf-mono hf-tiny hf-faint">
          <span aria-label="阅读时长 ${n.reading_minutes} 分钟">${n.reading_minutes} min</span><br>
          <span aria-label="共 ${n.word_count} 字">${n.word_count} 字</span>
        </div>
      </article>`;
  };

  const feed = posts.length
    ? (pinned ? renderPinned(pinned) : '') + rest.map(renderRow).join('')
    : '<p class="wsa-empty">还没有公开的文章。</p>';

  // 右栏 — 作者 / 最近笔记 / 标签云
  const socialLinks = (author.social ?? [])
    .map(
      (s) =>
        `<li><a class="ui-btn ui-btn--sm ui-btn--ghost" href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.platform)}</a></li>`,
    )
    .join('');

  const recentNoteItems = recentNotes
    .slice(0, 4)
    .map((n) => {
      const iso = isoDate(n);
      const visClass =
        n.visibility === 'public'
          ? 'ui-badge--public'
          : n.visibility === 'private'
            ? 'ui-badge--private'
            : 'ui-badge--unlisted';
      const visLabel =
        n.visibility === 'public' ? '公开' : n.visibility === 'private' ? '私有' : '仅链接';
      return `
        <li>
          <a class="wsa-side__note hf-hover" href="/posts/${esc(n.slug)}.html">
            <div class="wsa-side__note-meta">
              <span class="ui-badge ${visClass}" style="font-size:11px" aria-label="可见性 ${esc(visLabel)}">${esc(visLabel)}</span>
              <time datetime="${esc(iso)}" class="hf-mono hf-tiny hf-faint">· ${esc(iso)}</time>
            </div>
            <div class="wsa-side__note-title hf-sm">${esc(n.title)}</div>
          </a>
        </li>`;
    })
    .join('');

  // 标签云 — 取前 14 个,前 2 个标记 hot
  const tagCloud = [...byTag.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 14)
    .map(([tag, notes], i) => {
      const hot = i < 2;
      return `<li><a class="ui-tag${hot ? ' ui-tag--accent' : ''}" href="/tags/${esc(encodeURIComponent(tag))}.html" style="font-size:11px" aria-label="标签 ${esc(tag)},共 ${notes.length} 篇${hot ? ',热门' : ''}">#${esc(tag)}<span class="hf-mono hf-faint" aria-hidden="true" style="margin-left:3px;font-size:10px">${notes.length}</span></a></li>`;
    })
    .join('');

  const avatarChar = (author.name || 'L').charAt(0).toUpperCase();

  const body = `
    <div class="wsa-home">
      <!-- HERO -->
      <div class="wsa-hero">
        <div class="hf-blob wsa-hero__blob-a" aria-hidden="true"></div>
        <div class="hf-blob wsa-hero__blob-b" aria-hidden="true"></div>
        <div class="wsa-hero__inner">
          <div class="wsa-hero__pre">
            <span class="ui-tag" style="font-family:var(--mono);font-size:11px">v${esc(String(config.site.title.length))} · ${esc(config.site.title)}</span>
          </div>
          <h1 class="wsa-hero__title">${esc(heroTitle)}</h1>
          ${heroIntro ? `<p class="wsa-hero__intro">${esc(heroIntro)}</p>` : ''}
          <div class="wsa-hero__cta">
            <a class="ui-btn ui-btn--primary" href="#recent">${esc(config.home?.hero_cta_primary ?? '看最新文章')} <span aria-hidden="true">→</span></a>
            <a class="ui-btn" href="/tags/index.html">${esc(config.home?.hero_cta_secondary ?? '逛标签')} <span aria-label="共 ${totalNotes} 条">(${totalNotes})</span></a>
          </div>
        </div>
      </div>

      <!-- THREE COLUMN -->
      <div class="wsa-grid">
        <!-- LEFT: catalog -->
        <aside class="wsa-cat" aria-label="目录">
          <div class="wsa-cat__head hf-mono hf-tiny">▸ 目录</div>
          ${renderCategoryGroup('文章', '📄', groupA, 'wsa-cat-a')}
          ${renderCategoryGroup('系列', '📚', groupB, 'wsa-cat-b')}
        </aside>

        <!-- MIDDLE: feed -->
        <section class="wsa-feed" id="recent" aria-labelledby="recent-h">
          <div class="wsa-feed__head">
            <h2 id="recent-h" class="wsa-feed__h">最近发布</h2>
            <span class="hf-mono hf-tiny hf-faint">${totalArticles} articles · ${totalNotes} notes</span>
          </div>
          ${feed}
        </section>

        <!-- RIGHT: profile + tag cloud -->
        <aside class="wsa-side" aria-label="作者资料与标签">
          <div class="wsa-side__profile">
            <div class="wsa-side__avatar" aria-hidden="true">${esc(avatarChar)}</div>
            <div class="wsa-side__name">${esc(author.name)}</div>
            ${author.bio ? `<div class="wsa-side__bio hf-tiny hf-muted">${esc(author.bio)}</div>` : ''}
            ${socialLinks ? `<ul class="wsa-side__social" aria-label="社交链接">${socialLinks}</ul>` : ''}
          </div>

          ${
            recentNoteItems
              ? `<section class="wsa-side__section" aria-labelledby="wsa-recent-notes-h">
                  <h3 id="wsa-recent-notes-h" class="wsa-side__h hf-mono hf-tiny">▸ 最近笔记</h3>
                  <ul class="wsa-side__notes">${recentNoteItems}</ul>
                </section>`
              : ''
          }

          ${
            tagCloud
              ? `<section class="wsa-side__section" aria-labelledby="wsa-tag-cloud-h">
                  <h3 id="wsa-tag-cloud-h" class="wsa-side__h hf-mono hf-tiny">▸ 标签云</h3>
                  <ul class="wsa-side__cloud">${tagCloud}</ul>
                </section>`
              : ''
          }
        </aside>
      </div>
    </div>`;

  return layout({
    title: config.site.title,
    description: config.site.description ?? '',
    config,
    body,
    active: 'home',
  });
}
