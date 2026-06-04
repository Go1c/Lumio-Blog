import type { SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { renderPageHead, renderSubscribe } from './lumio-design.js';

export function renderAbout(config: SiteConfig): string {
  const description = config.author.bio ?? `${config.site.title} 的技术分享阵地`;
  const authorName = config.author.name || 'Lumio';
  const authorInitial = authorName.charAt(0).toUpperCase();
  const bio = config.author.bio
    ?? '热爱游戏开发与图形学,专注于渲染与性能优化方向的研究与实践。在这里记录技术成长的点滴,也希望能帮到走在同一条路上的你。';
  const body = `
    ${renderPageHead('About', '关于 Lumio Games', '致力于分享游戏开发领域的技术经验与实践,涵盖渲染、性能、架构、工具链等方向。')}
    <main class="page">
      <p class="about-lead">
        Lumio Game Tech Blog 是 <b>Lumio.games</b> 的技术分享阵地。我们相信,把踩过的坑、想明白的原理、打磨过的工具<b>公开地写下来</b>,既能帮到同行,也能让自己走得更稳更远。
      </p>

      <div class="feat-row">
        <div class="feat">
          <div class="feat__icon i-blue" aria-hidden="true">${uploadIcon()}</div>
          <div class="feat__title">技术分享</div>
          <p class="feat__txt">分享深度技术文章与实战经验,沉淀可复用的工程知识。</p>
        </div>
        <div class="feat">
          <div class="feat__icon i-mint" aria-hidden="true">${shieldIcon()}</div>
          <div class="feat__title">实战导向</div>
          <p class="feat__txt">注重实践落地与项目经验,每篇内容都可复现、能落地。</p>
        </div>
        <div class="feat">
          <div class="feat__icon i-amber" aria-hidden="true">${usersIcon()}</div>
          <div class="feat__title">社区交流</div>
          <p class="feat__txt">与开发者共同学习与成长,在讨论中碰撞出更好的方案。</p>
        </div>
        <div class="feat">
          <div class="feat__icon i-violet" aria-hidden="true">${refreshIcon()}</div>
          <div class="feat__title">持续更新</div>
          <p class="feat__txt">定期更新优质内容,紧跟引擎与硬件演进,保持前瞻性。</p>
        </div>
      </div>

      <div class="about-grid">
        <section class="author-card" aria-label="作者信息">
          <div class="author-card__top">
            <div class="author-card__face" aria-hidden="true">${esc(authorInitial)}</div>
            <div>
              <div class="author-card__name">${esc(authorName)}</div>
              <div class="author-card__role">独立开发者<span class="pip" aria-hidden="true"></span>技术博主</div>
            </div>
          </div>
          <p class="author-card__bio">${esc(bio)}</p>
          <div class="social" aria-label="社交链接">
            <a href="https://github.com/Go1c" aria-label="GitHub">${githubIcon()}</a>
            <a href="/" aria-label="博客">${docIcon()}</a>
            <a href="/feed.xml" aria-label="RSS">${rssIcon()}</a>
            <a href="mailto:hello@lumio.games" aria-label="邮箱">${mailIcon()}</a>
          </div>
        </section>

        <section class="stats" aria-label="站点统计">
          <div class="stat"><div class="stat__n">128+</div><div class="stat__l">文章</div></div>
          <div class="stat"><div class="stat__n">24+</div><div class="stat__l">专栏</div></div>
          <div class="stat"><div class="stat__n">15k+</div><div class="stat__l">读者</div></div>
          <div class="stat"><div class="stat__n">3年+</div><div class="stat__l">持续创作</div></div>
        </section>
      </div>

      ${renderSubscribe('想和我们聊聊?', '合作、投稿或交流,欢迎留下你的邮箱', '联系我们', 'style="margin-top:34px;"')}
    </main>`;

  return layout({
    title: `关于 · ${config.site.title}`,
    description,
    config,
    body,
    active: 'about',
    path: '/about.html',
  });
}

function uploadIcon(): string {
  return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"></path></svg>';
}

function shieldIcon(): string {
  return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"></path><path d="M9 12l2 2 4-4"></path></svg>';
}

function usersIcon(): string {
  return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"></circle><path d="M15 11a3 3 0 1 0 0-6M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M16 15c2.7.3 5 2 5 5"></path></svg>';
}

function refreshIcon(): string {
  return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 7M21 3v4h-4"></path></svg>';
}

function githubIcon(): string {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2A10 10 0 0 0 8.8 21.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.5-1.1-4.5-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.5 5 .3.3.6.9.6 1.8v2.7c0 .3.2.6.7.5A10 10 0 0 0 12 2z"></path></svg>';
}

function docIcon(): string {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h11l5 5v11H4z"></path><path d="M14 4v5h5M8 13h8M8 17h6"></path></svg>';
}

function rssIcon(): string {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none"></circle></svg>';
}

function mailIcon(): string {
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"></rect><path d="m4 7 8 5 8-5"></path></svg>';
}
