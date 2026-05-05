import { visit, SKIP } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, PhrasingContent } from 'mdast';

/**
 * Obsidian comments: %%hidden%%
 *
 * 默认行为:对外完全不渲染(对应 Obsidian 阅读视图)。
 * 可选 mode='visible' 渲染成虚化的 <span class="cm-comment">,通常仅用 dev。
 */

interface Options {
  mode?: 'hidden' | 'visible';
}

export const remarkComments: Plugin<[Options?], Root> = (options) => {
  const mode = options?.mode ?? 'hidden';
  // %%inline%%(单行) 和 %%multi\nline%%(多行) 都吃
  const RE = /%%([\s\S]+?)%%/g;

  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      const value = node.value;
      if (!value.includes('%%')) return;

      const newChildren: PhrasingContent[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      let changed = false;
      RE.lastIndex = 0;

      while ((m = RE.exec(value))) {
        if (m.index > last) {
          newChildren.push({ type: 'text', value: value.slice(last, m.index) });
        }
        if (mode === 'visible') {
          newChildren.push({
            type: 'html',
            value: `<span class="cm-comment" aria-hidden="true">${esc(m[1] ?? '')}</span>`,
          } as unknown as PhrasingContent);
        }
        last = m.index + (m[0]?.length ?? 0);
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
