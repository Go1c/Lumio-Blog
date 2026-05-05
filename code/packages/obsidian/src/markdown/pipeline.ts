import { unified, type Processor } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeStringify from 'rehype-stringify';
import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import { createHighlighter, type Highlighter } from 'shiki';
import { visit } from 'unist-util-visit';
import { toString as mdToString } from 'mdast-util-to-string';

import type { Root as MdastRoot } from 'mdast';
import type { Root as HastRoot, Element } from 'hast';

import type {
  RenderMarkdownOptions,
  RenderResult,
  RenderedLink,
} from '../types.js';
import { remarkWikilinks } from './plugins/wikilinks.js';
import { remarkEmbeds } from './plugins/embeds.js';
import { remarkCallouts } from './plugins/callouts.js';
import { remarkHighlights } from './plugins/highlights.js';
import { remarkComments } from './plugins/comments.js';
import { remarkInlineTags } from './plugins/inline-tags.js';
import { remarkBlockIds } from './plugins/block-ids.js';
import { remarkObsidianTasks } from './plugins/tasks.js';
import { remarkMermaid } from './plugins/mermaid.js';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(themes: { light: string; dark: string }): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [themes.light, themes.dark],
      langs: [
        'typescript', 'javascript', 'tsx', 'jsx', 'json', 'jsonc', 'yaml', 'toml',
        'bash', 'shell', 'sh', 'zsh', 'fish', 'powershell',
        'python', 'rust', 'go', 'java', 'kotlin', 'swift', 'c', 'cpp', 'csharp',
        'ruby', 'php', 'scala', 'haskell', 'lua', 'r', 'sql',
        'html', 'css', 'scss', 'less',
        'hlsl', 'glsl',
        'markdown', 'mdx',
        'diff', 'dockerfile', 'nginx', 'graphql', 'proto',
        'vue', 'svelte', 'astro',
      ],
    });
  }
  return highlighterPromise;
}

/** 把 mdast heading 收集出来,顺便补 id(这里只是抽出来,id 由 rehype-slug 实际写入) */
function collectHeadings(): {
  plugin: () => (tree: HastRoot) => void;
  headings: { level: number; id: string; text: string }[];
} {
  const headings: { level: number; id: string; text: string }[] = [];
  return {
    plugin: () => (tree: HastRoot) => {
      visit(tree, 'element', (node: Element) => {
        const tag = node.tagName;
        if (!/^h[1-6]$/.test(tag)) return;
        const level = Number(tag.slice(1));
        const id = String((node.properties?.id as string | undefined) ?? '');
        const text = textOfHeading(node);
        if (id && text) headings.push({ level, id, text });
      });
    },
    headings,
  };
}

/** heading 文本(过滤 autolink 的 # 锚点 child) */
function textOfHeading(node: Element): string {
  let out = '';
  for (const c of node.children) {
    if (c.type === 'text') {
      out += c.value;
      continue;
    }
    if (c.type === 'element') {
      // 跳过 rehype-autolink-headings 添加的 a.heading-anchor
      const className = (c.properties?.className as string[] | string | undefined);
      const arr = Array.isArray(className) ? className : typeof className === 'string' ? [className] : [];
      if (c.tagName === 'a' && arr.includes('heading-anchor')) continue;
      // 其它(如 <em>、<code>)递归
      out += textOfElement(c);
    }
  }
  return out.trim();
}

function textOfElement(node: Element): string {
  let out = '';
  visit(node, 'text', (n: { value: string }) => {
    out += n.value;
  });
  return out;
}

