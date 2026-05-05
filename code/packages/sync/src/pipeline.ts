import { readdir } from 'node:fs/promises';
import { join, relative, basename, dirname } from 'node:path';
import {
  type LinkEdge,
  type NoteRow,
  type NoteKind,
  type SyncEvent,
  type SyncStats,
  generateUniqueShortId,
  nowIso,
  slugify,
} from '@opennote/core';
import { NoteRepo, ShortLinkRepo, type DbHandle } from '@opennote/db';
import {
  buildVaultIndex,
  walkVault,
  type VaultIndex,
  type VaultNoteRef,
} from '@opennote/obsidian';
import { parseFile } from './parse.js';
import { normalize } from './normalize.js';
import { createRenderContext, renderNote, type RenderContext } from './render.js';

/** 一次同步收集到的、可被外部 inspect 的结构化诊断信息。 */
export interface SyncDiagnostics {
  /** 扫到 .md 文件总数 */
  files_scanned: number;
  /** parse 失败被丢弃的文件 */
  parse_failed: { source_path: string; message: string }[];
  /** normalize 出 warning 的文件(不影响入库) */
  normalize_warnings: { source_path: string; message: string }[];
  /** desiredSlug 撞车,被改写成了 finalSlug 的文件 */
  slug_conflicts: { source_path: string; desired: string; final: string }[];
  /** processNote 阶段抛错的文件 */
  process_failed: { source_path: string; slug: string; message: string }[];
  /** vault 删了所以从 db 摘掉的旧 slug */
  removed_slugs: string[];
}

/** 渲染完每篇笔记后,可外部插入的钩子(WS-G4 用于扫 media ref) */
export interface PostRenderHook {
  /** slug + 渲染好的 body_html → 由实现去解析 url 并写 media_refs */
  (slug: string, bodyHtml: string): void | Promise<void>;
}

export interface SyncOptions {
  vault: string;
  db: DbHandle;
  /** 静态产物输出目录 — Obsidian 资源会被复制到 <out>/_attachments/ */
  out: string;
  onEvent?: (e: SyncEvent) => void;
  onLog?: (level: 'info' | 'warn' | 'error', msg: string, meta?: unknown) => void;
  /** 每篇笔记 render 完之后调用一次。失败不影响主流程,只 warn。 */
  onNoteRendered?: PostRenderHook;
  /** 全量同步结束后,把诊断信息回吐(用于 /api/admin/sync/diagnostics)。 */
  onDiagnostics?: (diag: SyncDiagnostics) => void;
}

/** 单文件处理用的上下文。slug 解析表是 db 全量映射 + 本批新增的合并。 */
interface ProcessCtx {
  noteRepo: NoteRepo;
  shortRepo: ShortLinkRepo;
  /** vault 索引 + 资源 pipeline,渲染所有笔记共用 */
  render: RenderContext;
  /** 笔记 stem → 最终 slug,用于 wikilink 解析 */
  noteSlugMap: Map<string, string>;
  onEvent?: SyncOptions['onEvent'];
  onLog?: SyncOptions['onLog'];
  onNoteRendered?: SyncOptions['onNoteRendered'];
}

/**
 * 把一份 parsed 笔记 normalize → render → 写库。返回是否真的改变了行（hash diff）。
 * 写库时按 hash 跳过 no-op。
 */
