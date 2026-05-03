import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { ArticleAnalytics, AnalyticsRange, TimeSeriesPoint } from '@opennote/core';
import { Button, HfIcon, Tag } from '@opennote/ui';
import { api, type NoteDetail } from '../api.js';
import { AreaChart } from '../components/area-chart.js';

const RANGES: AnalyticsRange[] = ['7d', '30d', '90d'];

export function NoteAnalyticsPage({ slug }: { slug: string }): JSX.Element {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [data, setData] = useState<ArticleAnalytics | null>(null);
  const [series, setSeries] = useState<TimeSeriesPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .getNote(slug)
      .then((r) => {
        if (!cancelled) setNote(r.note);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    void api.analytics
      .article(slug)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    setSeries(null);
    void api.analytics
      .timeseries(range, 'views')
      .then((r) => {
        if (!cancelled) setSeries(r.points);
      })
      .catch(() => {
        /* 单篇 timeseries 暂回退到全站,等 WS-G 提供单篇 */
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  if (error && !data) {
    return (
      <div role="alert" class="hf-tiny" style={{ padding: 12, background: 'var(--danger-soft)', color: 'var(--danger-text)', borderRadius: 6 }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* breadcrumb */}
      <nav aria-label="面包屑" class="hf-tiny" style={{ marginBottom: 8 }}>
        <a href="#/notes" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          <span aria-hidden="true">← </span>笔记列表
        </a>
        <span aria-hidden="true"> / </span>
        <a href={`#/notes/${encodeURIComponent(slug)}`} style={{ color: 'var(--ink-2)' }}>
          {slug}
        </a>
      </nav>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
        <div>
          <div class="hf-mono hf-tiny hf-muted" style={{ marginBottom: 4 }}>
            {note ? `${note.updated_at.slice(0, 10)} · ${note.reading_minutes} min · ${visLabel(note.visibility)}` : '载入中…'}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
            {note?.title ?? slug}
          </h1>
        </div>
        <div class="hf-grow" />
        <Button size="sm" onClick={() => window.open(`/posts/${encodeURIComponent(slug)}.html`, '_blank')}>
          <HfIcon name="arrowR" size={11} /> 查看页面
        </Button>
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

      {/* big numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiBox label="总浏览" value={data ? formatNum(data.views) : '—'} />
        <KpiBox label="独立访客" value={data ? formatNum(data.unique_visitors) : '—'} />
        <KpiBox label="平均停留" value={data ? formatDwell(data.avg_dwell_seconds) : '—'} />
        <KpiBox label="读完率" value={data ? `${formatPct(completionRate(data.completion_heatmap))}` : '—'} />
      </div>

      {/* 2-col: chart + scroll-depth */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14 }}>
        <div class="ui-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>浏览趋势</span>
            <div class="hf-grow" />
            <span class="hf-tiny hf-muted">range: {range}</span>
          </div>
          {series ? <AreaChart points={series} aria-label={`浏览趋势 ${range}`} /> : (
            <div class="hf-tiny hf-muted" style={{ padding: 24, textAlign: 'center' }} aria-busy="true">
              载入中…
            </div>
          )}
        </div>

        <div class="ui-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>阅读深度</div>
          {data ? <CompletionHeatmap heat={data.completion_heatmap} /> : (
            <p class="hf-tiny hf-muted" aria-busy="true">载入中…</p>
          )}
        </div>
      </div>

      {/* referrer + short vs canonical */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
        <div class="ui-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>流量来源</div>
          {data ? <ReferrerPie items={data.referrer_breakdown} /> : (
            <p class="hf-tiny hf-muted" aria-busy="true">载入中…</p>
          )}
        </div>

        <div class="ui-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>短链 vs 直链</div>
          {data ? <ShortVsCanonical sv={data.short_vs_canonical} /> : (
            <p class="hf-tiny hf-muted" aria-busy="true">载入中…</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiBox({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div class="ui-card" style={{ padding: 14 }}>
      <div class="hf-mono hf-tiny hf-muted">{label}</div>
      <div
        class="hf-mono"
        style={{ fontSize: 26, fontWeight: 700, marginTop: 4, lineHeight: 1 }}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </div>
    </div>
  );
}

function CompletionHeatmap({ heat }: { heat: number[] }): JSX.Element {
  // heat 长度 N (典型 10),0..1
  if (heat.length === 0) return <p class="hf-tiny hf-muted">无数据</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="阅读完成度热力">
      {heat.map((v, i) => {
        const pct = clamp01(v) * 100;
        const seg = Math.round((i / heat.length) * 100);
        const color = i === heat.length - 1 ? 'var(--ok)' : 'var(--accent)';
        return (
          <li key={i} style={{ marginBottom: 8 }}>
            <div
              class="hf-mono hf-tiny"
              style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, color: 'var(--ink-3)' }}
            >
              <span>{seg}% 段</span>
              <span style={{ color: 'var(--ink)' }}>{pct.toFixed(0)}%</span>
            </div>
            <div
              style={{
                height: 6,
                background: 'var(--bg-sunk)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`第 ${seg}% 段完成度`}
            >
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ReferrerPie({ items }: { items: Array<{ source: string; views: number }> }): JSX.Element {
  const total = items.reduce((s, x) => s + x.views, 0);
  if (total === 0 || items.length === 0) {
    return <p class="hf-tiny hf-muted">无数据</p>;
  }
  // SVG 饼图
  const cx = 60;
  const cy = 60;
  const r = 50;
  const palette = ['var(--accent)', 'var(--ok)', 'var(--warn)', 'var(--danger)', 'var(--ink-3)', 'var(--ink-4)'];
  let acc = 0;
  const segs = items.map((it, i) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += it.views;
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    const color = palette[i % palette.length] ?? 'var(--accent)';
    return { ...it, d, color, pct: (it.views / total) * 100 };
  });

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <svg
        viewBox="0 0 120 120"
        width={120}
        height={120}
        role="img"
        aria-label="流量来源饼图"
        style={{ flexShrink: 0 }}
      >
        {segs.map((s) => (
          <path key={s.source} d={s.d} fill={s.color} stroke="var(--bg)" strokeWidth="1" />
        ))}
      </svg>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
        {segs.map((s) => (
          <li
            key={s.source}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '3px 0' }}
          >
            <span
              aria-hidden="true"
              style={{ display: 'inline-block', width: 10, height: 10, background: s.color, borderRadius: 2 }}
            />
            <span class="hf-grow">{s.source || '直接访问'}</span>
            <span class="hf-mono hf-tiny hf-muted">{formatNum(s.views)} · {s.pct.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShortVsCanonical({ sv }: { sv: { short_id_views: number; canonical_views: number } }): JSX.Element {
  const total = sv.short_id_views + sv.canonical_views;
  if (total === 0) return <p class="hf-tiny hf-muted">无数据</p>;
  const shortPct = (sv.short_id_views / total) * 100;
  const canonPct = (sv.canonical_views / total) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Bar label="短链 (/n/...)" value={sv.short_id_views} pct={shortPct} color="var(--warn)" />
      <Bar label="canonical" value={sv.canonical_views} pct={canonPct} color="var(--accent)" />
      <p class="hf-tiny hf-muted" style={{ marginTop: 4 }}>
        总计 {formatNum(total)} 次浏览
      </p>
    </div>
  );
}

function Bar({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }): JSX.Element {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span class="hf-mono hf-tiny hf-muted">{formatNum(value)} · {pct.toFixed(0)}%</span>
      </div>
      <div
        style={{ height: 8, background: 'var(--bg-sunk)', borderRadius: 4, overflow: 'hidden' }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function completionRate(heat: number[]): number {
  if (heat.length === 0) return 0;
  return clamp01(heat[heat.length - 1] ?? 0);
}

function formatPct(p01: number): string {
  return `${(p01 * 100).toFixed(0)}%`;
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function formatDwell(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}m ${rest.toString().padStart(2, '0')}s`;
}

function visLabel(v: 'public' | 'unlisted' | 'link-only' | 'private'): string {
  if (v === 'public') return '公开';
  if (v === 'unlisted') return '不列出';
  if (v === 'link-only') return '仅链接';
  return '私有';
}
