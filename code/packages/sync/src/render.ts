import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { extractWikilinks } from '@opennote/core';
import {
  AssetPipeline,
  buildVaultIndex,
  htmlToPlainText,
  makeVaultLinkResolver,
  prepublishCanvasAssets,
  prepublishMarkdownAssets,
  prerenderTransclusions,
  renderCanvas as obRenderCanvas,
  renderHtmlNote,
  renderMarkdown as obRenderMarkdown,
  type RenderedLink,
  type VaultAsset,
  type VaultIndex,
  type VaultNoteRef,
} from '@opennote/obsidian';

/**
 * sync 包对外暴露的渲染入口:
 * 把(原文 body, kind)+ vault 索引 → 渲染好的 HTML / 纯文本 / 链接边。
 *
 * 老 API renderMarkdown(body, resolveSlug) 留作兼容(只 wrap markdown)。
 */

export interface RenderContext {
  index: VaultIndex;
  pipeline: AssetPipeline;
  publishedByPath: Map<string, { url: string; bytes: number; filename: string; mime: string }>;
  /** vault 根目录,用于读 transclusion 的笔记原文 */
  vaultRoot: string;
  /** 通过 noteRef 反查最终 slug,用于 LinkResolver 兜底 */
  fallbackSlug?: (n: VaultNoteRef) => string;
}

export interface RenderInput {
  kind: 'markdown' | 'canvas' | 'html';
  body: string;
  source_path: string;
}

export interface RenderOutput {
  html: string;
  text: string;
  links: { raw: string; resolved: string | null }[];
  /** 内嵌资源(用于 media_refs 写库) */
  asset_refs: string[];
}

/** 创建一次完整的 RenderContext;walkVault 是 IO 重活,sync pipeline 一轮共享一份。 */
export function createRenderContext(opts: {
  index: VaultIndex;
  outRoot: string;
  vaultRoot: string;
  fallbackSlug?: (n: VaultNoteRef) => string;
}): RenderContext {
  const pipeline = new AssetPipeline({
    outRoot: opts.outRoot,
    subdir: '_attachments',
    urlPrefix: '/_attachments',
  });
  const ctx: RenderContext = {
    index: opts.index,
    pipeline,
    publishedByPath: new Map(),
    vaultRoot: opts.vaultRoot,
  };
  if (opts.fallbackSlug) ctx.fallbackSlug = opts.fallbackSlug;
  return ctx;
}

/** 给 prerenderTransclusions 用——按 source_path 读笔记 body(去 frontmatter) */
async function readNoteBody(vaultRoot: string, sourcePath: string): Promise<string | null> {
  try {
    const raw = await readFile(join(vaultRoot, sourcePath), 'utf-8');
    if (sourcePath.toLowerCase().endsWith('.md') || sourcePath.toLowerCase().endsWith('.markdown')) {
      const parsed = matter(raw);
      return parsed.content;
    }
    return raw;
  } catch {
    return null;
  }
}