async function processNote(
  parsed: ReturnType<typeof normalize>['note'],
  ctx: ProcessCtx,
  existing?: NoteRow,
): Promise<{ changed: boolean; isNew: boolean; row: NoteRow; rawTargets: string[] }> {
  const kind: NoteKind = parsed.kind ?? 'markdown';
  const rendered = await renderNote(
    { kind, body: parsed.body, source_path: parsed.source_path },
    ctx.render,
  );
  const html = rendered.html;
  const text = rendered.text;
  const links = rendered.links;
  // canvas / html 走自己的 word_count(基于渲染后的 plain text)
  let wordCount = parsed.word_count;
  let readingMinutes = parsed.reading_minutes;
  if (kind !== 'markdown' && text) {
    const cjk = (text.match(/[一-鿿]/g) ?? []).length;
    const ascii = text.replace(/[一-鿿]/g, ' ').match(/\b\w+\b/g) ?? [];
    wordCount = cjk + ascii.length;
    readingMinutes = Math.max(1, Math.round(wordCount / 300));
  }

  // 短链：分配/复用
  let shortId = parsed.short_id;
  if (!shortId) {
    const active = ctx.shortRepo.getActive(parsed.slug);
    if (active) {
      shortId = active.short_id;
    } else if (parsed.visibility === 'link-only' || parsed.visibility === 'unlisted') {
      shortId = generateUniqueShortId((id) => ctx.shortRepo.exists(id));
      ctx.shortRepo.create({
        short_id: shortId,
        slug: parsed.slug,
        created_at: nowIso(),
        tombstoned_at: null,
      });
    }
  }

  const isNew = !existing;
  const changed = !existing || existing.hash !== parsed.hash;

  const summary = parsed.frontmatter.summary ?? autoSummary(text);
  const cover = (parsed.frontmatter.cover as string | undefined) ?? null;

  const row: NoteRow = {
    slug: parsed.slug,
    title: parsed.title,
    summary,
    body_html: html,
    body_text: text,
    kind,
    visibility: parsed.visibility,
    searchable: parsed.searchable ? 1 : 0,
    seo_indexable: parsed.seo_indexable ? 1 : 0,
    rss_includable: parsed.rss_includable ? 1 : 0,
    featured_on_home: parsed.featured_on_home ? 1 : 0,
    short_id: shortId,
    source_path: parsed.source_path,
    created_at: existing?.created_at ?? (parsed.frontmatter.created_at as string) ?? nowIso(),
    updated_at: nowIso(),
    published_at:
      (parsed.frontmatter.published_at as string | undefined) ??
      existing?.published_at ??
      (parsed.visibility === 'public' ? nowIso() : null),
    scheduled_at: (parsed.frontmatter.scheduled_at as string | undefined) ?? null,
    word_count: wordCount,
    reading_minutes: readingMinutes,
    cover,
    hash: parsed.hash,
  };

  if (changed) {
    const linkRows: LinkEdge[] = links.map((l) => ({
      src_slug: parsed.slug,
      dst_slug: l.resolved,
      raw_target: l.raw,
    }));
    ctx.noteRepo.upsert(row, parsed.tags, linkRows);

    // WS-G4 hook:扫 body_html 提取 media URL 并写 media_refs
    if (ctx.onNoteRendered) {
      try {
        await ctx.onNoteRendered(parsed.slug, html);
      } catch (e) {
        ctx.onLog?.('warn', 'post.render.hook.failed', {
          slug: parsed.slug,
          err: (e as Error).message,
        });
      }
    }
  }

  return { changed, isNew, row, rawTargets: links.map((l) => l.raw) };
}

/** db 已有 source_path → slug 的快照,本批新增 + 复用。给 VaultIndex 的 lookup 兜底。 */
function buildSlugMap(
  noteRepo: NoteRepo,
  overrides: Map<string, string> = new Map(),
): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of noteRepo.allSourceMappings()) {
    map.set(r.source_path, r.slug);
    const base = basename(r.source_path).replace(/\.(md|canvas|html|htm)$/i, '');
    map.set(base, r.slug);
    map.set(base.toLowerCase(), r.slug);
    map.set(r.slug, r.slug);
  }
  for (const [k, v] of overrides) map.set(k, v);
  return map;
}

