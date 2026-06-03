import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { HfIcon } from '@opennote/ui';

interface AdItem {
  id: string;
  name: string;
  url: string;
  weeklyClicks: number;
  enabled: boolean;
}

interface TrendPoint {
  label: string;
  height: number;
}

interface DashboardRow {
  slug: string;
  title: string;
  author: string;
  category: string;
  categoryClass: string;
  status: string;
  statusClass: string;
  views: string;
  date: string;
}

const ADS_SEED: AdItem[] = [
  { id: 'home-feed-banner', name: '首页信息流横幅', url: 'example.com/promo', weeklyClicks: 728, enabled: true },
  { id: 'sidebar-square', name: '侧边栏方图', url: 'partner.io/x', weeklyClicks: 214, enabled: true },
  { id: 'post-footer-promo', name: '文末推广', url: '-', weeklyClicks: 116, enabled: false },
];

const TREND: TrendPoint[] = [
  { label: '周一', height: 52 },
  { label: '周二', height: 68 },
  { label: '周三', height: 45 },
  { label: '周四', height: 80 },
  { label: '周五', height: 62 },
  { label: '周六', height: 91 },
  { label: '周日', height: 74 },
];

const ROWS: DashboardRow[] = [
  row('render-pipeline', '深入 GPU 渲染管线:从顶点到像素', '林辰', '渲染', 'c-blue', '已发布', 'pub', '3.2k', '2026-05-30'),
  row('render-optimization', '渲染优化实战', '林辰', '渲染', 'c-blue', '已发布', 'pub', '2.1k', '2026-05-28'),
  row('unity-performance', 'Unity 性能调优', '叶舟', '性能', 'c-mint', '已发布', 'pub', '1.8k', '2026-05-25'),
  row('shader-guide', 'Shader 入门指南', '明月', '图形学', 'c-amber', '待审核', 'review', '-', '2026-05-22'),
  row('architecture-notes', '架构设计笔记', '周岩', '架构', 'c-violet', '已发布', 'pub', '1.5k', '2026-05-20'),
  row('network-sync', '网络同步方案', '周岩', '网络', 'c-sky', '草稿', 'draft', '-', '2026-05-18'),
  row('toolchain-boost', '工具链提效', '明月', '工具', 'c-rose', '已发布', 'pub', '980', '2026-05-15'),
];

export const DASHBOARD_RESPONSIVE_STYLE = `
.adm-body { min-width: 0; }
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}
.two-col {
  display: grid;
  grid-template-columns: 1.55fr 1fr;
  gap: 24px;
}
.adrow {
  display: flex;
  align-items: center;
  gap: 14px;
}
@media (max-width: 1100px) {
  .stat-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .two-col { grid-template-columns: 1fr; }
}
@media (max-width: 680px) {
  .stat-row { grid-template-columns: 1fr; }
  .adrow { align-items: flex-start; }
  .tbl { min-width: 760px; }
  .panel { overflow: auto; }
}
`;

let dashboardStyleInjected = false;

function DashboardStyles(): null {
  if (typeof document !== 'undefined' && !dashboardStyleInjected) {
    dashboardStyleInjected = true;
    const tag = document.createElement('style');
    tag.setAttribute('data-dashboard', '1');
    tag.textContent = DASHBOARD_RESPONSIVE_STYLE;
    document.head.appendChild(tag);
  }
  return null;
}

