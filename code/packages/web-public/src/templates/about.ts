import type { SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { renderPageHead, renderSubscribe } from './lumio-design.js';

export function renderAbout(config: SiteConfig): string {
  const description = config.author.bio ?? `${config.site.title} 的技术分享阵地`;
  const body = `
    ${renderPageHead('About', '关于 Lumio', '我们是一群热爱游戏与技术的开发者,在这里记录、分享与沉淀。')}
    <main class="page">
      <p class="about-lead">
        Lumio Game Tech Blog 是 <b>Lumio.games</b> 团队的技术分享阵地。我们相信,把踩过的坑、想明白的原理、打磨过的工具<b>公开地写下来</b>,既能帮到同行,也能让自己走得更稳更远。
      </p>

      <div class="feat-row">
        <div class="feat">
          <div class="feat__icon i-blue" aria-hidden="true">${shieldIcon()}</div>
          <div class="feat__title">实战为先</div>
          <p class="feat__txt">每篇文章都来自真实项目,可复现、能落地,而非纸上谈兵。</p>
        </div>
        <div class="feat">
          <div class="feat__icon i-mint" aria-hidden="true">${sunIcon()}</div>
          <div class="feat__title">原理透彻</div>
          <p class="feat__txt">不止于"怎么做",更讲清"为什么",帮你建立可迁移的认知。</p>
        </div>
        <div class="feat">
          <div class="feat__icon i-amber" aria-hidden="true">${starIcon()}</div>
          <div class="feat__title">持续更新</div>
          <p class="feat__txt">紧跟引擎与硬件演进,保持内容的新鲜度与前瞻性。</p>
        </div>
      </div>

      <h2 class="section-title">核心团队</h2>
      <div class="team">
        ${member('L', '林辰', '主程 · 渲染', 'linear-gradient(160deg,#B6C0FF,#7C8CFF)')}
        ${member('Y', '叶舟', '性能优化', 'linear-gradient(160deg,#8DEBD4,#43C9AD)')}
        ${member('Z', '周岩', '引擎架构', 'linear-gradient(160deg,#FFD08A,#F39A47)')}
        ${member('M', '明月', '工具 · TA', 'linear-gradient(160deg,#C7B6FF,#8E76F0)')}
      </div>

      ${renderSubscribe('想和我们聊聊?', '合作、投稿或交流,欢迎留下你的邮箱', '联系我们')}
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

function member(initial: string, name: string, role: string, background: string): string {
  return `
    <div class="member">
      <div class="member__face" style="background:${esc(background)};">${esc(initial)}</div>
      <div class="member__name">${esc(name)}</div>
      <div class="member__role">${esc(role)}</div>
    </div>`;
}

function shieldIcon(): string {
  return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"></path><path d="M9 12l2 2 4-4"></path></svg>';
}

function sunIcon(): string {
  return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"></path><circle cx="12" cy="12" r="3"></circle></svg>';
}

function starIcon(): string {
  return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 6.5H21l-5.3 4 2 6.5L12 15l-5.7 4 2-6.5L3 8.5h6.6z"></path></svg>';
}
