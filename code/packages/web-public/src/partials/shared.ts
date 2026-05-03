import type { NoteRow } from '@opennote/core';
import { esc } from '../templates/layout.js';

/** ISO 日期 (YYYY-MM-DD) */
export function isoDate(n: NoteRow): string {
  return (n.published_at ?? n.updated_at).slice(0, 10);
}

/** 短日期 (MM-DD) */
export function shortDate(iso: string): string {
  return iso.length >= 10 ? iso.slice(5, 10) : iso;
}

/** 取得文章主标签(用于"系列") */
export function pickPrimaryTag(byTag: Map<string, NoteRow[]>, slug: string): string | null {
  for (const [tag, notes] of byTag) {
    if (notes.some((n) => n.slug === slug)) return tag;
  }
  return null;
}

/** 渲染单个标签 chip(链接) */
export function tagChip(tag: string, opts: { hot?: boolean; size?: 'sm' } = {}): string {
  const cls = `ui-tag${opts.hot ? ' ui-tag--accent' : ''}`;
  const style = opts.size === 'sm' ? ' style="font-size:11px"' : '';
  return `<a class="${cls}" href="/tags/${esc(encodeURIComponent(tag))}.html"${style}>#${esc(tag)}</a>`;
}

/** 文章卡片 — 横排紧凑列表(home / tag 复用) */
export function compactArticleRow(n: NoteRow): string {
  const iso = isoDate(n);
  return `
    <article class="wsa-row">
      <time datetime="${esc(iso)}" class="wsa-row__date hf-mono hf-tiny hf-faint">${esc(shortDate(iso))}</time>
      <div class="wsa-row__main">
        <h3 class="wsa-row__title"><a href="/posts/${esc(n.slug)}.html">${esc(n.title)}</a></h3>
        ${n.summary ? `<p class="wsa-row__sum">${esc(n.summary)}</p>` : ''}
      </div>
      <div class="wsa-row__meta hf-mono hf-tiny hf-faint" aria-hidden="true">
        ${n.reading_minutes} min<br>${n.word_count} 字
      </div>
      <span class="sr-only">阅读时长 ${n.reading_minutes} 分钟,共 ${n.word_count} 字</span>
    </article>`;
}

/** 安全获取 NoteRow 标签集合(从 byTag map 倒查) */
export function tagsForSlug(byTag: Map<string, NoteRow[]>, slug: string): string[] {
  const out: string[] = [];
  for (const [tag, notes] of byTag) {
    if (notes.some((n) => n.slug === slug)) out.push(tag);
  }
  return out;
}
