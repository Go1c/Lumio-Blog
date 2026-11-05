import type { NoteRow, PromoGame } from '@opennote/core';
import { escHtml as esc } from '@opennote/ui/ssg';

/**
 * Lumio 引流模块(设计见 doc/devdoc/blog-hub-plan.md,原型 doc/prototype/hub-v1/index.html)。
 *
 *  - 创作中心卡:面向开发者,第一优先;社群 / 关注 / GitHub / 文档都跳创作中心对应锚点
 *  - 平台游戏推荐:面向玩家,数据来自 server 的 PlatformGamesFeed(已合并置顶 / 屏蔽)
 *  - 手机悬浮条:≤900px 时左栏放不下,改为固定在屏幕底部
 *  - 首屏媒体:media 视频 → 视频位;media 音频 → 边听边读;否则不显示(cover 只用于列表卡片)
 *
 * 外链不带 utm_* 追踪参数:官网 canonical 由平台逐页输出,UTM 只会产生重复 URL。
 * entry=blog 保留,它是 lumiogames.cn 自己的入口归因参数(站内也用 entry=rank 等)。
 */

const STUDIO_URL = 'https://lumiogames.cn/studio/';
const SITE_URL = 'https://lumiogames.cn/';

export type HubMedium = 'left_rail' | 'mobile_float' | 'home_rail';

function studioHref(anchor = ''): string {
  return `${STUDIO_URL}${anchor}`;
}

function allGamesHref(): string {
  return `${SITE_URL}?entry=blog`;
}

/** 官网同款 Lumio 标志。同页多次出现时 gradient id 必须唯一。 */
export function lumioMark(id: string, size: number, cls = 'lumio-mark'): string {
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6659db"/><stop offset="1" stop-color="#9aa6ff"/></linearGradient></defs><rect width="100" height="100" rx="29" fill="url(#${id})"/><rect x="25" y="22" width="16" height="16" rx="4" fill="#fff"/><rect x="25" y="42" width="16" height="16" rx="4" fill="#fff"/><rect x="25" y="62" width="16" height="16" rx="4" fill="#fff"/><rect x="45" y="62" width="16" height="16" rx="4" fill="#fff" fill-opacity=".6"/><rect x="65" y="62" width="16" height="16" rx="4" fill="#5de2c6"/><path d="M70 19C71.56 28.1 73.9 30.44 83 32C73.9 33.56 71.56 35.9 70 45C68.44 35.9 66.1 33.56 57 32C66.1 30.44 68.44 28.1 70 19Z" fill="#fff"/></svg>`;
}

const ICON_USERS = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
const ICON_BELL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
const ICON_GITHUB = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>';
const ICON_BOOK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
const ICON_ARROW = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
const ICON_PLAY = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5z"/></svg>';
const ICON_PAUSE = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg>';
const ICON_PAD = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4"/><circle cx="16" cy="11" r=".8" fill="currentColor"/><circle cx="18" cy="13" r=".8" fill="currentColor"/></svg>';
const ICON_HEADPHONES = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/></svg>';

/** 创作中心卡(面向开发者)。 */
export function renderHubCard(medium: HubMedium): string {
  const chip = (anchor: string, icon: string, label: string) =>
    `<a class="hub-chip" href="${esc(studioHref(anchor))}" target="_blank" rel="noopener">${icon}${label}</a>`;
  return `
    <section class="hub-card" aria-label="Lumio 创作中心">
      <div class="hub-card__eyebrow">${lumioMark(`lumio-g-card-${medium}`, 30)}<span>Lumio 创作中心</span></div>
      <div class="hub-card__title">一起做出好玩的游戏</div>
      <div class="hub-card__chips">
        ${chip('#community', ICON_USERS, '社群')}
        ${chip('#follow', ICON_BELL, '关注')}
        ${chip('#github', ICON_GITHUB, 'GitHub')}
        ${chip('#docs', ICON_BOOK, '文档')}
      </div>
      <a class="hub-card__cta" href="${esc(studioHref())}" target="_blank" rel="noopener">进入创作中心${ICON_ARROW}</a>
    </section>`;
}