/**
 * 全量重建：扫 vault 所有 .md。v0.6 起仅作初次启动 / 手动触发的兜底，
 * 日常变更走 syncOne / syncRemove。
 *
 * v0.7 起加入 slug 冲突解析:不同 source_path 撞同一个 slug 不再静默
 * 互相覆盖,而是后到的用 "父目录-原slug" / "原slug-2" 之类避让。
 * 已经入库的 (slug, source_path) 对会被锁定 → 老链接不破。
 */
export async function syncAll(opts: SyncOptions): Promise<SyncStats> {
  const start = Date.now();
  opts.onEvent?.({ kind: 'sync.started' });

  const stats: SyncStats = { added: 0, modified: 0, removed: 0, failed: 0, duration_ms: 0 };
  const diag: SyncDiagnostics = {
    files_scanned: 0,
    parse_failed: [],
    normalize_warnings: [],
    slug_conflicts: [],
    process_failed: [],
    removed_slugs: [],
  };

  const noteRepo = new NoteRepo(opts.db);
  const shortRepo = new ShortLinkRepo(opts.db);

  // 一次走 vault,产出 索引 + 文件列表(.md/.canvas/.html + 附件)
  const { notes: vaultNotes, assets: vaultAssets } = await walkVault(opts.vault);
  diag.files_scanned = vaultNotes.length;
  const seenSlugs = new Set<string>();

  // 先 parse + normalize 全部，建本批 slug 表
  const parsedAll: ReturnType<typeof normalize>['note'][] = [];
  for (const ref of vaultNotes) {
    const abs = join(opts.vault, ref.source_path);
    const { note, error } = await parseFile(abs, ref.source_path);
    if (error) {
      stats.failed++;
      diag.parse_failed.push(error);
      opts.onLog?.('error', 'parse.failed', error);
      continue;
    }
    if (!note) continue;
    const { note: normalized, warnings } = normalize(note);
    for (const w of warnings) {
      diag.normalize_warnings.push(w);
      opts.onLog?.('warn', 'normalize.warning', w);
    }
    parsedAll.push(normalized);
  }

  // ── slug 冲突解析 ──
  // 1. 已存在 db 的 (source_path → slug) 锁定,不破老链接
  // 2. 新文件按 vault 顺序分配 slug;撞车就用父目录/数字后缀避让
  // 3. 同时改写 normalized.slug,这样 processNote 走的是 final slug
  const dbExisting = noteRepo.listAll();
  const existingBySource = new Map<string, NoteRow>(dbExisting.map((n) => [n.source_path, n]));
  const existingBySlug = new Map<string, NoteRow>(dbExisting.map((n) => [n.slug, n]));
  const usedSlugs = new Set<string>();

  // pass 1:锁定已存在的 source_path
  const lockedBySource = new Map<string, string>();
  for (const n of parsedAll) {
    const ex = existingBySource.get(n.source_path);
    if (ex) {
      lockedBySource.set(n.source_path, ex.slug);
      usedSlugs.add(ex.slug);
    }
  }

  // pass 2:给新文件分配,用 desiredSlug 不冲突就直接用
  const overrides = new Map<string, string>();
  for (const n of parsedAll) {
    const locked = lockedBySource.get(n.source_path);
    let finalSlug: string;
    if (locked) {
      finalSlug = locked;
    } else {
      const desired = n.slug;
      finalSlug = resolveNewSlug({
        desired,
        sourcePath: n.source_path,
        usedSlugs,
        existingBySlug,
        existingBySource,
      });
      if (finalSlug !== desired) {
        diag.slug_conflicts.push({
          source_path: n.source_path,
          desired,
          final: finalSlug,
        });
        opts.onLog?.('warn', 'slug.conflict.resolved', {
          source_path: n.source_path,
          desired,
          final: finalSlug,
        });
      }
      usedSlugs.add(finalSlug);
    }
    n.slug = finalSlug;
    const base = basename(n.source_path).replace(/\.(md|canvas|html|htm)$/i, '');
    overrides.set(base, finalSlug);
    overrides.set(base.toLowerCase(), finalSlug);
    overrides.set(finalSlug, finalSlug);
    overrides.set(n.source_path, finalSlug);
  }

  const slugMap = buildSlugMap(noteRepo, overrides);

  // 把 vault 索引 + 资源 pipeline 注入 process ctx;所有笔记共用一份
  const indexedNotes = vaultNotes.map((n) => ({ ...n, slug: slugMap.get(n.source_path) ?? n.stem }));
  const vaultIndex = buildVaultIndex(indexedNotes, vaultAssets);
  const renderCtx = createRenderContext({
    index: vaultIndex,
    outRoot: opts.out,
    vaultRoot: opts.vault,
    fallbackSlug: (n) => slugMap.get(n.source_path) ?? slugMap.get(n.stem.toLowerCase()) ?? n.stem,
  });

  const ctx: ProcessCtx = {
    noteRepo,
    shortRepo,
    render: renderCtx,
    noteSlugMap: slugMap,
    onEvent: opts.onEvent,
    onLog: opts.onLog,
    onNoteRendered: opts.onNoteRendered,
  };

  const existing = new Map(dbExisting.map((n) => [n.slug, n]));

  for (const n of parsedAll) {
    seenSlugs.add(n.slug);
    try {
      const { changed, isNew } = await processNote(n, ctx, existing.get(n.slug));
      if (!changed) continue;
      if (isNew) {
        stats.added++;
        opts.onEvent?.({ kind: 'note.published', slug: n.slug, visibility: n.visibility });
      } else {
        stats.modified++;
        opts.onEvent?.({ kind: 'note.updated', slug: n.slug });
      }
    } catch (e) {
      stats.failed++;
      diag.process_failed.push({
        source_path: n.source_path,
        slug: n.slug,
        message: (e as Error).message,
      });
      opts.onLog?.('error', 'process.failed', { slug: n.slug, err: (e as Error).message });
    }
  }

  // 删 vault 里没了的笔记
  for (const [slug] of existing) {
    if (!seenSlugs.has(slug)) {
      noteRepo.delete(slug);
      stats.removed++;
      diag.removed_slugs.push(slug);
      opts.onEvent?.({ kind: 'note.unpublished', slug, reason: 'source removed' });
    }
  }

  stats.duration_ms = Date.now() - start;
  opts.onEvent?.({ kind: 'sync.completed', stats });
  opts.onLog?.('info', 'sync.completed', stats);
  opts.onDiagnostics?.(diag);
  return stats;
}

