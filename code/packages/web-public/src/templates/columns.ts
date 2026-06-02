import type { NoteRow, SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';
import { buildLumioArticles, renderPageHead } from './lumio-design.js';

interface ColumnItem {
  name: string;
  desc: string;
  cat: string;
  tone: string;
  art: string;
  fallbackCount: number;
}

const COLUMNS: ColumnItem[] = [
  {
    name: '渲染管线精讲',
    desc: '从光栅化到延迟渲染,逐篇拆解现代渲染管线的核心机制。',
    cat: '渲染',
    tone: 't-blue',
    fallbackCount: 9,
    art: '<div class="cube float" style="--s:34px; left:38%; top:40%;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div><div class="cube c-mint float" style="--s:24px; left:56%; top:58%; animation-delay:-1.3s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>',
  },
  {
    name: '性能优化之道',
    desc: 'CPU、GPU、内存、加载,全链路性能优化的实战方法论。',
    cat: '性能',
    tone: 't-mint',
    fallbackCount: 7,
    art: '<div class="cube c-mint float" style="--s:38px; left:50%; top:46%; margin:-19px 0 0 -19px;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>',
  },
  {
    name: 'Shader 实验室',
    desc: '用一系列可运行的案例,带你从零写出炫酷的着色器效果。',
    cat: '图形学',
    tone: 't-amber',
    fallbackCount: 6,
    art: '<div class="orb" style="left:32%;top:28%;"></div>',
  },
  {
    name: '架构演进实录',
    desc: '真实项目中架构如何随规模演进,踩过的坑与得到的经验。',
    cat: '架构',
    tone: 't-violet',
    fallbackCount: 8,
    art: '<div class="cube float" style="--s:28px; left:30%; top:36%; --t:#D9D2FF; --r:#B5A6FF; --l:#8E76F0;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div><div class="cube float" style="--s:28px; left:54%; top:52%; --t:#D9D2FF; --r:#B5A6FF; --l:#8E76F0; animation-delay:-1.6s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>',
  },
];

export function renderColumns(
  posts: NoteRow[],
  byTag: Map<string, NoteRow[]>,
  config: SiteConfig,
): string {
  const articles = buildLumioArticles(posts, byTag);
  const countFor = (cat: string, fallback: number) => {
    const n = articles.filter((article) => article.category === cat).length;
    return n || fallback;
  };
  const cards = COLUMNS.map((column) => `
    <a class="col-card" href="/articles/index.html?cat=${encodeURIComponent(column.cat)}">
      <div class="col-card__cover thumb ${esc(column.tone)}">
        <div class="thumb__grid" aria-hidden="true"></div>
        <div class="thumb__art" aria-hidden="true">${column.art}</div>
      </div>
      <div class="col-card__body">
        <div class="col-card__name">${esc(column.name)}</div>
        <p class="col-card__dek">${esc(column.desc)}</p>
        <div class="col-card__foot">
          <span class="col-card__count">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 3h10v10H3z"></path><path d="M3 6.5h10M6.5 6.5V13"></path></svg>
            ${countFor(column.cat, column.fallbackCount)} 篇文章
          </span>
          <span class="btn-ghost">订阅专栏</span>
        </div>
      </div>
    </a>`).join('');

  const body = `
    ${renderPageHead('Columns', '技术专栏', '成体系的系列文章,跟随专栏由浅入深,系统掌握一个领域。')}
    <main class="page">
      <div class="cols">${cards}</div>
    </main>`;

  return layout({
    title: `专栏 · ${config.site.title}`,
    description: '技术专栏',
    config,
    body,
    active: 'columns',
  });
}
