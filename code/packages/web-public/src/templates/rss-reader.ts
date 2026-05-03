import type { SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';

interface FeedEntry {
  name: string;
  url: string;
  fmt: string;
  recommended?: string;
}

interface ReaderEntry {
  name: string;
  color: string;
  url: (feedUrl: string) => string;
}

/**
 * RSS / Atom / JSON Feed 美化阅读页 — `/feed/`
 * 对应设计稿:doc/prototype/hf-extras2.jsx §7 HFRssPage
 *
 * 注:目前只有 /feed.xml(RSS 2.0)真实存在;Atom/JSON 链到同一个 feed.xml,
 *     等 WS-B 增 atom.xml / feed.json 后再切。前端 UI 已布局好。
 */
export function renderRssReader(config: SiteConfig): string {
  const siteUrl = config.site.url.replace(/\/+$/, '');

  const feeds: FeedEntry[] = [
    { name: '全部文章', url: '/feed.xml', fmt: 'RSS 2.0', recommended: '默认推荐' },
    { name: '全部文章', url: '/feed.xml', fmt: 'Atom 1.0' },
    { name: '全部文章', url: '/feed.xml', fmt: 'JSON Feed' },
  ];

  const readers: ReaderEntry[] = [
    {
      name: 'Feedly',
      color: '#2bb24c',
      url: (u) => `https://feedly.com/i/subscription/feed/${encodeURIComponent(u)}`,
    },
    {
      name: 'Inoreader',
      color: '#1976d2',
      url: (u) => `https://www.inoreader.com/?add_feed=${encodeURIComponent(u)}`,
    },
    {
      name: 'NewsBlur',
      color: '#3878d6',
      url: (u) => `https://newsblur.com/?url=${encodeURIComponent(u)}`,
    },
    {
      name: 'The Old Reader',
      color: '#0a7cff',
      url: (u) => `https://theoldreader.com/feeds/subscribe?url=${encodeURIComponent(u)}`,
    },
  ];

  const feedRows = feeds
    .map((f, i) => {
      const fullUrl = `${siteUrl}${f.url}`;
      const recBadge = f.recommended
        ? `<span class="ui-tag ui-tag--accent" style="font-size:10px">${esc(f.recommended)}</span>`
        : '';
      return `
        <li class="wsc-feed-row${f.recommended ? ' wsc-feed-row--rec' : ''}">
          <div class="wsc-feed-row__main">
            <div class="wsc-feed-row__head">
              <span class="wsc-feed-row__name">${esc(f.name)}</span>
              <span class="ui-tag" style="font-size:10px">${esc(f.fmt)}</span>
              ${recBadge}
            </div>
            <code class="wsc-feed-row__url hf-mono hf-tiny">${esc(fullUrl)}</code>
          </div>
          <div class="wsc-feed-row__actions">
            <button type="button"
              class="ui-btn ui-btn--sm wsc-feed-copy"
              data-url="${esc(fullUrl)}"
              data-idx="${i}"
              aria-label="复制 ${esc(f.name)} (${esc(f.fmt)}) 的 URL">
              <span aria-hidden="true">⧉</span> 复制
            </button>
            <a class="ui-btn ui-btn--sm ui-btn--primary"
              href="${esc(f.url)}"
              aria-label="在浏览器中打开 ${esc(f.name)} (${esc(f.fmt)})">
              订阅 <span aria-hidden="true">→</span>
            </a>
          </div>
        </li>`;
    })
    .join('');

  // 一键添加到第三方阅读器
  const defaultFeed = `${siteUrl}/feed.xml`;
  const readerCells = readers
    .map(
      (r) => `
        <li>
          <a class="wsc-reader hf-hover"
            href="${esc(r.url(defaultFeed))}"
            target="_blank" rel="noopener noreferrer"
            aria-label="在 ${esc(r.name)} 中订阅">
            <span class="wsc-reader__dot" aria-hidden="true" style="background:${esc(r.color)}"></span>
            <span class="wsc-reader__name">${esc(r.name)}</span>
            <span class="wsc-reader__arrow" aria-hidden="true">→</span>
          </a>
        </li>`,
    )
    .join('');

  // 客户端复制脚本(不依赖外部 JS)
  const script = `<script>
    (function(){
      var btns = document.querySelectorAll('.wsc-feed-copy');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function(e){
          var btn = e.currentTarget;
          var url = btn.getAttribute('data-url');
          if (!url) return;
          var done = function(){
            var prev = btn.innerHTML;
            btn.innerHTML = '<span aria-hidden="true">✓</span> 已复制';
            btn.setAttribute('aria-label', '已复制');
            setTimeout(function(){ btn.innerHTML = prev; btn.setAttribute('aria-label', '复制 URL'); }, 1500);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done, function(){});
          } else {
            try {
              var ta = document.createElement('textarea');
              ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
              document.body.appendChild(ta); ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
              done();
            } catch (err) {}
          }
        });
      }
    })();
  </script>`;

  const body = `
    <div class="wsc-rss">
      <header class="wsc-rss__head">
        <div class="wsc-rss__icon" aria-hidden="true">RSS</div>
        <div class="wsc-rss__head-text">
          <div class="hf-mono hf-tiny hf-muted">RSS · Atom · JSON Feed</div>
          <h1 class="wsc-rss__title">用 RSS 订阅</h1>
        </div>
      </header>

      <p class="wsc-rss__lede">
        我相信开放 web。这里所有内容都有 RSS——选你喜欢的工具,把链接粘进去就行。
      </p>

      <h2 class="wsc-rss__sec-h hf-mono hf-tiny">▸ Feed URL</h2>
      <ul class="wsc-rss__feeds" aria-label="可用的 feed 链接">
        ${feedRows}
      </ul>

      <h2 class="wsc-rss__sec-h hf-mono hf-tiny">▸ 一键添加到</h2>
      <ul class="wsc-rss__readers" aria-label="第三方 RSS 阅读器">
        ${readerCells}
      </ul>

      <h2 class="wsc-rss__sec-h hf-mono hf-tiny">▸ 不知道 RSS 是什么?</h2>
      <div class="wsc-rss__about ui-card">
        <p class="hf-sm">
          RSS 是一种让你在 <b>不打开网站</b> 的情况下追新内容的格式。
          挑一个阅读器(上面那些都行),把
          <code class="hf-mono hf-tiny">${esc(defaultFeed)}</code> 粘进去,
          以后我发新文章它就会自动收到。
        </p>
        <p class="hf-sm hf-muted" style="margin-top:8px">
          没有算法、没有跟踪、没有广告。
        </p>
      </div>
    </div>
    ${script}`;

  return layout({
    title: `RSS 订阅 · ${config.site.title}`,
    description: '通过 RSS / Atom / JSON Feed 订阅本站内容',
    config,
    body,
    active: 'home',
  });
}

/**
 * WS-C — RSS 阅读页样式 + 移动端覆写。
 * 由 render-site.ts 拼接到全站 styles.css 末尾。
 */
export const RSS_READER_CSS = `
/* ====================================================================== */
/* WS-C — RSS 阅读页 (/feed/)                                                */
/* ====================================================================== */

.wsc-rss { max-width: 760px; margin: 0 auto; padding: 48px 24px 80px; }
.wsc-rss__head {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 18px;
}
.wsc-rss__icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #fff; font-family: var(--mono); font-weight: 800; font-size: 11px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(249, 115, 22, .35);
  flex-shrink: 0;
}
.wsc-rss__head-text { min-width: 0; }
.wsc-rss__title {
  font-size: 30px; font-weight: 800; margin: 2px 0 0;
  letter-spacing: -0.01em; line-height: 1.15;
}
.wsc-rss__lede {
  font-size: 15px; color: var(--ink-3);
  line-height: 1.7; margin: 0 0 32px;
}
.wsc-rss__sec-h {
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: .05em;
  font-size: 11px;
  margin: 32px 0 8px;
  font-weight: 600;
}
.wsc-rss__feeds {
  list-style: none; padding: 0; margin: 0 0 8px;
  display: flex; flex-direction: column; gap: 8px;
}
.wsc-feed-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
}
.wsc-feed-row--rec { border-color: var(--accent); }
.wsc-feed-row__main { flex: 1; min-width: 0; }
.wsc-feed-row__head {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap;
}
.wsc-feed-row__name { font-size: 14px; font-weight: 500; color: var(--ink); }
.wsc-feed-row__url {
  display: block; margin-top: 4px;
  color: var(--ink-3);
  word-break: break-all;
  font-size: 11px;
  background: none; padding: 0;
}
.wsc-feed-row__actions {
  display: flex; gap: 6px; align-items: center;
  flex-shrink: 0;
}
.wsc-rss__readers {
  list-style: none; padding: 0; margin: 0 0 8px;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
}
.wsc-reader {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 13px;
  text-decoration: none;
  color: var(--ink);
}
.wsc-reader__dot {
  width: 8px; height: 8px; border-radius: 50%;
  flex-shrink: 0;
}
.wsc-reader__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wsc-reader__arrow { color: var(--ink-3); font-family: var(--mono); font-size: 12px; }
.wsc-rss__about { padding: 16px; margin-top: 4px; }
.wsc-rss__about p { margin: 0; }
.wsc-rss__about code {
  background: var(--bg-sunk);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--accent);
  word-break: break-all;
}

@media (max-width: 768px) {
  .wsc-rss { padding: 32px 16px 64px; }
  .wsc-rss__title { font-size: 24px; }
  .wsc-rss__lede { font-size: 14px; margin-bottom: 24px; }
  .wsc-feed-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .wsc-feed-row__actions {
    justify-content: flex-end;
  }
  .wsc-feed-row__actions .ui-btn { min-height: 36px; }
  .wsc-rss__readers { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 380px) {
  .wsc-rss { padding-left: 14px; padding-right: 14px; }
  .wsc-rss__title { font-size: 22px; }
  .wsc-rss__readers { grid-template-columns: 1fr; }
}
`;
