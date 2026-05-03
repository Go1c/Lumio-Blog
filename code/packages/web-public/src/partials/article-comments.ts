import type { SiteConfig } from '@opennote/core';
import { esc } from '../templates/layout.js';

/**
 * 文章侧栏评论 — 飞书风划词高亮 + Giscus 后端
 *
 * 设计稿:doc/prototype/hf-article.jsx 评论 rail + hf-extras.jsx §1
 *
 * - 选中正文文本 → 浮 bubble(复制 / 高亮 / 评论)
 * - 高亮的句子 ↔ 右侧评论卡通过 `data-mid` 关联
 * - 评论 hover 时左侧高亮变 active(JS 处理)
 * - 后端走 Giscus(GitHub Discussions),客户端引入 giscus.js 拉数据,
 *   但 UI 完全自定义,不直接渲染 giscus 默认 widget
 * - 若 features.comments === false → 调用方应 skip 整块
 */
export interface CommentsConfig {
  /** Giscus repo,例如 `lumio/lumio-blog` */
  repo?: string;
  /** Giscus repo id */
  repoId?: string;
  /** Giscus category */
  category?: string;
  /** Giscus category id */
  categoryId?: string;
  /** 文章标识,用作 mapping(默认 pathname) */
  mapping?: 'pathname' | 'url' | 'title';
  /** 文章 slug — 用于映射到 GitHub Discussion */
  slug: string;
}

/**
 * 渲染文章评论侧栏。
 *
 * 调用方需:
 *  1. 检查 `config.features?.comments !== false`
 *  2. 把返回的 HTML 嵌入到 `<aside id="comments">` 容器
 */
export function renderArticleComments(opts: CommentsConfig, _config: SiteConfig): string {
  const repo = opts.repo ?? '';
  const repoId = opts.repoId ?? '';
  const category = opts.category ?? 'Comments';
  const categoryId = opts.categoryId ?? '';
  const mapping = opts.mapping ?? 'pathname';

  // 把 giscus 配置作为 data-* 属性,客户端 JS 读取
  const dataAttrs = [
    `data-component="comments"`,
    `data-giscus-repo="${esc(repo)}"`,
    `data-giscus-repo-id="${esc(repoId)}"`,
    `data-giscus-category="${esc(category)}"`,
    `data-giscus-category-id="${esc(categoryId)}"`,
    `data-giscus-mapping="${esc(mapping)}"`,
    `data-slug="${esc(opts.slug)}"`,
  ].join(' ');

  return `
    <div class="wsb-comments" ${dataAttrs}>
      <div class="wsb-comments__sticky">
        <header class="wsb-comments__head">
          <h2 class="wsb-comments__title">
            <span aria-hidden="true">💬</span> 评论
            <span class="hf-mono hf-tiny" data-count aria-label="评论数">0</span>
          </h2>
          <div class="hf-grow"></div>
          <span class="ui-tag" style="font-size:11px;font-family:var(--mono)">Giscus</span>
        </header>

        <div class="wsb-comments__hint hf-tiny hf-muted">
          <span aria-hidden="true">💡</span>
          选中正文可<b>划线评论</b> — 点击高亮跳转到对应评论
        </div>

        <ol class="wsb-comments__list" id="wsb-comments-list" aria-label="评论列表" aria-live="polite"></ol>

        <div class="wsb-comments__empty" data-empty>
          <p class="hf-tiny hf-muted">暂无评论 — 选中段落或在下方留下第一条想法</p>
        </div>

        <form class="wsb-comments__compose" data-compose aria-label="发表评论" novalidate>
          <span class="wsb-comments__avatar" aria-hidden="true">?</span>
          <label for="wsb-comments-input" class="sr-only">写下你的评论</label>
          <input
            id="wsb-comments-input"
            class="wsb-comments__input"
            type="text"
            placeholder="选段评论 · 或全文评论…"
            autocomplete="off"
          >
          <button type="submit" class="ui-btn ui-btn--sm ui-btn--primary" data-submit>发布</button>
          <p class="wsb-comments__error hf-tiny" role="alert" aria-live="assertive" data-error hidden></p>
        </form>

        <footer class="wsb-comments__foot hf-tiny hf-faint">
          后端:GitHub Discussions ·
          <a id="wsb-comments-login" href="#" rel="nofollow noopener">登录 GitHub</a>
        </footer>
      </div>
    </div>

    <!-- 选中文本浮 bubble — 由 comments.js 控制 visibility / position -->
    <div class="wsb-selbubble" id="wsb-selbubble" role="toolbar" aria-label="选中操作" hidden>
      <button type="button" data-action="copy" aria-label="复制选中文本"><span aria-hidden="true">📋</span> 复制</button>
      <span class="wsb-selbubble__sep" aria-hidden="true"></span>
      <button type="button" data-action="highlight" aria-label="高亮选中文本"><span class="wsb-selbubble__swatch" aria-hidden="true"></span> 高亮</button>
      <span class="wsb-selbubble__sep" aria-hidden="true"></span>
      <button type="button" data-action="comment" aria-label="评论选中文本"><span aria-hidden="true">💬</span> 评论</button>
    </div>

    <script src="/comments.js" defer></script>`;
}
