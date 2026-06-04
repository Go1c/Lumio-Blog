import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { isoDate, tagsForSlug } from '../partials/shared.js';
import { renderArticleComments } from '../partials/article-comments.js';
import { type Neighborhood } from '../partials/backlinks-graph.js';
import { buildLumioArticles } from './lumio-design.js';

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
  const { note, byTag, series } = data;
  const iso = isoDate(note);
  const tags = tagsForSlug(byTag, note.slug);
  const author = config.author;
  const articleDesign = buildLumioArticles([note], byTag)[0];

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
            `<a class="toc__link${h.level === 3 ? ' toc__link--sub' : ''}" href="#${esc(h.id)}">${esc(h.text)}</a>`,
        )
        .join('')
    : '';

  const seriesItems = (series || [])
    .filter((s) => s.slug !== note.slug)
    .slice(0, 6)
    .map((s, index) => renderRelatedItem(s, byTag, index))
    .join('');

  const tagLinks = tags
    .map(
      (t, i) =>
        `<a class="tag-inline${i === 1 ? ' s-mint' : ''}" href="/tags/${esc(encodeURIComponent(t))}.html">${esc(t)}</a>`,
    )
    .join('');

  const primaryTag = tags[0] ?? '文章';
  const tagCrumb = tags[0]
    ? `<span class="crumb__sep">/</span>
          <a href="/tags/${esc(encodeURIComponent(tags[0]))}.html">${esc(tags[0])}</a>`
    : '';
  const postBody = renderPostBody(note);

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

  const commentsHtml = config.features?.comments === false
    ? ''
    : `<section class="post-panel post-comments" id="comments" aria-label="评论">
        ${renderArticleComments({ slug: note.slug }, config)}
      </section>`;

  const body = `
    <div class="wsa-post lumio-post">
      <div class="wsa-progress lumio-post__progress" role="progressbar" aria-label="阅读进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="wsa-progress__bar" id="wsa-progress-bar" aria-hidden="true"></div>
      </div>

      <main class="page post-page">
        <nav class="crumb" aria-label="面包屑">
          <a href="/">首页</a>
          <span class="crumb__sep">/</span>
          <a href="/articles/index.html">文章</a>
          ${tagCrumb}
          <span class="crumb__sep">/</span>
          <span class="crumb__cur">${esc(note.title)}</span>
        </nav>

        <div class="layout layout--post">
          <article class="post-article">
            <h1 class="post-title">${esc(note.title)}</h1>
            <div class="post-tags">
              ${tagLinks || `<span class="tag-inline">${esc(primaryTag)}</span>`}
              ${visibilityBadge}
              <span class="diff">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 11l3-3 2 2 4-4 3 3"></path></svg>
                中级
              </span>
            </div>
            <div class="post-meta">
              <span class="post-meta__author">
                <span class="post-meta__face">${userIcon()}</span>
                <span class="post-meta__name">${esc(author.name)}</span>
              </span>
              <span class="m">${calendarIcon()}<time datetime="${esc(iso)}">${esc(iso)}</time></span>
              <span class="m">${clockIcon()}${note.reading_minutes} 分钟</span>
              <span class="m">${eyeIcon()}${displayViews(note)} 阅读</span>
            </div>

            <div class="post-hero">
              <div class="thumb__grid" aria-hidden="true"></div>
              <div class="post-hero__art" aria-hidden="true">
                ${articleDesign?.art ?? ''}
                <div class="cube c-mint float" style="--s:40px; left:58%; top:46%; animation-delay:-1.4s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>
              </div>
            </div>

            ${postBody}
            ${commentsHtml}
          </article>

          <aside class="post-rail" aria-label="文章信息">
            ${
              outlineHtml
                ? `<section class="side-card toc">
                    <div class="side-card__title">文章目录</div>
                    <nav class="toc__list" id="toc">${outlineHtml}</nav>
                  </section>`
                : ''
            }
            ${
              seriesItems
                ? `<section class="side-card">
                    <div class="side-card__title">相关文章</div>
                    <div class="related">${seriesItems}</div>
                  </section>`
                : ''
            }
          </aside>
        </div>
      </main>

      <div class="wsc-pill" role="toolbar" aria-label="文章操作">
        <button type="button" class="wsc-pill__btn" id="wsc-pill-link" aria-label="复制链接">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.8 9.2a2.2 2.2 0 0 0 3.1 0l2.1-2.1A2.2 2.2 0 0 0 8.9 4L7.8 5.1"></path><path d="M9.2 6.8a2.2 2.2 0 0 0-3.1 0L4 8.9A2.2 2.2 0 0 0 7.1 12l1.1-1.1"></path></svg>
        </button>
        <button type="button" class="wsc-pill__btn" id="wsc-pill-share" aria-label="分享">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5V2H9"></path><path d="M7 9 12 4"></path><path d="M13 8.5v3A1.5 1.5 0 0 1 11.5 13h-7A1.5 1.5 0 0 1 3 11.5v-7A1.5 1.5 0 0 1 4.5 3h3"></path></svg>
        </button>
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
    </script>
    <script>
      (function(){
        var links = Array.prototype.slice.call(document.querySelectorAll('.toc__link'));
        if (!links.length) return;
        var heads = links.map(function(link){ return document.querySelector(link.getAttribute('href') || ''); });
        function spy(){
          var active = 0;
          heads.forEach(function(head, i){
            if (head && head.getBoundingClientRect().top < 120) active = i;
          });
          links.forEach(function(link, i){ link.classList.toggle('is-active', i === active); });
        }
        links.forEach(function(link){
          link.addEventListener('click', function(event){
            var target = document.querySelector(link.getAttribute('href') || '');
            if (!target) return;
            event.preventDefault();
            window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 24, behavior: 'smooth' });
          });
        });
        window.addEventListener('scroll', spy, { passive: true });
        spy();
      })();
    </script>`;

  return layout({
    title: `${note.title} · ${config.site.title}`,
    description: note.summary ?? '',
    config,
    noindex: note.visibility !== 'public' || (note.seo_indexable ?? 1) === 0,
    body,
    active: 'articles',
    path: `/posts/${note.slug}.html`,
    ...(note.cover ? { image: String(note.cover) } : {}),
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

function renderPostBody(note: NoteRow): string {
  if (note.kind === 'canvas') return `<div class="wsa-prose post-prose ob-canvas-host">${note.body_html}</div>`;
  if (note.kind === 'html') return `<div class="wsa-prose post-prose ob-html-host">${note.body_html}</div>`;
  return `<div class="wsa-prose post-prose prose hf-prose">${note.body_html}</div>`;
}

function renderRelatedItem(note: NoteRow, byTag: Map<string, NoteRow[]>, index: number): string {
  const article = buildLumioArticles([note], byTag)[0];
  return `
    <a class="related__item" href="/posts/${esc(note.slug)}.html">
      <span class="related__thumb thumb ${esc(article?.tone ?? 't-blue')}">
        <span class="thumb__grid" aria-hidden="true"></span>
        ${article?.art ?? ''}
      </span>
      <span>
        <span class="related__t">${esc(note.title)}</span>
        <span class="related__d">${esc(isoDate(note))}</span>
      </span>
    </a>`;
}

function displayViews(note: NoteRow): string {
  const value = Math.max(1.1, (note.word_count || 1200) / 900);
  return `${value.toFixed(1)}k`;
}

function userIcon(): string {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="9" r="3.4"></circle><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"></path></svg>';
}

function calendarIcon(): string {
  return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5"></rect><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke-linecap="round"></path></svg>';
}

function clockIcon(): string {
  return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="5.5"></circle><path d="M8 5v3l2 1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
}

function eyeIcon(): string {
  return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 3C4.5 3 2 8 2 8s2.5 5 6 5 6-5 6-5-2.5-5-6-5z"></path><circle cx="8" cy="8" r="2"></circle></svg>';
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
  .wsa-prose { min-width: 0; overflow-wrap: anywhere; }
  .wsa-prose pre {
    width: 100%;
    max-width: calc(100vw - 32px);
    box-sizing: border-box;
    overflow-x: auto;
  }
  .wsa-prose pre code {
    white-space: pre;
    word-break: normal;
    overflow-wrap: normal;
  }
  .wsa-prose table {
    display: block;
    width: 100%;
    max-width: calc(100vw - 32px);
    overflow-x: auto;
  }

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
