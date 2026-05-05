import { posix } from 'node:path';
import type { RenderHtmlOptions, VaultIndex, VaultAsset } from '../types.js';
import { resolveAssetTarget, resolveNoteTarget } from '../assets/resolver.js';

/**
 * .html 笔记的渲染策略:
 *
 * 这种文件大多是第三方工具(如 Claude / Notion 导出)产出的"深度报告"——
 * 它已经是一份独立的 HTML 文档,直接 inline 进文章页会跟主页面 CSS 互相污染。
 *
 * 所以我们:
 *   1. 把内部相对引用(<img src="附件/x.png"> / <a href="../别的笔记.md">)改写成
 *      已发布资源的绝对 URL,保证它能在新地址下加载;
 *   2. 输出一个 sandboxed iframe + srcdoc 内嵌——主页面可以正常排版,
 *      而它内部的样式 / 脚本不会泄漏出来;
 *   3. iframe 自适应高度(由前端 message + ResizeObserver 自动调整)。
 *
 * 由于使用 srcdoc,我们没有跨域问题——同一文档树。允许 allow-scripts(让 mermaid /
 * highlight.js 之类的脚本运行),不开 allow-same-origin(防止读取父 cookies)。
 */

export interface RenderHtmlResult {
  /** 包了 iframe 的最终 HTML(可直接放进文章正文) */
  html: string;
  /** rewritten 后的 srcdoc 原始 HTML(用于 SEO 抽 plain text / FTS) */
  rewritten: string;
  /** 文档内引用到的所有 vault 资源 */
  referenced: VaultAsset[];
}

export function renderHtmlNote(
  opts: RenderHtmlOptions & { toAssetUrl: (a: VaultAsset) => string },
): RenderHtmlResult {
  const referenced: VaultAsset[] = [];
  const { rewritten, refs } = rewriteUrls(opts.html, opts);
  for (const a of refs) referenced.push(a);

  // srcdoc HTML 转义:srcdoc 是 quoted attr,内部 " 必须转义
  const srcdoc = rewritten
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');

  const iframeHtml = `<div class="ob-html-embed">
  <iframe class="ob-html-embed__frame"
          loading="lazy"
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          referrerpolicy="no-referrer"
          title="HTML 报告"
          srcdoc="${srcdoc}"></iframe>
  <button type="button" class="ob-html-embed__expand" aria-label="全屏查看">⛶</button>
</div>`;

  return { html: iframeHtml, rewritten, referenced };
}

/**
 * 在 HTML 文档里改写所有相对 URL 引用,使其指向 publish 后的资源。
 *
 * 处理:
 *   <img src=...>  <video src=...>  <audio src=...>  <source src=...>  <link href=...>
 *   <script src=...>  <a href=...>
 *
 * 规则:
 *   - 绝对 URL(http/https/data:/blob:/mailto:) 留原样
 *   - 锚点(#xxx) 留原样
 *   - 相对路径 → 解析为相对 source_path 的目录,再走 vault index
 *   - 命中 asset → toAssetUrl(asset)
 *   - 命中 note(.md/.canvas/.html) → /posts/<slug>.html
 *   - 不命中 → 留原样,交给浏览器(srcdoc 里会失效,但不至于阻塞)
 */
function rewriteUrls(
  html: string,
  opts: RenderHtmlOptions & { toAssetUrl: (a: VaultAsset) => string },
): { rewritten: string; refs: VaultAsset[] } {
  const refs: VaultAsset[] = [];
  const baseDir = posix.dirname(opts.source_path.replace(/\\/g, '/'));

  // 同时支持 src/href 单/双引号
  const ATTR_RE = /\b(src|href)\s*=\s*(["'])([^"']+)\2/gi;
  const rewritten = html.replace(ATTR_RE, (full, attr, quote, url: string) => {
    const newUrl = resolve(url);
    if (newUrl === null) return full;
    return `${attr}=${quote}${newUrl}${quote}`;
  });

  function resolve(url: string): string | null {
    if (!url) return null;
    if (url.startsWith('#')) return null;
    if (/^([a-z][a-z0-9+\-.]*:)/i.test(url)) return null;
    if (url.startsWith('//')) return null;
    // strip 末尾 anchor / query 用于解析
    const [pathPart, ...rest] = url.split(/([?#])/);
    if (!pathPart) return null;
    const tail = rest.join('');

    let normalized: string;
    if (pathPart.startsWith('/')) {
      normalized = pathPart.slice(1);
    } else {
      normalized = posix.normalize(posix.join(baseDir, pathPart));
    }

    // try note
    const note = resolveNoteTarget(normalized, opts.index);
    if (note) {
      return `/posts/${note.slug || note.stem}.html${tail}`;
    }
    // try asset
    const asset = resolveAssetTarget(normalized, opts.index);
    if (asset) {
      refs.push(asset);
      return opts.toAssetUrl(asset) + tail;
    }
    return null;
  }

  return { rewritten, refs };
}

/** 用于 plain text 抽取(摘要/FTS):粗暴去标签 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * iframe 自适应高度的客户端脚本——postMessage from srcdoc → parent。
 * 上层 layout 注入这一段,iframe 加载后自动计算内容高度。
 */
export const HTML_EMBED_RUNTIME_JS = `(function(){
  function setup(frame){
    let lastH = 0;
    function poll(){
      try {
        const doc = frame.contentDocument;
        if (!doc) return;
        const h = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
        if (h && Math.abs(h - lastH) > 4) {
          lastH = h;
          frame.style.height = h + 'px';
        }
      } catch(e) { /* sandbox */ }
    }
    frame.addEventListener('load', () => {
      poll();
      // 监视后续 DOM 变化(图片懒加载完成等)
      try {
        const doc = frame.contentDocument;
        if (!doc) return;
        const ro = new ResizeObserver(poll);
        ro.observe(doc.documentElement);
      } catch(e) {}
    });
    setInterval(poll, 1500);
  }
  document.querySelectorAll('.ob-html-embed__frame').forEach(setup);

  // 全屏切换按钮
  document.querySelectorAll('.ob-html-embed__expand').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.ob-html-embed');
      if (!wrap) return;
      if (document.fullscreenElement === wrap) document.exitFullscreen();
      else wrap.requestFullscreen && wrap.requestFullscreen();
    });
  });
})();`;
