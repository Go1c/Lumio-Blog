import type { SiteConfig } from '@opennote/core';

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface LayoutOpts {
  title: string;
  description: string;
  config: SiteConfig;
  body: string;
  noindex?: boolean;
}

export function layout(o: LayoutOpts): string {
  return `<!doctype html>
<html lang="${esc(o.config.site.language ?? 'zh-CN')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(o.title)}</title>
  <meta name="description" content="${esc(o.description)}">
  ${o.noindex ? '<meta name="robots" content="noindex,nofollow">' : ''}
  <link rel="alternate" type="application/rss+xml" href="/feed.xml" title="${esc(o.config.site.title)}">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
</head>
<body>
  <a class="skip-link" href="#main-content">跳到正文</a>
  <header>
    <h1><a href="/" style="color:inherit;text-decoration:none">${esc(o.config.site.title)}</a></h1>
    <nav aria-label="主导航">
      <a href="/">首页</a>
      <a href="/tags/index.html">标签</a>
      <a href="/feed.xml" aria-label="RSS 订阅">RSS</a>
    </nav>
  </header>
  <main id="main-content">${o.body}</main>
  <footer>
    <p>${esc(o.config.author.name)} · powered by opennote</p>
  </footer>
  <script type="module">
    if (document.querySelector('.mermaid')) {
      const m = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
      m.default.initialize({ startOnLoad: false, theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default' });
      await m.default.run({ querySelector: '.mermaid' });
    }
  </script>
</body>
</html>`;
}
