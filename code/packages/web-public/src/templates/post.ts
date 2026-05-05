import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { isoDate, tagsForSlug } from '../partials/shared.js';
import { renderArticleComments } from '../partials/article-comments.js';
import {
  renderBacklinksGraphSection,
  type Neighborhood,
} from '../partials/backlinks-graph.js';

export interface PostData {
  note: NoteRow;
  byTag: Map<string, NoteRow[]>;
  /** 同主标签下的其他文章(系列) */
  series: NoteRow[];
  /** 1-hop 邻居图(PR-F / A-2)。无邻居时图整体隐藏。 */
  neighborhood?: Neighborhood;
}

/**
 * 文章详情页 — 三栏:左系列+大纲+操作 / 中正文 / 右评论容器
 * 对应设计稿: doc/prototype/hf-article.jsx (不含侧栏评论 — WS-B)
 */
export function renderPost(data: PostData, config: SiteConfig): string {
  const { note, byTag, series, neighborhood } = data;
  const minigraphHtml = neighborhood
    ? renderBacklinksGraphSection(neighborhood)
    : '';
  const iso = isoDate(note);
  const tags = tagsForSlug(byTag, note.slug);
  const author = config.author;

  const visibilityLabel = labelOf(note.visibility);
  const visibilityBadge =
    note.visibility !== 'public'
      ? `<span class="ui-badge ${visBadgeClass(note.visibility)}" aria-label="可见性:${esc(visibilityLabel)}">${esc(visibilityLabel)}</span>`
      : '';

  // 大纲 — 从 body_html 中正则抽 <h2> / <h3>
  const outline = extractOutline(note.body_html);
  const outlineHtml = outline.length
    ? outline
        .map(
          (h) =>
            `<li class="wsa-outline__item wsa-outline__item--${h.level}">
              <a href="#${esc(h.id)}">${esc(h.text)}</a>
            </li>`,
        )
        .join('')
    : '';

  // 系列(同主标签)
  const seriesPrimary = tags[0] ?? null;
  const seriesItems = (series || [])
    .filter((s) => s.slug !== note.slug)
    .slice(0, 6)
    .map(
      (s) => `
        <li>
          <a class="wsa-series__row" href="/posts/${esc(s.slug)}.html">${esc(s.title)}</a>
        </li>`,
    )
    .join('');

  const tagChips = tags
    .map(
      (t, i) =>
        `<li><a class="ui-tag${i === 0 ? ' ui-tag--accent' : ''}" href="/tags/${esc(encodeURIComponent(t))}.html">#${esc(t)}</a></li>`,
    )
    .join('');

  const avatarChar = (author.name || 'L').charAt(0).toUpperCase();

  // 阅读进度条 + analytics view ping
  const progressScript = `<script>
    (function(){
      var bar = document.getElementById('wsa-progress-bar');
      if (!bar) return;
      function update(){
        var doc = document.documentElement;
        var h = doc.scrollHeight - doc.clientHeight;
        if (h <= 0) { bar.style.width = '0%'; return; }
        var p = Math.max(0, Math.min(100, (window.scrollY / h) * 100));
        bar.style.width = p.toFixed(2) + '%';
        bar.parentElement && bar.parentElement.setAttribute('aria-valuenow', String(Math.round(p)));
      }
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    })();
    (function(){
      // analytics: 上报 view + 离开时 dwell/scroll
      var slug = ${JSON.stringify(note.slug)};
      var startMs = Date.now();
      var maxScrollPct = 0;
      function snapshot(){
        var doc = document.documentElement;
        var h = doc.scrollHeight - doc.clientHeight;
        if (h > 0) {
          var pct = Math.round(Math.max(0, Math.min(100, (window.scrollY / h) * 100)));
          if (pct > maxScrollPct) maxScrollPct = pct;
        }
      }
      window.addEventListener('scroll', snapshot, { passive: true });
      function send(payload){
        try {
          if (navigator.sendBeacon) {
            var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon('/api/track', blob);
            return;
          }
        } catch (e) {}
        try {
          fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(function(){});
        } catch (e) {}
      }
      send({ slug: slug, event: 'view', meta: { referrer: document.referrer || '' } });
      function flushDwell(){
        var dwell = Math.max(0, Math.round((Date.now() - startMs) / 1000));
        snapshot();
        send({ slug: slug, event: 'dwell', meta: { dwell_seconds: dwell, scroll_pct: maxScrollPct } });
      }
      window.addEventListener('pagehide', flushDwell);
      window.addEventListener('beforeunload', flushDwell);
      document.addEventListener('visibilitychange', function(){
        if (document.visibilityState === 'hidden') flushDwell();
      });
    })();
  </script>`;

  const body = `
    <div class="wsa-post">
      <!-- progress bar -->
      <div class="wsa-progress" role="progressbar" aria-label="阅读进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="wsa-progress__bar" id="wsa-progress-bar" aria-hidden="true"></div>
      </div>

      <div class="wsa-post__grid">
        <!-- LEFT — series + outline + actions -->
        <aside class="wsa-post__left" aria-label="文章导航">
          ${
            seriesItems
              ? `<div class="wsa-side__h hf-mono hf-tiny">▸ ${esc(seriesPrimary ?? '系列')}</div>
                 <ul class="wsa-series">${seriesItems}</ul>`
              : ''
          }
          ${
            outlineHtml
              ? `<div class="wsa-side__h hf-mono hf-tiny">▸ 大纲</div>
                 <ul class="wsa-outline">${outlineHtml}</ul>`
              : ''
          }
          ${minigraphHtml}

        </aside>

        <!-- MIDDLE — article body -->
        <article class="wsa-post__main">
          ${tagChips ? `<ul class="wsa-post__tags" aria-label="标签">${tagChips}</ul>` : ''}
          <h1 class="wsa-post__title">${esc(note.title)}</h1>
          ${note.summary ? `<p class="wsa-post__summary">${esc(note.summary)}</p>` : ''}
          <p class="wsa-post__meta hf-mono hf-tiny">
            ${visibilityBadge}
            <time datetime="${esc(iso)}">${esc(iso)}</time>
            <span aria-hidden="true">·</span>
            <span aria-label="阅读时长 ${note.reading_minutes} 分钟">${note.reading_minutes} min read</span>
            <span aria-hidden="true">·</span>
            <span aria-label="共 ${note.word_count} 字">${note.word_count} 字</span>
          </p>
          <hr class="hf-divider wsa-post__divider">

          ${
            note.kind === 'canvas'
              ? `<div class="wsa-prose ob-canvas-host">${note.body_html}</div>`
              : note.kind === 'html'
              ? `<div class="wsa-prose ob-html-host">${note.body_html}</div>`
              : `<div class="wsa-prose hf-prose">${note.body_html}</div>`
          }

          <hr class="hf-divider wsa-post__divider">

          <!-- end-of-article subscribe CTA -->
          <aside class="wsa-cta" aria-label="订阅作者">
            <div class="wsa-cta__avatar" aria-hidden="true">${esc(avatarChar)}</div>
            <div class="hf-grow">
              <div class="wsa-cta__name">${esc(author.name)}</div>
              <div class="wsa-cta__sub hf-sm hf-muted">订阅以收到下一篇</div>
            </div>
            <a class="ui-btn ui-btn--primary" href="/feed.xml">订阅 RSS</a>
          </aside>
        </article>

        <!-- RIGHT — comments rail (WS-B) -->
        ${
          config.features?.comments === false
            ? ''
            : `<aside class="wsa-post__right" id="comments" aria-label="评论">
            ${renderArticleComments({ slug: note.slug }, config)}
          </aside>`
        }
      </div>

      <!-- WS-C — 移动端浮动操作 pill(桌面隐藏) -->
      <div class="wsc-pill" role="toolbar" aria-label="文章操作">
        <button type="button" class="wsc-pill__btn" id="wsc-pill-fav" aria-label="收藏"><span aria-hidden="true">★</span></button>
        <button type="button" class="wsc-pill__btn" id="wsc-pill-link" aria-label="复制链接"><span aria-hidden="true">🔗</span></button>
        <button type="button" class="wsc-pill__btn" id="wsc-pill-share" aria-label="分享"><span aria-hidden="true">↗</span></button>
        <button type="button" class="wsc-pill__btn wsc-pill__btn--accent" id="wsc-pill-feedback" aria-label="反馈"><span aria-hidden="true">✎</span></button>
      </div>
    </div>
    ${progressScript}
    <script>
      (function(){
        var lk = document.getElementById('wsc-pill-link');
        if (lk) lk.addEventListener('click', function(){
          try { navigator.clipboard.writeText(location.href); lk.setAttribute('aria-label','已复制链接'); } catch (e) {}
        });
        var sh = document.getElementById('wsc-pill-share');
        if (sh) sh.addEventListener('click', function(){
          if (navigator.share) {
            navigator.share({ title: document.title, url: location.href }).catch(function(){});
          } else if (navigator.clipboard) {
            try { navigator.clipboard.writeText(location.href); sh.setAttribute('aria-label','已复制链接(浏览器不支持原生分享)'); } catch (e) {}
          }
        });
      })();
    </script>`;

  return layout({
    title: `${note.title} · ${config.site.title}`,
    description: note.summary ?? '',
    config,
    noindex: note.visibility !== 'public' || (note.seo_indexable ?? 1) === 0,
    body,
    active: 'home',
  });
}

