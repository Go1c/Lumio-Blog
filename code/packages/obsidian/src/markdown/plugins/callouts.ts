import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Blockquote, Paragraph, Text } from 'mdast';

/**
 * Obsidian 13 种 callout + 任意自定义类型。语法:
 *
 *   > [!note]                 — 默认展开
 *   > [!warning] Custom title  — 自定义 title
 *   > [!tip]+                 — 默认展开,可折叠
 *   > [!info]-                — 默认折叠
 *   > [!quote]
 *   >
 *   > 多段 body 也支持
 *
 * 我们把 mdast Blockquote 改造成:
 *   `<aside data-callout="<type>">` + `<header>` + `<div class="callout__body">` 包原 body
 *
 * 视觉上由 obsidian.css 接管:13 种 colors + icons(用 inline SVG 注入)。
 */

const CALLOUT_TYPES = new Set([
  'note', 'abstract', 'summary', 'tldr',
  'info', 'todo',
  'tip', 'hint', 'important',
  'success', 'check', 'done',
  'question', 'help', 'faq',
  'warning', 'caution', 'attention',
  'failure', 'fail', 'missing',
  'danger', 'error',
  'bug',
  'example',
  'quote', 'cite',
]);

/** 各 type 的图标(lucide 风格,单色 stroke) */
const ICONS: Record<string, string> = {
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533Z"/><path d="M12.75 4.533V20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533Z"/></svg>',
  abstract: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  todo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  tip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M2 12a10 10 0 0 1 5-8.7 10 10 0 0 1 10 0 10 10 0 0 1 5 8.7c0 2.6-1 5-2.7 6.7-.6.6-.9 1.4-.9 2.3H9.6c0-.9-.3-1.7-.9-2.3A9.97 9.97 0 0 1 6 12"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/></svg>',
  question: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  failure: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
  danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13a8 8 0 0 1 7 7"/><path d="M4 5a16 16 0 0 1 15 15"/><circle cx="5" cy="19" r="1"/><path d="m22 22-3.5-3.5"/></svg>',
  bug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>',
  example: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/><path d="M9 11V7a3 3 0 0 1 6 0v4"/><circle cx="12" cy="16" r="1"/></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg>',
};

/** alias 归一化 → 主类型(用于 CSS class) */
const ALIAS: Record<string, string> = {
  abstract: 'abstract', summary: 'abstract', tldr: 'abstract',
  info: 'info', todo: 'todo',
  tip: 'tip', hint: 'tip', important: 'tip',
  success: 'success', check: 'success', done: 'success',
  question: 'question', help: 'question', faq: 'question',
  warning: 'warning', caution: 'warning', attention: 'warning',
  failure: 'failure', fail: 'failure', missing: 'failure',
  danger: 'danger', error: 'danger',
  bug: 'bug', example: 'example',
  quote: 'quote', cite: 'quote',
  note: 'note',
};

interface Options {
  /** 不在表里的 type 是否当 generic callout 渲染(默认 true) */
  allowCustom?: boolean;
}

export const remarkCallouts: Plugin<[Options?], Root> = (options) => {
  const allowCustom = options?.allowCustom ?? true;
  return (tree) => {
    visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
      if (!parent || index === undefined) return;
      const first = node.children[0];
      if (!first || first.type !== 'paragraph') return;
      const para = first as Paragraph;
      const head = para.children[0];
      if (!head || head.type !== 'text') return;
      const text = head as Text;
      // 形如 "[!note]" / "[!note]-" / "[!note]+ Some title\nbody..."
      // 注意 (.*) 对换行不贪心(无 s 标志):.* 只到第一个 \n,正好把 title 切出来
      const m = text.value.match(/^\[!([^\]]+)\]([+-]?)[ \t]*([^\n]*)(?:\n([\s\S]*))?$/);
      if (!m) return;
      const rawType = (m[1] ?? '').trim().toLowerCase();
      const fold = m[2]; // '', '+', '-'
      const titleInline = (m[3] ?? '').trim();
      const bodyTextAfterTitle = m[4] ?? '';

      const known = CALLOUT_TYPES.has(rawType);
      if (!known && !allowCustom) return;
      const cssType = ALIAS[rawType] ?? (known ? rawType : 'note');

      // 第一段:把 title 行剃掉,余下文字 + 同段后续 inline child 进 body 第一段
      const rest = para.children.slice(1);
      const bodyParas: Blockquote['children'] = [];
      const firstParaChildren: Paragraph['children'] = [];
      if (bodyTextAfterTitle.trim()) {
        firstParaChildren.push({ type: 'text', value: bodyTextAfterTitle });
      }
      // 跳掉首个 break(softbreak),后面 inline 节点接着塞进同一段
      const cleaned = trimLeadingBreaks(rest) as Paragraph['children'];
      firstParaChildren.push(...cleaned);
      if (firstParaChildren.length > 0) {
        bodyParas.push({ type: 'paragraph', children: firstParaChildren });
      }
      // blockquote 后续段落原样保留
      bodyParas.push(...node.children.slice(1));

      const titleText = titleInline || prettyType(rawType);
      const icon = ICONS[cssType] ?? ICONS.note ?? '';
      const foldable = fold === '+' || fold === '-';
      const collapsed = fold === '-';

      const headerHtml = `<div class="callout__title">
        <span class="callout__icon" aria-hidden="true">${icon}</span>
        <span class="callout__title-text">${esc(titleText)}</span>
        ${foldable ? '<span class="callout__chevron" aria-hidden="true">▾</span>' : ''}
      </div>`;

      // 生成 mdast html node 包住 header + body container 开标签;最后一个 html node 关 body+aside
      const openTag: Root['children'][number] = {
        type: 'html',
        value: `<aside class="callout callout--${esc(cssType)}${foldable ? ' is-foldable' : ''}${collapsed ? ' is-collapsed' : ''}" data-callout="${esc(rawType)}">
          ${headerHtml}
          <div class="callout__body">`,
      } as unknown as Root['children'][number];

      const closeTag: Root['children'][number] = {
        type: 'html',
        value: `</div></aside>`,
      } as unknown as Root['children'][number];

      const replacement = [openTag, ...bodyParas as unknown as Root['children'], closeTag];
      (parent.children as Root['children']).splice(index, 1, ...replacement);
    });
  };
};

function trimLeadingBreaks<T extends { type: string }>(arr: T[]): T[] {
  const out = [...arr];
  while (out.length > 0 && (out[0]?.type === 'break')) out.shift();
  return out;
}

function prettyType(t: string): string {
  if (!t) return 'Note';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
