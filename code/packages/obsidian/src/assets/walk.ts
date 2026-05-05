import { readdir, stat } from 'node:fs/promises';
import { join, relative, basename, extname } from 'node:path';
import type { VaultAsset, VaultIndex, VaultNoteRef, NoteKind } from '../types.js';

/** 默认忽略的目录名(Obsidian 自身 + 各种 dotfiles) */
const IGNORED_DIRS = new Set(['.obsidian', '.git', '.trash', 'node_modules']);

/** 笔记文件的扩展名 → kind */
const NOTE_KIND_BY_EXT = new Map<string, NoteKind>([
  ['.md', 'markdown'],
  ['.markdown', 'markdown'],
  ['.canvas', 'canvas'],
  ['.html', 'html'],
  ['.htm', 'html'],
]);

/** 走全 vault 收集笔记 + 附件;一次 IO,后续渲染共享。 */
export async function walkVault(vaultRoot: string): Promise<{
  notes: VaultNoteRef[];
  assets: VaultAsset[];
}> {
  const notes: VaultNoteRef[] = [];
  const assets: VaultAsset[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.') && IGNORED_DIRS.has(e.name)) continue;
      if (e.name.startsWith('.')) continue; // 跳过所有 dotfiles
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(abs);
        continue;
      }
      if (!e.isFile()) continue;

      const rel = toPosix(relative(vaultRoot, abs));
      const base = basename(rel);
      const ext = extname(base).toLowerCase();
      const stem = base.slice(0, base.length - ext.length);

      const kind = NOTE_KIND_BY_EXT.get(ext);
      if (kind) {
        notes.push({
          source_path: rel,
          basename: base,
          stem,
          // slug 由调用方填(走 frontmatter / slugify)
          slug: '',
          kind,
        });
      } else {
        let bytes: number | undefined;
        try {
          const s = await stat(abs);
          bytes = s.size;
        } catch {
          // ignore
        }
        const item: VaultAsset = {
          source_path: rel,
          basename: base,
          stem,
          ext,
          abs_path: abs,
        };
        if (bytes !== undefined) item.bytes = bytes;
        assets.push(item);
      }
    }
  }

  await walk(vaultRoot);
  return { notes, assets };
}

/** notes + assets → VaultIndex(O(1) 查询) */
export function buildVaultIndex(
  notes: VaultNoteRef[],
  assets: VaultAsset[],
): VaultIndex {
  const idx: VaultIndex = {
    notesByStem: new Map(),
    notesByStemExact: new Map(),
    assetsByBasename: new Map(),
    assetsByBasenameLower: new Map(),
    assetsByPath: new Map(),
    notesByPath: new Map(),
  };

  for (const n of notes) {
    idx.notesByPath.set(n.source_path, n);
    idx.notesByStemExact.set(n.stem, n);
    const lc = n.stem.toLowerCase();
    // 同名笔记冲突时,先到先得;exact 表会承担精确匹配
    if (!idx.notesByStem.has(lc)) idx.notesByStem.set(lc, n);
  }

  for (const a of assets) {
    idx.assetsByPath.set(a.source_path, a);
    if (!idx.assetsByBasename.has(a.basename)) idx.assetsByBasename.set(a.basename, a);
    const lc = a.basename.toLowerCase();
    if (!idx.assetsByBasenameLower.has(lc)) idx.assetsByBasenameLower.set(lc, a);
  }

  return idx;
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}
