import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { HfIcon } from '@opennote/ui';
import type { AdminSettings, HfAdSettings } from '@opennote/core';
import {
  api,
  type AuditEntry,
  type HealthInfo,
  type NoteSummary,
  type SyncDiagnosticsResponse,
} from '../api.js';
import { readAds } from './ads.js';

interface TrendPoint {
  label: string;
  value: number;
  height: number;
}

export interface DashboardOverviewStat {
  icon: 'eye' | 'note' | 'sync' | 'book';
  tone: string;
  label: string;
  value: string;
  delta: string;
  deltaTone: 'up' | 'down';
}

export interface DashboardAdRow {
  id: string;
  name: string;
  detail: string;
  stat: string;
  statLabel: string;
  href: string;
  enabled: boolean;
}

export interface SyncSummary {
  title: string;
  detail: string;
  tone: 'ok' | 'warn' | 'default';
  scanned: string;
  removed: string;
  atLabel: string;
}

const DASHBOARD_AD_SLOT_LABELS: Record<NonNullable<HfAdSettings['slot']>, string> = {
  home: '首页',
  article: '文章页',
  column: '专栏页',
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
.dash-sync {
  display: grid;
  gap: 12px;
}
.dash-sync__status {
  padding: 13px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--bg-soft);
}
.dash-sync__status.is-ok { border-color: rgba(31,158,128,.28); background: rgba(93,226,198,.12); }
.dash-sync__status.is-warn { border-color: rgba(194,65,91,.28); background: rgba(255,184,107,.14); }
.dash-sync__title { font-weight: 750; color: var(--ink); }
.dash-sync__detail { margin-top: 4px; color: var(--ink-3); font-size: 12.5px; line-height: 1.5; }
.dash-sync__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.dash-sync__metric {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #fff;
}
.dash-sync__metric b { display: block; font-family: var(--mono); font-size: 18px; color: var(--ink); }
.dash-sync__metric span { display: block; margin-top: 2px; color: var(--ink-4); font-size: 11px; }
.activity-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.activity-row {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 10px;
  align-items: baseline;
}
.activity-row time { color: var(--ink-4); font-family: var(--mono); font-size: 11px; }
.activity-row__main { min-width: 0; color: var(--ink); font-size: 13px; }
.activity-row__target { display: block; margin-top: 2px; color: var(--ink-4); font-family: var(--mono); font-size: 11px; overflow-wrap: anywhere; }
.adrow {
  display: flex;
  align-items: center;
  gap: 14px;
}
.adrow.is-paused { opacity: .64; }
@media (max-width: 1100px) {
  .stat-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .two-col { grid-template-columns: 1fr; }
}
@media (max-width: 680px) {
  .stat-row { grid-template-columns: 1fr; }
  .dash-sync__metrics { grid-template-columns: 1fr; }
  .activity-row { grid-template-columns: 1fr; gap: 2px; }
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

interface DashboardState {
  health: HealthInfo | null;
  notes: NoteSummary[];
  views30d: number | null;
  trend: TrendPoint[];
  sync: SyncDiagnosticsResponse | null;
  audit: AuditEntry[];
  ads: DashboardAdRow[];
}

const EMPTY_STATE: DashboardState = {
  health: null,
  notes: [],
  views30d: null,
  trend: [],
  sync: null,
  audit: [],
  ads: [],
};

export function Dashboard(): JSX.Element {
  const [state, setState] = useState<DashboardState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void Promise.allSettled([
      api.health(),
      api.listNotes(),
      api.analytics.overview('30d'),
      api.analytics.timeseries('7d', 'views'),
      api.syncDiagnostics(),
      api.audit(6),
      api.settings.get(),
    ]).then(([health, notes, overview, series, sync, audit, settings]) => {
      if (cancelled) return;
      const failures = [health, notes, overview, series, sync, audit, settings]
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failures.length > 0) {
        setError(failures[0]?.reason instanceof Error ? failures[0].reason.message : String(failures[0]?.reason));
      }
      const rawTrend = series.status === 'fulfilled' ? series.value.points : [];
      setState({
        health: health.status === 'fulfilled' ? health.value : null,
        notes: notes.status === 'fulfilled' ? notes.value.notes : [],
        views30d: overview.status === 'fulfilled' ? overview.value.total_views : null,
        trend: makeTrend(rawTrend),
        sync: sync.status === 'fulfilled' ? sync.value : null,
        audit: audit.status === 'fulfilled' ? audit.value.entries : [],
        ads: settings.status === 'fulfilled' ? buildDashboardAdRows(settings.value.home) : [],
      });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recentNotes = useMemo(
    () => [...state.notes].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)).slice(0, 7),
    [state.notes],
  );
  const overview = buildDashboardOverview({
    health: state.health,
    notes: state.notes,
    views30d: state.views30d,
    syncAt: state.sync?.at ?? null,
    filesScanned: state.sync?.diag.files_scanned ?? 0,
  });
  const syncSummary = buildSyncSummary(state.sync);

  return (
    <div class="adm-body">
      <DashboardStyles />

      {error && (
        <p role="alert" class="lumio-alert">
          部分后台数据载入失败:{error}
        </p>
      )}

      <section class="stat-row" aria-label="核心指标" aria-busy={loading ? 'true' : 'false'}>
        {overview.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            tone={stat.tone}
            delta={stat.delta}
            deltaTone={stat.deltaTone}
            value={stat.value}
            label={stat.label}
          />
        ))}
      </section>

      <section class="two-col">
        <div class="panel">
          <div class="panel__head">
            <div class="panel__title">近 7 日访问趋势</div>
            <div class="panel__spacer" />
            <a class="panel__link" href="#/analytics">查看详情</a>
          </div>
          <div class="chart" aria-label="近 7 日访问趋势">
            {state.trend.length === 0 ? (
              <p class="hf-sm hf-muted" style={{ padding: 24, textAlign: 'center' }}>暂无访问数据。</p>
            ) : (
              <>
                <div class="chart__bars">
                  {state.trend.map((point, index) => (
                    <div
                      key={`${point.label}-${index}`}
                      class="chart__bar"
                      style={{ height: `${point.height}%` }}
                      title={`${point.label}: ${point.value}`}
                    />
                  ))}
                </div>
                <div class="chart__x">
                  {state.trend.map((point, index) => (
                    <span key={`${point.label}-x-${index}`}>{point.label}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <SyncStatusPanel summary={syncSummary} />
      </section>

      <section class="two-col">
        <ActivityPanel entries={state.audit} />

        <div class="panel">
          <div class="panel__head">
            <div class="panel__title">广告位管理</div>
            <div class="panel__spacer" />
            <a class="panel__link" href="#/ads">管理广告</a>
          </div>
          <div class="adlist">
            {state.ads.length === 0 ? (
              <AdSummaryEmpty />
            ) : state.ads.map((ad) => (
              <AdSummaryRow key={ad.id} row={ad} />
            ))}
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel__head">
          <div class="panel__title">最近文章</div>
          <div class="panel__spacer" />
          <a class="panel__link" href="#/vault">管理全部</a>
        </div>
        {recentNotes.length === 0 ? (
          <p class="hf-sm hf-muted" style={{ padding: 22 }}>还没有同步文章。</p>
        ) : (
          <table class="tbl">
            <thead>
              <tr>
                <th>标题</th>
                <th>路径</th>
                <th>状态</th>
                <th>字数</th>
                <th>更新日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {recentNotes.map((note) => (
                <tr key={note.slug}>
                  <td>
                    <div class="tbl__title">
                      {note.title || note.slug}
                      <small>{note.slug}</small>
                    </div>
                  </td>
                  <td><span class="hf-mono hf-tiny hf-muted">{note.source_path ?? '—'}</span></td>
                  <td><span class={`st ${statusClass(note.visibility)}`}>{visLabel(note.visibility)}</span></td>
                  <td class="hf-mono hf-tiny">{note.word_count}</td>
                  <td>{note.updated_at.slice(0, 10)}</td>
                  <td>
                    <div class="row-act">
                      <a href={`#/note/${encodeURIComponent(note.slug)}`} aria-label={`编辑 ${note.title}`}>
                        <HfIcon name="edit" size={13} />
                      </a>
                      {note.visibility === 'public' && (
                        <a href={`/posts/${encodeURIComponent(note.slug)}.html`} target="_blank" rel="noreferrer" aria-label={`预览 ${note.title}`}>
                          <HfIcon name="eye" size={13} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  icon: 'eye' | 'note' | 'sync' | 'book';
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

function SyncStatusPanel({ summary }: { summary: SyncSummary }): JSX.Element {
  return (
    <div class="panel">
      <div class="panel__head">
        <div class="panel__title">同步状态</div>
        <div class="panel__spacer" />
        <a class="panel__link" href="#/audit?action_prefix=sync.">同步日志</a>
      </div>
      <div class="dash-sync">
        <div class={`dash-sync__status is-${summary.tone}`}>
          <div class="dash-sync__title">{summary.title}</div>
          <div class="dash-sync__detail">{summary.detail}</div>
        </div>
        <div class="dash-sync__metrics" aria-label="最近同步指标">
          <span class="dash-sync__metric">
            <b>{summary.scanned}</b>
            <span>扫描文件</span>
          </span>
          <span class="dash-sync__metric">
            <b>{summary.removed}</b>
            <span>移除记录</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function ActivityPanel({ entries }: { entries: AuditEntry[] }): JSX.Element {
  return (
    <div class="panel">
      <div class="panel__head">
        <div class="panel__title">实时活动流</div>
        <div class="panel__spacer" />
        <a class="panel__link" href="#/audit">查看全部</a>
      </div>
      {entries.length === 0 ? (
        <p class="hf-sm hf-muted" style={{ padding: 22 }}>暂无后台活动。</p>
      ) : (
        <ul class="activity-list">
          {entries.slice(0, 6).map((entry) => (
            <li class="activity-row" key={entry.id}>
              <time dateTime={entry.ts}>{formatActivityTime(entry.ts)}</time>
              <span class="activity-row__main">
                {activityLabel(entry.action)}
                {entry.target && <span class="activity-row__target">{entry.target}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdSummaryRow({ row }: { row: DashboardAdRow }): JSX.Element {
  return (
    <a class={`adrow ${row.enabled ? '' : 'is-paused'}`} href={row.href} style={{ color: 'inherit', textDecoration: 'none' }}>
      <div class="adrow__thumb" aria-hidden="true">
        <HfIcon name="image" size={18} />
      </div>
      <div class="adrow__info">
        <div class="adrow__name">{row.name}</div>
        <div class="adrow__url">{row.detail}</div>
      </div>
      <div class="adrow__stat">
        <b>{row.stat}</b>
        <small>{row.statLabel}</small>
      </div>
    </a>
  );
}

function AdSummaryEmpty(): JSX.Element {
  return (
    <a class="adrow" href="#/ads" style={{ color: 'inherit', textDecoration: 'none' }}>
      <div class="adrow__thumb" aria-hidden="true">
        <HfIcon name="image" size={18} />
      </div>
      <div class="adrow__info">
        <div class="adrow__name">未配置广告位</div>
        <div class="adrow__url">从首页、文章页或专栏页添加真实投放配置</div>
      </div>
      <div class="adrow__stat">
        <b>0</b>
        <small>广告</small>
      </div>
    </a>
  );
}

export function buildDashboardAdRows(home: AdminSettings['home'] | null | undefined): DashboardAdRow[] {
  return readAds((home ?? {}) as NonNullable<AdminSettings['home']>).slice(0, 3).map((ad, index) => {
    const slot = (ad.slot ?? 'home') as NonNullable<HfAdSettings['slot']>;
    const enabled = ad.enabled !== false;
    const impressions = ad.impressions ?? 0;
    const clicks = ad.clicks ?? 0;
    return {
      id: ad.id ?? `${slot}-${index}`,
      name: ad.name || ad.title || '未命名广告',
      detail: `${DASHBOARD_AD_SLOT_LABELS[slot]} · ${enabled ? '开启' : '暂停'} · 曝光 ${formatCount(impressions)}`,
      stat: formatCount(clicks),
      statLabel: '点击 / 周',
      href: '#/ads',
      enabled,
    };
  });
}

export function buildDashboardOverview(input: {
  health: Pick<HealthInfo, 'note_count' | 'visibility_counts'> | null;
  notes: Array<Pick<NoteSummary, 'source_path' | 'slug'>>;
  views30d: number | null;
  syncAt: string | null;
  filesScanned: number;
  now?: Date;
}): DashboardOverviewStat[] {
  const publicCount = input.health?.visibility_counts.public ?? 0;
  const privateCount = input.health?.visibility_counts.private ?? 0;
  const notesCount = input.health?.note_count ?? input.notes.length;
  const todaySync = isSameDate(input.syncAt, input.now ?? new Date()) ? input.filesScanned : 0;
  const syncDelta = input.syncAt ? `最近 ${formatSyncAt(input.syncAt, input.now ?? new Date())}` : '暂无同步记录';
  return [
    {
      icon: 'note',
      tone: 'i-blue',
      label: '笔记总数',
      value: formatNum(notesCount),
      delta: `${publicCount} 篇公开 · ${privateCount} 篇待公开`,
      deltaTone: privateCount > 0 ? 'down' : 'up',
    },
    {
      icon: 'sync',
      tone: 'i-mint',
      label: '今日同步扫描',
      value: formatNum(todaySync),
      delta: syncDelta,
      deltaTone: todaySync > 0 ? 'up' : 'down',
    },
    {
      icon: 'eye',
      tone: 'i-amber',
      label: '近 30 日浏览',
      value: input.views30d === null ? '—' : formatNum(input.views30d),
      delta: 'analytics · 30d',
      deltaTone: 'up',
    },
    {
      icon: 'book',
      tone: 'i-rose',
      label: '活跃专栏',
      value: formatNum(countColumnsFromNotes(input.notes)),
      delta: 'vault 一级目录',
      deltaTone: 'up',
    },
  ];
}

export function buildSyncSummary(sync: SyncDiagnosticsResponse | null): SyncSummary {
  if (!sync?.at) {
    return {
      title: '还没有同步记录',
      detail: '执行一次同步后,这里会显示扫描文件数、解析问题和移除记录。',
      tone: 'default',
      scanned: '0',
      removed: '0',
      atLabel: '—',
    };
  }
  const diag = sync.diag;
  const issues = [
    ...diag.parse_failed,
    ...diag.normalize_warnings,
    ...diag.slug_conflicts.map((item) => ({
      source_path: item.source_path,
      message: `slug 冲突:${item.desired} → ${item.final}`,
    })),
    ...diag.process_failed,
  ];
  const atLabel = formatSyncAt(sync.at);
  if (issues.length === 0) {
    return {
      title: '最近同步正常',
      detail: `最近 ${atLabel} 完成同步,没有解析失败或 slug 冲突。`,
      tone: 'ok',
      scanned: formatCount(diag.files_scanned),
      removed: formatCount(diag.removed_slugs.length),
      atLabel,
    };
  }
  const detail = issues
    .slice(0, 3)
    .map((item) => `${item.source_path}: ${item.message}`)
    .join(' · ');
  return {
    title: `最近同步有 ${issues.length} 个问题`,
    detail,
    tone: 'warn',
    scanned: formatCount(diag.files_scanned),
    removed: formatCount(diag.removed_slugs.length),
    atLabel,
  };
}

function makeTrend(points: { date: string; value: number }[]): TrendPoint[] {
  if (!points.some((p) => p.value > 0)) return [];
  const latest = fillLastSevenDays(points);
  const max = Math.max(1, ...latest.map((p) => p.value));
  return latest.map((p) => ({
    label: p.date.slice(5),
    value: p.value,
    height: Math.max(6, Math.round((p.value / max) * 100)),
  }));
}

function fillLastSevenDays(points: { date: string; value: number }[]): { date: string; value: number }[] {
  const byDate = new Map(points.map((p) => [p.date, p.value]));
  const now = new Date();
  const out: { date: string; value: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    out.push({ date, value: byDate.get(date) ?? 0 });
  }
  return out;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return n.toLocaleString('en-US');
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

function countColumnsFromNotes(notes: Array<Pick<NoteSummary, 'source_path' | 'slug'>>): number {
  const ids = new Set<string>();
  for (const note of notes) {
    const path = note.source_path ?? note.slug;
    const first = path.includes('/') ? path.split('/')[0]!.trim() : '';
    ids.add(first || '__root__');
  }
  return ids.size;
}

function isSameDate(value: string | null, now: Date): boolean {
  if (!value) return false;
  return value.slice(0, 10) === now.toISOString().slice(0, 10);
}

function formatSyncAt(value: string, now = new Date()): string {
  if (isSameDate(value, now)) return value.slice(11, 16);
  return `${value.slice(5, 10)} ${value.slice(11, 16)}`;
}

function formatActivityTime(value: string): string {
  return value.slice(5, 16).replace('T', ' ');
}

function activityLabel(action: string): string {
  if (action.startsWith('sync.')) return action === 'sync.force' ? '强制同步' : '手动同步';
  if (action.startsWith('note.')) return '笔记更新';
  if (action.startsWith('shortlink.')) return '短链变更';
  if (action.startsWith('webhook.')) return 'Webhook 变更';
  if (action.startsWith('token.')) return 'Token 变更';
  if (action.startsWith('auth.')) return '登录与权限';
  return action;
}

function visLabel(v: string): string {
  if (v === 'public') return '公开';
  if (v === 'unlisted') return '不列出';
  if (v === 'link-only') return '仅链接';
  if (v === 'private') return '私有';
  return v;
}

function statusClass(v: string): string {
  if (v === 'public') return 'pub';
  if (v === 'private') return 'draft';
  return 'review';
}
