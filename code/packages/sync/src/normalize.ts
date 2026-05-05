import {
  type NormalizedNote,
  type NoteKind,
  type ParsedNote,
  type Visibility,
  countWords,
  enforceVisibilityRules,
  slugify,
  stripMarkdown,
} from '@opennote/core';

export interface NormalizeWarning {
  source_path: string;
  message: string;
}

/** 去掉 markdown body 前导的第一个 `# heading` 行(连同它后面的空行)。 */
function stripLeadingH1(body: string): string {
  const lines = body.split('\n');
  let i = 0;
  // 先跳过开头空白行
  while (i < lines.length && lines[i]!.trim() === '') i++;
  // 必须命中 `# heading`(不是 `##`/`###`)
  if (i < lines.length && /^#\s+\S/.test(lines[i] ?? '')) {
    i++;
    // 吃掉紧跟其后的一行空白
    while (i < lines.length && lines[i]!.trim() === '') i++;
    return lines.slice(i).join('\n');
  }
  return body;
}

/**
 * 把 ParsedNote 补默认值、跑约束、算字数。
 * 不分配 short_id（那要查 db，留给 pipeline）。
 */
export function normalize(p: ParsedNote & { kind?: NoteKind }): {
  note: NormalizedNote;
  warnings: NormalizeWarning[];
} {
  const warnings: NormalizeWarning[] = [];

  const fm = p.frontmatter;
  const kind: NoteKind = p.kind ?? 'markdown';
  const fileStem = p.source_path.split('/').pop()?.replace(/\.(md|markdown|canvas|html|htm)$/i, '') ?? 'untitled';
  const firstH1 = kind === 'markdown' ? p.body.match(/^#\s+(.+)$/m)?.[1]?.trim() : undefined;
  const title =
    fm.title ??
    firstH1 ??
    fileStem;

  // 去重 h1:文章页模板自己渲染 .wsa-post__title 显示 note.title。
  // 如果 markdown body 第一行也是同一个 # 标题(Obsidian 默认就这么写),
  // 渲染出来会有两个一模一样的大标题。这里在 normalize 阶段把它从 body 剥掉。
  // 仅当首个 h1 文本等于最终 title 时才剥,避免误伤真有「另起一个 h1」的极端用法。
  if (kind === 'markdown' && firstH1 && firstH1 === title) {
    p = { ...p, body: stripLeadingH1(p.body) };
  }

  const slug = fm.slug ?? slugify(title);
  const visibility: Visibility = fm.visibility ?? 'private';

  const requestedSearchable = fm.searchable ?? visibility === 'public';
  const { searchable, warning } = enforceVisibilityRules(visibility, requestedSearchable);
  if (warning) warnings.push({ source_path: p.source_path, message: warning });

  // 4 维 searchable — frontmatter 没显式给 → 跟 searchable 走;link-only/private 强制 false。
  const restricted = visibility === 'link-only' || visibility === 'private';
  const seoIndexable = restricted ? false : (fm.seo_indexable ?? searchable);
  const rssIncludable = restricted ? false : (fm.rss_includable ?? searchable);
  const featuredOnHome = restricted ? false : (fm.featured_on_home ?? false);

  const tags = (fm.tags ?? []).filter((t) => typeof t === 'string');
  // canvas / html 走自己的字数估算(后面 pipeline 渲染好后,从 plain text 重新算)
  const plain = kind === 'markdown' ? stripMarkdown(p.body) : '';
  const { words, minutes } = countWords(plain);

  return {
    note: {
      ...p,
      kind,
      slug,
      title,
      visibility,
      searchable,
      seo_indexable: seoIndexable,
      rss_includable: rssIncludable,
      featured_on_home: featuredOnHome,
      short_id: fm.short_id ?? null,
      tags,
      word_count: words,
      reading_minutes: minutes,
    },
    warnings,
  };
}
