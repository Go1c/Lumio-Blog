import type { SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';

/**
 * About 页 — config-driven 作者页
 * 对应设计稿: doc/prototype/hf-extras2.jsx §15 HFAbout
 */
export function renderAbout(config: SiteConfig): string {
  const a = config.author;
  const avatarChar = (a.name || 'L').charAt(0).toUpperCase();

  // bio: 优先 bio_md(简化:仅支持纯段落,不解析 markdown — 由 server 端预渲染),否则 bio
  const bioHtml = a.bio_md
    ? `<div class="wsa-about__bio">${renderSimpleParagraphs(a.bio_md)}</div>`
    : a.bio
      ? `<div class="wsa-about__bio"><p>${esc(a.bio)}</p></div>`
      : '';

  // 联系方式 — email + social
  const contactRows: Array<{ platform: string; handle: string; href: string; icon: string }> = [];
  if (a.email) {
    contactRows.push({
      platform: 'Email',
      handle: a.email,
      href: `mailto:${a.email}`,
      icon: '📧',
    });
  }
  for (const s of a.social ?? []) {
    contactRows.push({
      platform: s.platform,
      handle: extractHandle(s.url),
      href: s.url,
      icon: socialIcon(s.platform),
    });
  }

  const contactHtml = contactRows.length
    ? `<ul class="wsa-about__contact" aria-label="联系方式">
        ${contactRows
          .map(
            (r) => `
            <li>
              <a class="wsa-about__contact-row hf-hover" href="${esc(r.href)}" rel="noopener noreferrer">
                <span class="wsa-about__contact-platform" style="font-size:13px;color:var(--ink-3)"><span aria-hidden="true">${esc(r.icon)}</span> ${esc(r.platform)}</span>
                <span class="hf-mono hf-sm wsa-about__contact-handle">${esc(r.handle)}</span>
              </a>
            </li>`,
          )
          .join('')}
      </ul>`
    : '';

  // 订阅 / 关注 — RSS + Newsletter (如果开启)
  const subscribeRows: string[] = [];
  subscribeRows.push(
    `<a class="ui-btn" href="/feed.xml" aria-label="订阅 RSS"><span aria-hidden="true">📡</span> RSS</a>`,
  );
  if (config.features?.newsletter) {
    subscribeRows.push(
      `<a class="ui-btn" href="/newsletter" aria-label="订阅邮件通讯"><span aria-hidden="true">📬</span> Newsletter</a>`,
    );
  }
  const githubLink = (a.social ?? []).find((s) => /github/i.test(s.platform));
  if (githubLink) {
    subscribeRows.push(
      `<a class="ui-btn" href="${esc(githubLink.url)}" rel="noopener noreferrer" aria-label="GitHub"><span aria-hidden="true">🐙</span> GitHub</a>`,
    );
  }

  const description = a.bio ?? `${a.name} · ${config.site.title}`;

  const body = `
    <div class="wsa-about">
      <div class="wsa-about__hero">
        <div class="wsa-about__avatar" aria-hidden="true">${esc(avatarChar)}</div>
        <div>
          <div class="hf-mono hf-tiny hf-muted wsa-about__pre">About</div>
          <h1 class="wsa-about__title">嘿,我是 ${esc(a.name)}</h1>
          ${a.bio ? `<div class="wsa-about__sub hf-sm hf-muted">${esc(a.bio)}</div>` : ''}
        </div>
      </div>

      ${bioHtml}

      ${
        contactHtml
          ? `<div class="wsa-side__h hf-mono hf-tiny wsa-about__sec-h">▸ 联系我</div>
             <div class="wsa-about__card ui-card">${contactHtml}</div>`
          : ''
      }

      <div class="wsa-side__h hf-mono hf-tiny wsa-about__sec-h">▸ 订阅 / 关注</div>
      <div class="wsa-about__subscribe">${subscribeRows.join('')}</div>
    </div>`;

  return layout({
    title: `关于 · ${config.site.title}`,
    description,
    config,
    body,
    active: 'about',
    path: '/about.html',
  });
}

/** 极简 markdown:把空行分隔的段落转成 <p>;不解析行内 */
function renderSimpleParagraphs(md: string): string {
  return md
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function extractHandle(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+|\/+$/g, '');
    return path ? `@${path.split('/')[0]}` : u.hostname;
  } catch {
    return url;
  }
}

function socialIcon(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes('github')) return '🐙';
  if (p.includes('twitter') || p === 'x') return '💬';
  if (p.includes('mastodon')) return '🐘';
  if (p.includes('mail')) return '📧';
  if (p.includes('rss')) return '📡';
  return '🔗';
}
