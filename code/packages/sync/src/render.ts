import { Marked } from 'marked';
import katex from 'katex';
import { createHighlighter, type Highlighter } from 'shiki';
import { extractWikilinks, stripMarkdown } from '@opennote/core';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [
        'typescript', 'javascript', 'tsx', 'jsx', 'json', 'yaml', 'toml',
        'bash', 'shell', 'python', 'rust', 'go', 'sql', 'html', 'css',
        'markdown', 'diff',
      ],
    });
  }
  return highlighterPromise;
}

/**
 * 渲染 markdown → html。
 * - GFM
 * - [[wikilink]] → /posts/<slug>
 * - ```mermaid → <div class="mermaid">…</div>（客户端渲染）
 * - ```<lang> → Shiki 双主题（github-light + github-dark）
 * - $inline$ / $$block$$ → KaTeX 服务端渲染
 */
export async function renderMarkdown(
  body: string,
  resolveLink: (target: string) => string | null,
): Promise<{ html: string; text: string; links: { raw: string; resolved: string | null }[] }> {
  const links: { raw: string; resolved: string | null }[] = [];

  // 1. wikilink → markdown link / 断链 span
  let pre = body.replace(
    /\[\[([^\]|#]+)(?:#([^\]|]*))?(?:\|([^\]]*))?\]\]/g,
    (_m, target: string, _anchor: string | undefined, alias: string | undefined) => {
      const t = target.trim();
      const resolved = resolveLink(t);
      links.push({ raw: t, resolved });
      const label = alias?.trim() ?? t;
      if (resolved) return `[${label}](/posts/${resolved})`;
      return `<span class="opennote-broken-link" title="未找到笔记: ${escapeHtml(t)}">${escapeHtml(label)}</span>`;
    },
  );

  // 2. KaTeX：先抽 $$block$$ 和 $inline$ 出来占位，避免被 markdown 撕碎
  const mathSlots: string[] = [];
  pre = pre.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) => {
    const html = renderMath(tex.trim(), true);
    mathSlots.push(html);
    return `\u0000MATH${mathSlots.length - 1}\u0000`;
  });
  pre = pre.replace(/(?<!\\)\$([^\n$]+?)(?<!\\)\$/g, (_m, tex: string) => {
    const html = renderMath(tex, false);
    mathSlots.push(html);
    return `\u0000MATH${mathSlots.length - 1}\u0000`;
  });

  // 3. 准备 marked + shiki + mermaid hook
  const highlighter = await getHighlighter();
  const marked = new Marked({
    gfm: true,
    breaks: false,
  });

  marked.use({
    renderer: {
      code(token): string {
        const t = token as { text: string; lang?: string };
        const lang = (t.lang ?? '').trim().toLowerCase();
        if (lang === 'mermaid') {
          return `<div class="mermaid" data-source="${escapeHtml(t.text)}">${escapeHtml(t.text)}</div>`;
        }
        const supported = highlighter.getLoadedLanguages().includes(lang);
        if (lang && supported) {
          return highlighter.codeToHtml(t.text, {
            lang,
            themes: { light: 'github-light', dark: 'github-dark' },
            defaultColor: false,
          });
        }
        return `<pre><code>${escapeHtml(t.text)}</code></pre>`;
      },
    },
  });

  let html = await marked.parse(pre);

  // 4. 还原 KaTeX 占位
  html = html.replace(/\u0000MATH(\d+)\u0000/g, (_m, i: string) => mathSlots[Number(i)] ?? '');

  // 5. 收集 plain text（用于摘要、字数、FTS）
  const text = stripMarkdown(body);

  // 备份：保证 wikilink 全收齐
  for (const t of extractWikilinks(body)) {
    if (!links.some((l) => l.raw === t)) {
      links.push({ raw: t, resolved: resolveLink(t) });
    }
  }

  return { html, text, links };
}

function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    return `<span class="opennote-math-error">${escapeHtml(tex)}</span>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