export function Dashboard(): JSX.Element {
  const [ads, setAds] = useState<AdItem[]>(ADS_SEED);

  return (
    <div class="adm-body">
      <DashboardStyles />

      <section class="stat-row" aria-label="核心指标">
        <StatCard
          icon="eye"
          tone="i-blue"
          delta="▲ 12.4%"
          deltaTone="up"
          value="48,210"
          label="本月访问量"
        />
        <StatCard
          icon="note"
          tone="i-mint"
          delta="▲ 3 篇"
          deltaTone="up"
          value="28"
          label="已发布文章"
        />
        <StatCard
          icon="mail"
          tone="i-amber"
          delta="▲ 8.1%"
          deltaTone="up"
          value="3,642"
          label="邮件订阅数"
        />
        <StatCard
          icon="chart"
          tone="i-rose"
          delta="▼ 2.3%"
          deltaTone="down"
          value="1,058"
          label="广告点击量"
        />
      </section>

      <section class="two-col">
        <div class="panel">
          <div class="panel__head">
            <div class="panel__title">近 7 日访问趋势</div>
            <div class="panel__spacer" />
            <a class="panel__link" href="#/analytics">查看详情</a>
          </div>
          <div class="chart" aria-label="近 7 日访问趋势">
            <div class="chart__bars">
              {TREND.map((point, index) => (
                <div
                  key={`${point.label}-${index}`}
                  class="chart__bar"
                  style={{ height: `${point.height}%` }}
                  title={`${point.label}: ${point.height}%`}
                />
              ))}
            </div>
            <div class="chart__x">
              {TREND.map((point, index) => (
                <span key={`${point.label}-x-${index}`}>{point.label}</span>
              ))}
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <div class="panel__title">广告位管理</div>
            <div class="panel__spacer" />
            <a class="panel__link" href="#/media">+ 新建</a>
          </div>
          <div class="adlist">
            {ads.map((ad) => (
              <div class="adrow" key={ad.id}>
                <div class="adrow__thumb" aria-hidden="true">
                  <HfIcon name="image" size={18} />
                </div>
                <div class="adrow__info">
                  <div class="adrow__name">{ad.name}</div>
                  <div class="adrow__url">{ad.url}</div>
                </div>
                <div class="adrow__stat">
                  <b>{formatNum(ad.weeklyClicks)}</b>
                  <small>点击 / 周</small>
                </div>
                <button
                  type="button"
                  class={`switch ${ad.enabled ? '' : 'off'}`}
                  aria-label={`${ad.name}${ad.enabled ? '已启用' : '已停用'}`}
                  aria-pressed={ad.enabled}
                  onClick={() => setAds((prev) => prev.map((item) => item.id === ad.id ? { ...item, enabled: !item.enabled } : item))}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel__head">
          <div class="panel__title">文章管理</div>
          <div class="panel__spacer" />
          <a class="panel__link" href="/articles/index.html">前台查看</a>
        </div>
        <table class="tbl">
          <thead>
            <tr>
              <th>标题</th>
              <th>分类</th>
              <th>状态</th>
              <th>浏览</th>
              <th>发布日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((note) => (
              <tr key={note.slug}>
                <td>
                  <div class="tbl__title">
                    {note.title}
                    <small>作者 · {note.author}</small>
                  </div>
                </td>
                <td><span class={`tag-cat ${note.categoryClass}`}>{note.category}</span></td>
                <td><span class={`st ${note.statusClass}`}>{note.status}</span></td>
                <td>{note.views}</td>
                <td>{note.date}</td>
                <td>
                  <div class="row-act">
                    <a href={`#/notes/${encodeURIComponent(note.slug)}`} aria-label={`编辑 ${note.title}`}>
                      <HfIcon name="edit" size={13} />
                    </a>
                    <a href={`/posts/${encodeURIComponent(note.slug)}.html`} target="_blank" rel="noreferrer" aria-label={`预览 ${note.title}`}>
                      <HfIcon name="eye" size={13} />
                    </a>
                    <button type="button" class="danger" aria-label={`删除 ${note.title}`}>
                      <HfIcon name="trash" size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  tone,
  delta,
  deltaTone,
  value,
  label,
}: {
  icon: 'eye' | 'note' | 'mail' | 'chart';
  tone: string;
  delta: string;
  deltaTone: 'up' | 'down';
  value: string | number;
  label: string;
}): JSX.Element {
  return (
    <div class="stat">
      <div class="stat__top">
        <div class={`stat__icon ${tone}`}><HfIcon name={icon} size={18} /></div>
        <span class={`stat__delta ${deltaTone}`}>{delta}</span>
      </div>
      <div class="stat__num">{value}</div>
      <div class="stat__label">{label}</div>
    </div>
  );
}

function formatNum(n: number): string;
function formatNum(n: string): string;
function formatNum(n: number | string): string {
  if (typeof n === 'string') return n;
  if (n >= 10000) return n.toLocaleString('en-US');
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function row(
  slug: string,
  title: string,
  author: string,
  category: string,
  categoryClass: string,
  status: string,
  statusClass: string,
  views: string,
  date: string,
): DashboardRow {
  return {
    slug,
    title,
    author,
    category,
    categoryClass,
    status,
    statusClass,
    views,
    date,
  };
}
