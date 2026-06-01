import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { isoDate, shortDate, tagsForSlug } from '../partials/shared.js';
import { renderInlineMd } from '../partials/inline-md.js';
import { renderHfAdHero } from '../partials/hf-ad.js';

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

/**
 * Home 页 — 三栏:左目录 220 / 中文章流 / 右作者+广告+标签云 260
 * 对应设计稿: doc/prototype/hf-home.jsx
 */
export function renderHome(data: HomeData, config: SiteConfig): string {
  const { posts, byTag, recentNotes, totalArticles, totalNotes, folders } = data;
  const author = config.author;
  const heroTitleSrc = config.home?.hero_title_md ?? config.site.title;
  const heroIntroSrc = config.home?.hero_intro_md ?? (config.site.description ?? '');
  // hero_title_md / hero_intro_md 按 inline-only Markdown 渲染:支持 **bold**/*italic*/`code`/[](),
  // 以及白名单 inline HTML(<span style="color:..."> / <em> / <strong> / <code> / <a>)。
  // <script>、<iframe>、事件处理器一律剔除;纯文本输入等价于 esc()。
  const heroTitleHtml = renderInlineMd(heroTitleSrc);
  const heroIntroHtml = renderInlineMd(heroIntroSrc);

  // 左目录:把所有标签按文章数排序展示一份完整列表(不再人为对半切成 文章/系列)
  const tagEntries = [...byTag.entries()]
    .sort((a, b) => b[1].length - a[1].length);

  const renderCatalog = (items: Array<[string, NoteRow[]]>): string => {
    let html = '';

    // 文件夹部分
    if (folders.length > 0) {
      const folderRows = folders
        .map(
          (f) => `
            <li>
              <a class="wsa-cat__row wsa-cat__row--folder" href="/folders/${esc(encodeURIComponent(f.name))}.html">
                <span class="wsa-cat__name"><span aria-hidden="true" style="margin-right:4px">📁</span>${esc(f.name)}</span>
                <span class="hf-mono hf-tiny hf-faint" aria-label="${f.count} 篇">${f.count}</span>
              </a>
            </li>`,
        )
        .join('');
      html += `
        <div class="wsa-cat__group">
          <div class="wsa-cat__title" id="wsa-cat-folders"><span aria-hidden="true">📂</span> 文件夹</div>
          <ul class="wsa-cat__list" aria-labelledby="wsa-cat-folders">${folderRows}</ul>
        </div>`;
    }

    // 标签部分
    if (!items.length) {
      html += '<p class="hf-tiny hf-muted" style="padding:4px 10px;margin:0">暂无标签</p>';
    } else {
      const tagRows = items
        .map(
          ([tag, notes]) => `
            <li>
              <a class="wsa-cat__row" href="/tags/${esc(encodeURIComponent(tag))}.html">
                <span class="wsa-cat__name">#${esc(tag)}</span>
                <span class="hf-mono hf-tiny hf-faint" aria-label="${notes.length} 篇">${notes.length}</span>
              </a>
            </li>`,
        )
        .join('');
      html += `
        <div class="wsa-cat__group">
          <div class="wsa-cat__title" id="wsa-cat-all"><span aria-hidden="true">🏷️</span> 标签</div>
          <ul class="wsa-cat__list" aria-labelledby="wsa-cat-all">${tagRows}</ul>
        </div>`;
    }

    return html;
  };

  // 文章流 — 只把显式 frontmatter pinned: true 的当置顶
  const isPinned = (n: NoteRow): boolean => {
    const fm = (n as { frontmatter?: { pinned?: unknown }; pinned?: unknown }).frontmatter;
    if (fm && (fm.pinned === true || fm.pinned === 'true' || fm.pinned === 1)) return true;
    const flat = (n as { pinned?: unknown }).pinned;
    return flat === true || flat === 1;
  };
  const pinnedIdx = posts.findIndex(isPinned);
  const pinned = pinnedIdx >= 0 ? posts[pinnedIdx] : null;
  const rest = pinned ? posts.filter((_, i) => i !== pinnedIdx) : posts;
  const isWeakHomePost = (n: NoteRow): boolean => {
    const title = (n.title ?? '').trim();
    return !title || /^未命名(?:\s+\d+)?$/.test(title) || Number(n.word_count ?? 0) <= 0;
  };
  const sortDateMs = (n: NoteRow): number => {
    const raw = n.updated_at || n.published_at || n.created_at || '';
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : 0;
  };
  const restSorted = [...rest].sort((a, b) => {
    const quality = Number(isWeakHomePost(a)) - Number(isWeakHomePost(b));
    if (quality !== 0) return quality;
    const date = sortDateMs(b) - sortDateMs(a);
    if (date !== 0) return date;
    return a.slug.localeCompare(b.slug, 'zh-Hans-CN');
  });

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
    ? (pinned ? renderPinned(pinned) : '') + restSorted.map(renderRow).join('')
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

  // 自家广告(HfAd) — 放在作者卡和"最近笔记"之间。enabled !== true 时返回空串。
  const hfAdHtml = renderHfAdHero(config.home?.ad);

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
          <h1 class="wsa-hero__title">${heroTitleHtml}</h1>
          ${heroIntroHtml ? `<p class="wsa-hero__intro">${heroIntroHtml}</p>` : ''}
          <div class="wsa-hero__cta">
            <a class="ui-btn ui-btn--primary" href="#recent">${esc(config.home?.hero_cta_primary ?? '看最新文章')} <span aria-hidden="true">→</span></a>
            <a class="ui-btn" href="/tags/index.html">${esc(config.home?.hero_cta_secondary ?? '逛标签')} <span aria-label="共 ${byTag.size} 个标签">(${byTag.size})</span></a>
            <a class="ui-btn" href="/search/index.html" aria-label="全站搜索"><span aria-hidden="true">🔍</span> 搜索</a>
          </div>
        </div>
      </div>

      <!-- THREE COLUMN -->
      <div class="wsa-grid">
        <!-- LEFT: catalog -->
        <aside class="wsa-cat" aria-label="目录">
          <div class="wsa-cat__head hf-mono hf-tiny">▸ 目录</div>
          ${renderCatalog(tagEntries)}
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

          ${hfAdHtml}

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
    path: '/',
  });
}

