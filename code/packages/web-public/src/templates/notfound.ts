import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { isoDate } from '../partials/shared.js';

export type NotFoundReason = 'missing' | 'private' | 'short-revoked' | 'expired';

export interface NotFoundData {
  /** 4 种 404 场景 */
  reason: NotFoundReason;
  /** 用户尝试访问的 slug 或 short_id(用于诊断卡片) */
  attempted?: string;
  /** 已 resolve 的内部 ID(可选,用于诊断展示) */
  resolvedId?: string;
  /** 推荐文章 — 比如 popular_posts */
  popular?: NoteRow[];
}

const TITLES: Record<NotFoundReason, string> = {
  missing: '这页不存在',
  private: '这页存在 — 但你不该看到它',
  'short-revoked': '短链已被撤销',
  expired: '链接已过期',
};

const SUBTITLES: Record<NotFoundReason, string> = {
  missing: '可能链接失效、URL 拼错了,或者文章已下架。',
  private: '作者把这篇笔记设为了私有。',
  'short-revoked': '这条短链曾经存在,但已被作者撤销。',
  expired: '这条链接已过期 — 可能仅在某段时间内有效。',
};

/**
 * 404 页 — 4 种场景区分
 * 对应设计稿: doc/prototype/hf-extras.jsx §5 HFNotFound
 */
export function renderNotFound(data: NotFoundData, config: SiteConfig): string {
  const { reason, attempted, resolvedId, popular = [] } = data;

  // 诊断卡 — 按 reason 分流
  const diag = diagnosticRows(reason, attempted, resolvedId)
    .map(
      (row) => `
        <div class="wsa-404__diag-row">
          <span class="wsa-404__diag-key" style="color:var(--${row.color})">${esc(row.icon)} ${esc(row.label)}</span>
          <span class="hf-muted">${row.value}</span>
        </div>`,
    )
    .join('');

  const popularHtml = popular
    .slice(0, 3)
    .map((n) => {
      const iso = isoDate(n);
      return `
        <li>
          <a class="wsa-404__alt hf-hover" href="/posts/${esc(n.slug)}.html">
            <div class="wsa-404__alt-title">${esc(n.title)}</div>
            <div class="wsa-404__alt-meta hf-tiny hf-muted">
              <time datetime="${esc(iso)}">${esc(iso)}</time>
              <span aria-hidden="true"> · </span>
              <span aria-label="阅读时长 ${n.reading_minutes} 分钟">${n.reading_minutes} min</span>
            </div>
          </a>
        </li>`;
    })
    .join('');

  const body = `
    <div class="wsa-404">
      <div class="wsa-404__visual" aria-hidden="true">
        <div class="wsa-404__big">4<span style="color:var(--accent)">0</span>4</div>
        <div class="wsa-404__big wsa-404__big--ghost">404</div>
      </div>

      <h1 class="wsa-404__title">${esc(TITLES[reason])}</h1>
      <p class="wsa-404__sub">${esc(SUBTITLES[reason])}</p>

      <section class="wsa-404__diag" aria-label="诊断信息">
        <div class="wsa-side__h hf-mono hf-tiny">▸ 诊断</div>
        <div class="wsa-404__diag-body hf-mono">${diag}</div>
      </section>

      <div class="wsa-404__cta">
        <a class="ui-btn ui-btn--primary" href="/"><span aria-hidden="true">⌂</span> 回首页</a>
        <a class="ui-btn" href="/tags/index.html"><span aria-hidden="true">#</span> 浏览标签</a>
        ${
          config.author.email
            ? `<a class="ui-btn" href="mailto:${esc(config.author.email)}">联系作者</a>`
            : ''
        }
      </div>

      ${
        popularHtml
          ? `<section class="wsa-404__alts" aria-labelledby="wsa-404-alts-h">
              <div id="wsa-404-alts-h" class="wsa-side__h hf-mono hf-tiny">▸ 可能你在找</div>
              <ul class="wsa-404__alts-list">${popularHtml}</ul>
            </section>`
          : ''
      }
    </div>`;

  return layout({
    title: `404 · ${config.site.title}`,
    description: '页面未找到',
    config,
    body,
    noindex: true,
    path: '/404.html',
  });
}

interface DiagRow {
  icon: string;
  label: string;
  color: string;
  value: string;
}

function diagnosticRows(
  reason: NotFoundReason,
  attempted: string | undefined,
  resolvedId: string | undefined,
): DiagRow[] {
  const target = attempted ? esc(attempted) : 'unknown';
  switch (reason) {
    case 'missing':
      return [
        { icon: '✗', label: 'not found', color: 'danger-text', value: `slug = "${target}"` },
        { icon: '·', label: 'hint', color: 'ink-4', value: '检查 URL 拼写,或返回首页搜索' },
      ];
    case 'private':
      return [
        { icon: '✓', label: 'resolved', color: 'ok-text', value: `slug = "${target}"` },
        ...(resolvedId
          ? [{ icon: '✓', label: 'found', color: 'ok-text', value: `note id = ${esc(resolvedId)}` }]
          : []),
        {
          icon: '✗',
          label: 'blocked',
          color: 'danger-text',
          value: `visibility = <b style="color:var(--danger-text)">private</b>`,
        },
        { icon: '·', label: 'hint', color: 'ink-4', value: '需要 owner 设为 public 或 link' },
      ];
    case 'short-revoked':
      return [
        { icon: '✓', label: 'resolved', color: 'ok-text', value: `short_id = "${target}"` },
        {
          icon: '✗',
          label: 'revoked',
          color: 'danger-text',
          value: '该短链已被作者撤销',
        },
        { icon: '·', label: 'hint', color: 'ink-4', value: '查找规范链接(canonical URL)' },
      ];
    case 'expired':
      return [
        { icon: '✓', label: 'resolved', color: 'ok-text', value: `slug = "${target}"` },
        { icon: '✗', label: 'expired', color: 'danger-text', value: '此链接已过期' },
        { icon: '·', label: 'hint', color: 'ink-4', value: '内容仍可能存在,请去首页查看' },
      ];
    default:
      return [];
  }
}
