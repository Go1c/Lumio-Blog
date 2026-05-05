import { visit, SKIP } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, PhrasingContent, Paragraph, RootContent } from 'mdast';
import type { LinkResolver, RenderedLink, ResolvedLink } from '../../types.js';
import { splitWikilink } from '../helpers.js';

interface Options {
  resolveLink: LinkResolver;
  /** 收集到的所有引用,渲染后暴露给上层 */
  collectedLinks: RenderedLink[];
}

/**
 * 把 mdast 文本里的 [[..]] / ![[..]] 拆成自定义 mdast 节点。
 *
 * 输出节点(都是 mdast `html` 类型,内容是已渲染好的 HTML 片段):
 * - link 内部笔记 → <a class="internal-link" data-slug="..." href="/posts/...">label</a>
 * - link 内部笔记缺失 → <span class="internal-link is-unresolved">label</span>
 * - link 附件下载 → <a class="internal-link is-asset" href="/_attachments/...">filename</a>
 * - embed 图片/视频/音频/PDF/笔记 → 各种富 HTML(由 embed.ts 生成)
 *
 * 这里只处理 link 形态,embed 由 embeds.ts 单独走。
 *
 * 为什么用 html node 而不是 link node:Obsidian wikilink 行为远超过普通 link
 * (alias / anchor / asset 不同 class / unresolved),硬塞 link 节点会丢信息。
 */
export const remarkWikilinks: Plugin<[Options], Root> = (options) => {
  const { resolveLink, collectedLinks } = options;
  // 同时匹配 ![[..]] 和 [[..]]——但 ![[..]] 留给 embeds.ts 处理,这里跳过
  const RE = /(!?)\[\[([^\]\n]+)\]\]/g;

  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      const value = node.value;
      if (!value.includes('[[')) return;

      const newChildren: PhrasingContent[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      RE.lastIndex = 0;
      let changed = false;

      while ((m = RE.exec(value))) {
        const [full, bang, body] = m;
        if (bang === '!') continue; // embed,跳过(由 embeds.ts 处理)
        if (m.index > last) {
          newChildren.push({ type: 'text', value: value.slice(last, m.index) });
        }
        const parts = splitWikilink(body!);
        const resolved = resolveLink({ ...parts, embed: false });
        newChildren.push({
          type: 'html',
          value: linkHtml(resolved, parts.target, parts.alias),
        } as unknown as PhrasingContent);
        collectedLinks.push(toCollected(resolved, parts.target, false));
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

function linkHtml(r: ResolvedLink, raw: string, alias: string | undefined): string {
  const label = alias ?? (r.kind === 'note' ? r.title : raw);
  const safeLabel = esc(label);
  if (r.kind === 'note') {
    const href = r.anchor ? `/posts/${r.slug}.html#${slugifyAnchor(r.anchor)}` : `/posts/${r.slug}.html`;
    return `<a class="internal-link" data-slug="${esc(r.slug)}" href="${esc(href)}">${safeLabel}</a>`;
  }
  if (r.kind === 'asset') {
    return `<a class="internal-link is-asset" href="${esc(r.url)}" download="${esc(r.filename)}">${safeLabel}</a>`;
  }
  // broken
  return `<span class="internal-link is-unresolved" title="未找到笔记: ${esc(raw)}">${safeLabel}</span>`;
}

function slugifyAnchor(a: string): string {
  if (a.startsWith('^')) return `block-${a.slice(1).replace(/[^A-Za-z0-9_-]/g, '')}`;
  return a.toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}\-_]+/gu, '');
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function toCollected(r: ResolvedLink, raw: string, embed: boolean): RenderedLink {
  if (r.kind === 'note') return { raw, kind: 'note', resolved: r.slug, embed };
  if (r.kind === 'asset') return { raw, kind: 'asset', resolved: r.filename, embed };
  return { raw, kind: 'broken', resolved: raw, embed };
}

// 标记 paragraph 不被空白裹挟
export type _Touch = Paragraph | RootContent;
