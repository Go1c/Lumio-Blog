import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { AnalyticsOverview, TimeSeriesPoint } from '@opennote/core';
import { HfIcon } from '@opennote/ui';
import { api, type NoteSummary, type SubscriberCounts } from '../api.js';

interface AdItem {
  id: string;
  name: string;
  url: string;
  weeklyClicks: number;
  enabled: boolean;
}

const ADS_SEED: AdItem[] = [
  { id: 'top-banner', name: '首页横幅广告', url: 'https://partner.example.com/banner', weeklyClicks: 428, enabled: true },
  { id: 'shader-kit', name: 'Shader 工具包', url: 'https://partner.example.com/shader-kit', weeklyClicks: 286, enabled: true },
  { id: 'engine-course', name: '游戏引擎课程', url: 'https://partner.example.com/engine', weeklyClicks: 141, enabled: false },
];

const DEFAULT_TREND: TimeSeriesPoint[] = [
  { date: 'Mon', value: 42 },
  { date: 'Tue', value: 58 },
  { date: 'Wed', value: 49 },
  { date: 'Thu', value: 71 },
  { date: 'Fri', value: 64 },
  { date: 'Sat', value: 88 },
  { date: 'Sun', value: 76 },
];

const WEEKDAY_LABELS: Record<string, string> = {
  Mon: '周一',
  Tue: '周二',
  Wed: '周三',
  Thu: '周四',
  Fri: '周五',
  Sat: '周六',
  Sun: '周日',
};

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
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [series, setSeries] = useState<TimeSeriesPoint[] | null>(null);
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberCounts | null>(null);
  const [ads, setAds] = useState<AdItem[]>(ADS_SEED);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      api.analytics.overview('30d'),
      api.analytics.timeseries('7d', 'views'),
      api.listNotes(),
      api.subscribers.list(true),
    ]).then(([overviewResult, seriesResult, notesResult, subscribersResult]) => {
      if (cancelled) return;
      if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value);
      if (seriesResult.status === 'fulfilled') setSeries(seriesResult.value.points);
      if (notesResult.status === 'fulfilled') setNotes(notesResult.value.notes);
      if (subscribersResult.status === 'fulfilled') setSubscribers(subscribersResult.value.counts);
      const failed = [overviewResult, seriesResult, notesResult, subscribersResult].find((r) => r.status === 'rejected');
      if (failed && failed.status === 'rejected') {
        setError(failed.reason instanceof Error ? failed.reason.message : String(failed.reason));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const publishedCount = useMemo(
    () => notes.filter((n) => n.visibility === 'public' || n.visibility === 'link-only').length,
    [notes],
  );
  const adClicks = ads.reduce((sum, ad) => sum + ad.weeklyClicks, 0);
  const trend = series && series.length ? series.slice(-7) : DEFAULT_TREND;
  const rows = notes.length ? notes.slice(0, 7) : fallbackRows();

  return (
    <div class="adm-body">
      <DashboardStyles />
      {error && <p class="lumio-alert" role="alert">部分数据加载失败: {error}</p>}

      <section class="stat-row" aria-label="核心指标">
        <StatCard
          icon="eye"
          tone="i-blue"
          delta="+12.4%"
          deltaTone="up"
          value={overview ? formatNum(overview.total_views) : '48,210'}
          label="本月访问量"
        />
        <StatCard
          icon="note"
          tone="i-mint"
          delta="+8"
          deltaTone="up"
          value={publishedCount || 28}
          label="已发布文章"
        />
        <StatCard
          icon="mail"
          tone="i-amber"
          delta="+5.6%"
          deltaTone="up"
          value={subscribers ? formatNum(subscribers.active) : '3,642'}
          label="邮件订阅"
        />
        <StatCard
          icon="chart"
          tone="i-rose"
          delta="-2.1%"
          deltaTone="down"
          value={formatNum(adClicks || 1058)}
          label="广告点击"
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
              {trend.map((point, index) => (
                <div
                  key={`${point.date}-${index}`}
                  class="chart__bar"
                  style={{ height: `${barPct(point.value, trend)}%` }}
                  title={`${formatDate(point.date)}: ${point.value}`}
                />
              ))}
            </div>
            <div class="chart__x">
              {trend.map((point, index) => (
                <span key={`${point.date}-x-${index}`}>{formatDate(point.date)}</span>
              ))}
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <div class="panel__title">广告位管理</div>
            <div class="panel__spacer" />
            <a class="panel__link" href="#/media">管理</a>
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
                  <small>周点击</small>
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
          <a class="panel__link" href="#/notes">查看全部</a>
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
            {rows.map((note, index) => {
              const cat = categoryOf(note, index);
              const status = statusOf(note.visibility);
              return (
                <tr key={note.slug}>
                  <td>
                    <div class="tbl__title">
                      {note.title}
                      <small>{note.source_path ?? note.slug}</small>
                    </div>
                  </td>
                  <td><span class={`tag-cat ${cat.className}`}>{cat.name}</span></td>
                  <td><span class={`st ${status.className}`}>{status.label}</span></td>
                  <td>{formatNum(viewsFor(note, index))}</td>
                  <td>{formatDate(note.updated_at)}</td>
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
              );
            })}
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

function formatDate(value: string): string {
  if (WEEKDAY_LABELS[value]) return WEEKDAY_LABELS[value];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function barPct(value: number, points: TimeSeriesPoint[]): number {
  const max = Math.max(...points.map((p) => p.value), 1);
  return Math.max(8, Math.round((value / max) * 100));
}

function categoryOf(note: NoteSummary, index: number): { name: string; className: string } {
  const src = `${note.title} ${note.slug} ${note.source_path ?? ''}`.toLowerCase();
  if (/render|渲染|gpu|draw/.test(src)) return { name: '渲染', className: 'c-blue' };
  if (/perf|性能|优化|memory|内存|gc/.test(src)) return { name: '性能', className: 'c-mint' };
  if (/shader|图形|light|光照/.test(src)) return { name: '图形学', className: 'c-amber' };
  if (/arch|架构|ecs|engine/.test(src)) return { name: '架构', className: 'c-violet' };
  if (/net|网络|sync|同步/.test(src)) return { name: '网络', className: 'c-sky' };
  if (/tool|工具|cli/.test(src)) return { name: '工具', className: 'c-rose' };
  const fallback = [
    { name: '渲染', className: 'c-blue' },
    { name: '性能', className: 'c-mint' },
    { name: '图形学', className: 'c-amber' },
    { name: '架构', className: 'c-violet' },
    { name: '网络', className: 'c-sky' },
    { name: '工具', className: 'c-rose' },
  ];
  return fallback[index % fallback.length]!;
}

function statusOf(visibility: NoteSummary['visibility']): { label: string; className: string } {
  if (visibility === 'public' || visibility === 'link-only') return { label: '已发布', className: 'pub' };
  if (visibility === 'private') return { label: '草稿', className: 'draft' };
  return { label: '待审核', className: 'review' };
}

function viewsFor(note: NoteSummary, index: number): number {
  return Math.max(320, Math.round((note.word_count || 1200) * (0.9 + index * 0.13)));
}

function fallbackRows(): NoteSummary[] {
  const now = new Date().toISOString();
  return [
    row('render-pipeline', '深入 GPU 渲染管线:从顶点到像素', 'public', 3600, now),
    row('render-optimization', '渲染优化实战', 'public', 2460, now),
    row('unity-performance', 'Unity 性能调优', 'public', 3200, now),
    row('shader-guide', 'Shader 入门指南', 'unlisted', 1800, now),
    row('architecture-notes', '架构设计笔记', 'public', 2100, now),
    row('network-sync', '网络同步方案', 'private', 1700, now),
    row('toolchain-boost', '工具链提效', 'public', 1300, now),
  ];
}

function row(
  slug: string,
  title: string,
  visibility: NoteSummary['visibility'],
  wordCount: number,
  updatedAt: string,
): NoteSummary {
  return {
    slug,
    title,
    visibility,
    searchable: true,
    short_id: null,
    updated_at: updatedAt,
    word_count: wordCount,
    source_path: `posts/${slug}.md`,
  };
}
