import type { VaultAsset, VaultIndex, VaultNoteRef } from '../types.js';

/**
 * Obsidian 链接 target 解析。
 *
 * Obsidian 的解析规则(简化但忠实):
 * 1. 完整路径精确匹配:`folder/note.md` / `attach/x.png`
 * 2. basename 匹配(默认 setting):`note` 命中 `folder/note.md`
 * 3. 大小写不敏感后备
 * 4. 笔记 target 通常不带扩展名,匹配时尝试加 `.md` / `.canvas` / `.html`
 */
export function resolveNoteTarget(
  target: string,
  index: VaultIndex,
): VaultNoteRef | null {
  const t = target.trim().replace(/^\/+/, '');
  if (!t) return null;

  // 1. 完整 source_path
  const direct = index.notesByPath.get(t);
  if (direct) return direct;
  // 加 .md / .canvas / .html 后再试一遍
  for (const ext of ['.md', '.canvas', '.html']) {
    const v = index.notesByPath.get(t + ext);
    if (v) return v;
  }

  // 2. stem 精确(可能带扩展名)
  const stem = t.endsWith('.md') || t.endsWith('.canvas') || t.endsWith('.html')
    ? t.replace(/\.(md|canvas|html|htm|markdown)$/i, '')
    : t;
  const lastSlash = stem.lastIndexOf('/');
  const baseStem = lastSlash >= 0 ? stem.slice(lastSlash + 1) : stem;

  const exact = index.notesByStemExact.get(baseStem);
  if (exact) return exact;

  const ci = index.notesByStem.get(baseStem.toLowerCase());
  if (ci) return ci;

  return null;
}

export function resolveAssetTarget(
  target: string,
  index: VaultIndex,
): VaultAsset | null {
  const t = target.trim().replace(/^\/+/, '');
  if (!t) return null;

  // 1. 完整 path
  const byPath = index.assetsByPath.get(t);
  if (byPath) return byPath;

  // 2. basename
  const lastSlash = t.lastIndexOf('/');
  const base = lastSlash >= 0 ? t.slice(lastSlash + 1) : t;
  const exact = index.assetsByBasename.get(base);
  if (exact) return exact;

  const ci = index.assetsByBasenameLower.get(base.toLowerCase());
  if (ci) return ci;

  return null;
}

/** 一些常见附件扩展名 → mime 简表(仅供 LinkResolver 在没有真 stat 信息时用) */
export const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',

  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.ogv': 'video/ogg',
  '.mkv': 'video/x-matroska',

  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',

  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',

  '.zip': 'application/zip',
};

export function mimeOfAsset(a: VaultAsset): string {
  return MIME_BY_EXT[a.ext] ?? 'application/octet-stream';
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}
export function isVideoMime(mime: string): boolean {
  return mime.startsWith('video/');
}
export function isAudioMime(mime: string): boolean {
  return mime.startsWith('audio/');
}
export function isPdfMime(mime: string): boolean {
  return mime === 'application/pdf';
}