function renderGameItem(game: PromoGame): string {
  const href = game.url;
  const cover = game.coverUrl
    ? `<img class="hub-game__cover" src="${esc(game.coverUrl)}" alt="" loading="lazy" decoding="async">`
    : '<span class="hub-game__cover" aria-hidden="true"></span>';
  const who = game.authorName ? `@${game.authorName}` : '';
  const plays = game.plays !== null ? `${game.plays} 次游玩` : '';
  const meta = [who, plays].filter(Boolean).join(' · ');
  return `<a class="hub-game" href="${esc(href)}" target="_blank" rel="noopener">${cover}<span class="hub-game__main"><span class="hub-game__t">${esc(game.title)}</span>${meta ? `<span class="hub-game__a">${esc(meta)}</span>` : ''}</span><span class="hub-game__play" aria-hidden="true">${ICON_PLAY}</span></a>`;
}

/** 平台游戏推荐(面向玩家)。没有数据时整块不出。 */
export function renderHubPlay(games: PromoGame[], medium: HubMedium, extraClass = ''): string {
  if (!games.length) return '';
  return `
    <section class="hub-play${extraClass ? ` ${extraClass}` : ''}" aria-label="开发者新作,点开就玩">
      <div class="hub-play__head"><span class="hub-play__title">开发者新作，点开就玩</span></div>
      <div class="hub-play__list">${games.map((g) => renderGameItem(g)).join('')}</div>
      <a class="hub-play__more" href="${esc(allGamesHref())}" target="_blank" rel="noopener">全部游戏 →</a>
    </section>`;
}

/** 文章页左栏:整列吸顶,创作中心卡在上,游戏推荐在下。 */
export function renderHubRail(games: PromoGame[]): string {
  return `
          <aside class="hub-rail" aria-label="Lumio 平台">
            ${renderHubCard('left_rail')}
            ${renderHubPlay(games, 'left_rail')}
          </aside>`;
}

/** 手机 / 平板底部悬浮条(≤900px 才显示)。 */
export function renderHubFloat(games: PromoGame[]): string {
  const sheet = games.length ? renderHubPlay(games, 'mobile_float', 'hub-float__sheet') : '';
  const playBtn = games.length
    ? `<button type="button" class="hub-float__play" data-float-play aria-expanded="false">${ICON_PAD}玩</button>`
    : '';
  return `
  <div class="hub-float__scrim" data-float-scrim></div>
  <div class="hub-float" data-float>
    ${sheet}
    <div class="hub-float__bar">
      ${lumioMark('lumio-g-float', 30)}
      <span class="hub-float__t">Lumio 创作中心</span>
      ${playBtn}
      <a class="hub-float__go" href="${esc(studioHref())}" target="_blank" rel="noopener">进入 →</a>
      <button type="button" class="hub-float__min" data-float-min aria-label="收起">×</button>
    </div>
    <button type="button" class="hub-float__fab" data-float-fab aria-label="展开 Lumio 创作中心">${lumioMark('lumio-g-fab', 48)}</button>
  </div>`;
}

// ---------------------------------------------------------------------------
// 首屏媒体
// ---------------------------------------------------------------------------

export type PostMedia =
  | { kind: 'video-embed'; src: string }
  | { kind: 'video-file'; src: string }
  | { kind: 'audio'; src: string };

