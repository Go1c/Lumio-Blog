import { visit, SKIP } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, PhrasingContent } from 'mdast';

/**
 * Obsidian inline tag: #tag-name / #nested/tag
 * 在 prose 里出现时:
 *   - 不在 url / heading / 行内代码里
 *   - 前面要么是行首,要么是空白
 *   - 至少 1 字母,允许 / - _ 数字
 * → <a class="cm-tag" href="/tags/<tag>.html">#tag</a>
 *
 * 注意:`# heading` 不算 tag(后面有空格),被 markdown heading 接管。
 */

interface Options {
  collected: string[];
  /** tag 名 → URL,默认 `/tags/<tag>.html` */
  hrefFor?: (tag: string) => string;
}

export const remarkInlineTags: Plugin<[Options], Root> = (opts) => {
  const RE = /(^|[\s(])#([\p{L}\p{N}][\p{L}\p{N}_/\-]*)/gu;
  const hrefFor = opts.hrefFor ?? ((t: string) => `/tags/${encodeURIComponent(t)}.html`);

  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      // 跳过 heading / link / code 内的 text
      const ptype = (parent as { type?: string }).type;
      if (ptype === 'heading' || ptype === 'link' || ptype === 'inlineCode') return;
      const value = node.value;
      if (!value.includes('#')) return;

      const newChildren: PhrasingContent[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      RE.lastIndex = 0;
      let changed = false;

      while ((m = RE.exec(value))) {
        const [full, prefix, tag] = m;
        if (!tag) continue;
        // 不要把 #数字 当 tag(避免 #1234 类标号)
        if (/^\d+$/.test(tag)) continue;
        const start = m.index + (prefix?.length ?? 0);
        if (start > last) {
          newChildren.push({ type: 'text', value: value.slice(last, start) });
        }
        opts.collected.push(tag);
        newChildren.push({
          type: 'html',
          value: `<a class="cm-tag" href="${hrefFor(tag)}">#${esc(tag)}</a>`,
        } as unknown as PhrasingContent);
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

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
