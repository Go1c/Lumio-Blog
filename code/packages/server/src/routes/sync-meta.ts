import type { SyncDiagnostics } from '@opennote/sync';
import type { NoteRepo } from '@opennote/db';

export interface SyncDiagnosticsSnapshot {
  at: string;
  diag: SyncDiagnostics;
}

/** 内存里缓存最近一次 syncAll 的诊断,routes 用来回吐给前端。 */
export class SyncDiagnosticsBuffer {
  private last: SyncDiagnosticsSnapshot | null = null;

  record(diag: SyncDiagnostics): void {
    this.last = { at: new Date().toISOString(), diag };
  }

  snapshot(): SyncDiagnosticsSnapshot | null {
    return this.last;
  }
}

/** 空诊断兜底,前端首次访问时拿到一个标准结构。 */
export const EMPTY_DIAGNOSTICS: SyncDiagnostics = {
  files_scanned: 0,
  parse_failed: [],
  normalize_warnings: [],
  slug_conflicts: [],
  process_failed: [],
  removed_slugs: [],
};

export interface FolderEntry {
  name: string;
  path: string;
  note_count: number;
  updated_at: string | null;
}

export interface FolderTreeNoteSummary {
  slug: string;
  title: string;
  visibility: string;
  searchable: boolean;
  short_id: string | null;
  updated_at: string;
  word_count: number;
  source_path: string;
}

export interface FolderTreeResponse {
  path: string;
  breadcrumbs: { name: string; path: string }[];
  folders: FolderEntry[];
  notes: FolderTreeNoteSummary[];
  /**
   * 当前路径(含子目录)下所有笔记的 visibility 计数。前台筛选 chip 显示这个,
   * 跟 `notes`(只有当前层)区分开——否则 root 下永远是 0/0/0/0。
   */
  visibility_counts: {
    all: number;
    public: number;
    unlisted: number;
    'link-only': number;
    private: number;
  };
}

/**
 * 按 source_path 把 notes 切成"当前层目录 + 当前层笔记"。
 * path = '' 表示 vault 根。
 */
export function buildFolderTree(repo: NoteRepo, path: string): FolderTreeResponse {
  const cleanPath = path.replace(/^\/+|\/+$/g, '').replace(/\\/g, '/');
  const all = repo.listAll();

  const prefix = cleanPath === '' ? '' : `${cleanPath}/`;
  const inScope = cleanPath === ''
    ? all
    : all.filter((n) => n.source_path === cleanPath || n.source_path.startsWith(prefix));

  const folders = new Map<string, { count: number; updated_at: string | null }>();
  const directNotes: FolderTreeNoteSummary[] = [];
  const visibility_counts = {
    all: 0, public: 0, unlisted: 0, 'link-only': 0, private: 0,
  };

  for (const n of inScope) {
    visibility_counts.all += 1;
    const v = n.visibility as keyof typeof visibility_counts;
    if (v in visibility_counts) visibility_counts[v] += 1;
    const rel = cleanPath === '' ? n.source_path : n.source_path.slice(prefix.length);
    const segs = rel.split('/');
    if (segs.length === 1) {
      directNotes.push({
        slug: n.slug,
        title: n.title,
        visibility: n.visibility,
        searchable: !!n.searchable,
        short_id: n.short_id,
        updated_at: n.updated_at,
        word_count: n.word_count,
        source_path: n.source_path,
      });
    } else {
      const childName = segs[0]!;
      const cur = folders.get(childName) ?? { count: 0, updated_at: null };
      cur.count += 1;
      if (!cur.updated_at || n.updated_at > cur.updated_at) cur.updated_at = n.updated_at;
      folders.set(childName, cur);
    }
  }

  const folderEntries: FolderEntry[] = [...folders.entries()]
    .map(([name, v]) => ({
      name,
      path: cleanPath === '' ? name : `${cleanPath}/${name}`,
      note_count: v.count,
      updated_at: v.updated_at,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  directNotes.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));

  const breadcrumbs: { name: string; path: string }[] = [];
  if (cleanPath !== '') {
    const parts = cleanPath.split('/');
    let acc = '';
    for (let i = 0; i < parts.length - 1; i++) {
      acc = acc === '' ? parts[i]! : `${acc}/${parts[i]}`;
      breadcrumbs.push({ name: parts[i]!, path: acc });
    }
  }

  return { path: cleanPath, breadcrumbs, folders: folderEntries, notes: directNotes, visibility_counts };
}
