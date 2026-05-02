import { readdir, stat } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';
import {
  type LinkEdge,
  type NoteRow,
  type SyncEvent,
  type SyncStats,
  generateUniqueShortId,
  nowIso,
} from '@opennote/core';
import { NoteRepo, ShortLinkRepo, type DbHandle } from '@opennote/db';
import { parseFile, type ParsedNote } from './parse.js';
import { normalize } from './normalize.js';
import { renderMarkdown } from './render.js';

export interface SyncOptions {
  vault: string;
  db: DbHandle;
  onEvent?: (e: SyncEvent) => void;
  onLog?: (level: 'info' | 'warn' | 'error', msg: string, meta?: unknown) => void;
}

/** 单文件处理用的上下文。slug 解析表是 db 全量映射 + 本批新增的合并。 */
interface ProcessCtx {
  noteRepo: NoteRepo;
  shortRepo: ShortLinkRepo;
  resolveSlug: (target: string) => string | null;
  onEvent?: SyncOptions['onEvent'];
  onLog?: SyncOptions['onLog'];
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
  const { html, text, links } = await renderMarkdown(parsed.body, ctx.resolveSlug);

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

  const summary =
    parsed.frontmatter.summary ?? text.slice(0, 200) + (text.length > 200 ? '…' : '');
  const cover = (parsed.frontmatter.cover as string | undefined) ?? null;

  const row: NoteRow = {
    slug: parsed.slug,
    title: parsed.title,
    summary,
    body_html: html,
    body_text: text,
    visibility: parsed.visibility,
    searchable: parsed.searchable ? 1 : 0,
    short_id: shortId,
    source_path: parsed.source_path,
    created_at: existing?.created_at ?? (parsed.frontmatter.created_at as string) ?? nowIso(),
    updated_at: nowIso(),
    published_at:
      (parsed.frontmatter.published_at as string | undefined) ??
      existing?.published_at ??
      (parsed.visibility === 'public' ? nowIso() : null),
    scheduled_at: (parsed.frontmatter.scheduled_at as string | undefined) ?? null,
    word_count: parsed.word_count,
    reading_minutes: parsed.reading_minutes,
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
  }

  return { changed, isNew, row, rawTargets: links.map((l) => l.raw) };
}

/** 构造 basename → slug 映射。db 已有 + 本批新增合并。 */
function buildResolver(
  noteRepo: NoteRepo,
  overrides: Map<string, string> = new Map(),
): (target: string) => string | null {
  const map = new Map<string, string>();
  for (const r of noteRepo.allSourceMappings()) {
    const base = basename(r.source_path).replace(/\.md$/, '');
    map.set(base, r.slug);
    map.set(base.toLowerCase(), r.slug);
    map.set(r.slug, r.slug);
  }
  for (const [k, v] of overrides) map.set(k, v);
  return (target: string) =>
    map.get(target) ?? map.get(target.toLowerCase()) ?? null;
}

/**
 * 全量重建：扫 vault 所有 .md。v0.6 起仅作初次启动 / 手动触发的兜底，
 * 日常变更走 syncOne / syncRemove。
 */
export async function syncAll(opts: SyncOptions): Promise<SyncStats> {
  const start = Date.now();
  opts.onEvent?.({ kind: 'sync.started' });

  const stats: SyncStats = { added: 0, modified: 0, removed: 0, failed: 0, duration_ms: 0 };
  const noteRepo = new NoteRepo(opts.db);
  const shortRepo = new ShortLinkRepo(opts.db);

  const files = await walkMarkdown(opts.vault);
  const seenSlugs = new Set<string>();

  // 先 parse + normalize 全部，建本批 slug 表
  const parsedAll: ReturnType<typeof normalize>['note'][] = [];
  const overrides = new Map<string, string>();
  for (const abs of files) {
    const sourcePath = relative(opts.vault, abs);
    const { note, error } = await parseFile(abs, sourcePath);
    if (error) {
      stats.failed++;
      opts.onLog?.('error', 'parse.failed', error);
      continue;
    }
    if (!note) continue;
    const { note: normalized, warnings } = normalize(note);
    for (const w of warnings) opts.onLog?.('warn', 'normalize.warning', w);
    parsedAll.push(normalized);
    const base = basename(sourcePath).replace(/\.md$/, '');
    overrides.set(base, normalized.slug);
    overrides.set(base.toLowerCase(), normalized.slug);
    overrides.set(normalized.slug, normalized.slug);
  }

  const resolveSlug = buildResolver(noteRepo, overrides);
  const ctx: ProcessCtx = {
    noteRepo,
    shortRepo,
    resolveSlug,
    onEvent: opts.onEvent,
    onLog: opts.onLog,
  };

  const existing = new Map(noteRepo.listAll().map((n) => [n.slug, n]));

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
      opts.onLog?.('error', 'process.failed', { slug: n.slug, err: (e as Error).message });
    }
  }

  // 删 vault 里没了的笔记
  for (const [slug] of existing) {
    if (!seenSlugs.has(slug)) {
      noteRepo.delete(slug);
      stats.removed++;
      opts.onEvent?.({ kind: 'note.unpublished', slug, reason: 'source removed' });
    }
  }

  stats.duration_ms = Date.now() - start;
  opts.onEvent?.({ kind: 'sync.completed', stats });
  opts.onLog?.('info', 'sync.completed', stats);
  return stats;
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
  if (!sourcePath.endsWith('.md') || sourcePath.startsWith('..')) return;

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

  const base = basename(sourcePath).replace(/\.md$/, '');
  const overrides = new Map<string, string>([
    [base, normalized.slug],
    [base.toLowerCase(), normalized.slug],
    [normalized.slug, normalized.slug],
  ]);
  const ctx: ProcessCtx = {
    noteRepo,
    shortRepo,
    resolveSlug: buildResolver(noteRepo, overrides),
    onEvent: opts.onEvent,
    onLog: opts.onLog,
  };

  const existing = noteRepo.getBySlug(normalized.slug);
  // 处理重命名：source_path 变了但 slug 一样 → 走 update 路径；
  // source_path 一样但 slug 变了（用户改了 slug frontmatter）→ 删旧 slug
  if (!existing) {
    const bySource = noteRepo.getBySourcePath(sourcePath);
    if (bySource && bySource.slug !== normalized.slug) {
      noteRepo.delete(bySource.slug);
      opts.onEvent?.({
        kind: 'note.unpublished',
        slug: bySource.slug,
        reason: 'slug changed',
      });
    }
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

async function walkMarkdown(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await walkMarkdown(full, out);
    else if (e.isFile() && e.name.endsWith('.md')) out.push(full);
  }
  return out;
}
