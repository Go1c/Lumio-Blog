import { createHash, randomBytes } from 'node:crypto';

/** 标题 → slug。中文保留拼音前的原字符（v0.1 不做拼音转换）。 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** 估算字数 + 阅读时间。中文按字符算，英文按词算。 */
export function countWords(text: string): { words: number; minutes: number } {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const ascii = text.replace(/[\u4e00-\u9fff]/g, ' ').match(/\b\w+\b/g) ?? [];
  const words = cjk + ascii.length;
  // 中文 ~ 400 字/分钟，英文 ~ 200 词/分钟，混合就取个中间值
  const minutes = Math.max(1, Math.round(words / 300));
  return { words, minutes };
}

/** 内容指纹，用于增量 */
export function hashContent(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

/** 短链：5 字符 base62 */
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateShortId(): string {
  const bytes = randomBytes(5);
  let out = '';
  for (let i = 0; i < 5; i++) {
    const ch = BASE62[bytes[i]! % 62];
    if (ch) out += ch;
  }
  return out;
}

/** 抽到冲突重抽，最多 N 次 */
export function generateUniqueShortId(
  exists: (id: string) => boolean,
  maxRetries = 5,
): string {
  for (let i = 0; i < maxRetries; i++) {
    const id = generateShortId();
    if (!exists(id)) return id;
  }
  throw new Error(`failed to generate unique short_id after ${maxRetries} tries`);
}

/** 从 markdown body 抽取 [[wikilink]] 目标，原样返回 */
export function extractWikilinks(body: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m[1]) out.push(m[1].trim());
  }
  return out;
}

/** 简单 ISO 时间戳 */
export function nowIso(): string {
  return new Date().toISOString();
}

/** 从 markdown body 抽 plain text（用于全文索引和 word count） */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')          // code blocks
    .replace(/`[^`]*`/g, ' ')                  // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')     // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // links
    .replace(/\[\[([^\]|#]+)[^\]]*\]\]/g, '$1') // wikilinks
    .replace(/[#>*_~`-]+/g, ' ')               // markdown punct
    .replace(/\s+/g, ' ')
    .trim();
}
