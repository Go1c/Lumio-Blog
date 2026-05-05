/** Obsidian heading-id slugify(尽量贴近 Obsidian 自身行为)。 */
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\-_]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'h';
}

/** HTML 转义 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 解析单条 wikilink target,得到 { target, anchor, alias }。embed 由调用侧指明。 */
export function splitWikilink(raw: string): { target: string; anchor?: string; alias?: string } {
  // raw: "target#anchor|alias"
  let body = raw;
  let alias: string | undefined;
  const pipe = body.indexOf('|');
  if (pipe >= 0) {
    alias = body.slice(pipe + 1).trim();
    body = body.slice(0, pipe);
  }
  let anchor: string | undefined;
  const hash = body.indexOf('#');
  if (hash >= 0) {
    anchor = body.slice(hash + 1).trim();
    body = body.slice(0, hash);
  }
  const out: { target: string; anchor?: string; alias?: string } = {
    target: body.trim(),
  };
  if (anchor !== undefined) out.anchor = anchor;
  if (alias !== undefined) out.alias = alias;
  return out;
}

/**
 * 把 stem 转成稳定的 anchor id。Obsidian 块引用 `^foo` 也走这个,
 * heading 锚点 `#标题` 走 slugifyHeading。
 */
export function anchorIdFromBlockId(blockId: string): string {
  return `block-${blockId.replace(/[^A-Za-z0-9_-]/g, '')}`;
}
