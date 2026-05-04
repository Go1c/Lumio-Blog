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
  { id: 'tags', label: '标签', href: '/tags/index.html' },
  { id: 'search', label: '搜索', href: '/search/index.html' },
];

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
  const fontUrl = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap';

  return `<!doctype html>
<html lang="${escHtml(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(o.title)}</title>
  <meta name="description" content="${escHtml(o.description)}">
  ${o.noindex ? '<meta name="robots" content="noindex,nofollow">' : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${fontUrl}">
  <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="${escHtml(o.config.site.title)}">
  <link rel="stylesheet" href="${escHtml(stylesHref)}">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
  <script>${THEME_BOOT_SCRIPT}</script>
  ${o.extraHead ?? ''}
</head>
<body class="ui-public">
  <a class="skip-link" href="#main-content">跳到正文</a>
  <nav class="ui-public__nav" aria-label="主导航">
    <a href="/" class="ui-public__brand" aria-label="${escHtml(o.config.site.title)} 首页">
      <span class="ui-public__brand-logo" aria-hidden="true">${escHtml(o.config.site.title.charAt(0).toUpperCase())}</span>
      <span>${escHtml(o.config.site.title)}</span>
    </a>
    <ul class="ui-public__nav-list">
      ${NAV_ITEMS.map((it) => `<li><a class="ui-public__nav-link" href="${it.href}"${o.active === it.id ? ' aria-current="page"' : ''}>${it.label}</a></li>`).join('\n      ')}
    </ul>
    <div class="hf-grow"></div>
    <a href="/search/index.html" class="ui-btn ui-btn--icon" aria-label="全站搜索">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"></circle><path d="m10.5 10.5 3 3"></path></svg>
    </a>
    <button type="button" class="ui-btn ui-btn--icon" id="ui-theme-toggle" aria-label="切换主题">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="3"></circle><path d="M8 1 V3 M8 13 V15 M1 8 H3 M13 8 H15 M3 3 L4.5 4.5 M11.5 11.5 L13 13 M3 13 L4.5 11.5 M11.5 4.5 L13 3"></path></svg>
    </button>
    <a href="/feed.xml" class="ui-btn ui-btn--icon" aria-label="RSS 订阅">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"></circle><path d="M2 8 Q8 8, 8 14 M2 4 Q12 4, 12 14"></path></svg>
    </a>
  </nav>
  <main id="main-content" class="ui-public__main" role="main">${o.body}</main>
  <footer class="ui-public__footer" role="contentinfo">
    <p>${escHtml(o.config.author.name)} · powered by opennote</p>
  </footer>
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
