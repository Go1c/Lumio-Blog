import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { HfIcon } from '@opennote/ui';
import { api, type HealthInfo, type NoteSummary, type CommentCounts, type SubscriberCounts } from '../api.js';

interface TrendPoint {
  label: string;
  value: number;
  height: number;
}

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
.task-row {
  display: flex;
  align-items: center;
  gap: 14px;
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
  .task-row { align-items: flex-start; }
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
  comments: CommentCounts | null;
  subscribers: SubscriberCounts | null;
}

const EMPTY_STATE: DashboardState = {
  health: null,
  notes: [],
  views30d: null,
  trend: [],
  comments: null,
  subscribers: null,
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
      api.comments.list({ status: 'pending', limit: 5 }),
      api.subscribers.list(true),
    ]).then(([health, notes, overview, series, comments, subscribers]) => {
      if (cancelled) return;
      const failures = [health, notes, overview, series, comments, subscribers]
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
        comments: comments.status === 'fulfilled' ? comments.value.counts : null,
        subscribers: subscribers.status === 'fulfilled' ? subscribers.value.counts : null,
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
  const privateCount = state.health?.visibility_counts.private ?? 0;
  const publishedCount = state.health?.visibility_counts.public ?? 0;
  const pendingComments = state.comments?.pending ?? 0;
  const activeSubscribers = state.subscribers?.active ?? 0;

  return (
    <div class="adm-body">
      <DashboardStyles />

      {error && (
        <p role="alert" class="lumio-alert">
          部分后台数据载入失败:{error}
        </p>
      )}

      <section class="stat-row" aria-label="核心指标" aria-busy={loading ? 'true' : 'false'}>
        <StatCard
          icon="eye"
          tone="i-blue"
          delta="analytics · 30d"
          deltaTone="up"
          value={state.views30d === null ? '—' : formatNum(state.views30d)}
          label="近 30 日访问量"
        />
        <StatCard
          icon="note"
          tone="i-mint"
          delta={`${privateCount} 篇待公开`}
          deltaTone={privateCount > 0 ? 'down' : 'up'}
          value={formatNum(publishedCount)}
          label="已公开文章"
        />
        <StatCard
          icon="mail"
          tone="i-amber"
          delta="本地订阅表"
          deltaTone="up"
          value={formatNum(activeSubscribers)}
          label="邮件订阅数"
        />
        <StatCard
          icon="comment"
          tone="i-rose"
          delta={pendingComments > 0 ? '需要审核' : '暂无待审'}
          deltaTone={pendingComments > 0 ? 'down' : 'up'}
          value={formatNum(pendingComments)}
          label="待审评论"
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

        <div class="panel">
          <div class="panel__head">
            <div class="panel__title">待处理</div>
            <div class="panel__spacer" />
            <a class="panel__link" href="#/comments">评论审核</a>
          </div>
          <div class="adlist">
            <TaskRow
              icon="comment"
              name="待审评论"
              detail="公开前需要管理员审核"
              stat={pendingComments}
              href="#/comments"
            />
            <TaskRow
              icon="lock"
              name="私有文章"
              detail="默认不公开,需要手动发布"
              stat={privateCount}
              href="#/vault"
            />
            <TaskRow
              icon="tag"
              name="全部文章"
              detail="来自后端同步数据库"
              stat={state.health?.note_count ?? state.notes.length}
              href="#/vault"
            />
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
  icon: 'eye' | 'note' | 'mail' | 'comment';
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

function TaskRow({
  icon,
  name,
  detail,
  stat,
  href,
}: {
  icon: 'comment' | 'lock' | 'tag';
  name: string;
  detail: string;
  stat: number;
  href: string;
}): JSX.Element {
  return (
    <a class="adrow task-row" href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
      <div class="adrow__thumb" aria-hidden="true">
        <HfIcon name={icon} size={18} />
      </div>
      <div class="adrow__info">
        <div class="adrow__name">{name}</div>
        <div class="adrow__url">{detail}</div>
      </div>
      <div class="adrow__stat">
        <b>{formatNum(stat)}</b>
        <small>条目</small>
      </div>
    </a>
  );
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
