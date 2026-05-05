import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Code } from 'mdast';

/**
 * ```mermaid` 代码块 → 占位 div(客户端用 mermaid.js 异步渲染)。
 * 必须放在 shiki 之前(否则 shiki 会把 mermaid 当代码高亮)。
 */
export const remarkMermaid: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (!parent || index === undefined) return;
      const lang = (node.lang ?? '').toLowerCase();
      if (lang !== 'mermaid') return;
      const html = `<div class="mermaid" data-source="${esc(node.value)}">${esc(node.value)}</div>`;
      const replacement = { type: 'html', value: html } as unknown as Root['children'][number];
      (parent.children as Root['children']).splice(index, 1, replacement);
    });
  };
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
