/**
 * 端到端验证:把一个最小 vault 当真实输入,跑全套 pipeline,然后断言关键 HTML 片段
 * 出现在最终 body_html 里。
 *
 * 这是一个回归保险——如果 obsidian.css 类名改了 / 插件输出变了 / asset URL 拼装变了,
 * 这里会第一时间挂掉。
 */

import { describe, it, expect } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  AssetPipeline,
  buildVaultIndex,
  makeVaultLinkResolver,
  parseCanvas,
  prepublishCanvasAssets,
  prepublishMarkdownAssets,
  prerenderTransclusions,
  renderCanvas,
  renderHtmlNote,
  renderMarkdown,
  walkVault,
} from './index.js';

describe('e2e: realistic Obsidian vault', () => {
  it('renders a multi-note vault with cross-links, embeds, callouts, transclusions, canvas, and html report', async () => {
    const tmp = join(tmpdir(), `obsidian-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const vault = join(tmp, 'vault');
    const out = join(tmp, 'out');
    await mkdir(vault, { recursive: true });
    await mkdir(out, { recursive: true });

    try {
      // ────────── vault 内容 ──────────
      await write(vault, '附件/screenshot.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]));
      await write(vault, '附件/demo.mp4', Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70]));

      await write(vault, 'Glossary.md', `# Glossary

## TBDR

Tile-Based Deferred Rendering. Mobile GPUs use this.

## IMR

Immediate Mode Rendering. PC GPUs.
`);

      await write(vault, 'GPU Notes.md', `# GPU Driven 渲染

> [!info] 适用范围
> 移动端 + PC,不止于游戏。

主要瓶颈:**DrawCall**。看 ==Hi-Z 遮挡剔除== 这一节。

参考词条 [[Glossary#TBDR]] 和 [[Glossary]]。

## 截图证据

![[附件/screenshot.png|400]]

## 演示视频

![[附件/demo.mp4]]

## 不存在的引用

[[NonExistent]] 和 ![[NonExistentAttachment.png]]

## 完整词条嵌入

![[Glossary]]

## 任务

- [ ] 写完 Hi-Z 章节
- [/] 加 mermaid 流程图
- [x] 跑通 demo

## 代码示例

\`\`\`hlsl
struct InstanceData {
  float4x4 localToWorld;
  float4 boundingSphere;
};
\`\`\`

## 数学

$$
\\sum_{i=0}^{N} draw_i \\to \\text{IndirectArgs}
$$

#gpu #rendering/realtime #performance
`);

      await write(vault, 'Architecture.canvas', JSON.stringify({
        nodes: [
          { id: 'g1', type: 'group', label: 'CPU', x: -10, y: -10, width: 320, height: 200, color: '1' },
          { id: 'cpu', type: 'text', text: '## CPU\n\n- 上传 buffer\n- 触发 dispatch', x: 10, y: 10, width: 280, height: 160, color: '1' },
          { id: 'gpu', type: 'text', text: '## GPU\n\n- 剔除 (compute)\n- 写 IndirectArgs', x: 380, y: 10, width: 280, height: 160, color: '4' },
          { id: 'spec', type: 'file', file: 'GPU Notes.md', x: 760, y: 10, width: 240, height: 120 },
        ],
        edges: [
          { id: 'e1', fromNode: 'cpu', toNode: 'gpu', label: 'dispatch', toEnd: 'arrow' },
          { id: 'e2', fromNode: 'gpu', toNode: 'spec', toEnd: 'arrow' },
        ],
      }));

      await write(vault, 'report.html', `<!doctype html>
<html><body>
  <h1>Performance Report</h1>
  <p>See attached <img src="附件/screenshot.png" alt="proof"></p>
  <p>Source: <a href="GPU Notes.md">GPU Notes</a></p>
</body></html>`);

      // ────────── 走 walkVault + 渲染 ──────────
      const { notes, assets } = await walkVault(vault);
      expect(notes.length).toBe(4); // Glossary, GPU Notes, Architecture.canvas, report.html
      expect(assets.length).toBe(2); // screenshot.png, demo.mp4

      const indexed = notes.map((n) => ({
        ...n,
        slug: n.stem.toLowerCase().replace(/\s+/g, '-'),
      }));
      const index = buildVaultIndex(indexed, assets);
      const pipeline = new AssetPipeline({ outRoot: out, subdir: '_attachments', urlPrefix: '/_attachments' });
      const publishedByPath = new Map<string, { url: string; bytes: number; filename: string; mime: string }>();

      // ---- markdown:GPU Notes.md ----
      const gpuBody = await readFile(join(vault, 'GPU Notes.md'), 'utf-8');
      // 略过 frontmatter:此 fixture 没 frontmatter,直接拿原文
      await prepublishMarkdownAssets({ body: gpuBody, index, pipeline, publishedByPath });

      const transclusionMap = await prerenderTransclusions({
        body: gpuBody,
        ctx: {
          index, pipeline, publishedByPath,
          readNoteBody: async (sp) => {
            try {
              const c = await readFile(join(vault, sp), 'utf-8');
              return c;
            } catch { return null; }
          },
          maxDepth: 1,
        },
      });
      expect(transclusionMap.has('Glossary')).toBe(true);

      const resolveLink = makeVaultLinkResolver({ index, pipeline, publishedByPath, transclusionMap });
      const md = await renderMarkdown({ body: gpuBody, resolveLink });

      // 关键 HTML 片段断言:
      expect(md.html).toContain('<h1');
      expect(md.html).toContain('callout--info');
      expect(md.html).toContain('适用范围');
      expect(md.html).toMatch(/<strong>DrawCall<\/strong>/);
      expect(md.html).toContain('cm-highlight'); // ==Hi-Z 遮挡剔除==
      expect(md.html).toContain('href="/posts/glossary.html#tbdr"'); // wikilink with anchor
      expect(md.html).toContain('href="/posts/glossary.html"'); // 普通 wikilink
      expect(md.html).toMatch(/<img[^>]+src="\/_attachments\/screenshot\.[a-f0-9]+\.png"[^>]+width="400"/);
      expect(md.html).toMatch(/<video[^>]+src="\/_attachments\/demo\.[a-f0-9]+\.mp4"/);
      expect(md.html).toContain('is-unresolved'); // [[NonExistent]]
      expect(md.html).toContain('class="internal-embed embed-note"'); // ![[Glossary]] 展开
      expect(md.html).toContain('Tile-Based Deferred Rendering'); // 嵌入内容
      expect(md.html).toContain('task-unchecked');
      expect(md.html).toContain('task-slash');
      expect(md.html).toContain('task-x');
      expect(md.html).toMatch(/<pre[^>]*class="[^"]*shiki[^"]*"/);
      expect(md.html).toContain('katex'); // 数学公式
      expect(md.html).toContain('cm-tag'); // #gpu, #rendering/realtime, #performance
      expect(md.html).toContain('href="/tags/gpu.html"');
      expect(md.html).toContain('href="/tags/rendering%2Frealtime.html"');

      // headings
      expect(md.headings.find((h) => h.text === '截图证据')).toBeDefined();
      expect(md.headings.find((h) => h.text === '完整词条嵌入')).toBeDefined();

      // links 收集到了所有引用
      const dstSlugs = md.links.filter((l) => l.kind === 'note').map((l) => l.resolved);
      expect(dstSlugs).toContain('glossary');

      // ---- canvas:Architecture.canvas ----
      const canvasJson = await readFile(join(vault, 'Architecture.canvas'), 'utf-8');
      const doc = parseCanvas(canvasJson);
      expect(doc.nodes.length).toBe(4);
      await prepublishCanvasAssets({ json: canvasJson, index, pipeline, publishedByPath });
      const canvasHtml = await renderCanvas({
        json: canvasJson,
        resolveLink,
        renderInlineMarkdown: async (mdx) => (await renderMarkdown({ body: mdx, resolveLink })).html,
      });
      expect(canvasHtml).toContain('class="ob-canvas"');
      expect(canvasHtml).toContain('CPU');
      expect(canvasHtml).toContain('GPU');
      expect(canvasHtml).toContain('href="/posts/gpu-notes.html"');
      expect(canvasHtml).toMatch(/<path d="M[^"]+" stroke="[^"]+"/);
      expect(canvasHtml).toContain('marker-end');
      expect(canvasHtml).toContain('dispatch'); // edge label

      // ---- html:report.html ----
      const reportRaw = await readFile(join(vault, 'report.html'), 'utf-8');
      const r1 = renderHtmlNote({
        html: reportRaw,
        source_path: 'report.html',
        index,
        toAssetUrl: (a) => `/_attachments/${encodeURIComponent(a.basename)}`,
      });
      for (const a of r1.referenced) await pipeline.publish(a);
      for (const a of r1.referenced) {
        const pub = pipeline.lookup(a);
        if (pub) publishedByPath.set(a.source_path, { url: pub.url, bytes: pub.bytes, filename: pub.filename, mime: pub.mime });
      }
      const r2 = renderHtmlNote({
        html: reportRaw,
        source_path: 'report.html',
        index,
        toAssetUrl: (a) => publishedByPath.get(a.source_path)?.url ?? `/_attachments/${a.basename}`,
      });
      expect(r2.html).toContain('<iframe');
      expect(r2.html).toContain('sandbox');
      expect(r2.rewritten).toMatch(/src=["']\/_attachments\/screenshot\.[a-f0-9]+\.png["']/);
      expect(r2.rewritten).toContain('href="/posts/gpu-notes.html"');

      // ────────── 写到 out 让人肉眼看(测试不强制断言文件) ──────────
      // 顺便保留 out 让 dev 可以打开看;CI 上 afterEach 会清掉。
      await writeFile(join(out, 'gpu-notes.html'), wrapDoc('GPU Notes', md.html), 'utf-8');
      await writeFile(join(out, 'architecture.html'), wrapDoc('Architecture', canvasHtml), 'utf-8');
      await writeFile(join(out, 'report.html'), wrapDoc('Report', r2.html), 'utf-8');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }, 30_000);
});

async function write(root: string, rel: string, content: string | Buffer): Promise<void> {
  const abs = join(root, rel);
  await mkdir(join(abs, '..'), { recursive: true });
  await writeFile(abs, content);
}

function wrapDoc(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body class="hf-prose">${body}</body></html>`;
}
