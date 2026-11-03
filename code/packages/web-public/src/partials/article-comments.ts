import type { SiteConfig } from '@opennote/core';
import { esc } from '../templates/layout.js';

/**
 * 文章评论区 — 不登录,名字 = 「苦逼瞬间」+ 职能,走本地后端 (/api/posts/:slug/comments)
 *
 * 设计稿:doc/prototype/hub-v1/index.html 的 `data-cmt` 段;文字说明见 doc/devdoc/blog-hub-plan.md §3.5
 *
 * - 职能下拉、苦逼瞬间库、骰子、localStorage 记名字都在 public/comments.js
 * - GET 拉 approved 列表,POST 投到 pending 队列等审核;自己刚发的评论标「· 审核后公开」
 * - 若 features.comments === false → 调用方应 skip 整块
 */
export interface CommentsConfig {
  /** 文章 slug — 用于本地评论接口 /api/posts/:slug/comments */
  slug: string;
}

const DICE_ICON =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/></svg>';

/**
 * 渲染文章评论区。
 *
 * 调用方需:
 *  1. 检查 `config.features?.comments !== false`
 *  2. 把返回的 HTML 嵌入到 `#comments` 容器
 */
export function renderArticleComments(opts: CommentsConfig, _config: SiteConfig): string {
  return `
    <div class="cmt" data-cmt data-component="comments" data-slug="${esc(opts.slug)}">
      <h2 class="cmt__title">评论 <span data-cmt-count aria-label="评论数">0</span></h2>
      <form class="cmt__form" data-cmt-form aria-label="发表评论" novalidate>
        <div class="cmt__who">
          <span class="cmt__avatar" data-cmt-avatar aria-hidden="true">路</span>
          <input class="cmt__name" data-cmt-state type="text" maxlength="16" placeholder="打包等了一小时的" aria-label="你的状态" autocomplete="off">
          <select class="cmt__role" data-cmt-role aria-label="你的职能"></select>
          <button type="button" class="cmt__dice" data-cmt-dice title="换一个这个职能的苦逼瞬间" aria-label="换一个这个职能的苦逼瞬间">${DICE_ICON}</button>
        </div>
        <textarea class="cmt__body" data-cmt-body rows="3" maxlength="4000" placeholder="说点什么…" aria-label="评论内容"></textarea>
        <div class="cmt__actions">
          <span class="cmt__err" data-cmt-err role="alert" aria-live="assertive"></span>
          <button type="submit" class="cmt__send" data-cmt-send>发布</button>
        </div>
      </form>
      <ol class="cmt__list" data-cmt-list aria-label="评论列表" aria-live="polite"></ol>
      <p class="cmt__empty" data-cmt-empty hidden>还没有人留言，来当第一个</p>
    </div>

    <script src="/comments.js" defer></script>`;
}