/**
 * 给新 source_path 分配一个不撞车的 slug。
 * 优先级:desired → parent-desired → parent.parent-desired → ... → desired-2/-3/...
 *
 * usedSlugs 是本批已分配过的(包含 db 锁定的);existingBySlug 是 db 现状。
 * 都查一遍才安全。
 */
function resolveNewSlug(args: {
  desired: string;
  sourcePath: string;
  usedSlugs: Set<string>;
  existingBySlug: Map<string, NoteRow>;
  existingBySource: Map<string, NoteRow>;
}): string {
  const { desired, sourcePath, usedSlugs, existingBySlug, existingBySource } = args;

  const isFree = (s: string): boolean => {
    if (usedSlugs.has(s)) return false;
    const ex = existingBySlug.get(s);
    if (ex && ex.source_path !== sourcePath) return false;
    // 同 source_path 落在 existing 里其实在 pass 1 就锁了,这里防御
    return true;
  };

  if (isFree(desired)) return desired;

  // 用父目录前缀重试。从最近的父目录往上爬。
  const parts = dirname(sourcePath).split(/[\\/]/).filter((p) => p && p !== '.');
  for (let i = parts.length - 1; i >= 0; i--) {
    const ancestors = parts.slice(i).join('-');
    const prefix = slugify(ancestors);
    if (!prefix) continue;
    const cand = `${prefix}-${desired}`.slice(0, 80).replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (cand && cand !== desired && isFree(cand)) return cand;
  }

  // 兜底:数字后缀
  for (let i = 2; i < 1000; i++) {
    const cand = `${desired}-${i}`.slice(0, 80);
    if (isFree(cand)) return cand;
  }
  // 极端情况:连 -999 都被占了。退回带 source_path hash 的 slug,确保唯一
  const fallback = `${desired}-${hashShort(sourcePath)}`.slice(0, 80);
  return fallback;
}

