import { esc } from '../templates/layout.js';

/**
 * 自家广告 / 自我推广卡片(HfAd)。
 * 对应设计稿: doc/prototype/hf-shared.jsx 的 HfAd 组件。
 *
 * 两种 variant:
 *   - 'hero'   — 大块、深色 + 玻璃 glow,放在首页右栏(作者卡和最近笔记之间)。
 *   - 'native' — 紧凑横向,后续在文章流 / 文章中段插入用(本 PR 暂不接入)。
 *
 * 数据来自 config.home.ad(见 core/schema.ts)。当 enabled !== true 时返回空串。
 */

export interface HfAdConfig {
  enabled?: boolean;
  variant?: 'hero' | 'native';
  emoji?: string;
  title: string;
  body?: string;
  cta_label?: string;
  cta_href?: string;
  /** CSS 颜色 token,默认 var(--accent) */
  accent?: string;
}

/** 安全 URL 校验 — 与 inline-md 保持一致的策略,但只允许 http(s) / 根相对(广告通常外链)。 */
function safeHref(href: string | undefined): string | null {
  if (!href) return null;
  const v = href.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('/')) return v;
  return null;
}

/** 简单 CSS 颜色校验,见 inline-md 的 isSafeCssColor — 这里复刻一份精简版避免循环依赖。 */
function safeColor(value: string | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v || v.length > 80) return null;
  if (/[<>"'\\;]|\/\*|\*\//.test(v)) return null;
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  if (/^rgba?\([\d.,\s%/-]+\)$/.test(v)) return v;
  if (/^hsla?\([\d.,\s%/-]+\)$/.test(v)) return v;
  if (/^var\(\s*--[a-zA-Z0-9_-]+(?:\s*,\s*[^()<>"';]+)?\s*\)$/.test(v)) return v;
  if (/^[a-zA-Z]+$/.test(v) && v.length <= 32) return v;
  return null;
}

/**
 * 大版(home 右栏)。CSS 类前缀 `wsa-ad-hero`,样式见 render-site.ts AD_CSS。
 * 当 ad 未启用 / 缺必填字段时返回空串。
 */
export function renderHfAdHero(ad: HfAdConfig | null | undefined): string {
  if (!ad || ad.enabled !== true) return '';
  if (!ad.title) return '';
  const href = safeHref(ad.cta_href);
  const accent = safeColor(ad.accent) ?? 'var(--accent)';
  const accentStyle = ` style="--wsa-ad-accent: ${esc(accent)}"`;
  const emoji = ad.emoji ? `<span class="wsa-ad-hero__emoji" aria-hidden="true">${esc(ad.emoji)}</span>` : '';
  const body = ad.body
    ? `<p class="wsa-ad-hero__body">${esc(ad.body)}</p>`
    : '';
  const cta = ad.cta_label
    ? href
      ? `<a class="ui-btn ui-btn--sm ui-btn--primary wsa-ad-hero__cta" href="${esc(href)}" rel="noopener noreferrer sponsored" target="_blank">${esc(ad.cta_label)} <span aria-hidden="true">→</span></a>`
      : `<span class="ui-btn ui-btn--sm wsa-ad-hero__cta">${esc(ad.cta_label)}</span>`
    : '';

  return `
    <section class="wsa-ad-hero"${accentStyle} aria-label="自家广告">
      <span class="wsa-ad-hero__tag hf-mono hf-tiny" aria-label="赞助">SPONSOR</span>
      <div class="wsa-ad-hero__glow" aria-hidden="true"></div>
      <div class="wsa-ad-hero__inner">
        ${emoji}
        <div class="wsa-ad-hero__title">${esc(ad.title)}</div>
        ${body}
        ${cta}
      </div>
    </section>`;
}

/**
 * 小版(文章流 / 文章中段 inline)。本 PR 仅导出,暂不接入到 article/feed 模板。
 */
export function renderHfAdNative(ad: HfAdConfig | null | undefined): string {
  if (!ad || ad.enabled !== true) return '';
  if (!ad.title) return '';
  const href = safeHref(ad.cta_href);
  const accent = safeColor(ad.accent) ?? 'var(--accent)';
  const accentStyle = ` style="--wsa-ad-accent: ${esc(accent)}"`;
  const emoji = ad.emoji
    ? `<span class="wsa-ad-native__emoji" aria-hidden="true">${esc(ad.emoji)}</span>`
    : '';
  const body = ad.body
    ? `<div class="wsa-ad-native__body">${esc(ad.body)}</div>`
    : '';
  const cta = ad.cta_label
    ? href
      ? `<a class="wsa-ad-native__cta hf-mono" href="${esc(href)}" rel="noopener noreferrer sponsored" target="_blank">${esc(ad.cta_label)} <span aria-hidden="true">→</span></a>`
      : ''
    : '';

  return `
    <aside class="wsa-ad-native"${accentStyle} aria-label="自家广告">
      <span class="wsa-ad-native__tag hf-mono hf-tiny">SPONSOR</span>
      ${emoji}
      <div class="wsa-ad-native__main">
        <div class="wsa-ad-native__title">${esc(ad.title)}</div>
        ${body}
        ${cta}
      </div>
    </aside>`;
}

/**
 * HfAd CSS — 由 render-site 拼到 styles.css 末尾。
 * 设计参考:doc/prototype/hf-shared.jsx HfAd。颜色全走 CSS token,自动适配深浅模式。
 */
export const HF_AD_CSS = `
/* ====================================================================== */
/* HfAd — 自家广告卡片                                                    */
/* ====================================================================== */
.wsa-ad-hero {
  position: relative;
  display: block;
  margin-top: 24px;
  padding: 16px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--ink) 0%, #1a1a1a 100%);
  color: #fff;
  overflow: hidden;
  --wsa-ad-accent: var(--accent);
}
.wsa-ad-hero__tag {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.55);
  letter-spacing: .04em;
  font-size: 10px;
}
.wsa-ad-hero__glow {
  position: absolute;
  top: -30px;
  left: -30px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--wsa-ad-accent);
  filter: blur(40px);
  opacity: .35;
  pointer-events: none;
}
.wsa-ad-hero__inner {
  position: relative;
}
.wsa-ad-hero__emoji {
  display: inline-block;
  font-size: 18px;
  margin-bottom: 6px;
}
.wsa-ad-hero__title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  margin-bottom: 6px;
}
.wsa-ad-hero__body {
  font-size: 11px;
  line-height: 1.55;
  color: rgba(255,255,255,.65);
  margin: 0 0 12px;
}
.wsa-ad-hero__cta {
  background: var(--wsa-ad-accent);
  color: #fff;
  border-color: var(--wsa-ad-accent);
}
.wsa-ad-hero__cta:hover { filter: brightness(1.1); }

.wsa-ad-native {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin: 24px 0;
  padding: 18px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--wsa-ad-accent, var(--accent));
  border-radius: 8px;
  background: var(--bg-soft);
  position: relative;
  --wsa-ad-accent: var(--accent);
}
.wsa-ad-native__tag {
  position: absolute;
  top: 10px;
  right: 14px;
  color: var(--ink-4);
  letter-spacing: .05em;
  font-size: 9px;
}
.wsa-ad-native__emoji {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--ink);
  color: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-weight: 700;
  font-size: 16px;
}
.wsa-ad-native__main {
  flex: 1;
  min-width: 0;
}
.wsa-ad-native__title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 4px;
}
.wsa-ad-native__body {
  font-size: 13px;
  color: var(--ink-3);
  line-height: 1.55;
  margin-bottom: 8px;
}
.wsa-ad-native__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--wsa-ad-accent, var(--accent));
  text-decoration: none;
}
.wsa-ad-native__cta:hover { text-decoration: underline; }

/* dark mode — wsa-ad-native 保持 bg-soft 的 token 自动切换;hero 一直深色不动 */
@media (max-width: 768px) {
  .wsa-ad-hero { padding: 14px; }
  .wsa-ad-native { padding: 14px; gap: 10px; }
  .wsa-ad-native__emoji { width: 36px; height: 36px; font-size: 14px; }
}
`;
