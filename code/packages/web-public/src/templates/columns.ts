import type { HfAdSettings, NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { renderEmptyState, renderPageHead } from './lumio-design.js';

const TONES = ['t-blue', 't-mint', 't-amber', 't-violet'] as const;

const COLUMN_ART = '<div class="cube float" style="--s:34px; left:40%; top:42%;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div><div class="cube c-mint float" style="--s:24px; left:58%; top:58%; animation-delay:-1.3s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>';

interface Column {
  name: string;
  notes: NoteRow[];
}

/**
 * 专栏页 — 专栏 = Obsidian vault 一级目录(含至少一篇公开文章)。
 * 不再渲染静态 demo 专栏:无文章 → 空态;有文章但都在根目录 → "还没有专栏"。
 */
export function renderColumns(
  posts: NoteRow[],
  _byTag: Map<string, NoteRow[]>,
  config: SiteConfig,
): string {
  const head = renderPageHead(
    'Columns',
    '技术专栏',
    '成体系的系列文章,跟随专栏由浅入深,系统掌握一个领域。',
  );
  const ads = renderColumnAds(config);
  const columns = groupByTopFolder(posts);

  let main: string;
  if (posts.length === 0) {
    main = renderEmptyState(
      '暂无公开专栏',
      '当前没有设为公开的笔记。把后台笔记可见性切回公开后,这里会重新显示专栏。',
    );
  } else if (columns.length === 0) {
    main = renderEmptyState(
      '还没有专栏',
      '专栏来自 Obsidian vault 一级目录。把文章放进某个一级子目录(如 Rendering/、AI/),这里就会自动生成对应专栏。',
    );
  } else {
    const meta = `<div class="cols__meta">${columns.length} 个真实专栏</div>`;
    const cards = columns.map((column, i) => renderColumnCard(column, TONES[i % TONES.length]!)).join('');
    main = `${meta}<div class="cols">${cards}</div>`;
  }

  const body = `
    ${head}
    <main class="page">
      ${ads}
      ${main}
    </main>`;

  return layout({
    title: `专栏 · ${config.site.title}`,
    description: '技术专栏',
    config,
    body,
    active: 'columns',
  });
}

/** 按 source_path 一级目录分组;根目录文件(无 `/`)不构成专栏。 */
function groupByTopFolder(posts: NoteRow[]): Column[] {
  const groups = new Map<string, NoteRow[]>();
  for (const post of posts) {
    const segs = (post.source_path ?? '').split('/');
    if (segs.length < 2) continue;
    const folder = segs[0]?.trim();
    if (!folder) continue;
    const bucket = groups.get(folder);
    if (bucket) bucket.push(post);
    else groups.set(folder, [post]);
  }
  return [...groups.entries()]
    .map(([name, notes]) => ({ name, notes }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderColumnCard(column: Column, tone: string): string {
  const recent = column.notes
    .slice()
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, 3)
    .map((n) => `<li>${esc(n.title)}</li>`)
    .join('');
  return `
    <a class="col-card" href="/articles/index.html?cat=${encodeURIComponent(column.name)}">
      <div class="col-card__cover thumb ${esc(tone)}">
        <div class="thumb__grid" aria-hidden="true"></div>
        <div class="thumb__art" aria-hidden="true">${COLUMN_ART}</div>
      </div>
      <div class="col-card__body">
        <div class="col-card__name">${esc(column.name)}</div>
        <ul class="col-card__list">${recent}</ul>
        <div class="col-card__foot">
          <span class="col-card__count">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 3h10v10H3z"></path><path d="M3 6.5h10M6.5 6.5V13"></path></svg>
            ${column.notes.length} 篇文章
          </span>
          <span class="btn-ghost">进入专栏</span>
        </div>
      </div>
    </a>`;
}

/** slot=column 的广告,渲染在专栏网格上方。 */
function renderColumnAds(config: SiteConfig): string {
  const ads = (config.home?.ads ?? []).filter(
    (ad: HfAdSettings) => ad.enabled !== false && ad.slot === 'column',
  );
  if (ads.length === 0) return '';
  const cards = ads
    .map((ad) => {
      const tone = ad.tone ?? 'blue';
      const href = ad.cta_href && /^https?:\/\//i.test(ad.cta_href) ? ad.cta_href : '#';
      return `
      <a class="col-ad t-${esc(tone)}" data-ad-slot="column" href="${esc(href)}" target="_blank" rel="noopener sponsored">
        <span class="ad__label">赞助 · Sponsored</span>
        <span class="col-ad__title">${esc(ad.title)}</span>
        ${ad.body ? `<span class="col-ad__body">${esc(ad.body)}</span>` : ''}
        ${ad.cta_label ? `<span class="col-ad__cta">${esc(ad.cta_label)}</span>` : ''}
      </a>`;
    })
    .join('');
  return `<div class="col-ads" aria-label="赞助广告">${cards}</div>`;
}