function safeMediaUrl(raw: string): string | null {
  const v = raw.trim();
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function extOf(url: string): string {
  const path = url.split(/[?#]/)[0] ?? '';
  const m = /\.([a-z0-9]+)$/i.exec(path);
  return m ? m[1]!.toLowerCase() : '';
}

/** 按地址 / 扩展名判断 media 是视频还是音频;认不出返回 null(退回 cover)。 */
export function classifyMedia(raw: string | null | undefined): PostMedia | null {
  if (!raw) return null;
  const url = safeMediaUrl(raw);
  if (!url) return null;
  let host = '';
  try {
    host = new URL(url, 'https://blog.lumio.games').hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  if (host.endsWith('bilibili.com')) {
    const bv = /BV[0-9A-Za-z]{10}/.exec(url)?.[0];
    if (bv) {
      return { kind: 'video-embed', src: `https://player.bilibili.com/player.html?bvid=${bv}&page=1&high_quality=1&danmaku=0&autoplay=0` };
    }
  }
  if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') {
    const u = new URL(url);
    const id = host === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') ?? /\/embed\/([\w-]{11})/.exec(u.pathname)?.[1];
    if (id && /^[\w-]{11}$/.test(id)) return { kind: 'video-embed', src: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  const ext = extOf(url);
  // 文件直链必须是 https 或站内路径:CSP 的 media-src 只放行 'self' 和 https:,http 地址放不出来
  if (url.startsWith('http:')) return null;
  if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return { kind: 'video-file', src: url };
  if (['mp3', 'm4a', 'ogg', 'oga', 'wav', 'aac', 'flac'].includes(ext)) return { kind: 'audio', src: url };
  return null;
}

function mediaTitleFallback(src: string): string {
  const raw = (src.split(/[?#]/)[0] ?? '').split('/').pop() ?? '';
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    // 「100%.mp3」这类不合法的转义:原样显示,不能让整站渲染中断
  }
  return name.replace(/\.[a-z0-9]+$/i, '') || '边听边读';
}

/**
 * 标题下的首屏区域:media 视频 → 视频位;media 音频 → 边听边读;否则不显示。
 * cover 封面图只在列表卡片和分享图上用,文章页里不再重复显示。
 */
export function renderPostMedia(note: Pick<NoteRow, 'title' | 'media' | 'media_title'>): string {
  const media = classifyMedia(note.media);
  const title = note.media_title?.trim() ?? '';
  if (media?.kind === 'video-embed' || media?.kind === 'video-file') {
    const label = title ? `<div class="media-cover__label">${ICON_HEADPHONES}${esc(title)}</div>` : '';
    const player =
      media.kind === 'video-embed'
        ? `<iframe src="${esc(media.src)}" title="${esc(title || note.title)}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
        : `<video src="${esc(media.src)}" controls preload="metadata" playsinline></video>`;
    return `
            <div class="media-cover">
              ${label}
              <div class="media-cover__frame">${player}</div>
            </div>`;
  }
  if (media?.kind === 'audio') {
    const name = title || mediaTitleFallback(media.src);
    return `
            <div class="listen" data-listen>
              <audio preload="none" src="${esc(media.src)}" data-listen-audio></audio>
              <button type="button" class="listen__btn" data-listen-toggle aria-label="播放">
                <span class="i-play">${ICON_PLAY}</span><span class="i-pause">${ICON_PAUSE}</span>
              </button>
              <div class="listen__main">
                <div class="listen__line"><span class="listen__eyebrow">边听边读</span><span class="listen__t">${esc(name)}</span></div>
                <div class="listen__bar"><i data-listen-progress></i></div>
              </div>
              <div class="listen__wave" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
              <span class="listen__time" data-listen-time></span>
            </div>
            <div class="mini" data-mini>
              <button type="button" class="mini__btn" data-mini-toggle aria-label="暂停">
                <span class="mini__disc"><span class="i-play">${ICON_PLAY}</span><span class="i-pause">${ICON_PAUSE}</span></span>
              </button>
              <span class="mini__tip">♪ ${esc(name)}<span data-mini-time></span></span>
            </div>`;
  }
  return '';
}

// ---------------------------------------------------------------------------
// 客户端行为(悬浮条 + 边听边读),随布局输出一次
// ---------------------------------------------------------------------------

export const HUB_RUNTIME_JS = `<script>
(function () {
  var fl = document.querySelector('[data-float]');
  if (fl) {
    var scrim = document.querySelector('[data-float-scrim]');
    var playBtn = fl.querySelector('[data-float-play]');
    var openSheet = function (open) {
      fl.classList.toggle('is-open', open);
      if (scrim) scrim.classList.toggle('is-on', open);
      if (playBtn) playBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    if (playBtn) playBtn.addEventListener('click', function () { openSheet(!fl.classList.contains('is-open')); });
    if (scrim) scrim.addEventListener('click', function () { openSheet(false); });
    var min = fl.querySelector('[data-float-min]');
    if (min) min.addEventListener('click', function () { openSheet(false); fl.classList.add('is-min'); });
    var fab = fl.querySelector('[data-float-fab]');
    if (fab) fab.addEventListener('click', function () { fl.classList.remove('is-min'); });
  }

  var listen = document.querySelector('[data-listen]');
  if (!listen) return;
  var audio = listen.querySelector('[data-listen-audio]');
  var mini = document.querySelector('[data-mini]');
  var prog = listen.querySelector('[data-listen-progress]');
  var timeEls = [listen.querySelector('[data-listen-time]'), mini && mini.querySelector('[data-mini-time]')];
  var started = false;
  function fmt(s) {
    if (!isFinite(s) || s < 0) return '';
    s = Math.round(s);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function sync() {
    var playing = !audio.paused && !audio.ended;
    listen.classList.toggle('is-playing', playing);
    if (mini) mini.classList.toggle('is-playing', playing);
    var label = playing ? '暂停' : '播放';
    listen.querySelector('[data-listen-toggle]').setAttribute('aria-label', label);
    if (mini) mini.querySelector('[data-mini-toggle]').setAttribute('aria-label', label);
    var pct = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
    if (prog) prog.style.width = pct + '%';
    if (mini) mini.querySelector('.mini__btn').style.setProperty('--p', pct + '%');
    var left = audio.duration ? fmt(audio.duration - audio.currentTime) : '';
    timeEls.forEach(function (el) { if (el) el.textContent = left; });
    updateMini();
  }
  function updateMini() {
    if (!mini) return;
    var gone = listen.getBoundingClientRect().bottom < 0;
    mini.classList.toggle('is-on', gone && started);
  }
  function toggle() {
    if (audio.paused) { started = true; var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
    else audio.pause();
  }
  listen.querySelector('[data-listen-toggle]').addEventListener('click', toggle);
  if (mini) mini.querySelector('[data-mini-toggle]').addEventListener('click', toggle);
  ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata'].forEach(function (ev) { audio.addEventListener(ev, sync); });
  addEventListener('scroll', updateMini, { passive: true });
})();
</script>`;

// ---------------------------------------------------------------------------
// 样式:在 styles.css 最后输出,覆盖旧版布局
// ---------------------------------------------------------------------------

export const HUB_CSS = `
/* ====================================================================== */
/* Lumio 引流模块(blog-hub-plan)                                        */
/* ====================================================================== */

/* —— 品牌:与官网一致的 Lumio 标志 + 字标 —— */
.ui-public__brand.brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
.ui-public__brand .lumio-mark { width: 44px; height: 44px; flex: none; }
.lumio-word { font-size: 23px; line-height: 24px; font-weight: 800; color: var(--ink); letter-spacing: -.01em; }
.lumio-word small { display: block; margin-top: 4px; font-size: 10px; line-height: 1; font-weight: 700; letter-spacing: .25em; }

/* —— 右上角:官网 + 创作中心 —— */
.nav__ext-link {
  font-size: 14px; font-weight: 600; color: var(--muted); text-decoration: none;
  padding: 8px 10px; border-radius: 10px; white-space: nowrap;
}
.nav__ext-link:hover { color: var(--ink); background: var(--accent-soft); }
.nav__studio {
  display: inline-flex; align-items: center; gap: 8px;
  height: 42px; padding: 0 16px; border-radius: 12px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-d) 100%);
  color: #fff; font-weight: 700; font-size: 14px; text-decoration: none;
  box-shadow: 0 8px 20px -8px rgba(97,113,240,.7);
  white-space: nowrap;
}
.nav__studio:hover { filter: brightness(1.06); color: #fff; }

/* —— 文章页三栏 —— */
.shell:has(.layout--hub) { max-width: 1400px; }
.layout.layout--hub {
  grid-template-columns: 216px minmax(0, 1fr) 248px;
  gap: 36px;
  align-items: start;
}
.layout--hub .post-article { min-width: 0; max-width: 760px; margin: 0 auto; width: 100%; }

/* —— 左栏:整列吸顶;4 款游戏 + 创作中心卡约 570px,普通屏幕放得下 —— */
.hub-rail {
  position: sticky; top: 22px;
  display: flex; flex-direction: column; gap: 12px;
  min-width: 0;
}

/* 创作中心卡:沿用站点首页的浅蓝紫 → 浅薄荷渐变,按钮与右上角「创作中心」同款 */
.hub-card {
  position: relative; overflow: hidden; flex: none;
  padding: 16px 14px 14px; border-radius: var(--radius);
  background: linear-gradient(160deg, #DCE4FF 0%, #E4ECFF 45%, #DFF7F0 100%);
  border: 1px solid var(--line-strong, #D4DCF5);
  color: var(--ink);
}
.hub-card::before {
  content: ""; position: absolute; width: 150px; height: 150px; right: -50px; top: -60px;
  border-radius: 50%; background: radial-gradient(circle, rgba(124,140,255,.28), transparent 65%);
  pointer-events: none;
}
.hub-card > * { position: relative; z-index: 1; }
.hub-card__eyebrow { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; color: var(--muted); }
.hub-card__eyebrow .lumio-mark { width: 26px; height: 26px; flex: none; }
.hub-card__title { margin: 12px 0 14px; font-size: 18px; line-height: 1.35; font-weight: 800; letter-spacing: -.01em; color: var(--ink); }
.hub-card__chips { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
.hub-chip {
  display: flex; align-items: center; gap: 6px; padding: 7px 8px; border-radius: 10px;
  background: rgba(255,255,255,.72); border: 1px solid rgba(255,255,255,.9);
  color: var(--ink); text-decoration: none; font-size: 12.5px; font-weight: 600;
}
.hub-chip:hover { background: #fff; color: var(--primary-d); }
.hub-chip svg { flex: none; color: var(--primary-d); }
.hub-card__cta {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  height: 40px; border-radius: 12px; text-decoration: none;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-d) 100%);
  color: #fff; font-weight: 800; font-size: 14px;
  box-shadow: 0 8px 20px -10px rgba(97,113,240,.8);
}
.hub-card__cta:hover { filter: brightness(1.06); color: #fff; }

/* 平台游戏推荐 */
.hub-play {
  flex: none;
  padding: 12px 12px 8px; border-radius: var(--radius);
  background: var(--card); border: 1px solid var(--line);
}
.hub-play__head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.hub-play__title { font-size: 13.5px; font-weight: 800; color: var(--ink); }
.hub-play__list { display: flex; flex-direction: column; }
.hub-game {
  display: flex; gap: 10px; align-items: center; padding: 6px; margin: 0 -6px;
  border-radius: 12px; text-decoration: none; color: inherit; position: relative;
}
.hub-game:hover { background: var(--accent-soft); }
.hub-game__cover {
  width: 44px; height: 44px; flex: none; border-radius: 10px; object-fit: cover;
  background: var(--bg); border: 1px solid var(--line); display: block;
}
.hub-game__main { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.hub-game__t { font-size: 13px; font-weight: 700; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hub-game__a { font-size: 11.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.hub-game__play {
  flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
  background: var(--accent-soft); color: var(--primary-d);
}
.hub-game:hover .hub-game__play { background: var(--primary-d); color: #fff; }
.hub-play__more {
  display: block; text-align: center; padding: 8px 0 2px; margin-top: 4px; border-top: 1px dashed var(--line);
  font-size: 12px; font-weight: 600; color: var(--primary-d); text-decoration: none;
}

/* —— 响应式:推广优先于目录 —— */
@media (max-width: 1179.98px) {
  .layout.layout--hub { grid-template-columns: 216px minmax(0, 1fr); gap: 28px; }
  .layout--hub > .post-rail { display: none; }
}
@media (max-width: 980px) {
  /* 旧规则会把 .layout--post 变成单栏、侧栏变静态,这里保持左栏 */
  .layout.layout--hub { grid-template-columns: 216px minmax(0, 1fr); }
  .layout--hub > .hub-rail { position: sticky; }
}
/* 特别矮的屏幕放不下整列:不再吸顶,随页面滚动,游戏数量不变 */
@media (max-height: 640px) {
  .layout--hub > .hub-rail, .home-hub__rail { position: static; }
}
@media (max-width: 900px) {
  .layout.layout--hub { grid-template-columns: minmax(0, 1fr); }
  .layout--hub > .hub-rail,
  .layout--hub > .post-rail { display: none; }
  .nav__ext-link { display: none; }
  body .hub-float { display: block; }
  /* 给底部悬浮条留出位置(含页脚);.mini 的基础规则写在后面,这里用 body 提高优先级 */
  body .shell { margin-bottom: 76px; }
  body .mini { bottom: 84px; }
  .lumio-post .wsc-pill { bottom: 84px; }
}
@media (max-width: 640px) {
  .nav__studio { height: 36px; padding: 0 12px; font-size: 13px; }
}

/* —— 手机 / 平板底部悬浮条 —— */
.hub-float { display: none; position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 42; }
.hub-float__bar {
  display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 10px;
  border-radius: 18px; background: var(--card); color: var(--ink);
  border: 1px solid var(--line-strong, #D4DCF5);
  box-shadow: var(--shadow-pop, 0 18px 50px -16px rgba(53,68,120,.40));
}
.hub-float__bar .lumio-mark { width: 30px; height: 30px; flex: none; }
.hub-float__t { flex: 1; min-width: 0; font-size: 14px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hub-float__play, .hub-float__min {
  flex: none; border: 0; cursor: pointer; font: inherit; color: var(--primary-d);
  background: var(--accent-soft); border-radius: 11px;
}
.hub-float__play { height: 36px; padding: 0 11px; display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; }
.hub-float__play[aria-expanded="true"] { background: var(--secondary); color: #12302a; }
.hub-float__go {
  flex: none; height: 36px; padding: 0 12px; border-radius: 11px; display: inline-flex; align-items: center;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-d) 100%);
  color: #fff; font-size: 13px; font-weight: 800; text-decoration: none; white-space: nowrap;
}
.hub-float__min { width: 26px; height: 26px; background: none; color: var(--faint); font-size: 18px; line-height: 1; }
.hub-float__sheet {
  display: none; margin-bottom: 8px; padding: 14px 14px 10px; border-radius: 18px;
  background: var(--card); border: 1px solid var(--line);
  box-shadow: var(--shadow-pop, 0 18px 50px -16px rgba(53,68,120,.40));
}
.hub-float.is-open .hub-float__sheet { display: block; }
.hub-float__sheet .hub-play__list { flex-direction: row; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 4px; }
.hub-float__sheet .hub-game { flex-direction: column; align-items: flex-start; width: 124px; flex: none; margin: 0; padding: 6px; scroll-snap-align: start; }
.hub-float__sheet .hub-game__cover { width: 112px; height: 112px; }
.hub-float__sheet .hub-game__play { position: absolute; right: 12px; top: 86px; }
.hub-float__sheet .hub-game__main { width: 100%; }
.hub-float.is-min { right: auto; }
.hub-float.is-min .hub-float__bar, .hub-float.is-min .hub-float__sheet { display: none; }
.hub-float__fab {
  display: none; width: 48px; height: 48px; border: 0; padding: 0; cursor: pointer; border-radius: 15px;
  background: none; box-shadow: var(--shadow-pop, 0 18px 50px -16px rgba(53,68,120,.40));
}
.hub-float__fab .lumio-mark { width: 48px; height: 48px; display: block; }
.hub-float.is-min .hub-float__fab { display: block; }
.hub-float__scrim { display: none; position: fixed; inset: 0; z-index: 41; background: rgba(30,42,58,.25); }
.hub-float__scrim.is-on { display: block; }
@media (min-width: 901px) { .hub-float__scrim.is-on { display: none; } }

/* —— 首屏媒体:视频 —— */
.media-cover { margin: 0 0 22px; }
.media-cover__label {
  display: inline-flex; align-items: center; gap: 6px; margin-bottom: 10px;
  padding: 5px 10px; border-radius: 999px; background: var(--accent-soft);
  color: var(--primary-d); font-size: 12.5px; font-weight: 700;
}
.media-cover__frame {
  position: relative; aspect-ratio: 16 / 9; border-radius: var(--radius); overflow: hidden;
  background: #000; box-shadow: var(--shadow-card);
}
.media-cover__frame iframe,
.media-cover__frame video { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; display: block; }

/* —— 首屏媒体:边听边读 —— */
.listen {
  display: flex; align-items: center; gap: 10px; margin: 0 0 18px; max-width: 420px;
  padding: 6px 12px 6px 6px; border-radius: 999px;
  background: var(--accent-soft); border: 1px solid var(--line); color: var(--ink);
}
.listen audio { display: none; }
.listen__btn {
  flex: none; width: 30px; height: 30px; border-radius: 50%; border: 0; cursor: pointer;
  display: grid; place-items: center; color: #fff; background: var(--primary-d);
}
.listen__btn > span, .mini__disc > span { display: grid; place-items: center; }
.listen .i-pause, .mini .i-pause, .is-playing .i-play { display: none; }
.is-playing .i-pause { display: grid; }
.listen__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.listen__line { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.listen__eyebrow { flex: none; font-size: 11.5px; font-weight: 700; color: var(--primary-d); }
.listen__t { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.listen__bar { height: 2px; border-radius: 2px; background: var(--line); overflow: hidden; }
.listen__bar i { display: block; height: 100%; width: 0; background: var(--primary-d); }
.listen__time { flex: none; font-family: var(--mono); font-size: 11px; color: var(--muted); }
.listen__wave { display: flex; gap: 2px; align-items: flex-end; height: 12px; }
.listen__wave i { width: 2px; height: 3px; border-radius: 2px; background: var(--primary-d); }
.listen.is-playing .listen__wave i { animation: hub-wave 900ms ease-in-out infinite; }
.listen__wave i:nth-child(2) { animation-delay: -200ms; }
.listen__wave i:nth-child(3) { animation-delay: -450ms; }
.listen__wave i:nth-child(4) { animation-delay: -650ms; }
@keyframes hub-wave { 0%, 100% { height: 3px; } 50% { height: 12px; } }

/* 音频条滚出屏幕后:右下角 40px 小角标,唱片旋转 + 环形进度,悬停才显示曲名 */
.mini {
  position: fixed; right: 20px; bottom: 20px; z-index: 40;
  display: flex; align-items: center; flex-direction: row-reverse; gap: 8px;
  opacity: 0; transform: translateY(8px); pointer-events: none; transition: opacity .2s, transform .2s;
}
.mini.is-on { opacity: 1; transform: none; pointer-events: auto; }
.mini__btn {
  position: relative; width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer; padding: 0;
  background: conic-gradient(var(--primary-d) var(--p, 0%), var(--line) 0); box-shadow: var(--shadow-card);
}
.mini__disc {
  position: absolute; inset: 3px; border-radius: 50%; display: grid; place-items: center; color: #fff;
  background: radial-gradient(circle, #1E2A3A 0 22%, #2c3a50 23% 100%);
}
.mini.is-playing .mini__disc { animation: hub-spin 4s linear infinite; }
@keyframes hub-spin { to { transform: rotate(360deg); } }
.mini__tip {
  padding: 6px 10px; border-radius: 999px; background: var(--card); border: 1px solid var(--line);
  font-size: 12px; font-weight: 600; color: var(--ink); white-space: nowrap; box-shadow: var(--shadow-card);
  opacity: 0; transform: translateX(6px); transition: opacity .15s, transform .15s; pointer-events: none;
}
.mini:hover .mini__tip { opacity: 1; transform: none; }
.mini__tip span { color: var(--muted); font-weight: 500; margin-left: 4px; font-family: var(--mono); font-size: 11px; }
@media (prefers-reduced-motion: reduce) {
  .listen.is-playing .listen__wave i, .mini.is-playing .mini__disc { animation: none; }
}
`;
