import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { AnalyticsOverview, AnalyticsRange, TimeSeriesPoint } from '@opennote/core';
import { Button, HfIcon, Tag } from '@opennote/ui';
import { api, type HealthInfo, type NoteSummary } from '../api.js';
import { KpiCard } from '../components/kpi-card.js';
import { AreaChart } from '../components/area-chart.js';

interface ActivityItem {
  id: string;
  /** event kind 来自 SyncEvent.kind */
  kind: string;
  text: string;
  ts: string;
}

const RANGES: AnalyticsRange[] = ['7d', '30d', '90d'];

export const DASHBOARD_RESPONSIVE_STYLE = `
.dash { min-width: 0; }
.dash__kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.dash__main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.dash__split-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.dash__top-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 80px 40px;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}
.dash__top-row + .dash__top-row { border-top: 1px solid var(--line); }
.dash__top-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: var(--ink);
  text-decoration: none;
}
.dash__top-meter {
  width: 80px;
  height: 4px;
  background: var(--bg-sunk);
  border-radius: 2px;
  overflow: hidden;
}
.dash__alert-row {
  display: flex;
  gap: 10px;
  padding: 10px 0;
}
.dash__alert-row + .dash__alert-row { border-top: 1px solid var(--line); }
@media (max-width: 720px) {
  .dash__kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .dash__main-grid,
  .dash__split-grid { grid-template-columns: 1fr; }
  .dash__top-row { grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; }
  .dash__top-title { white-space: normal; overflow: visible; }
  .dash__top-meter { display: none; }
  .dash__alert-row { align-items: flex-start; }
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
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [series, setSeries] = useState<TimeSeriesPoint[] | null>(null);
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [idleShortLinks, setIdleShortLinks] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOverview(null);
    setSeries(null);
    void Promise.all([api.analytics.overview(range), api.analytics.timeseries(range, 'views')])
      .then(([ov, ts]) => {
        if (cancelled) return;
        setOverview(ov);
        setSeries(ts.points);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  useEffect(() => {
    void api
      .listNotes()
      .then((r) => setNotes(r.notes))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    void api
      .health()
      .then((h) => setHealth(h))
      .catch(() => {
        /* health 失败不要塞错误 */
      });
    void api
      .idleShortLinks(30)
      .then((r) => setIdleShortLinks(r.count))
      .catch(() => {
        /* idle short link 数失败不要塞错误,仪表盘其他部分仍要显示 */
      });
  }, []);

  // SSE
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/admin/changes', { withCredentials: true });
    } catch {
      return undefined;
    }
    const handle = (kind: string) => (ev: MessageEvent<string>) => {
      const payload = safeParse(ev.data);
      const text = renderActivity(kind, payload);
      const item: ActivityItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind,
        text,
        ts: new Date().toISOString(),
      };
      setActivity((prev) => [item, ...prev].slice(0, 20));
    };
    const kinds = [
      'note.published',
      'note.updated',
      'note.unpublished',
      'sync.started',
      'sync.completed',
      'sync.failed',
      'settings.changed',
      'media.uploaded',
      'media.deleted',
    ];
    const handlers: Array<{ kind: string; fn: (e: MessageEvent<string>) => void }> = [];
    es.addEventListener('open', () => setSseConnected(true));
    es.addEventListener('error', () => setSseConnected(false));
    for (const k of kinds) {
      const fn = handle(k);
      es.addEventListener(k, fn as EventListener);
      handlers.push({ kind: k, fn });
    }
    return () => {
      for (const h of handlers) es?.removeEventListener(h.kind, h.fn as EventListener);
      es?.close();
    };
  }, []);

  const counts = useMemo(() => {
    const out = { public: 0, unlisted: 0, 'link-only': 0, private: 0 } as Record<string, number>;
    if (!notes) return out;
    for (const n of notes) out[n.visibility] = (out[n.visibility] ?? 0) + 1;
    return out;
  }, [notes]);

  const draftScheduled = useMemo(() => {
    if (!notes) return { drafts: 0, scheduled: 0 };
    let drafts = 0;
    let scheduled = 0;
    for (const n of notes) {
      // we don't currently track scheduled in the summary; treat private as draft proxy
      if (n.visibility === 'private') drafts += 1;
    }
    return { drafts, scheduled };
  }, [notes]);

  // 真 sparkline:按 updated_at 把笔记落 14 天的 bin,得到"最近 14 天的更新次数"曲线
  const noteActivitySpark = useMemo(() => buildActivitySpark(notes, () => true), [notes]);
  const visibleNoteActivitySpark = useMemo(
    () => buildActivitySpark(notes, (n) => n.visibility === 'public' || n.visibility === 'link-only'),
    [notes],
  );

  const top5 = overview?.top_posts.slice(0, 5) ?? [];
  const totalNotes = notes?.length ?? 0;
  const visibleCount = (counts['public'] ?? 0) + (counts['link-only'] ?? 0);
  const recentActivityCount = activity.length;

  return (
    <div class="dash">
      <DashboardStyles />
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>嘿,欢迎回来</h1>
      <p class="hf-sm hf-muted" style={{ marginTop: 4, marginBottom: 24 }}>
        过去 {range},
        {overview ? (
          <>
            <b style={{ color: 'var(--ink)' }}>{formatNum(overview.total_views)}</b> 次访问 ·
            <b style={{ color: 'var(--ink)' }}>{formatNum(overview.unique_visitors)}</b> 独立访客
          </>
        ) : (
          <span class="hf-faint" aria-busy="true">载入中…</span>
        )}
      </p>

      {error && (
        <div role="alert" class="hf-tiny" style={{ padding: 10, marginBottom: 12, background: 'var(--danger-soft)', borderRadius: 6, color: 'var(--danger-text)' }}>
          {error}
        </div>
      )}

      {/* KPI grid */}
      <div class="dash__kpis">
        <KpiCard
          label="总笔记"
          value={totalNotes}
          icon="layers"
          tone="var(--accent)"
          sub={<>{counts['public'] ?? 0} 公开 / {counts['link-only'] ?? 0} 链接</>}
          spark={noteActivitySpark}
        />
        <KpiCard
          label="可见笔记"
          value={visibleCount}
          icon="eye"
          tone="var(--ok)"
          sub={<>{counts['unlisted'] ?? 0} 不列出 · {counts['private'] ?? 0} 私有</>}
          spark={visibleNoteActivitySpark}
        />
        <KpiCard
          label={`总 PV (${range})`}
          value={overview ? formatNum(overview.total_views) : '—'}
          icon="chart"
          tone="var(--accent)"
          sub={overview ? <>UV {formatNum(overview.unique_visitors)}</> : '—'}
          spark={(series ?? []).map((p) => p.value)}
        />
        <KpiCard
          label="近期活动"
          value={recentActivityCount}
          icon="activity"
          tone={sseConnected ? 'var(--ok)' : 'var(--ink-3)'}
          sub={sseConnected ? `${recentActivityCount > 0 ? '收到' : '已连接,等待'}事件` : '未连接 SSE'}
        />
      </div>

      {/* main grid: chart + alerts */}
      <div class="dash__main-grid">
        <div class="ui-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>访问趋势</div>
              <div class="hf-tiny hf-muted" style={{ marginTop: 2 }}>PV · 全部公开内容</div>
            </div>
            <div class="hf-grow" />
            <div role="radiogroup" aria-label="时间范围" style={{ display: 'flex', gap: 4 }}>
              {RANGES.map((r) => (
                <Tag
                  key={r}
                  pressable
                  pressed={range === r}
                  tone={range === r ? 'accent' : 'default'}
                  onClick={() => setRange(r)}
                  aria-label={`切换到 ${r}`}
                >
                  {r}
                </Tag>
              ))}
            </div>
          </div>
          {series ? (
            <AreaChart points={series} aria-label={`访问趋势 ${range}`} />
          ) : (
            <div class="hf-tiny hf-muted" style={{ padding: 40, textAlign: 'center' }} aria-busy="true">
              载入中…
            </div>
          )}
        </div>

        <div class="ui-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>待处理 / 推荐</div>
          {buildAlerts({
            drafts: draftScheduled.drafts,
            top: top5[0] ? { title: top5[0].title, slug: top5[0].slug } : undefined,
            idleShortLinks,
            sse: sseConnected,
            sseRecentSync: !!activity.find((a) => a.kind === 'sync.completed'),
            sseRecentSyncFailed: !!activity.find((a) => a.kind === 'sync.failed'),
          }).map((alert, i) => (
            <div
              key={i}
              class="dash__alert-row"
            >
              <span class={`ui-dot ui-dot--${alert.tone}`} style={{ marginTop: 6 }} aria-hidden="true" />
              <div class="hf-grow">
                <div class="hf-sm" style={{ fontWeight: 500 }}>{alert.title}</div>
                <div class="hf-tiny hf-muted" style={{ marginTop: 2 }}>{alert.sub}</div>
              </div>
              {alert.cta && (
                <Button size="sm" onClick={alert.onClick} aria-label={alert.cta}>
                  {alert.cta}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* top 5 + activity stream */}
      <div class="dash__split-grid">
        <div class="ui-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>访问 Top 5</div>
            <div class="hf-grow" />
            <a class="hf-mono hf-tiny" href="#/notes" style={{ color: 'var(--ink-4)' }}>
              查看全部 →
            </a>
          </div>
          {top5.length === 0 ? (
            <p class="hf-tiny hf-muted" style={{ padding: '12px 0' }}>{overview ? '暂无数据' : '载入中…'}</p>
          ) : (
            top5.map((p, i) => {
              const max = top5[0]?.views ?? 1;
              const pct = max > 0 ? (p.views / max) * 100 : 0;
              return (
                <div
                  key={p.slug}
                  class="dash__top-row"
                >
                  <span class="hf-mono hf-tiny hf-faint" style={{ width: 16 }}>{i + 1}</span>
                  <a
                    class="hf-sm dash__top-title"
                    href={`#/notes/${encodeURIComponent(p.slug)}`}
                  >
                    {p.title || p.slug}
                  </a>
                  <div
                    class="dash__top-meter"
                    aria-hidden="true"
                  >
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)' }} />
                  </div>
                  <span class="hf-mono hf-tiny" style={{ width: 40, textAlign: 'right', fontWeight: 600 }}>
                    {formatNum(p.views)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div class="ui-card" style={{ padding: 18 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <HfIcon name="activity" size={14} color="var(--accent)" /> 实时活动
            <div class="hf-grow" />
            <span
              class={`ui-dot ${sseConnected ? 'ui-dot--ok' : ''}`}
              aria-label={sseConnected ? 'SSE 已连接' : 'SSE 未连接'}
              role="img"
            />
          </div>
          {activity.length === 0 ? (
            <p class="hf-tiny hf-muted" aria-live="polite" style={{ margin: 0, padding: '8px 0' }}>
              {sseConnected ? '等待事件…' : '未连接到事件流'}
            </p>
          ) : (
            <ul
              aria-live="polite"
              style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {activity.map((a) => (
                <li key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ marginTop: 2, color: 'var(--ink-3)' }} aria-hidden="true">
                    <HfIcon name={iconForKind(a.kind)} size={13} />
                  </span>
                  <div class="hf-grow hf-sm">{a.text}</div>
                  <time class="hf-mono hf-tiny hf-faint" dateTime={a.ts}>
                    {timeAgo(a.ts)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* sync status card */}
      <div class="ui-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span class={`ui-dot ${sseConnected ? 'ui-dot--ok' : 'ui-dot--warn'}`} aria-hidden="true" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>同步状态</div>
            <div class="hf-tiny hf-muted">
              {sseConnected ? '已连接事件流' : '未连接事件流'}
              {health ? ` · 总笔记 ${health.note_count}` : ''}
            </div>
          </div>
          <div class="hf-grow" />
          <Button size="sm" onClick={() => void api.sync().catch(() => {/* ignore */})}>
            <HfIcon name="sync" size={12} /> 手动同步
          </Button>
        </div>
      </div>
    </div>
  );
}

function buildAlerts(args: {
  drafts: number;
  top: { title: string; slug: string } | undefined;
  idleShortLinks: number;
  sse: boolean;
  sseRecentSync: boolean;
  sseRecentSyncFailed: boolean;
}): {
  tone: 'warn' | 'ok' | 'accent';
  title: string;
  sub: string;
  cta?: string;
  onClick?: () => void;
}[] {
  const out: {
    tone: 'warn' | 'ok' | 'accent';
    title: string;
    sub: string;
    cta?: string;
    onClick?: () => void;
  }[] = [];
  if (args.drafts > 0) {
    out.push({
      tone: 'warn',
      title: `${args.drafts} 篇笔记还是私有`,
      sub: '可能是漏改了 visibility',
      cta: '查看',
      onClick: () => {
        location.hash = '#/notes';
      },
    });
  }
  if (args.idleShortLinks > 0) {
    out.push({
      tone: 'warn',
      title: `${args.idleShortLinks} 个分享链接 30d 无访问`,
      sub: '考虑撤销以减少噪音',
      cta: '查看',
      onClick: () => {
        // 笔记列表暂未支持 short_link_idle 过滤,先跳到 /notes;
        // 列表支持过滤后,query 会被自动消费。
        location.hash = '#/notes?short_link_idle=1';
      },
    });
  }
  if (args.top) {
    const t = args.top;
    out.push({
      tone: 'accent',
      title: `推荐置顶 "${t.title}"`,
      sub: 'Top 1 文章',
      cta: '查看',
      onClick: () => {
        location.hash = `#/notes/${encodeURIComponent(t.slug)}`;
      },
    });
  }
  if (args.sseRecentSyncFailed) {
    out.push({
      tone: 'warn',
      title: '上次同步失败',
      sub: '查看同步日志排查',
      cta: '查看',
      onClick: () => {
        location.hash = '#/audit?action_prefix=sync.';
      },
    });
  } else if (args.sseRecentSync) {
    out.push({ tone: 'ok', title: '同步完成', sub: '事件流刚刚收到 sync.completed' });
  } else if (args.sse) {
    out.push({ tone: 'ok', title: '事件流已连接', sub: '等待变更' });
  } else {
    out.push({ tone: 'warn', title: '事件流未连接', sub: '检查 /api/admin/changes' });
  }
  return out;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

function renderActivity(kind: string, payload: unknown): string {
  const slug =
    typeof payload === 'object' && payload !== null && 'slug' in payload
      ? String((payload as { slug?: unknown }).slug ?? '')
      : '';
  switch (kind) {
    case 'note.published':
      return `已发布 ${slug || '笔记'}`;
    case 'note.updated':
      return `更新 ${slug || '笔记'}`;
    case 'note.unpublished':
      return `下线 ${slug || '笔记'}`;
    case 'sync.started':
      return '同步开始';
    case 'sync.completed':
      return '同步完成';
    case 'sync.failed':
      return '同步失败';
    case 'settings.changed':
      return '设置已更改';
    case 'media.uploaded':
      return '上传媒体';
    case 'media.deleted':
      return '删除媒体';
    default:
      return kind;
  }
}

function iconForKind(kind: string): 'sync' | 'edit' | 'eye' | 'link' | 'activity' | 'settings' | 'image' {
  if (kind.startsWith('sync')) return 'sync';
  if (kind === 'note.published' || kind === 'note.updated') return 'edit';
  if (kind === 'note.unpublished') return 'eye';
  if (kind === 'settings.changed') return 'settings';
  if (kind.startsWith('media.')) return 'image';
  return 'activity';
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h`;
  return `${Math.round(diff / 86_400_000)}d`;
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

/**
 * 把笔记按 updated_at 落 14 天的 bin,产出 sparkline。
 * 如果还没载入或全部笔记都太老 → 返回空数组,KpiCard 会不画。
 */
function buildActivitySpark(
  notes: NoteSummary[] | null,
  predicate: (n: NoteSummary) => boolean,
): number[] {
  if (!notes || notes.length === 0) return [];
  const days = 14;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = new Array<number>(days).fill(0);
  for (const n of notes) {
    if (!predicate(n)) continue;
    const t = Date.parse(n.updated_at);
    if (Number.isNaN(t)) continue;
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
    if (diff < 0 || diff >= days) continue;
    buckets[days - 1 - diff]! += 1;
  }
  const total = buckets.reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  return buckets;
}
