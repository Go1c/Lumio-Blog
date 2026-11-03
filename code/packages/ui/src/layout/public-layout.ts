import type { SiteConfig } from '@opennote/core';
import { THEME_BOOT_SCRIPT } from '../theme-boot.js';

export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Open Graph `article:*` meta，仅文章页使用。 */
export interface ArticleMeta {
  /** ISO 8601 timestamp */
  publishedTime?: string;
  /** ISO 8601 timestamp */
  modifiedTime?: string;
  tags?: string[];
  author?: string;
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
  /** schema.org 实体,序列化成 application/ld+json。noindex 页面应传空。 */
  jsonLd?: unknown[];
  /** 文章页的 article:* Open Graph meta */
  article?: ArticleMeta;
  /** 额外的 head HTML(例如 og:image) */
  extraHead?: string;
  /** 额外的 footer JS,可放 mermaid 等动态 */
  extraScripts?: string;
  /** styles.css 路径,默认 '/styles.css' */
  stylesHref?: string;
  /** 放在 .shell 之后的 HTML(例如手机底部悬浮条),不受 .shell 的 overflow 裁切 */
  afterShell?: string;
}

/** 右上角外链,带来源参数方便统计(见 doc/devdoc/blog-hub-plan.md 第 6 节) */
const NAV_SITE_HREF = 'https://lumiogames.cn/?entry=blog&utm_source=blog&utm_medium=nav&utm_campaign=site';
const NAV_STUDIO_HREF = 'https://lumiogames.cn/studio/?utm_source=blog&utm_medium=nav&utm_campaign=studio_hub';

/** 与官网一致的 Lumio 标志 */
const BRAND_MARK_SVG = '<svg class="lumio-mark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="44" height="44" aria-hidden="true" focusable="false"><defs><linearGradient id="lumio-g-nav" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6659db"/><stop offset="1" stop-color="#9aa6ff"/></linearGradient></defs><rect width="100" height="100" rx="29" fill="url(#lumio-g-nav)"/><rect x="25" y="22" width="16" height="16" rx="4" fill="#fff"/><rect x="25" y="42" width="16" height="16" rx="4" fill="#fff"/><rect x="25" y="62" width="16" height="16" rx="4" fill="#fff"/><rect x="45" y="62" width="16" height="16" rx="4" fill="#fff" fill-opacity=".6"/><rect x="65" y="62" width="16" height="16" rx="4" fill="#5de2c6"/><path d="M70 19C71.56 28.1 73.9 30.44 83 32C73.9 33.56 71.56 35.9 70 45C68.44 35.9 66.1 33.56 57 32C66.1 30.44 68.44 28.1 70 19Z" fill="#fff"/></svg>';

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
 * 序列化 JSON-LD。`<` / `>` / `&` 转成 unicode 转义,防止正文里的字符串提前闭合 </script>。
 */
export function jsonLdScript(entities: unknown[]): string {
  const items = entities.filter((e) => e !== null && e !== undefined);
  if (!items.length) return '';
  return items
    .map((entity) => {
      const json = JSON.stringify(entity)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
      return `<script type="application/ld+json">${json}</script>`;
    })
    .join('\n  ');
}

