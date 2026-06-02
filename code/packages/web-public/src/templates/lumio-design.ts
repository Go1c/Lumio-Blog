import type { NoteRow, SiteConfig } from '@opennote/core';
import { isoDate, tagsForSlug } from '../partials/shared.js';
import { esc } from './layout.js';

export interface LumioArticle {
  title: string;
  description: string;
  category: string;
  tone: string;
  date: string;
  minutes: number;
  views: string;
  href: string;
  art: string;
}

const CATEGORY_ORDER = ['渲染', '性能', '图形学', '架构', '网络', '工具'];
const TONE_BY_CATEGORY = new Map<string, string>([
  ['渲染', 't-blue'],
  ['性能', 't-mint'],
  ['图形学', 't-amber'],
  ['架构', 't-violet'],
  ['网络', 't-sky'],
  ['工具', 't-rose'],
]);

const FALLBACK_ARTICLES: LumioArticle[] = [
  articleFallback('渲染优化实战', '从原理到实战,深入剖析渲染优化的关键技术与方法。', '渲染', '2026-05-28', 12, 0),
  articleFallback('Unity 性能调优', '系统化的性能分析与优化策略,打造流畅稳定的游戏体验。', '性能', '2026-05-25', 15, 1),
  articleFallback('Shader 入门指南', '从基础概念到实战案例,快速上手 Shader 编写与调试。', '图形学', '2026-05-22', 10, 2),
  articleFallback('架构设计笔记', '分享可扩展、可维护的游戏架构设计思路与最佳实践。', '架构', '2026-05-20', 14, 3),
  articleFallback('网络同步方案', '对比主流同步方案,详解实现细节与优化技巧。', '网络', '2026-05-18', 13, 4),
  articleFallback('工具链提效', '精选工具与自动化流程,全面提升开发效率与协作体验。', '工具', '2026-05-15', 11, 5),
  articleFallback('光照与阴影系统', '实时光照、阴影贴图与全局光照的实现取舍与性能平衡。', '图形学', '2026-05-12', 16, 2),
  articleFallback('内存管理与 GC 优化', '定位内存峰值、降低 GC 抖动,稳住帧率的实战手册。', '性能', '2026-05-09', 13, 1),
  articleFallback('ECS 架构落地实践', '数据驱动设计如何在真实项目中提升性能与可维护性。', '架构', '2026-05-06', 15, 3),
];

function articleFallback(
  title: string,
  description: string,
  category: string,
  date: string,
  minutes: number,
  index: number,
): LumioArticle {
  const tone = TONE_BY_CATEGORY.get(category) ?? 't-blue';
  return {
    title,
    description,
    category,
    tone,
    date,
    minutes,
    views: `${(2.4 + index * 0.2).toFixed(1)}k`,
    href: '#',
    art: artForTone(tone, index),
  };
}

export function buildLumioArticles(posts: NoteRow[], byTag: Map<string, NoteRow[]>): LumioArticle[] {
  if (!posts.length) return FALLBACK_ARTICLES;
  return posts.map((post, index) => {
    const tags = tagsForSlug(byTag, post.slug);
    const category = pickCategory(tags, index);
    const tone = TONE_BY_CATEGORY.get(category) ?? toneByIndex(index);
    const date = isoDate(post);
    return {
      title: post.title,
      description: post.summary ?? (post.body_text.slice(0, 96) || '这篇文章记录了游戏开发过程中的关键实践与技术取舍。'),
      category,
      tone,
      date,
      minutes: post.reading_minutes || 8,
      views: `${Math.max(1.2, (post.word_count || 1200) / 780).toFixed(1)}k`,
      href: `/posts/${esc(post.slug)}.html`,
      art: artForTone(tone, index),
    };
  });
}