function labelOf(v: string): string {
  if (v === 'public') return '公开';
  if (v === 'unlisted' || v === 'link-only') return '仅链接';
  if (v === 'private') return '私有';
  return v;
}

function visBadgeClass(v: string): string {
  if (v === 'public') return 'ui-badge--public';
  if (v === 'unlisted') return 'ui-badge--unlisted';
  if (v === 'link-only') return 'ui-badge--link-only';
  if (v === 'private') return 'ui-badge--private';
  return '';
}

interface OutlineEntry {
  level: 2 | 3;
  id: string;
  text: string;
}

/** 从 body_html 提取 h2 / h3 大纲 */
function extractOutline(html: string): OutlineEntry[] {
  const out: OutlineEntry[] = [];
  const re = /<h([23])(?:\s+[^>]*?id=(?:"([^"]*)"|'([^']*)'))?[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const level = (m[1] === '3' ? 3 : 2) as 2 | 3;
    const id = (m[2] ?? m[3] ?? '').trim();
    const rawText = (m[4] ?? '').replace(/<[^>]+>/g, '').trim();
    if (!id || !rawText) continue;
    out.push({ level, id, text: rawText });
  }
  return out.slice(0, 12);
}

/**
 * WS-C — Post 页 mobile-only CSS + 浮动操作 pill 样式。
 * pill 在桌面默认隐藏(display: none),移动端 sticky bottom 显示。
 */
