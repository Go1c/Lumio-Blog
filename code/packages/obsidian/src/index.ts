/**
 * @opennote/obsidian — Obsidian-faithful 渲染层。
 *
 * 三种笔记原文:
 *   - markdown — renderMarkdown
 *   - canvas   — renderCanvas
 *   - html     — renderHtmlNote
 *
 * 共享:
 *   - vault 索引(walkVault, buildVaultIndex)
 *   - 资源管线(AssetPipeline)
 *   - link resolver(VaultIndex → ResolvedLink)
 *
 * 同时暴露:
 *   - obsidian.css(styles 子路径,由 web-public 直接 import)
 *   - 客户端运行时:CANVAS_RUNTIME_JS, HTML_EMBED_RUNTIME_JS
 */

export * from './types.js';
export * from './assets/index.js';
export * from './markdown/index.js';
export * from './canvas/index.js';
export {
  renderHtmlNote,
  htmlToPlainText,
  HTML_EMBED_RUNTIME_JS,
  type RenderHtmlResult,
} from './html-embed/index.js';

import { resolveAssetTarget, resolveNoteTarget, mimeOfAsset } from './assets/resolver.js';
import { AssetPipeline } from './assets/pipeline.js';
import type { LinkResolver, RenderedLink, VaultIndex, VaultAsset, VaultNoteRef } from './types.js';

/**
 * 帮助函数:为 sync pipeline 一次性构造一个 LinkResolver。
 * - 笔记 → { kind: 'note', slug, title }
 * - 资源 → 走 AssetPipeline.publish(产生稳定 URL)
 * - 没命中 → broken
 *
 * 注意:resolver 是同步的,但 AssetPipeline.publish 是异步;为避免修改大量调用方,
 * 我们要求调用者在跑 pipeline 之前 prepublishAssets 把所有用到的附件 walk 一遍。
 * publishedByPath 用于 sync 查询。
 */
export function makeVaultLinkResolver(args: {
  index: VaultIndex;
  /** 用于 publish 资源 → URL */
  pipeline: AssetPipeline;
  /** vault 资源已经 publish 过的 cache;同步阶段查这个 */
  publishedByPath: Map<string, { url: string; bytes: number; filename: string; mime: string }>;
  /** noteRef.slug 缺省时回退用 */
  fallbackSlug?: (n: VaultNoteRef) => string;
  /** 已预渲染好的笔记 transclusion(原始 ![[..]] 内部内容 → HTML) */
  transclusionMap?: Map<string, string>;
}): LinkResolver {
  const { index, publishedByPath, fallbackSlug, transclusionMap } = args;
  return ({ target, anchor, alias, embed }) => {
    if (!target) return { kind: 'broken', raw: target, ...(alias ? { alias } : {}) };

    // 优先按笔记解析
    const note = resolveNoteTarget(target, index);
    if (note) {
      const slug = note.slug || (fallbackSlug ? fallbackSlug(note) : note.stem);
      const out: { kind: 'note'; slug: string; title: string; anchor?: string; alias?: string; transcludedHtml?: string } = {
        kind: 'note',
        slug,
        title: note.stem,
      };
      if (anchor) out.anchor = anchor;
      if (alias) out.alias = alias;
      if (embed && transclusionMap) {
        // transclusionMap 的 key 是 wikilink 内部原文(target[#anchor][|alias])
        // 但调用方此时已经拆开了,我们重建 key
        const lookupKey = anchor ? `${target}#${anchor}` : target;
        const html = transclusionMap.get(lookupKey)
          ?? (alias ? transclusionMap.get(`${target}${anchor ? '#' + anchor : ''}|${alias}`) : undefined)
          ?? transclusionMap.get(target);
        if (html) out.transcludedHtml = html;
      }
      return out;
    }

    // 否则按资源
    const asset = resolveAssetTarget(target, index);
    if (asset) {
      const pub = publishedByPath.get(asset.source_path);
      const out: {
        kind: 'asset';
        url: string; mime: string; filename: string; bytes?: number; alias?: string;
      } = {
        kind: 'asset',
        url: pub?.url ?? `/_attachments/${encodeURIComponent(asset.basename)}`,
        mime: pub?.mime ?? mimeOfAsset(asset),
        filename: pub?.filename ?? asset.basename,
      };
      if (pub?.bytes !== undefined) out.bytes = pub.bytes;
      else if (asset.bytes !== undefined) out.bytes = asset.bytes;
      if (alias) out.alias = alias;
      return out;
    }
    void embed; // 不影响 broken 行为
    const out: { kind: 'broken'; raw: string; alias?: string } = { kind: 'broken', raw: target };
    if (alias) out.alias = alias;
    return out;
  };
}

/**
 * 给 sync pipeline 一个一键扫描:遍历 markdown body,把所有 ![[..]] / [[..]] 里命中的
 * 附件发布出去,填充 publishedByPath。 markdown 渲染前调用。
 *
 * 这样真正 renderMarkdown 时 resolver 可以同步给出 URL。
 */