export async function renderNote(
  input: RenderInput,
  ctx: RenderContext,
): Promise<RenderOutput> {
  const fb = ctx.fallbackSlug;

  if (input.kind === 'markdown') {
    await prepublishMarkdownAssets({
      body: input.body,
      index: ctx.index,
      pipeline: ctx.pipeline,
      publishedByPath: ctx.publishedByPath,
    });

    // transclusion 预渲染:把 ![[Note]] / ![[Note#heading]] 里被引用的笔记内容渲染成 HTML
    const transclusionArgs: Parameters<typeof prerenderTransclusions>[0] = {
      body: input.body,
      ctx: {
        index: ctx.index,
        pipeline: ctx.pipeline,
        publishedByPath: ctx.publishedByPath,
        readNoteBody: (sp) => readNoteBody(ctx.vaultRoot, sp),
        maxDepth: 1,
      },
    };
    if (fb) transclusionArgs.fallbackSlug = fb;
    const transclusionMap = await prerenderTransclusions(transclusionArgs);

    const resolverArgs: Parameters<typeof makeVaultLinkResolver>[0] = {
      index: ctx.index,
      pipeline: ctx.pipeline,
      publishedByPath: ctx.publishedByPath,
      transclusionMap,
    };
    if (fb) resolverArgs.fallbackSlug = fb;
    const resolveLink = makeVaultLinkResolver(resolverArgs);

    const r = await obRenderMarkdown({ body: input.body, resolveLink });
    return {
      html: r.html,
      text: r.text,
      links: toEdges(r.links),
      asset_refs: r.links.filter((l) => l.kind === 'asset').map((l) => l.resolved),
    };
  }

  // 其他 kind 用普通 resolver(无 transclusion)
  const resolverArgs: Parameters<typeof makeVaultLinkResolver>[0] = {
    index: ctx.index,
    pipeline: ctx.pipeline,
    publishedByPath: ctx.publishedByPath,
  };
  if (fb) resolverArgs.fallbackSlug = fb;
  const resolveLink = makeVaultLinkResolver(resolverArgs);

  if (input.kind === 'canvas') {
    await prepublishCanvasAssets({
      json: input.body,
      index: ctx.index,
      pipeline: ctx.pipeline,
      publishedByPath: ctx.publishedByPath,
    });
    // canvas 文本节点里可能有内嵌 markdown(短小),用同 resolver 渲染
    const innerLinks: RenderedLink[] = [];
    const innerResolver = (parts: Parameters<typeof resolveLink>[0]) => {
      const r = resolveLink(parts);
      // 不收集 inner links 到主 links,避免 canvas embed 内的 wikilink 同时算 backlink
      // —— 但仍然透传给 prepublish(已经预发布过)
      return r;
    };
    const html = await obRenderCanvas({
      json: input.body,
      resolveLink: innerResolver,
      renderInlineMarkdown: async (md: string) => {
        if (!md.trim()) return '';
        const r = await obRenderMarkdown({ body: md, resolveLink: innerResolver });
        innerLinks.push(...r.links);
        return r.html;
      },
    });
    // canvas 也应抽 plain text → 走 nodes[*].text + label 拼起来
    const text = canvasPlainText(input.body);
    return {
      html,
      text,
      links: toEdges(innerLinks),
      asset_refs: innerLinks.filter((l) => l.kind === 'asset').map((l) => l.resolved),
    };
  }

  // html
  const toAssetUrl = (a: VaultAsset): string => {
    const cached = ctx.publishedByPath.get(a.source_path);
    return cached?.url ?? `/_attachments/${encodeURIComponent(a.basename)}`;
  };
  const r = renderHtmlNote({
    html: input.body,
    source_path: input.source_path,
    index: ctx.index,
    toAssetUrl,
  });
  // 把已 referenced 的资源补 publish 一遍(rewriter 已经引用了 toAssetUrl,但还没 publish)
  for (const a of r.referenced) {
    if (!ctx.publishedByPath.has(a.source_path)) {
      const pub = await ctx.pipeline.publish(a);
      ctx.publishedByPath.set(a.source_path, {
        url: pub.url,
        bytes: pub.bytes,
        filename: pub.filename,
        mime: pub.mime,
      });
    }
  }
  // 重做一次 rewrite(此时 toAssetUrl 已能拿到稳定 URL)
  const r2 = renderHtmlNote({
    html: input.body,
    source_path: input.source_path,
    index: ctx.index,
    toAssetUrl,
  });
  return {
    html: r2.html,
    text: htmlToPlainText(r2.rewritten),
    links: [],
    asset_refs: r2.referenced.map((a) => a.basename),
  };
}

function toEdges(links: RenderedLink[]): { raw: string; resolved: string | null }[] {
  const out: { raw: string; resolved: string | null }[] = [];
  const seen = new Set<string>();
  for (const l of links) {
    const k = `${l.embed ? '!' : ''}${l.kind}:${l.resolved}:${l.raw}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      raw: l.raw,
      // 仅 note 类才参与 backlink/出链图
      resolved: l.kind === 'note' ? l.resolved : null,
    });
  }
  return out;
}

function canvasPlainText(json: string): string {
  try {
    const doc = JSON.parse(json) as { nodes?: Array<{ type?: string; text?: string; label?: string }> };
    const out: string[] = [];
    for (const n of doc.nodes ?? []) {
      if (typeof n.text === 'string') out.push(n.text);
      if (typeof n.label === 'string') out.push(n.label);
    }
    return out.join('\n');
  } catch {
    return '';
  }
}

/* ---------------------------------------------------------------------- */
/* Compat shim — 老 API renderMarkdown(body, resolveSlug)                  */
/* ---------------------------------------------------------------------- */

/**
 * 兼容旧接口:旧 pipeline 调 renderMarkdown(body, resolveSlug)。
 * 新代码请改走 renderNote(input, ctx)。
 *
 * 这里做最小变换:用 resolveSlug 模拟一个内联 vault index,只有笔记没有附件。
 */
export async function renderMarkdown(
  body: string,
  resolveSlug: (target: string) => string | null,
): Promise<{ html: string; text: string; links: { raw: string; resolved: string | null }[] }> {
  // 构建一个 minimal index:把 resolveSlug 命中的 stems 都加进去,resolver 实际查 stem
  const stems: VaultNoteRef[] = [];
  for (const target of extractWikilinks(body)) {
    const slug = resolveSlug(target);
    if (slug) {
      stems.push({
        source_path: target,
        basename: target,
        stem: target,
        slug,
        kind: 'markdown',
      });
    }
  }
  const index = buildVaultIndex(stems, []);

  const resolveLink = makeVaultLinkResolver({
    index,
    pipeline: new AssetPipeline({ outRoot: '/tmp', subdir: '_attachments', urlPrefix: '/_attachments' }),
    publishedByPath: new Map(),
  });

  const r = await obRenderMarkdown({ body, resolveLink });
  return {
    html: r.html,
    text: r.text,
    links: toEdges(r.links),
  };
}