/** 4 字符 base36 hash,用于极端情况下的 slug 兜底 */
function hashShort(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 4);
}

/**
 * 增量：单文件加/改。
 * - parse + normalize；hash 没变就跳过
 * - 解析 wikilink 时用 db + 自身覆盖
 * - 写库后顺便重渲染：(a) 之前断链 raw_target 命中本 slug/basename 的 src_slug；
 *   (b) 本笔记的 inbound src_slug（万一别人指它的链接展示要更新）—— 但 inbound 内容
 *     其实不变（resolved 没动），跳过避免风暴
 */
export async function syncOne(absPath: string, opts: SyncOptions): Promise<void> {
  const sourcePath = relative(opts.vault, absPath);
  if (sourcePath.startsWith('..')) return;
  const lower = sourcePath.toLowerCase();
  if (!lower.endsWith('.md') && !lower.endsWith('.canvas') && !lower.endsWith('.html') && !lower.endsWith('.htm')) return;

  const noteRepo = new NoteRepo(opts.db);
  const shortRepo = new ShortLinkRepo(opts.db);

  const { note, error } = await parseFile(absPath, sourcePath);
  if (error) {
    opts.onLog?.('error', 'parse.failed', error);
    return;
  }
  if (!note) return;
  const { note: normalized, warnings } = normalize(note);
  for (const w of warnings) opts.onLog?.('warn', 'normalize.warning', w);

  const base = basename(sourcePath).replace(/\.(md|canvas|html|htm)$/i, '');
  const overrides = new Map<string, string>([
    [base, normalized.slug],
    [base.toLowerCase(), normalized.slug],
    [normalized.slug, normalized.slug],
    [sourcePath, normalized.slug],
  ]);
  const slugMap = buildSlugMap(noteRepo, overrides);

  // 单文件场景:仍要重新 walk vault(资源会被 publish);成本只是一次 readdir。
  // 也可缓存到 watcher 里,但增量频率低,不优化。
  const { notes, assets } = await walkVault(opts.vault);
  const indexed = notes.map((n) => ({ ...n, slug: slugMap.get(n.source_path) ?? n.stem }));
  const renderCtx = createRenderContext({
    index: buildVaultIndex(indexed, assets),
    outRoot: opts.out,
    vaultRoot: opts.vault,
    fallbackSlug: (n) => slugMap.get(n.source_path) ?? slugMap.get(n.stem.toLowerCase()) ?? n.stem,
  });

  const ctx: ProcessCtx = {
    noteRepo,
    shortRepo,
    render: renderCtx,
    noteSlugMap: slugMap,
    onEvent: opts.onEvent,
    onLog: opts.onLog,
    onNoteRendered: opts.onNoteRendered,
  };

  // 重命名 / 用户改了 frontmatter slug → 先按 source_path 找老 row
  const bySource = noteRepo.getBySourcePath(sourcePath);
  if (bySource && bySource.slug !== normalized.slug) {
    // source_path 一样但 slug 变了 → 删旧 slug,后面按新 slug 入库
    noteRepo.delete(bySource.slug);
    opts.onEvent?.({
      kind: 'note.unpublished',
      slug: bySource.slug,
      reason: 'slug changed',
    });
  }

  let existing = noteRepo.getBySlug(normalized.slug);
  // slug 冲突防御:存在 row 但 source_path 不同 → 别覆盖,改一个不撞的 slug
  if (existing && existing.source_path !== sourcePath) {
    const all = noteRepo.listAll();
    const final = resolveNewSlug({
      desired: normalized.slug,
      sourcePath,
      usedSlugs: new Set(),
      existingBySlug: new Map(all.map((n) => [n.slug, n])),
      existingBySource: new Map(all.map((n) => [n.source_path, n])),
    });
    opts.onLog?.('warn', 'slug.conflict.resolved', {
      source_path: sourcePath,
      desired: normalized.slug,
      final,
    });
    normalized.slug = final;
    overrides.set(base, final);
    overrides.set(base.toLowerCase(), final);
    overrides.set(final, final);
    overrides.set(sourcePath, final);
    // 重建 slug map(processNote 通过 ctx.render 走 vault index,但 noteSlugMap 仍要更新)
    for (const [k, v] of buildSlugMap(noteRepo, overrides)) ctx.noteSlugMap.set(k, v);
    existing = undefined;
  }

  let result;
  try {
    result = await processNote(normalized, ctx, existing);
  } catch (e) {
    opts.onLog?.('error', 'process.failed', {
      slug: normalized.slug,
      err: (e as Error).message,
    });
    return;
  }

  if (!result.changed) return;

  if (result.isNew) {
    opts.onEvent?.({
      kind: 'note.published',
      slug: normalized.slug,
      visibility: normalized.visibility,
    });

    // 这条笔记新出现 → 之前指它的断链可以解析了，重渲染那些 referers
    const referers = noteRepo.unresolvedReferers([base, normalized.slug]);
    for (const refSlug of referers) {
      const ref = noteRepo.getBySlug(refSlug);
      if (!ref) continue;
      try {
        const refAbs = join(opts.vault, ref.source_path);
        const { note: refNote } = await parseFile(refAbs, ref.source_path);
        if (!refNote) continue;
        const { note: refNorm } = normalize(refNote);
        // 强制 hash 不同以触发 upsert
        await processNote(refNorm, ctx, { ...ref, hash: '__force__' });
        opts.onEvent?.({ kind: 'note.updated', slug: refSlug });
      } catch (e) {
        opts.onLog?.('warn', 'rerender.failed', { slug: refSlug, err: (e as Error).message });
      }
    }
  } else {
    opts.onEvent?.({ kind: 'note.updated', slug: normalized.slug });
  }
}

