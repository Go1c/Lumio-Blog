import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { AnalyticsOverview, AnalyticsRange, TimeSeriesPoint } from '@opennote/core';
import { Tag } from '@opennote/ui';
import { api } from '../api.js';
import { KpiCard } from '../components/kpi-card.js';
import { AreaChart } from '../components/area-chart.js';

const RANGES: AnalyticsRange[] = ['7d', '30d', '90d', 'all'];
type Metric = 'views' | 'unique_visitors' | 'avg_dwell';
const METRICS: { id: Metric; label: string }[] = [
  { id: 'views', label: 'PV' },
  { id: 'unique_visitors', label: 'UV' },
  { id: 'avg_dwell', label: '平均停留 (s)' },
];

function formatNum(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatDwell(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export function AnalyticsOverviewPage(): JSX.Element {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [metric, setMetric] = useState<Metric>('views');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [series, setSeries] = useState<TimeSeriesPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // overview 只依赖 range — metric 切换不需要重拉
  useEffect(() => {
    let cancelled = false;
    setOverview(null);
    setError(null);
    api.analytics
      .overview(range)
      .then((ov) => { if (!cancelled) setOverview(ov); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [range]);

  // timeseries 依赖 range + metric
  useEffect(() => {
    let cancelled = false;
    setSeries(null);
    api.analytics
      .timeseries(range, metric)
      .then((ts) => { if (!cancelled) setSeries(ts.points); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [range, metric]);

  const total = overview?.total_views ?? 0;
  const peak = useMemo(() => {
    if (!series || series.length === 0) return null;
    return series.reduce((m, p) => (p.value > m.value ? p : m), series[0]!);
  }, [series]);

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>文章数据</h1>
        <p class="hf-sm hf-muted" style={{ marginTop: 4, margin: 0 }}>
          全站访问 / 停留 / Top 文章。数据由 <code>/api/track</code> 收集,日聚合写入 <code>analytics_daily</code>。
        </p>
      </div>

      {error && (
        <div role="alert" class="hf-tiny" style={{ padding: 10, marginBottom: 12, background: 'var(--danger-soft)', borderRadius: 6, color: 'var(--danger-text)' }}>
          {error}
        </div>
      )}

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard
          label={`总 PV (${range})`}
          value={overview ? formatNum(overview.total_views) : '—'}
          icon="chart"
          tone="var(--accent)"
          sub={overview ? <>累积访问</> : '—'}
        />
        <KpiCard
          label="独立访客"
          value={overview ? formatNum(overview.unique_visitors) : '—'}
          icon="users"
          tone="var(--ok)"
          sub={overview && total > 0 ? <>UV/PV {formatPct(overview.unique_visitors / total)}</> : '—'}
        />
        <KpiCard
          label="平均停留"
          value={overview ? formatDwell(overview.avg_dwell_seconds) : '—'}
          icon="cmd"
          tone="var(--accent)"
          sub="阅读深度参考"
        />
        <KpiCard
          label="跳出率"
          value={overview ? formatPct(overview.bounce_rate) : '—'}
          icon="link"
          tone={overview && overview.bounce_rate < 0.5 ? 'var(--ok)' : 'var(--warn)'}
          sub="单页会话占比"
        />
      </div>

      {/* trend chart */}
      <div class="ui-card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>趋势</div>
            <div class="hf-tiny hf-muted" style={{ marginTop: 2 }}>
              {METRICS.find((m) => m.id === metric)?.label} · {range}
              {peak && (
                <>
                  {' · '}峰值{' '}
                  <code class="hf-mono">{peak.date}</code> ({formatNum(peak.value)})
                </>
              )}
            </div>
          </div>
          <div class="hf-grow" />
          <div role="radiogroup" aria-label="指标" style={{ display: 'flex', gap: 4 }}>
            {METRICS.map((m) => (
              <Tag
                key={m.id}
                pressable
                pressed={metric === m.id}
                tone={metric === m.id ? 'accent' : 'default'}
                onClick={() => setMetric(m.id)}
                aria-label={`切换指标 ${m.label}`}
              >
                {m.label}
              </Tag>
            ))}
          </div>
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
          <AreaChart points={series} aria-label={`${metric} ${range}`} />
        ) : (
          <div class="hf-tiny hf-muted" style={{ padding: 40, textAlign: 'center' }} aria-busy="true">
            载入中…
          </div>
        )}
      </div>

      {/* top posts */}
      <div class="ui-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Top 文章</div>
            <div class="hf-tiny hf-muted" style={{ marginTop: 2 }}>按 PV 排序 · {range}</div>
          </div>
        </div>
        {!overview ? (
          <div class="hf-tiny hf-muted" style={{ padding: 24, textAlign: 'center' }} aria-busy="true">载入中…</div>
        ) : overview.top_posts.length === 0 ? (
          <div class="hf-tiny hf-muted" style={{ padding: 24, textAlign: 'center' }}>暂无数据。</div>
        ) : (
          <table aria-label="Top 文章">
            <thead>
              <tr>
                <th scope="col" style={{ width: 32 }}>#</th>
                <th scope="col">标题</th>
                <th scope="col" style={{ textAlign: 'right' }}>PV</th>
                <th scope="col">占比</th>
                <th scope="col" style={{ width: 60 }}><span class="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody>
              {overview.top_posts.map((p, i) => {
                const pct = total > 0 ? p.views / total : 0;
                return (
                  <tr key={p.slug}>
                    <td class="hf-mono hf-tiny hf-faint">{i + 1}</td>
                    <td>
                      <a href={`#/notes/${encodeURIComponent(p.slug)}`}>{p.title || p.slug}</a>
                      <div class="hf-mono hf-tiny hf-faint">{p.slug}</div>
                    </td>
                    <td style={{ textAlign: 'right' }} class="hf-mono">{formatNum(p.views)}</td>
                    <td>
                      <div
                        aria-label={`${formatPct(pct)} of total`}
                        style={{
                          height: 6,
                          background: 'var(--bg-sunk)',
                          borderRadius: 999,
                          overflow: 'hidden',
                          width: '100%',
                          maxWidth: 140,
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(2, pct * 100)}%`,
                            background: 'var(--accent)',
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <a class="hf-tiny" href={`#/notes/${encodeURIComponent(p.slug)}/analytics`}>详情</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