export async function prepublishMarkdownAssets(args: {
  body: string;
  index: VaultIndex;
  pipeline: AssetPipeline;
  publishedByPath: Map<string, { url: string; bytes: number; filename: string; mime: string }>;
}): Promise<void> {
  const { body, index, pipeline, publishedByPath } = args;
  const RE = /(!?)\[\[([^\]\n]+)\]\]/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = RE.exec(body))) {
    const body2 = m[2];
    if (!body2) continue;
    const tgt = body2.split(/[#|]/)[0]?.trim();
    if (!tgt || seen.has(tgt)) continue;
    seen.add(tgt);
    const a = resolveAssetTarget(tgt, index);
    if (!a) continue;
    if (publishedByPath.has(a.source_path)) continue;
    const pub = await pipeline.publish(a);
    publishedByPath.set(a.source_path, {
      url: pub.url,
      bytes: pub.bytes,
      filename: pub.filename,
      mime: pub.mime,
    });
  }
}

/**
 * 对 markdown body 做 transclusion 预渲染。
 *
 * 输入:body + index + 一个能读笔记原文的回调 readNoteBody(source_path) → md
 *
 * 行为:
 *   1. 扫 ![[note]] / ![[note#heading]] / ![[note#^block-id]] 引用
 *   2. 对命中笔记的 target,递归读 + 渲染该笔记的 body(或截取 heading/block 子片段)
 *   3. 深度上限 + 已访问集合,防止 A↔B 循环
 *   4. 渲染后存入 transclusionMap;主渲染时由 LinkResolver 注入到 ResolvedLink.transcludedHtml
 *
 * 注意:
 *   - 这里的子渲染不再做 transclusion(深度 = 1),避免组合爆炸
 *   - 子渲染共享同一个 publishedByPath,所以图片/视频也会被 publish
 *   - 子渲染共享同一个 vault index;wikilink/embed 都正确解析
 */
export interface TransclusionContext {
  index: VaultIndex;
  pipeline: AssetPipeline;
  publishedByPath: Map<string, { url: string; bytes: number; filename: string; mime: string }>;
  /** 读单篇笔记原文(去掉 frontmatter 之后的 markdown body)。 */
  readNoteBody: (sourcePath: string) => Promise<string | null>;
  /** 当前嵌入栈,用于 cycle 检测。外部首次调用传 new Set() 即可。 */
  visited?: Set<string>;
  /** 最大递归深度,默认 1(只展开第一层 transclusion;嵌套引用会降级 stub)。 */
  maxDepth?: number;
}

export async function prerenderTransclusions(args: {
  body: string;
  ctx: TransclusionContext;
  /** noteRef.slug 缺省时回退用 */
  fallbackSlug?: (n: VaultNoteRef) => string;
}): Promise<Map<string, string>> {
  const { ctx } = args;
  const out = new Map<string, string>();
  const visited = ctx.visited ?? new Set<string>();
  const maxDepth = ctx.maxDepth ?? 1;
  if (maxDepth <= 0) return out;

  const RE = /!\[\[([^\]\n]+)\]\]/g;
  const seenTargets = new Set<string>();
  const tasks: Promise<void>[] = [];

  let m: RegExpExecArray | null;
  while ((m = RE.exec(args.body))) {
    const body2 = m[1];
    if (!body2) continue;
    if (seenTargets.has(body2)) continue;
    seenTargets.add(body2);

    // 解析 target / anchor / alias
    const [, target, anchor] = body2.match(/^([^#|]+)(?:#([^|]*))?(?:\|.*)?$/) ?? [];
    if (!target) continue;
    const cleanTarget = target.trim();

    // 笔记 transclusion 才走这里;附件由 prepublishMarkdownAssets 管
    const note = resolveNoteTarget(cleanTarget, ctx.index);
    if (!note) continue;

    // markdown 才能 transclude;canvas/html 不行(由 embedHtml 走 stub)
    if (note.kind !== 'markdown') continue;

    const cycleKey = `${note.source_path}#${anchor ?? ''}`;
    if (visited.has(cycleKey)) continue;
    visited.add(cycleKey);

    tasks.push((async () => {
      const md = await ctx.readNoteBody(note.source_path);
      if (md == null) return;
      const sub = anchor ? extractSubtree(md, anchor) : md;
      if (!sub.trim()) return;

      // 子级:把附件先 publish 一遍(子内容里的 ![[image.png]])
      await prepublishMarkdownAssets({
        body: sub,
        index: ctx.index,
        pipeline: ctx.pipeline,
        publishedByPath: ctx.publishedByPath,
      });

      // 递归 transclusion(深度-1)
      let nestedMap = new Map<string, string>();
      if (maxDepth > 1) {
        const nestedCtx: TransclusionContext = {
          index: ctx.index,
          pipeline: ctx.pipeline,
          publishedByPath: ctx.publishedByPath,
          readNoteBody: ctx.readNoteBody,
          visited,
          maxDepth: maxDepth - 1,
        };
        const nestedArgs: { body: string; ctx: TransclusionContext; fallbackSlug?: (n: VaultNoteRef) => string } = {
          body: sub,
          ctx: nestedCtx,
        };
        if (args.fallbackSlug) nestedArgs.fallbackSlug = args.fallbackSlug;
        nestedMap = await prerenderTransclusions(nestedArgs);
      }

      // 子渲染用「带 transclusion 注入」的 resolver
      const subResolverArgs: Parameters<typeof makeVaultLinkResolver>[0] = {
        index: ctx.index,
        pipeline: ctx.pipeline,
        publishedByPath: ctx.publishedByPath,
      };
      if (args.fallbackSlug) subResolverArgs.fallbackSlug = args.fallbackSlug;
      const baseResolver = makeVaultLinkResolver(subResolverArgs);
      const subResolver: typeof baseResolver = (parts) => {
        const r = baseResolver(parts);
        if (r.kind === 'note' && parts.embed && nestedMap.size > 0) {
          const inner = nestedMap.get(parts.target) ?? nestedMap.get(parts.target + (parts.anchor ? '#' + parts.anchor : ''));
          if (inner) (r as { transcludedHtml?: string }).transcludedHtml = inner;
        }
        return r;
      };

      // 复用主 pipeline 的 renderMarkdown
      const { renderMarkdown: subRender } = await import('./markdown/pipeline.js');
      const result = await subRender({ body: sub, resolveLink: subResolver });
      out.set(body2, result.html);
    })());
  }

  await Promise.all(tasks);
  return out;
}

/** 从 markdown 里抽取 #heading 起到下一个同级/上级 heading 之间,或 ^block-id 那一段。 */
export function extractSubtree(md: string, anchor: string): string {
  const a = anchor.trim();
  if (!a) return md;
  if (a.startsWith('^')) {
    const id = a.slice(1);
    // 找包含 ^id 的一行,把那一段(blockquote / paragraph / list item)返回
    const lines = md.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      if (line.includes(`^${id}`)) {
        // 简化:返回该行(剥掉 ^id 标记) — 块级语义还原由主 render 的 block-ids 插件处理
        return line.replace(/\s+\^[A-Za-z0-9_-]+\s*$/, '').trim();
      }
    }
    return '';
  }
  // heading anchor:大小写不敏感,匹配 # / ## / ### ...
  const target = a.toLowerCase();
  const lines = md.split('\n');
  let startIdx = -1;
  let startLevel = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!m) continue;
    if ((m[2] ?? '').toLowerCase().trim() === target) {
      startIdx = i;
      startLevel = (m[1] ?? '').length;
      break;
    }
  }
  if (startIdx < 0) return '';
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const m = line.match(/^(#{1,6})\s+/);
    if (!m) continue;
    if ((m[1] ?? '').length <= startLevel) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join('\n').trim();
}

/**
 * Canvas 文件里的 file 节点也是 vault 资源 / 笔记。复用同一份发布缓存。
 */
export async function prepublishCanvasAssets(args: {
  json: string;
  index: VaultIndex;
  pipeline: AssetPipeline;
  publishedByPath: Map<string, { url: string; bytes: number; filename: string; mime: string }>;
}): Promise<void> {
  const { json, index, pipeline, publishedByPath } = args;
  let parsed: { nodes?: unknown[] };
  try { parsed = JSON.parse(json) as { nodes?: unknown[] }; }
  catch { return; }
  if (!Array.isArray(parsed.nodes)) return;
  for (const node of parsed.nodes) {
    if (typeof node !== 'object' || node === null) continue;
    const n = node as Record<string, unknown>;
    if (n.type !== 'file' || typeof n.file !== 'string') continue;
    const a = resolveAssetTarget(n.file, index);
    if (!a) continue;
    if (publishedByPath.has(a.source_path)) continue;
    const pub = await pipeline.publish(a);
    publishedByPath.set(a.source_path, {
      url: pub.url,
      bytes: pub.bytes,
      filename: pub.filename,
      mime: pub.mime,
    });
    void index;
  }
}

/** 给 sync pipeline 用——把 RenderedLink → 老的 LinkEdge 形式(src_slug 留空,由调用方填) */
export type RenderedEdgesAdapter = (links: RenderedLink[]) => Array<{
  raw_target: string;
  dst_slug: string | null;
  kind: RenderedLink['kind'];
  embed: boolean;
}>;

export const adaptRenderedLinks: RenderedEdgesAdapter = (links) =>
  links.map((l) => ({
    raw_target: l.raw,
    dst_slug: l.kind === 'note' ? l.resolved : null,
    kind: l.kind,
    embed: l.embed,
  }));
