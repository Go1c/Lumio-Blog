import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { isoDate, tagsForSlug } from '../partials/shared.js';

export interface PostData {
  note: NoteRow;
  byTag: Map<string, NoteRow[]>;
  /** 同主标签下的其他文章(系列) */
  series: NoteRow[];
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

  // 阅读进度条 — JS 计算
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
      // 复制链接
      var btn = document.getElementById('wsa-act-link');
      if (btn) btn.addEventListener('click', function(){
        try { navigator.clipboard.writeText(location.href); btn.setAttribute('aria-label','已复制链接'); }
        catch(e) {}
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

          <div class="wsa-actbar" role="toolbar" aria-label="文章操作">
            <button type="button" class="ui-btn ui-btn--icon" aria-label="收藏" id="wsa-act-fav"><span aria-hidden="true">★</span></button>
            <button type="button" class="ui-btn ui-btn--icon" aria-label="复制链接" id="wsa-act-link"><span aria-hidden="true">🔗</span></button>
            <button type="button" class="ui-btn ui-btn--icon" aria-label="分享" id="wsa-act-share"><span aria-hidden="true">↗</span></button>
            <button type="button" class="ui-btn ui-btn--icon" aria-label="更多操作" aria-haspopup="menu"><span aria-hidden="true">⋯</span></button>
          </div>
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

          <div class="wsa-prose hf-prose">
            ${note.body_html}
          </div>

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

        <!-- RIGHT — comments placeholder (WS-B fills in) -->
        <aside class="wsa-post__right" id="comments" aria-label="评论(待启用)">
          <div class="wsa-comments-stub">
            <div class="wsa-side__h hf-mono hf-tiny"><span aria-hidden="true">💬</span> 评论</div>
            <p class="hf-tiny hf-muted wsa-comments-stub__msg">评论功能筹备中。</p>
          </div>
        </aside>
      </div>
    </div>
    ${progressScript}`;

  return layout({
    title: `${note.title} · ${config.site.title}`,
    description: note.summary ?? '',
    config,
    noindex: note.visibility !== 'public',
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
