import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, ListItem, Paragraph, Text } from 'mdast';

/**
 * Obsidian 扩展任务状态(超出 GFM 的 [x] / [ ]):
 *
 *   - [ ]   todo
 *   - [x]   done
 *   - [/]   incomplete (in progress)
 *   - [-]   cancelled
 *   - [>]   forwarded
 *   - [<]   scheduled
 *   - [?]   question
 *   - [!]   important
 *   - [*]   star
 *   - [b]   bookmark
 *   - [I]   information
 *   - [S]   savings
 *   - [p]   pros
 *   - [c]   cons
 *
 * remark-gfm 只认 [ ] 和 [x]。这里:
 *   1. 给 listItem 设了 checked + 加 data-task=<char> + 强行覆盖 default checkbox。
 *   2. 没被 gfm 识别的(单字符不在 [ x] 之外的) 也手动剥前缀 + 包装。
 */

const KNOWN = new Set([' ', 'x', 'X', '/', '-', '>', '<', '?', '!', '*', 'b', 'I', 'S', 'p', 'c']);

export const remarkObsidianTasks: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'listItem', (node: ListItem) => {
      // 已经 checked 标识(GFM 处理过的) → 仅打标
      if (typeof node.checked === 'boolean') {
        const ch = node.checked ? 'x' : ' ';
        annotate(node, ch);
        return;
      }
      // 否则看首段第一个 text 是不是 "[X] xxx"
      const first = node.children[0];
      if (!first || first.type !== 'paragraph') return;
      const para = first as Paragraph;
      const head = para.children[0];
      if (!head || head.type !== 'text') return;
      const text = head as Text;
      const m = text.value.match(/^\[([^\]])\]\s?(.*)$/s);
      if (!m) return;
      const ch = m[1] ?? ' ';
      if (!KNOWN.has(ch)) return;
      // 剥前缀
      text.value = m[2] ?? '';
      annotate(node, ch);
    });
  };
};

function annotate(node: ListItem, ch: string): void {
  const chCss = ch === ' ' ? 'unchecked' : safeCh(ch);
  // 标记 checked/unchecked,GFM 会按 checkbox 渲染;同时塞 data-task / data-state
  node.checked = ch === 'x' || ch === 'X' ? true : ch === ' ' ? false : false;
  type DataAware = { data?: { hProperties?: Record<string, unknown> } };
  const n = node as unknown as DataAware;
  n.data ??= {};
  n.data.hProperties ??= {};
  const props = n.data.hProperties as Record<string, unknown>;
  const existingClass = (props.className as string[] | string | undefined);
  const arr = Array.isArray(existingClass)
    ? existingClass
    : typeof existingClass === 'string'
    ? existingClass.split(/\s+/)
    : [];
  arr.push('task-list-item', `task-${chCss}`);
  props.className = arr;
  props['data-task'] = ch;
  props['data-state'] = chCss;
}

function safeCh(ch: string): string {
  // CSS class 友好
  return ch
    .replace('/', 'slash')
    .replace('-', 'cancelled')
    .replace('>', 'forwarded')
    .replace('<', 'scheduled')
    .replace('?', 'question')
    .replace('!', 'important')
    .replace('*', 'star')
    .replace(/[a-zA-Z]/, (c) => c.toLowerCase());
}
