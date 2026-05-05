import { visit, SKIP } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, PhrasingContent } from 'mdast';

/**
 * Obsidian highlight: ==高亮文本==
 * → <mark class="cm-highlight">高亮文本</mark>
 *
 * 严格规则:
 * - 不跨行
 * - 内部不能为空,左右不能贴空白
 * - 转义 \== 不算开始
 */
export const remarkHighlights: Plugin<[], Root> = () => {
  // 至少 1 字,不允许 == 包 ==(避免 ====abc==== 解析歧义)
  const RE = /(?<!\\)==(?!=)([^\s=][^\n=]*?[^\s=]|[^\s=])==(?!=)/g;

  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      const value = node.value;
      if (!value.includes('==')) return;

      const newChildren: PhrasingContent[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      let changed = false;
      RE.lastIndex = 0;

      while ((m = RE.exec(value))) {
        const [full, inner] = m;
        if (m.index > last) {
          newChildren.push({ type: 'text', value: value.slice(last, m.index) });
        }
        newChildren.push({
          type: 'html',
          value: `<mark class="cm-highlight">${esc(inner ?? '')}</mark>`,
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