/** 增量：单文件删。按 source_path 找 slug，删掉，发事件。 */
export function syncRemove(absPath: string, opts: SyncOptions): void {
  const sourcePath = relative(opts.vault, absPath);
  if (sourcePath.startsWith('..')) return;
  const noteRepo = new NoteRepo(opts.db);
  const row = noteRepo.getBySourcePath(sourcePath);
  if (!row) return;
  noteRepo.delete(row.slug);
  opts.onEvent?.({ kind: 'note.unpublished', slug: row.slug, reason: 'source removed' });
}

/**
 * 自动摘要:取首段(\n\n 之前)的首句,最多 140 字。
 * 比起裸 slice(0, 200) 更像一段 tagline,而不是被腰斩的正文。
 */
function autoSummary(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const firstPara = text.split(/\n\s*\n/)[0]?.replace(/\s+/g, ' ').trim() ?? cleaned;
  const sentenceMatch = firstPara.match(/^[\s\S]*?[。！？!?.](?:["'”’」』)\]]*)/);
  let candidate = (sentenceMatch ? sentenceMatch[0] : firstPara).trim();
  if (candidate.length > 140) candidate = candidate.slice(0, 140).trim() + '…';
  return candidate;
}

async function _walkMarkdown_legacy(dir: string, out: string[] = []): Promise<string[]> {
  // legacy:保留接口签名给将来某些独立工具用,主流程不再走它
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await _walkMarkdown_legacy(full, out);
    else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
  }
  return out;
}
