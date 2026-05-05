import { visit, SKIP } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, PhrasingContent } from 'mdast';
import type { LinkResolver, RenderedLink, ResolvedLink, WikilinkParts } from '../../types.js';
import { splitWikilink } from '../helpers.js';
import { toCollected } from './wikilinks.js';

/**
 * Obsidian embed 形态:
 *
 *   ![[image.png]]                    → <img>
 *   ![[image.png|400]]                → <img width=400>(整数 alias = 像素宽)
 *   ![[image.png|alt text]]           → <img alt="alt text">
 *   ![[video.mp4]]                    → <video>
 *   ![[audio.mp3]]                    → <audio>
 *   ![[doc.pdf]]                      → <iframe>
 *   ![[note]]                         → <blockquote class="embedded-note">
 *   ![[note#heading]]                 → embed 该 heading 起的 section
 *   ![[note#^block-id]]               → embed 单个 block
 *
 * 笔记 transclusion 我们这里只放占位 placeholder,具体抽取由 sync pipeline 在
 * resolveLink 之前预渲染好作为 alias 传入(避免 obsidian 包知道笔记内容)。
 *
 * 但常见用法 ——只是图/视频/音频/PDF—— 这里直接渲染为最终 HTML。
 */

interface Options {
  resolveLink: LinkResolver;
  collectedLinks: RenderedLink[];
}

export const remarkEmbeds: Plugin<[Options], Root> = (options) => {
  const { resolveLink, collectedLinks } = options;
  const RE = /!\[\[([^\]\n]+)\]\]/g;

  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      const value = node.value;
      if (!value.includes('![[')) return;

      const newChildren: PhrasingContent[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      RE.lastIndex = 0;
      let changed = false;

      while ((m = RE.exec(value))) {
        const [full, body] = m;
        if (m.index > last) {
          newChildren.push({ type: 'text', value: value.slice(last, m.index) });
        }
        const parts: WikilinkParts = { ...splitWikilink(body!), embed: true };
        const resolved = resolveLink(parts);
        const html = embedHtml(resolved, parts);
        newChildren.push({ type: 'html', value: html } as unknown as PhrasingContent);
        collectedLinks.push(toCollected(resolved, parts.target, true));
        last = m.index + full.length;
        changed = true;
      }
      if (!changed) return;
      if (last < value.length) {
        newChildren.push({ type: 'text', value: value.slice(last) });
      }
      const children = parent.children as PhrasingContent[];
      children.splice(index, 1, ...newChildren);
      return [SKIP, index + newChildren.length];
    });
  };
};

function embedHtml(r: ResolvedLink, parts: WikilinkParts): string {
  if (r.kind === 'broken') {
    return `<span class="internal-embed is-unresolved" title="未找到资源: ${esc(parts.target)}">${esc(parts.alias ?? parts.target)}</span>`;
  }
  if (r.kind === 'note') {
    // 完整 transclusion:resolver 在 transcludedHtml 字段塞好了渲染好的片段
    const inner = r.transcludedHtml ?? '';
    const titleAnchor = parts.anchor ? `#${slugifyAnchor(parts.anchor)}` : '';
    if (inner) {
      const titleHref = `/posts/${esc(r.slug)}.html${titleAnchor}`;
      return `<aside class="internal-embed embed-note" data-slug="${esc(r.slug)}">
        <header class="embed-note__head">
          <a class="embed-note__title" href="${titleHref}">${esc(r.title)}${parts.anchor ? ' › ' + esc(parts.anchor) : ''}</a>
        </header>
        <div class="embed-note__body hf-prose">${inner}</div>
      </aside>`;
    }
    // 没有预渲染的 HTML(深度超限 / 找不到 / 循环引用) → 降级 stub
    return `<aside class="internal-embed embed-note is-stub" data-slug="${esc(r.slug)}">
      <a class="embed-note__title" href="/posts/${esc(r.slug)}.html${titleAnchor}">↪ ${esc(r.title)}${parts.anchor ? ' › ' + esc(parts.anchor) : ''}</a>
    </aside>`;
  }

  // asset 分四种
  const mime = r.mime;
  const url = r.url;
  const filename = r.filename;
  const alias = parts.alias;

  if (mime.startsWith('image/')) {
    const { width, alt } = parseImageAlias(alias, filename);
    const w = width ? ` width="${width}"` : '';
    return `<span class="internal-embed embed-image"><img src="${esc(url)}" alt="${esc(alt)}"${w} loading="lazy" decoding="async"></span>`;
  }
  if (mime.startsWith('video/')) {
    return `<span class="internal-embed embed-video">
      <video controls preload="metadata" src="${esc(url)}">
        <a href="${esc(url)}">${esc(filename)}</a>
      </video>
    </span>`;
  }
  if (mime.startsWith('audio/')) {
    return `<span class="internal-embed embed-audio">
      <audio controls preload="metadata" src="${esc(url)}"></audio>
    </span>`;
  }
  if (mime === 'application/pdf') {
    return `<span class="internal-embed embed-pdf">
      <iframe src="${esc(url)}#toolbar=0" loading="lazy" title="${esc(filename)}"></iframe>
      <a class="embed-pdf__fallback" href="${esc(url)}">${esc(filename)}</a>
    </span>`;
  }
  // 其他 → 下载链接
  return `<a class="internal-embed embed-file" href="${esc(url)}" download="${esc(filename)}">${esc(alias ?? filename)}</a>`;
}

function slugifyAnchor(a: string): string {
  if (a.startsWith('^')) return `block-${a.slice(1).replace(/[^A-Za-z0-9_-]/g, '')}`;
  return a.toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}\-_]+/gu, '');
}

function parseImageAlias(alias: string | undefined, filename: string): { width: number | null; alt: string } {
  if (!alias) return { width: null, alt: filename };
  // Obsidian: alias 是整数 → 像素宽;否则当 alt 文本
  if (/^\d{1,4}$/.test(alias.trim())) return { width: Number(alias.trim()), alt: filename };
  // 还可能是 "WIDTHxHEIGHT" — 我们只取 width
  const m = alias.trim().match(/^(\d{1,4})x\d{1,4}$/);
  if (m && m[1]) return { width: Number(m[1]), alt: filename };
  return { width: null, alt: alias };
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
