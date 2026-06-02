import type { SiteConfig } from '@opennote/core';
import { THEME_BOOT_SCRIPT } from '../theme-boot.js';

export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface PublicLayoutOpts {
  title: string;
  description: string;
  config: SiteConfig;
  /** main 内容,纯 HTML */
  body: string;
  /** 当前页面路径,用于 canonical / Open Graph URL */
  path?: string;
  /** 分享图路径或绝对 URL */
  image?: string;
  /** 当前导航项,匹配 nav item id(home / posts / notes / docs / tags / about) */
  active?: string;
  /** noindex meta */
  noindex?: boolean;
  /** 额外的 head HTML(例如 og:image) */
  extraHead?: string;
  /** 额外的 footer JS,可放 mermaid 等动态 */
  extraScripts?: string;
  /** styles.css 路径,默认 '/styles.css' */
  stylesHref?: string;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '首页', href: '/' },
  { id: 'articles', label: '文章', href: '/articles/index.html' },
  { id: 'columns', label: '专栏', href: '/columns/index.html' },
  { id: 'tags', label: '标签', href: '/tags/index.html' },
  { id: 'about', label: '关于', href: '/about.html' },
];

function normalizePath(path?: string): string {
  if (!path) return '/';
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

function absoluteUrl(base: string, path?: string): string {
  const siteUrl = base.trim().replace(/\/+$/, '') || 'http://localhost';
  const target = normalizePath(path);
  try {
    return new URL(target, `${siteUrl}/`).toString();
  } catch {
    return `${siteUrl}${target.startsWith('/') ? target : `/${target}`}`;
  }
}

/**
 * SSG-safe 公共布局,返回完整 HTML 字符串。
 *
 * - <html lang> 跟随 config.site.language(默认 zh-CN)
 * - 含 skip-link / 主导航 / RSS / 主题切换按钮
 * - 主题切换内联脚本,刷新不闪烁
 * - 使用 styles-hifi token 体系(由 web-public 把 ALL_CSS 写到 styles.css)
 */
export function publicLayout(o: PublicLayoutOpts): string {
  const lang = o.config.site.language ?? 'zh-CN';
  const stylesHref = o.stylesHref ?? '/styles.css';
  const fontUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
  const description = o.description || o.config.site.description || '';
  const canonicalUrl = absoluteUrl(o.config.site.url, o.path);
  const imageUrl = o.image ? absoluteUrl(o.config.site.url, o.image) : null;
  const ogType = normalizePath(o.path) === '/' ? 'website' : 'article';
  const brand = o.config.site.title || 'Lumio';

  return `<!doctype html>
<html lang="${escHtml(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(o.title)}</title>
  <meta name="description" content="${escHtml(description)}">
  ${o.noindex ? '<meta name="robots" content="noindex,nofollow">' : ''}
  <link rel="canonical" href="${escHtml(canonicalUrl)}">
  <meta property="og:title" content="${escHtml(o.title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:type" content="${escHtml(ogType)}">
  <meta property="og:url" content="${escHtml(canonicalUrl)}">
  <meta property="og:site_name" content="${escHtml(o.config.site.title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escHtml(o.title)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  ${imageUrl ? `<meta property="og:image" content="${escHtml(imageUrl)}">
  <meta name="twitter:image" content="${escHtml(imageUrl)}">` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${fontUrl}">
  <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="${escHtml(o.config.site.title)}">
  <link rel="stylesheet" href="${escHtml(stylesHref)}">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
  <script>${THEME_BOOT_SCRIPT}</script>
  ${o.extraHead ?? ''}
</head>
<body class="ui-public lumio-public">
  <a class="skip-link" href="#main-content">跳到正文</a>
  <div class="shell">
    <nav class="ui-public__nav nav" aria-label="主导航">
      <a href="/" class="ui-public__brand brand" aria-label="${escHtml(brand)} 首页">
        <span class="brand__mark" aria-hidden="true">
          <span class="brand__pix"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
        </span>
        <span class="brand__txt">
          <span class="brand__name">LUMIO</span>
          <span class="brand__sub">.GAMES</span>
        </span>
      </a>
      <ul class="ui-public__nav-list nav__links">
        ${NAV_ITEMS.map((it) => `<li><a class="ui-public__nav-link nav__link${o.active === it.id ? ' is-active' : ''}" href="${it.href}"${o.active === it.id ? ' aria-current="page"' : ''}>${it.label}</a></li>`).join('\n        ')}
      </ul>
      <div class="nav__spacer"></div>
      <form class="search" action="/search/index.html" role="search">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"></circle><path d="m10.5 10.5 3 3"></path></svg>
        <input type="search" name="q" placeholder="搜索文章、标签" aria-label="搜索文章、标签">
      </form>
      <button type="button" class="icon-btn" id="ui-theme-toggle" aria-label="切换主题">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="3"></circle><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"></path></svg>
      </button>
      <a class="avatar" href="/admin/" title="管理后台" aria-label="管理后台">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="9" r="3.4"></circle><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"></path></svg>
      </a>
    </nav>
    <main id="main-content" class="ui-public__main" role="main">${o.body}</main>
    <footer class="ui-public__footer" role="contentinfo">
      <p>${escHtml(o.config.author.name)} · ${escHtml(o.config.site.title)}</p>
    </footer>
  </div>
  <script>
    (function(){
      var btn=document.getElementById('ui-theme-toggle');
      if(!btn) return;
      function effective(){
        var t=document.documentElement.getAttribute('data-theme');
        if(t==='light'||t==='dark') return t;
        return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
      }
      btn.addEventListener('click',function(){
        var next=effective()==='dark'?'light':'dark';
        document.documentElement.setAttribute('data-theme',next);
        try{localStorage.setItem('theme',next);}catch(e){}
      });
    })();
  </script>
  ${o.extraScripts ?? ''}
</body>
</html>`;
}
