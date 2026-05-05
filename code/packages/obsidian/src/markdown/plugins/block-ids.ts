import { visit, SKIP } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Paragraph, Text, ListItem } from 'mdast';

/**
 * Obsidian block id: 行尾 ` ^block-id`
 *   - 把 id 从文本里剥掉
 *   - 把所属 block(paragraph / list item) 包成 `<div id="block-foo">…</div>`
 *
 * 这样别处用 `[[note#^foo]]` 跳过来时就有锚点了。
 */

interface Options {
  collected: string[];
}

export const remarkBlockIds: Plugin<[Options], Root> = (opts) => {
  const collected = opts.collected;
  // 行尾 ^id;id 仅 ASCII alnum / _ / -
  const TAIL = /(?:\s+)\^([A-Za-z0-9][A-Za-z0-9_-]*)\s*$/;

  return (tree) => {
    visit(tree, (node, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.type !== 'paragraph' && node.type !== 'listItem') return;

      // 找最后一个 text 子节点
      const block = node as Paragraph | ListItem;
      const last = lastTextNode(block);
      if (!last) return;
      const m = last.value.match(TAIL);
      if (!m || !m[1]) return;

      const id = m[1];
      collected.push(id);
      // 剥去尾巴
      last.value = last.value.slice(0, last.value.length - m[0].length);

      const anchorId = `block-${id}`;
      const open = { type: 'html', value: `<div id="${anchorId}" class="block-anchor">` } as unknown as Root['children'][number];
      const close = { type: 'html', value: '</div>' } as unknown as Root['children'][number];

      // 在 paragraph 这种「叶 block」前后插开/关 tag。
      // listItem 比较特殊——锚点放整个 li 周围更准,但 mdast list/item 嵌套会让插 tag 变复杂,
      // 退一步:listItem 只在末尾 inline 加一个空锚 span(够 [[#^id]] 跳)。
      if (node.type === 'listItem') {
        // 末尾 paragraph 后塞 inline html
        const li = node as ListItem;
        const tail: Root['children'][number] = {
          type: 'html',
          value: `<span id="${anchorId}" class="block-anchor block-anchor--inline" aria-hidden="true"></span>`,
        } as unknown as Root['children'][number];
        // 安全做法:把 inline tag 塞在 li 最后一个 paragraph 的最后
        const lastPara = lastParagraph(li);
        if (lastPara) {
          (lastPara.children as Paragraph['children']).push(tail as unknown as Paragraph['children'][number]);
        }
        return SKIP;
      }

      const arr = parent.children as Root['children'];
      arr.splice(index, 1, open, node as Root['children'][number], close);
      return [SKIP, index + 3];
    });
  };
};

function lastTextNode(block: Paragraph | ListItem): Text | null {
  // 走最后一个 child,递归找 text
  const stack: unknown[] = [...block.children].reverse();
  while (stack.length) {
    const n = stack.pop() as { type: string; children?: unknown[]; value?: string };
    if (!n) continue;
    if (n.type === 'text') return n as unknown as Text;
    if (Array.isArray(n.children) && n.children.length > 0) {
      stack.push(...[...n.children].reverse());
    }
  }
  return null;
}

function lastParagraph(li: ListItem): Paragraph | null {
  for (let i = li.children.length - 1; i >= 0; i--) {
    const c = li.children[i] as { type: string };
    if (c?.type === 'paragraph') return li.children[i] as Paragraph;
  }
  return null;
}