export function categoryCounts(articles: LumioArticle[]): Array<{ name: string; count: number }> {
  const counts = new Map(CATEGORY_ORDER.map((name) => [name, 0]));
  for (const article of articles) counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

export function renderPageHead(eyebrow: string, title: string, sub: string): string {
  return `
    <header class="page-head">
      <div class="page-head__grid" aria-hidden="true"></div>
      <div class="page-head__eyebrow">${esc(eyebrow)}</div>
      <h1 class="page-head__title">${esc(title)}</h1>
      <p class="page-head__sub">${esc(sub)}</p>
    </header>`;
}

export function renderArticleCard(article: LumioArticle, attrs = ''): string {
  const data = attrs ? ` ${attrs}` : '';
  return `
    <article class="card"${data}>
      <a class="card__link" href="${article.href}">
        <div class="thumb ${esc(article.tone)}">
          <div class="thumb__grid" aria-hidden="true"></div>
          <span class="badge">${esc(article.category)}</span>
          <div class="thumb__art" aria-hidden="true">${article.art}</div>
        </div>
        <div class="card__body">
          <h3 class="card__title">${esc(article.title)}</h3>
          <p class="card__dek">${esc(article.description)}</p>
          ${renderMeta(article)}
        </div>
      </a>
    </article>`;
}

export function renderFeatureArticle(article: LumioArticle): string {
  return `
    <article class="feature">
      <a class="feature__link" href="${article.href}">
        <div class="feature__art thumb ${esc(article.tone)}">
          <div class="thumb__grid" aria-hidden="true"></div>
          <span class="badge">置顶</span>
          <div class="thumb__art" aria-hidden="true">
            ${article.art}
            <div class="cube c-amber float" style="--s:28px; left:30%; top:58%; animation-delay:-2.2s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>
          </div>
        </div>
        <div class="feature__body">
          <span class="chip is-active">${esc(article.category)}</span>
          <h2 class="feature__title">${esc(article.title)}</h2>
          <p class="feature__dek">${esc(article.description)}</p>
          ${renderMeta(article, true)}
        </div>
      </a>
    </article>`;
}

export function renderSubscribe(title = '订阅更新', sub = '不错过每一篇技术干货与实践分享', button = '订阅'): string {
  return `
    <div class="subscribe">
      <span class="subscribe__icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"></rect><path d="m4 7 8 5 8-5"></path></svg>
      </span>
      <div class="subscribe__txt">
        <div class="subscribe__title">${esc(title)}</div>
        <div class="subscribe__sub">${esc(sub)}</div>
      </div>
      <form class="subscribe__form" action="/api/newsletter/subscribe" method="post">
        <input type="email" name="email" placeholder="输入邮箱地址" aria-label="邮箱地址">
        <button type="submit">${esc(button)}</button>
      </form>
    </div>`;
}

export function renderHeroScene(): string {
  return `
    <div class="hero__scene" aria-hidden="true">
      <div class="cube" style="--s:54px; left:8px; bottom:6px;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>
      <div class="cube c-mint" style="--s:54px; left:62px; bottom:6px;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>
      <div class="cube" style="--s:54px; left:116px; bottom:6px;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>
      <div class="cube c-mint" style="--s:54px; left:35px; bottom:42px;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>
      <div class="cube" style="--s:54px; left:89px; bottom:42px;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>
      <div class="cube c-amber float" style="--s:40px; right:30px; bottom:96px; animation-delay:-1s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>
      <div class="cube float" style="--s:34px; right:88px; bottom:30px; animation-delay:-2.4s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>
      ${renderPixelHeart()}
      <div class="coin float" style="right:46px; bottom:14px; animation-delay:-1.8s;"><span>★</span></div>
    </div>`;
}

export function renderAdSlot(config: SiteConfig): string {
  const href = config.home?.ad?.cta_href && /^https?:\/\//i.test(config.home.ad.cta_href)
    ? config.home.ad.cta_href
    : 'https://example.com/your-ad-target';
  const img = config.home?.ad?.enabled && config.home.ad.body && /^https?:\/\//i.test(config.home.ad.body)
    ? `<img class="ad__img" src="${esc(config.home.ad.body)}" alt="${esc(config.home.ad.title || 'Sponsored')}">`
    : `<div class="ad__ph">
        <span class="ad__ph-mark" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l16-7-4 16-4-6-8-3z"></path></svg>
        </span>
        <span class="ad__ph-txt">
          <span class="ad__ph-title">广告位 · 728 × 90 横幅</span>
          <span class="ad__ph-sub">替换为广告图片后,整块区域可点击跳转</span>
        </span>
      </div>`;
  return `
    <a class="ad ad__link" href="${esc(href)}" target="_blank" rel="noopener sponsored">
      <span class="ad__label">赞助 · Sponsored</span>
      ${img}
    </a>`;
}

function renderMeta(article: LumioArticle, includeViews = false): string {
  return `
    <div class="card__meta">
      <span>${calendarIcon()}${esc(article.date)}</span>
      <span>${clockIcon()}${article.minutes} 分钟</span>
      ${includeViews ? `<span>${eyeIcon()}${esc(article.views)} 阅读</span>` : ''}
    </div>`;
}

function pickCategory(tags: string[], index: number): string {
  const normalized = tags.join(' ').toLowerCase();
  if (/渲染|render|gpu|draw|光栅/.test(normalized)) return '渲染';
  if (/性能|perf|优化|内存|gc|profile/.test(normalized)) return '性能';
  if (/shader|图形|lighting|光照|阴影/.test(normalized)) return '图形学';
  if (/架构|ecs|engine|系统|模块/.test(normalized)) return '架构';
  if (/网络|同步|net|server|socket/.test(normalized)) return '网络';
  if (/工具|tool|workflow|自动化|cli/.test(normalized)) return '工具';
  return CATEGORY_ORDER[index % CATEGORY_ORDER.length]!;
}

function toneByIndex(index: number): string {
  return TONE_BY_CATEGORY.get(CATEGORY_ORDER[index % CATEGORY_ORDER.length]!) ?? 't-blue';
}

function artForTone(tone: string, index: number): string {
  if (tone === 't-mint') {
    return `<div class="cube c-mint float" style="--s:42px; left:50%; top:46%; margin:-21px 0 0 -21px; animation-delay:-${index % 3}s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>`;
  }
  if (tone === 't-amber') {
    return `<div class="orb"></div><div class="cube c-amber float" style="--s:30px; left:64%; top:60%; animation-delay:-1.2s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>`;
  }
  if (tone === 't-violet') {
    return `<div class="cube float" style="--s:30px; left:30%; top:36%; --t:#D9D2FF; --r:#B5A6FF; --l:#8E76F0;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div><div class="cube float" style="--s:30px; left:54%; top:52%; --t:#D9D2FF; --r:#B5A6FF; --l:#8E76F0; animation-delay:-1.6s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>`;
  }
  if (tone === 't-sky') {
    return `<div class="cube float" style="--s:30px; left:24%; top:34%; --t:#BFE6FF; --r:#86C8FF; --l:#4FA0E8;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div><div class="cube float" style="--s:30px; left:58%; top:34%; --t:#BFE6FF; --r:#86C8FF; --l:#4FA0E8; animation-delay:-1s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div><div class="cube float" style="--s:30px; left:41%; top:58%; --t:#BFE6FF; --r:#86C8FF; --l:#4FA0E8; animation-delay:-2s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>`;
  }
  if (tone === 't-rose') {
    return `<div class="cube c-pink float" style="--s:40px; left:50%; top:46%; margin:-20px 0 0 -20px;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>`;
  }
  return `<div class="cube float" style="--s:38px; left:50%; top:42%; margin:-19px 0 0 -42px;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div><div class="cube c-mint float" style="--s:30px; left:50%; top:54%; margin:-15px 0 0 6px; animation-delay:-1.4s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>`;
}

function renderPixelHeart(): string {
  return `
    <div class="px-heart float" style="--s:8px; right:140px; bottom:108px; animation-delay:-.6s;">
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
    </div>`;
}

function calendarIcon(): string {
  return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5"></rect><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke-linecap="round"></path></svg>';
}

function clockIcon(): string {
  return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="5.5"></circle><path d="M8 5v3l2 1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
}

function eyeIcon(): string {
  return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3C4.5 3 2 8 2 8s2.5 5 6 5 6-5 6-5-2.5-5-6-5z"></path><circle cx="8" cy="8" r="2"></circle></svg>';
}

export const LUMIO_CSS = `
:root {
  --primary: #7C8CFF;
  --primary-d: #6171F0;
  --secondary: #5DE2C6;
  --accent: #FFB86B;
  --bg: #F7FAFF;
  --ink: #1E2A3A;
  --muted: #6B7894;
  --faint: #9AA6BE;
  --line: #E7ECF6;
  --card: #FFFFFF;
  --radius: 18px;
  --radius-sm: 12px;
  --shadow-card: 0 1px 2px rgba(30,42,58,.04), 0 10px 30px -12px rgba(53,68,120,.18);
  --shadow-pop: 0 18px 50px -16px rgba(53,68,120,.40);
  --font-zh: 'Noto Sans SC', 'Inter', sans-serif;
  --font: 'Inter', 'Noto Sans SC', sans-serif;
  --sans: var(--font);
  --accent-soft: #ECEFFF;
  --accent-2: var(--primary-d);
  --line-strong: #D4DCF5;
}

html[data-theme="dark"] {
  --bg: #F7FAFF;
  --ink: #1E2A3A;
  --muted: #6B7894;
  --faint: #9AA6BE;
  --line: #E7ECF6;
  --card: #FFFFFF;
  color-scheme: light;
}

body.ui-public.lumio-public {
  font-family: var(--font);
  color: var(--ink);
  background:
    radial-gradient(120% 90% at 88% -10%, #EAF0FF 0%, rgba(234,240,255,0) 55%),
    radial-gradient(90% 80% at -5% 110%, #E7FBF4 0%, rgba(231,251,244,0) 50%),
    var(--bg);
  background-attachment: fixed;
  min-height: 100vh;
  padding: 40px 28px;
  line-height: 1.55;
  position: relative;
  overflow-x: hidden;
}
body.ui-public.lumio-public::before,
body.ui-public.lumio-public::after {
  content: "";
  position: fixed;
  width: 220px;
  height: 140px;
  z-index: 0;
  opacity: .5;
  background-image: radial-gradient(currentColor 1.4px, transparent 1.5px);
  background-size: 16px 16px;
  color: #C7D2F0;
  -webkit-mask-image: linear-gradient(135deg, #000, transparent 70%);
          mask-image: linear-gradient(135deg, #000, transparent 70%);
}
body.ui-public.lumio-public::before { top: 14px; left: 14px; }
body.ui-public.lumio-public::after { top: 14px; right: 14px; transform: scaleX(-1); }

.shell {
  position: relative;
  z-index: 1;
  max-width: 1180px;
  margin: 0 auto;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 26px;
  box-shadow: 0 30px 80px -40px rgba(40,54,110,.45), 0 2px 4px rgba(30,42,58,.04);
  overflow: hidden;
}
.ui-public__main { max-width: none; margin: 0; padding: 0; }
.ui-public__footer {
  max-width: none;
  margin: 0;
  padding: 18px 34px 22px;
  border-top: 1px solid var(--line);
  color: var(--faint);
  font: 500 12px/1.5 var(--font);
  background: rgba(255,255,255,.72);
}
.ui-public__footer p { margin: 0; }

.nav {
  position: relative;
  top: auto;
  height: auto;
  display: flex;
  align-items: center;
  gap: 26px;
  padding: 18px 28px;
  border-bottom: 1px solid var(--line);
  background: rgba(255,255,255,.7);
  backdrop-filter: blur(6px);
}
.brand { display: flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
.brand:hover { text-decoration: none; }
.brand__mark {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: linear-gradient(150deg, var(--primary), #9AA6FF);
  box-shadow: 0 6px 14px -5px rgba(124,140,255,.7), inset 0 1px 0 rgba(255,255,255,.4);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.brand__pix { display: grid; grid-template-columns: repeat(3, 5px); grid-template-rows: repeat(3, 5px); gap: 1.5px; }
.brand__pix i { background: #fff; border-radius: 1px; }
.brand__pix i:nth-child(2),
.brand__pix i:nth-child(4),
.brand__pix i:nth-child(6),
.brand__pix i:nth-child(8) { opacity: .35; }
.brand__txt { line-height: 1; }
.brand__name { display: block; font-weight: 800; font-size: 17px; letter-spacing: .02em; color: var(--ink); }
.brand__sub { display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .22em; color: var(--faint); margin-top: 2px; }
.nav__links { display: flex; gap: 4px; margin: 0 0 0 8px; padding: 0; list-style: none; }
.nav__link {
  display: inline-block;
  font-family: var(--font-zh);
  font-size: 14.5px;
  font-weight: 500;
  color: var(--muted);
  padding: 7px 12px;
  border-radius: 9px;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
  text-decoration: none;
  transition: color .15s, background .15s;
}
.nav__link:hover { color: var(--ink); background: #F1F4FC; text-decoration: none; }
.nav__link.is-active,
.ui-public__nav-link[aria-current="page"] { color: var(--primary-d); font-weight: 700; }
.nav__link.is-active::after,
.ui-public__nav-link[aria-current="page"]::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 1px;
  height: 2.5px;
  border-radius: 2px;
  background: var(--primary);
}
.nav__spacer { flex: 1; }
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 230px;
  height: 38px;
  padding: 0 14px;
  background: #F3F6FD;
  border: 1px solid var(--line);
  border-radius: 11px;
  color: var(--faint);
  transition: border-color .15s, background .15s;
}
.search:focus-within { border-color: var(--primary); background: #fff; }
.search input {
  border: 0;
  background: transparent;
  outline: none;
  flex: 1;
  min-width: 0;
  font-family: var(--font-zh);
  font-size: 13.5px;
  color: var(--ink);
}
.search input::placeholder { color: var(--faint); }
.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: #F3F6FD;
  color: var(--muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: .15s;
  padding: 0;
}
.icon-btn:hover { color: var(--primary-d); border-color: #C9D3F5; background: #fff; }
.avatar {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  flex-shrink: 0;
  background: linear-gradient(160deg, #B6C0FF, #7C8CFF);
  display: grid;
  place-items: center;
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5);
}

.body { display: grid; grid-template-columns: 380px 1fr; }
.hero {
  position: relative;
  overflow: hidden;
  color: var(--ink);
  padding: 48px 38px;
  background: linear-gradient(160deg, #DCE4FF 0%, #E4ECFF 38%, #DFF7F0 100%);
  display: flex;
  flex-direction: column;
}
.hero__deco { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.hero__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(124,140,255,.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(124,140,255,.12) 1px, transparent 1px);
  background-size: 26px 26px;
  -webkit-mask-image: linear-gradient(160deg, #000 5%, transparent 55%);
          mask-image: linear-gradient(160deg, #000 5%, transparent 55%);
}
.hero__eyebrow {
  position: relative;
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--primary-d);
  margin-bottom: 16px;
}
.hero__title {
  position: relative;
  font-size: 52px;
  line-height: 1.02;
  font-weight: 800;
  letter-spacing: -.02em;
  color: #243056;
  margin: 0 0 18px;
}
.hero__title em { font-style: normal; display: block; }
.hero__sub {
  position: relative;
  font-family: var(--font-zh);
  font-size: 15px;
  font-weight: 500;
  color: #4D5B7E;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 0 0 30px;
}
.hero__sub b { font-weight: 700; color: #3A4A6E; }
.dot { width: 4px; height: 4px; border-radius: 50%; background: var(--secondary); }
.btn-primary {
  position: relative;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-zh);
  font-size: 14.5px;
  font-weight: 700;
  color: #fff;
  padding: 13px 22px;
  border: 0;
  border-radius: 13px;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary), var(--primary-d));
  box-shadow: 0 12px 26px -10px rgba(97,113,240,.85), inset 0 1px 0 rgba(255,255,255,.35);
  transition: transform .15s, box-shadow .15s;
  text-decoration: none;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 18px 32px -10px rgba(97,113,240,.9); text-decoration: none; }
.btn-primary svg { transition: transform .15s; }
.btn-primary:hover svg { transform: translateX(3px); }
.hero__scene { margin-top: auto; position: relative; height: 190px; }

.cube {
  --s: 46px;
  --t: #C7D0FF;
  --l: #6E80F5;
  --r: #98A6FF;
  position: absolute;
  width: var(--s);
  height: var(--s);
  transform-style: preserve-3d;
  transform: rotateX(-24deg) rotateZ(-45deg);
}
.cube i { position: absolute; width: var(--s); height: var(--s); border-radius: 3px; backface-visibility: hidden; }
.cube .f-t { background: var(--t); transform: rotateX(90deg) translateZ(calc(var(--s) / 2)); }
.cube .f-r { background: var(--r); transform: translateZ(calc(var(--s) / 2)); }
.cube .f-l { background: var(--l); transform: rotateY(-90deg) translateZ(calc(var(--s) / 2)); }
.cube.c-mint { --t: #B6F2E4; --l: #43C9AD; --r: #6FE0C9; }
.cube.c-amber { --t: #FFE0B8; --l: #F39A47; --r: #FFC078; }
.cube.c-pink { --t: #FFCEDD; --l: #F0658E; --r: #FF93B4; }
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
.float { animation: bob 4s ease-in-out infinite; }
@keyframes bobcube {
  0%,100% { transform: translateY(0) rotateX(-24deg) rotateZ(-45deg); }
  50% { transform: translateY(-8px) rotateX(-24deg) rotateZ(-45deg); }
}
.cube.float { animation: bobcube 4s ease-in-out infinite; }
.px-heart { position: absolute; display: grid; grid-template-columns: repeat(5, var(--s)); grid-template-rows: repeat(5, var(--s)); gap: 1px; }
.px-heart i { background: transparent; border-radius: 1px; }
.px-heart i:nth-child(2), .px-heart i:nth-child(4),
.px-heart i:nth-child(6), .px-heart i:nth-child(7), .px-heart i:nth-child(8), .px-heart i:nth-child(9), .px-heart i:nth-child(10),
.px-heart i:nth-child(11), .px-heart i:nth-child(12), .px-heart i:nth-child(13), .px-heart i:nth-child(14), .px-heart i:nth-child(15),
.px-heart i:nth-child(17), .px-heart i:nth-child(18), .px-heart i:nth-child(19),
.px-heart i:nth-child(23) { background: #FF7EA6; box-shadow: inset 0 -2px 0 rgba(0,0,0,.08); }
.coin {
  position: absolute;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #FFE08A, #FFB86B 70%);
  border: 3px solid #F59E4B;
  display: grid;
  place-items: center;
  color: #C9742B;
  font-size: 15px;
  font-weight: 800;
  box-shadow: 0 4px 10px -3px rgba(245,158,75,.7);
}
.orb {
  position: absolute;
  left: 30%;
  top: 30%;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 34%, #FFFFFF 0%, #FFD8A8 32%, #FFA85B 70%, #FF8C3B 100%);
  box-shadow: 0 0 0 6px rgba(255,184,107,.25), 0 0 26px 4px rgba(255,168,91,.55);
}
.orb::after {
  content: "";
  position: absolute;
  top: -6px;
  right: -2px;
  width: 14px;
  height: 14px;
  background: radial-gradient(circle, #fff, transparent 70%);
}

.content { padding: 30px 34px 34px; display: flex; flex-direction: column; }
.sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.sec-title,
.section-title {
  font-family: var(--font-zh);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: .01em;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}
.section-title { font-size: 22px; margin: 6px 0 20px; }
.sec-title::before,
.section-title::before { content: ""; width: 4px; height: 18px; border-radius: 2px; background: var(--primary); }
.section-title::before { height: 20px; }
.sec-more {
  font-family: var(--font-zh);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  text-decoration: none;
  transition: color .15s, gap .15s;
}
.sec-more:hover { color: var(--primary-d); gap: 8px; text-decoration: none; }
.grid,
.grid-4 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.grid + .grid { margin-top: 18px; }
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform .18s, box-shadow .18s, border-color .18s;
}
.card:hover { transform: translateY(-4px); box-shadow: var(--shadow-pop); border-color: #D4DCF5; }
.card__link { color: inherit; text-decoration: none; display: flex; flex-direction: column; flex: 1; }
.card__link:hover { text-decoration: none; }
.thumb {
  position: relative;
  height: 132px;
  overflow: hidden;
  display: grid;
  place-items: center;
}
.thumb__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px);
  background-size: 22px 22px;
  opacity: .6;
}
.thumb.t-blue { background: linear-gradient(150deg, #E5EAFF, #D6DEFF); }
.thumb.t-mint { background: linear-gradient(150deg, #DFF7F1, #C9F1E6); }
.thumb.t-amber { background: linear-gradient(150deg, #FFEFD9, #FFE0BC); }
.thumb.t-violet { background: linear-gradient(150deg, #ECE6FF, #DCD2FF); }
.thumb.t-sky { background: linear-gradient(150deg, #DDF0FF, #C6E6FF); }
.thumb.t-rose { background: linear-gradient(150deg, #FFE6EE, #FFD3E0); }
.badge {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  font-family: var(--font-zh);
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,.88);
  color: var(--ink);
  box-shadow: 0 2px 6px rgba(30,42,58,.08);
  backdrop-filter: blur(4px);
}
.thumb__art { position: relative; width: 100%; height: 100%; }
.thumb__art .cube { left: 50%; top: 50%; }
.card__body { padding: 16px 16px 14px; display: flex; flex-direction: column; flex: 1; }
.card__title {
  font-family: var(--font-zh);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: .005em;
  margin: 0 0 8px;
  color: var(--ink);
}
.card:hover .card__title { color: var(--primary-d); }
.card__dek {
  font-family: var(--font-zh);
  font-size: 13px;
  font-weight: 400;
  color: var(--muted);
  line-height: 1.6;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}
.card__meta {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 14px;
  font-family: var(--font);
  font-size: 12px;
  font-weight: 500;
  color: var(--faint);
  flex-wrap: wrap;
}
.card__meta span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }

.ad {
  margin-top: 18px;
  position: relative;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: repeating-linear-gradient(45deg, #F3F6FD 0 12px, #EEF2FB 12px 24px);
  overflow: hidden;
  display: block;
}
.ad__label {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  font-family: var(--font);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--faint);
  padding: 3px 8px;
  border-radius: 7px;
  background: rgba(255,255,255,.85);
  border: 1px solid var(--line);
  backdrop-filter: blur(4px);
}
.ad__link { display: block; text-decoration: none; color: inherit; }
.ad__link:hover { text-decoration: none; }
.ad__img { display: block; width: 100%; height: auto; }
.ad__ph { display: flex; align-items: center; gap: 16px; padding: 22px 26px; min-height: 104px; }
.ad__ph-mark {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  flex-shrink: 0;
  background: linear-gradient(150deg, var(--primary), #9AA6FF);
  color: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 8px 18px -8px rgba(124,140,255,.8);
}
.ad__ph-txt { line-height: 1.5; }
.ad__ph-title { display: block; font-family: var(--font-zh); font-size: 15px; font-weight: 700; color: var(--ink); }
.ad__ph-sub { display: block; font-family: var(--font-zh); font-size: 12.5px; color: var(--muted); margin-top: 3px; }

.subscribe {
  margin-top: 22px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 20px 24px;
  border-radius: var(--radius);
  background: linear-gradient(120deg, #F3F6FF, #EEFBF6);
  border: 1px solid var(--line);
}
.subscribe__icon {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  flex-shrink: 0;
  background: linear-gradient(150deg, var(--primary), #9AA6FF);
  color: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 8px 18px -8px rgba(124,140,255,.8);
}
.subscribe__txt { flex: 1; }
.subscribe__title { font-family: var(--font-zh); font-size: 15px; font-weight: 700; }
.subscribe__sub { font-family: var(--font-zh); font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.subscribe__form { display: flex; gap: 10px; }
.subscribe__form input {
  width: 200px;
  height: 42px;
  padding: 0 14px;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: #fff;
  outline: none;
  font-family: var(--font-zh);
  font-size: 13.5px;
  color: var(--ink);
}
.subscribe__form input::placeholder { color: var(--faint); }
.subscribe__form input:focus { border-color: var(--primary); }
.subscribe__form button {
  height: 42px;
  padding: 0 22px;
  border: 0;
  border-radius: 11px;
  cursor: pointer;
  font-family: var(--font-zh);
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--primary-d));
  box-shadow: 0 10px 20px -9px rgba(97,113,240,.85);
  transition: transform .15s;
}
.subscribe__form button:hover { transform: translateY(-2px); }

.page-head {
  padding: 40px 34px 26px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #EEF2FF 0%, #F2F6FF 45%, #ECFBF5 100%);
  border-bottom: 1px solid var(--line);
}
.page-head__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(124,140,255,.10) 1px, transparent 1px),
    linear-gradient(90deg, rgba(124,140,255,.10) 1px, transparent 1px);
  background-size: 26px 26px;
  -webkit-mask-image: linear-gradient(160deg, #000 5%, transparent 60%);
          mask-image: linear-gradient(160deg, #000 5%, transparent 60%);
}
.page-head__eyebrow {
  position: relative;
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--primary-d);
  margin-bottom: 12px;
}
.page-head__title {
  position: relative;
  font-size: 40px;
  line-height: 1.04;
  font-weight: 800;
  letter-spacing: -.02em;
  color: #243056;
  margin: 0 0 12px;
}
.page-head__sub {
  position: relative;
  font-family: var(--font-zh);
  font-size: 15px;
  font-weight: 500;
  color: #4D5B7E;
  max-width: 560px;
  margin: 0;
}
.page { padding: 28px 34px 36px; }
.chips { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 24px; }
.chip {
  font-family: var(--font-zh);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--muted);
  padding: 8px 15px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #fff;
  cursor: pointer;
  transition: .15s;
  text-decoration: none;
  white-space: nowrap;
}
.chip:hover { color: var(--primary-d); border-color: #C9D3F5; text-decoration: none; }
.chip.is-active {
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--primary-d));
  border-color: transparent;
  box-shadow: 0 8px 18px -9px rgba(97,113,240,.85);
}
.chip__n { opacity: .65; font-weight: 700; margin-left: 4px; }
.feature {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--card);
  margin-bottom: 24px;
  cursor: pointer;
  transition: transform .18s, box-shadow .18s;
}
.feature:hover { transform: translateY(-3px); box-shadow: var(--shadow-pop); }
.feature__link { display: grid; grid-template-columns: 1.1fr 1fr; color: inherit; text-decoration: none; }
.feature__link:hover { text-decoration: none; }
.feature__art { min-height: 240px; height: auto; }
.feature__body { padding: 30px; display: flex; flex-direction: column; justify-content: center; }
.feature__body .chip { align-self: flex-start; margin-bottom: 4px; cursor: default; }
.feature__title { font-family: var(--font-zh); font-size: 25px; font-weight: 700; line-height: 1.25; margin: 10px 0 12px; }
.feature__dek { font-family: var(--font-zh); font-size: 14px; color: var(--muted); line-height: 1.65; margin: 0 0 18px; }

.cols { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.col-card {
  display: grid;
  grid-template-columns: 132px 1fr;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--card);
  cursor: pointer;
  text-decoration: none;
  color: var(--ink);
  transition: transform .18s, box-shadow .18s, border-color .18s;
}
.col-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-pop); border-color: #D4DCF5; text-decoration: none; }
.col-card__cover { position: relative; display: grid; place-items: center; min-height: 168px; }
.col-card__body { padding: 20px; display: flex; flex-direction: column; }
.col-card__name { font-family: var(--font-zh); font-size: 18px; font-weight: 700; margin-bottom: 7px; }
.col-card__dek {
  font-family: var(--font-zh);
  font-size: 13px;
  color: var(--muted);
  line-height: 1.6;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}
.col-card__foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }
.col-card__count { font-family: var(--font); font-size: 12.5px; font-weight: 600; color: var(--faint); display: inline-flex; align-items: center; gap: 6px; }
.btn-ghost {
  font-family: var(--font-zh);
  font-size: 13px;
  font-weight: 700;
  color: var(--primary-d);
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid #C9D3F5;
  background: #F3F6FF;
  cursor: pointer;
  transition: .15s;
  white-space: nowrap;
}
.col-card:hover .btn-ghost,
.btn-ghost:hover { background: var(--primary); color: #fff; border-color: transparent; }

.tagcloud { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 32px; }
.tagcloud .tag-pill {
  font-family: var(--font-zh);
  font-weight: 700;
  text-decoration: none;
  border-radius: 12px;
  padding: 12px 18px;
  cursor: pointer;
  transition: transform .15s, box-shadow .15s;
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  color: var(--ink);
  border: 1px solid var(--line);
  background: #fff;
}
.tag-pill:hover { transform: translateY(-3px); box-shadow: var(--shadow-card); text-decoration: none; }
.tag-pill .tag-pill__n {
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  padding: 1px 8px;
  border-radius: 20px;
  background: var(--primary);
}
.tag-pill.s-mint .tag-pill__n { background: #2BB89B; }
.tag-pill.s-amber .tag-pill__n { background: #E8902F; }
.tag-pill.s-violet .tag-pill__n { background: #8E76F0; }
.tag-pill.s-sky .tag-pill__n { background: #4FA0E8; }
.tag-pill.s-rose .tag-pill__n { background: #F0658E; }
.tag-pill.is-big { font-size: 19px; }
.tag-pill.is-mid { font-size: 16px; }

.about-lead {
  font-family: var(--font-zh);
  font-size: 19px;
  font-weight: 500;
  line-height: 1.75;
  color: #3A4A6E;
  max-width: 720px;
  margin: 0 0 34px;
}
.about-lead b { color: var(--primary-d); font-weight: 700; }
.feat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-bottom: 36px; }
.feat { padding: 24px 22px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--card); }
.feat__icon { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: #fff; margin-bottom: 14px; }
.feat__icon.i-blue { background: linear-gradient(150deg, var(--primary), #9AA6FF); }
.feat__icon.i-mint { background: linear-gradient(150deg, #5DE2C6, #43C9AD); }
.feat__icon.i-amber { background: linear-gradient(150deg, #FFB86B, #F39A47); }
.feat__title { font-family: var(--font-zh); font-size: 16px; font-weight: 700; margin-bottom: 7px; }
.feat__txt { font-family: var(--font-zh); font-size: 13.5px; color: var(--muted); line-height: 1.65; margin: 0; }
.team { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.member { text-align: center; padding: 24px 16px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--card); }
.member__face {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  margin: 0 auto 14px;
  display: grid;
  place-items: center;
  font-family: var(--font);
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4);
}
.member__name { font-family: var(--font-zh); font-size: 15px; font-weight: 700; }
.member__role { font-family: var(--font-zh); font-size: 12.5px; color: var(--muted); margin-top: 3px; }

.is-filtered-out { display: none !important; }

@media (max-width: 980px) {
  body.ui-public.lumio-public { padding: 28px 18px; }
  .nav { flex-wrap: wrap; gap: 12px; }
  .search { width: 100%; order: 5; }
  .body { grid-template-columns: 1fr; }
  .hero { padding: 36px 30px; }
  .hero__title { font-size: 42px; }
  .grid,
  .grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .feature__link { grid-template-columns: 1fr; }
  .cols { grid-template-columns: 1fr; }
  .feat-row { grid-template-columns: 1fr; }
  .team { grid-template-columns: repeat(2, 1fr); }
  .page-head__title { font-size: 32px; }
}
@media (max-width: 680px) {
  body.ui-public.lumio-public { padding: 16px 10px; }
  .shell { border-radius: 22px; }
  .nav__links { width: 100%; overflow-x: auto; margin-left: 0; padding-bottom: 2px; }
  .hero { padding: 32px 24px; }
  .hero__title { font-size: 38px; }
  .content,
  .page { padding: 24px 20px 28px; }
  .grid,
  .grid-4 { grid-template-columns: 1fr; }
  .subscribe { flex-direction: column; align-items: flex-start; }
  .subscribe__form { width: 100%; flex-direction: column; }
  .subscribe__form input,
  .subscribe__form button { width: 100%; }
  .col-card { grid-template-columns: 1fr; }
  .team { grid-template-columns: 1fr; }
}
`;