function articleMetaTags(article: ArticleMeta | undefined): string {
  if (!article) return '';
  const tags: string[] = [];
  if (article.publishedTime) {
    tags.push(`<meta property="article:published_time" content="${escHtml(article.publishedTime)}">`);
  }
  if (article.modifiedTime) {
    tags.push(`<meta property="article:modified_time" content="${escHtml(article.modifiedTime)}">`);
  }
  if (article.author) {
    tags.push(`<meta property="article:author" content="${escHtml(article.author)}">`);
    tags.push(`<meta name="author" content="${escHtml(article.author)}">`);
  }
  for (const tag of article.tags ?? []) {
    tags.push(`<meta property="article:tag" content="${escHtml(tag)}">`);
  }
  return tags.join('\n  ');
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
  const ogLocale = lang.toLowerCase().startsWith('zh') ? 'zh_CN' : lang.replaceAll('-', '_');
  const twitterCard = o.config.seo?.twitter_card || 'summary_large_image';
  // noindex 页面不该被引擎收录,也就没必要喂结构化数据。
  const jsonLd = o.noindex ? '' : jsonLdScript(o.jsonLd ?? []);
  const articleTags = articleMetaTags(o.article);
  const brand = o.config.site.title || 'Lumio';
  const footerLinks = [
    ...(o.config.features?.graph === false ? [] : [{ href: '/graph/index.html', label: '知识图谱' }]),
    { href: '/folders/index.html', label: '文件夹' },
    { href: '/feed/', label: 'RSS' },
  ];

  return `<!doctype html>
<html lang="${escHtml(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(o.title)}</title>
  <meta name="description" content="${escHtml(description)}">
  <meta name="msvalidate.01" content="48232FF4A9EAB80D49C7A5AE2D009539">
  <meta name="baidu-site-verification" content="codeva-qKoHKbt10r">
  <meta name="google-site-verification" content="YlFC2R5DY626I5yH2cA24zxqOOmciWqMHQcuJAw2El8">
  <meta name="sogou_site_verification" content="zRSOrPjKvt">
  ${o.noindex ? '<meta name="robots" content="noindex,nofollow">' : ''}
  <link rel="canonical" href="${escHtml(canonicalUrl)}">
  <link rel="alternate" hreflang="${escHtml(lang)}" href="${escHtml(canonicalUrl)}">
  <link rel="alternate" hreflang="x-default" href="${escHtml(canonicalUrl)}">
  <meta property="og:title" content="${escHtml(o.title)}">
  <meta property="og:description" content="${escHtml(description)}">
  <meta property="og:type" content="${escHtml(ogType)}">
  <meta property="og:url" content="${escHtml(canonicalUrl)}">
  <meta property="og:site_name" content="${escHtml(o.config.site.title)}">
  <meta property="og:locale" content="${escHtml(ogLocale)}">
  <meta name="twitter:card" content="${escHtml(twitterCard)}">
  <meta name="twitter:title" content="${escHtml(o.title)}">
  <meta name="twitter:description" content="${escHtml(description)}">
  ${imageUrl ? `<meta property="og:image" content="${escHtml(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:image" content="${escHtml(imageUrl)}">
  <meta itemprop="image" content="${escHtml(imageUrl)}">` : ''}
  ${articleTags}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${fontUrl}">
  <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="${escHtml(o.config.site.title)}">
  <link rel="stylesheet" href="${escHtml(stylesHref)}">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
  <script>${THEME_BOOT_SCRIPT}</script>
  ${jsonLd}
  ${o.extraHead ?? ''}
  <script defer src="https://data.lumio.games/script.js" data-website-id="2643aa10-6823-4702-8c18-26c3b4a8b4d3"></script>
</head>
<body class="ui-public lumio-public">
  <a class="skip-link" href="#main-content">跳到正文</a>
  <div class="shell">
    <nav class="ui-public__nav nav" aria-label="主导航">
      <a href="/" class="ui-public__brand brand" aria-label="${escHtml(brand)} 首页">
        ${BRAND_MARK_SVG}
        <span class="lumio-word">Lumio<small>GAMES</small></span>
      </a>
      <ul class="ui-public__nav-list nav__links">
        ${NAV_ITEMS.map((it) => `<li><a class="ui-public__nav-link nav__link${o.active === it.id ? ' is-active' : ''}" href="${it.href}"${o.active === it.id ? ' aria-current="page"' : ''}>${it.label}</a></li>`).join('\n        ')}
      </ul>
      <div class="nav__spacer"></div>
      <form class="search" action="/search/index.html" role="search">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"></circle><path d="m10.5 10.5 3 3"></path></svg>
        <input type="search" name="q" placeholder="搜索文章、标签" aria-label="搜索文章、标签">
      </form>
      <a class="nav__ext-link" href="${NAV_SITE_HREF}" target="_blank" rel="noopener">官网</a>
      <a class="nav__studio" href="${NAV_STUDIO_HREF}" target="_blank" rel="noopener">创作中心<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>
      <button type="button" class="icon-btn" id="ui-theme-toggle" aria-label="切换主题">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="3"></circle><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"></path></svg>
      </button>
    </nav>
    <main id="main-content" class="ui-public__main" role="main">${o.body}</main>
    <footer class="ui-public__footer" role="contentinfo">
      <p>${escHtml(o.config.author.name)} · ${escHtml(o.config.site.title)}</p>
      <nav aria-label="站点工具">
        ${footerLinks.map((link) => `<a href="${link.href}">${link.label}</a>`).join('\n        ')}
      </nav>
    </footer>
  </div>
  ${o.afterShell ?? ''}
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