/**
 * WS-C — Home 页 mobile-only CSS。由 render-site 拼接到 styles.css 末尾。
 * 不动 WS-A 桌面样式;只在 max-width: 768px 下覆写关键布局。
 */
export const HOME_MOBILE_CSS = `
/* ====================================================================== */
/* WS-C — Home 移动端 (max-width: 768px)                                     */
/* ====================================================================== */
@media (max-width: 768px) {
  /* 三栏 → 单栏:中流在前,右栏作者下移,左目录折叠到底部 */
  .wsa-grid {
    grid-template-columns: 1fr;
    padding: 20px 16px;
    gap: 24px;
  }
  .wsa-cat {
    order: 3;
    border-right: 0;
    border-top: 1px solid var(--line);
    padding: 16px 0 0;
  }
  .wsa-cat__list { display: flex; flex-wrap: wrap; gap: 6px; }
  .wsa-cat__row {
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 8px 12px;
    min-height: 36px;
    font-size: 13px;
  }
  .wsa-feed { order: 1; padding: 0; }
  .wsa-feed__h { font-size: 20px; }
  .wsa-side {
    order: 2;
    border-left: 0;
    padding-left: 0;
    border-top: 1px solid var(--line);
    padding-top: 20px;
  }

  /* hero — 简化、去 blob */
  .wsa-hero { padding: 32px 16px 28px; }
  .wsa-hero__title { font-size: 30px; line-height: 1.15; }
  .wsa-hero__intro { font-size: 15px; margin-top: 12px; }
  .wsa-hero__cta { gap: 8px; margin-top: 18px; }
  .wsa-hero__cta .ui-btn { min-height: 44px; padding-left: 14px; padding-right: 14px; }
  .wsa-hero__blob-a, .wsa-hero__blob-b { display: none; }

  /* 文章流 */
  .wsa-pinned { padding: 16px; }
  .wsa-pinned__title { font-size: 18px; }
  .wsa-row {
    grid-template-columns: 52px 1fr;
    gap: 10px;
    padding: 14px 0;
  }
  .wsa-row__meta {
    grid-column: 1 / -1;
    grid-row: 2;
    text-align: left;
    padding-top: 0;
    padding-left: 62px;
  }
  .wsa-row__title { font-size: 15px; }

  /* 全局触控目标 */
  body, html { overflow-x: hidden; }
  img, pre, table { max-width: 100%; }
  pre { overflow-x: auto; }
}
@media (max-width: 380px) {
  .wsa-hero { padding: 24px 14px 22px; }
  .wsa-hero__title { font-size: 26px; }
  .wsa-grid { padding-left: 14px; padding-right: 14px; }
}
`;