/**
 * 主入口:markdown body → RenderResult
 *
 * 顺序很重要(每一步都跑在前一步的结果上):
 * 1. parse markdown
 * 2. comments(尽早清掉,免得正则误伤)
 * 3. wikilinks 和 embeds 替换为 html node(避免被 link/image 默认规则吃掉)
 * 4. callouts 改造 blockquote
 * 5. highlights / inline-tags
 * 6. block-ids 包末尾 ^id 块
 * 7. tasks 给 list item 打 data-task
 * 8. mermaid 代码块替换为 div
 * 9. math + gfm + frontmatter(标准插件,顺序无关)
 * 10. mdast → hast(remark-rehype, allowDangerousHtml + raw)
 * 11. rehype-slug 给 heading 加 id
 * 12. rehype-autolink-headings 给 heading 加 hover anchor
 * 13. shiki 双主题代码高亮
 * 14. katex 渲染 math 节点
 * 15. stringify
 */
export async function renderMarkdown(opts: RenderMarkdownOptions): Promise<RenderResult> {
  const themes = opts.shikiThemes ?? { light: 'github-light', dark: 'github-dark' };
  const collectedLinks: RenderedLink[] = [];
  const blockIds: string[] = [];
  const inlineTags: string[] = [];
  const headingCollector = collectHeadings();

  const highlighter = await getHighlighter(themes);

  const processor: Processor<MdastRoot, MdastRoot, HastRoot, HastRoot, string> = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkComments, { mode: 'hidden' })
    .use(remarkEmbeds, { resolveLink: opts.resolveLink, collectedLinks })
    .use(remarkWikilinks, { resolveLink: opts.resolveLink, collectedLinks })
    .use(remarkCallouts, { allowCustom: true })
    .use(remarkHighlights)
    .use(remarkInlineTags, { collected: inlineTags })
    .use(remarkBlockIds, { collected: blockIds })
    .use(remarkObsidianTasks)
    .use(remarkMermaid)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkBreaks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'append',
      properties: { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 },
      content: { type: 'text', value: '#' },
    })
    // KaTeX 必须在 Shiki 之前 — remark-math 给 math node 的 hChildren 是
    // <code class="language-math math-display">,Shiki 看到 language-* 就接管,
    // KaTeX 就再找不到这类元素了。先 KaTeX 后 Shiki,各管各的。
    .use(rehypeKatex, { strict: 'ignore', output: 'html' })
    .use(rehypeShikiFromHighlighter, highlighter, {
      themes: { light: themes.light, dark: themes.dark },
      defaultColor: false,
      addLanguageClass: true,
      fallbackLanguage: 'text',
      onError: (e) => console.warn('[obsidian/shiki]', (e as Error).message),
    })
    .use(headingCollector.plugin)
    .use(rehypeStringify, { allowDangerousHtml: true });

  const file = await processor.process(opts.body);
  let html = String(file);

  // 去掉文档开头/结尾不必要空白
  html = html.trim();

  // 给 plain text:用 mdast 抽(已 strip 大多数 markdown,但带 wikilink 后字符干净)
  const text = stripMd(opts.body);

  return {
    html,
    text,
    links: dedupeLinks(collectedLinks),
    headings: headingCollector.headings,
    blockIds,
    inlineTags,
  };
}

function dedupeLinks(arr: RenderedLink[]): RenderedLink[] {
  const seen = new Set<string>();
  const out: RenderedLink[] = [];
  for (const l of arr) {
    const k = `${l.embed ? '!' : ''}${l.kind}:${l.resolved}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(l);
  }
  return out;
}

/** 基于 markdown body 抽 plain text(用于摘要 / FTS / word count) */
function stripMd(body: string): string {
  // 用 mdast 抽:把全部 markdown 渲染成 mdast(无插件) → mdToString 拿纯文字
  // 但这里也直接走 regex 简化版,效果够用,而且不需要再跑一次完整 pipeline。
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[\[[^\]]+\]\]/g, ' ')
    .replace(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/==([^=]+)==/g, '$1')
    .replace(/%%[\s\S]*?%%/g, ' ')
    .replace(/^>\s*\[![^\]]+\][+-]?\s*/gm, '')
    .replace(/[#>*_~`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 让 mdast-util-to-string 在测试用例 / 调试场景仍可被 import 时找到(side-effect 防 tree-shake)
export { mdToString };