export const POST_MOBILE_CSS = `
/* ====================================================================== */
/* WS-C — Post 移动端 (max-width: 768px) + 浮动操作 pill                    */
/* ====================================================================== */

/* 默认桌面隐藏 pill */
.wsc-pill { display: none; }

@media (max-width: 768px) {
  .wsa-post__grid {
    grid-template-columns: 1fr;
    padding: 20px 16px 100px; /* 底部留空给 sticky pill */
    gap: 20px;
  }
  .wsa-post__left { order: 2; }
  .wsa-post__main { order: 1; padding: 0; }
  .wsa-post__right { order: 3; }
  .wsa-post__title { font-size: 26px; line-height: 1.25; }
  .wsa-post__summary { font-size: 16px; }
  .wsa-prose, .hf-prose { font-size: 16px; line-height: 1.8; }
  .hf-prose h2 { font-size: 20px; }
  .hf-prose h3 { font-size: 16px; }

  /* 桌面操作栏 → 移动端隐藏(由底部浮动 pill 替代) */
  .wsa-actbar { display: none; }
  /* 评论 stub 取消 sticky */
  .wsa-comments-stub { position: static; }

  /* CTA 在窄屏堆叠 */
  .wsa-cta { flex-wrap: wrap; }
  .wsa-cta__avatar { flex-shrink: 0; }

  /* 浮动操作 pill — sticky(不要 fixed,避免某些浏览器 z 轴问题) */
  .wsc-pill {
    display: flex;
    position: sticky;
    bottom: 16px;
    z-index: 20;
    margin: 24px auto 0;
    gap: 4px;
    padding: 6px;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 999px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, .08), 0 2px 6px rgba(0, 0, 0, .06);
    width: max-content;
    max-width: 100%;
  }
  .wsc-pill__btn {
    width: 44px; height: 44px;
    min-width: 44px; min-height: 44px;
    border: 0; background: transparent;
    border-radius: 50%;
    cursor: pointer;
    color: var(--ink);
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 16px;
    padding: 0;
  }
  .wsc-pill__btn:hover, .wsc-pill__btn:focus-visible {
    background: var(--bg-soft);
  }
  .wsc-pill__btn--accent { color: var(--accent); }

  /* 防溢出 */
  body, html { overflow-x: hidden; }
  img, pre, table { max-width: 100%; }
  pre { overflow-x: auto; }

  /* 全局触控目标 */
  .ui-btn { min-height: 40px; }
  .ui-btn--sm { min-height: 36px; }
  .ui-btn--icon { min-width: 40px; min-height: 40px; }
}
@media (max-width: 380px) {
  .wsa-post__grid { padding-left: 14px; padding-right: 14px; }
  .wsa-post__title { font-size: 22px; }
}
`;
