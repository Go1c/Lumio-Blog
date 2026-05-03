import { MediaRepo, type MediaRefKind } from '@opennote/db';

/**
 * 从 body_html 提取 media URL 引用,写入 media_refs 表。
 *
 * 规则:
 * - <img src="..."> → kind=embed
 * - <a href="..."> 指向同站 media URL → kind=link
 * - 仅匹配本站 media URL(以 LocalMediaStore 的 urlPrefix 开头,或 S3 的 publicBaseUrl)
 *
 * url → media_id 用 path 末段(去掉 prefix)。如果 media 表里查不到该 id,
 * MediaRepo.refreshRefsForSlug 会自动跳过(避免 FK 错误)。
 */

export interface MediaRefExtractorOptions {
  /** LocalMediaStore.urlPrefix 之类(/static/media)。多个可以传数组 */
  prefixes: string[];
  repo: MediaRepo;
}

export class MediaRefExtractor {
  private opts: MediaRefExtractorOptions;
  constructor(opts: MediaRefExtractorOptions) {
    this.opts = opts;
  }

  /** 给 sync hook 当 onNoteRendered 用 */
  hook = (slug: string, html: string): void => {
    const refs = this.extract(html);
    this.opts.repo.refreshRefsForSlug(slug, refs);
  };

  extract(html: string): Array<{ media_id: string; kind: MediaRefKind }> {
    const out = new Map<string, MediaRefKind>(); // dedupe by id
    const imgRe = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
    const aRe = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;

    for (const m of html.matchAll(imgRe)) {
      const url = m[1];
      if (!url) continue;
      const id = this.urlToId(url);
      if (id) {
        // img always embed,即使之前是 link 也覆盖
        out.set(id, 'embed');
      }
    }
    for (const m of html.matchAll(aRe)) {
      const url = m[1];
      if (!url) continue;
      const id = this.urlToId(url);
      if (id && !out.has(id)) out.set(id, 'link');
    }
    return Array.from(out.entries()).map(([media_id, kind]) => ({ media_id, kind }));
  }

  private urlToId(url: string): string | null {
    for (const p of this.opts.prefixes) {
      const norm = p.replace(/\/$/, '');
      const idx = url.indexOf(norm + '/');
      if (idx >= 0) {
        let tail = url.slice(idx + norm.length + 1);
        // 去 query / fragment
        const q = tail.indexOf('?');
        if (q >= 0) tail = tail.slice(0, q);
        const f = tail.indexOf('#');
        if (f >= 0) tail = tail.slice(0, f);
        // 取最后一个 path 段(支持 shard 子目录)
        const slash = tail.lastIndexOf('/');
        if (slash >= 0) tail = tail.slice(slash + 1);
        try {
          tail = decodeURIComponent(tail);
        } catch { /* keep as-is */ }
        if (tail) return tail;
      }
    }
    return null;
  }
}
