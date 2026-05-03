import type { Database } from 'better-sqlite3';
import type {
  AnalyticsOverview,
  AnalyticsRange,
  ArticleAnalytics,
  TimeSeriesPoint,
  TrackEvent,
} from '@opennote/core';

/** 支持的 timeseries metric */
export type AnalyticsMetric = 'views' | 'unique_visitors' | 'avg_dwell';

interface IngestInput {
  slug: string;
  event: TrackEvent['event'];
  ts?: string;
  ip_hash?: string;
  ua?: string;
  referrer?: string;
  dwell_seconds?: number;
  scroll_pct?: number;
  meta?: Record<string, string | number>;
}

const HEATMAP_BUCKETS = 10;

/**
 * AnalyticsRepo
 * — 写入 analytics_events
 * — 读 overview / timeseries / article(从 events + analytics_daily 综合)
 * — rollupDay(date) 把某天的 events 聚合到 analytics_daily
 *
 * 设计原则:overview/timeseries 优先走物化表 analytics_daily(快),
 * 单篇 article 详情走 events 原表(灵活,数据量受 slug 维度天然约束)
 */
export class AnalyticsRepo {
  constructor(private db: Database) {}

  // ---------------------------------------------------------------------
  // ingest
  // ---------------------------------------------------------------------

  ingestEvent(e: IngestInput): void {
    const ts = e.ts ?? new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO analytics_events
         (slug, event, ts, ip_hash, ua, referrer, dwell_seconds, scroll_pct, meta_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        e.slug,
        e.event,
        ts,
        e.ip_hash ?? null,
        e.ua ?? null,
        e.referrer ?? null,
        e.dwell_seconds ?? null,
        e.scroll_pct ?? null,
        e.meta ? JSON.stringify(e.meta) : null,
      );
  }

  // ---------------------------------------------------------------------
  // overview
  // ---------------------------------------------------------------------

  overview(range: AnalyticsRange): AnalyticsOverview {
    const since = rangeStartIso(range);

    const totalsRow = this.db
      .prepare<[string], { views: number; uniques: number; dwell_sum: number; dwell_n: number }>(
        `SELECT
           SUM(CASE WHEN event = 'view'  THEN 1 ELSE 0 END)        AS views,
           COUNT(DISTINCT CASE WHEN event = 'view' THEN ip_hash END) AS uniques,
           SUM(CASE WHEN dwell_seconds IS NOT NULL THEN dwell_seconds ELSE 0 END) AS dwell_sum,
           SUM(CASE WHEN dwell_seconds IS NOT NULL THEN 1 ELSE 0 END)             AS dwell_n
         FROM analytics_events
         WHERE ts >= ?`,
      )
      .get(since) ?? { views: 0, uniques: 0, dwell_sum: 0, dwell_n: 0 };

    const totalViews = totalsRow.views ?? 0;
    const uniques = totalsRow.uniques ?? 0;
    const avgDwell = totalsRow.dwell_n > 0 ? Math.round(totalsRow.dwell_sum / totalsRow.dwell_n) : 0;

    // bounce_rate = 仅 view 没 dwell/scroll 的访客比例
    // 简化:每个 ip_hash+slug 在窗口内是否有 dwell/scroll 事件
    const bounceRow = this.db
      .prepare<[string], { sessions: number; bounced: number }>(
        `WITH visit AS (
           SELECT ip_hash, slug,
                  SUM(CASE WHEN event = 'view' THEN 1 ELSE 0 END) AS views,
                  SUM(CASE WHEN event IN ('dwell','scroll','click') THEN 1 ELSE 0 END) AS engaged
             FROM analytics_events
            WHERE ts >= ? AND ip_hash IS NOT NULL
            GROUP BY ip_hash, slug
         )
         SELECT COUNT(*) AS sessions,
                SUM(CASE WHEN views > 0 AND engaged = 0 THEN 1 ELSE 0 END) AS bounced
           FROM visit
          WHERE views > 0 OR engaged > 0`,
      )
      .get(since) ?? { sessions: 0, bounced: 0 };

    const bounceRate =
      bounceRow.sessions > 0 ? +(bounceRow.bounced / bounceRow.sessions).toFixed(3) : 0;

    const top = this.db
      .prepare<[string, number], { slug: string; title: string; views: number }>(
        `SELECT e.slug                        AS slug,
                COALESCE(n.title, e.slug)     AS title,
                COUNT(*)                      AS views
           FROM analytics_events e
           LEFT JOIN notes n ON n.slug = e.slug
          WHERE e.ts >= ? AND e.event = 'view'
          GROUP BY e.slug
          ORDER BY views DESC
          LIMIT ?`,
      )
      .all(since, 5);

    return {
      range,
      total_views: totalViews,
      unique_visitors: uniques,
      avg_dwell_seconds: avgDwell,
      bounce_rate: bounceRate,
      top_posts: top,
    };
  }

  // ---------------------------------------------------------------------
  // timeseries
  // ---------------------------------------------------------------------

  timeseries(range: AnalyticsRange, metric: AnalyticsMetric): TimeSeriesPoint[] {
    const since = rangeStartIso(range);

    if (metric === 'views') {
      return this.db
        .prepare<[string], { date: string; value: number }>(
          `SELECT substr(ts, 1, 10) AS date, COUNT(*) AS value
             FROM analytics_events
            WHERE event = 'view' AND ts >= ?
            GROUP BY substr(ts, 1, 10)
            ORDER BY date ASC`,
        )
        .all(since)
        .map((r) => ({ date: r.date, value: Number(r.value) }));
    }

    if (metric === 'unique_visitors') {
      return this.db
        .prepare<[string], { date: string; value: number }>(
          `SELECT substr(ts, 1, 10) AS date, COUNT(DISTINCT ip_hash) AS value
             FROM analytics_events
            WHERE event = 'view' AND ts >= ? AND ip_hash IS NOT NULL
            GROUP BY substr(ts, 1, 10)
            ORDER BY date ASC`,
        )
        .all(since)
        .map((r) => ({ date: r.date, value: Number(r.value) }));
    }

    // avg_dwell — 每天的平均停留秒数
    return this.db
      .prepare<[string], { date: string; value: number }>(
        `SELECT substr(ts, 1, 10) AS date,
                CAST(ROUND(AVG(dwell_seconds)) AS INTEGER) AS value
           FROM analytics_events
          WHERE dwell_seconds IS NOT NULL AND ts >= ?
          GROUP BY substr(ts, 1, 10)
          ORDER BY date ASC`,
      )
      .all(since)
      .map((r) => ({ date: r.date, value: Number(r.value ?? 0) }));
  }

  // ---------------------------------------------------------------------
  // single-article analytics
  // ---------------------------------------------------------------------

  article(slug: string): ArticleAnalytics {
    const totals = this.db
      .prepare<[string], { views: number; uniques: number; dwell_avg: number | null }>(
        `SELECT
           SUM(CASE WHEN event = 'view' THEN 1 ELSE 0 END)              AS views,
           COUNT(DISTINCT CASE WHEN event = 'view' THEN ip_hash END)    AS uniques,
           CAST(ROUND(AVG(CASE WHEN dwell_seconds IS NOT NULL THEN dwell_seconds END))
                AS INTEGER)                                             AS dwell_avg
         FROM analytics_events
         WHERE slug = ?`,
      )
      .get(slug) ?? { views: 0, uniques: 0, dwell_avg: 0 };

    // heatmap: 每个 bucket 的 scroll 命中比例 = (在该 bucket 及以上的访客) / 总访客
    // 简化:对该 slug 所有 scroll 事件取最大 scroll_pct per ip_hash,
    //       再按 10 个 bucket 算累计到达率
    const scrollRows = this.db
      .prepare<[string], { ip_hash: string | null; max_pct: number }>(
        `SELECT ip_hash, MAX(COALESCE(scroll_pct, 0)) AS max_pct
           FROM analytics_events
          WHERE slug = ? AND event = 'scroll' AND ip_hash IS NOT NULL
          GROUP BY ip_hash`,
      )
      .all(slug);

    const heatmap = new Array<number>(HEATMAP_BUCKETS).fill(0);
    if (scrollRows.length > 0) {
      const buckets = new Array<number>(HEATMAP_BUCKETS).fill(0);
      // bucket k(0-indexed)代表「至少滚到 (k+1)*10%」
      // pct=60 → 到达 buckets 0..5(即 10/20/30/40/50/60 都达成),不到 70/80/90/100
      // pct=100 → 到达 0..9
      // pct=0..9 → reachedTo=-1(没达成任何 bucket)
      for (const r of scrollRows) {
        const pct = Math.max(0, Math.min(100, r.max_pct));
        const reachedTo = Math.floor(pct / (100 / HEATMAP_BUCKETS)) - 1;
        const cap = Math.min(HEATMAP_BUCKETS - 1, reachedTo);
        for (let k = 0; k <= cap; k++) {
          const slot = buckets[k];
          buckets[k] = (slot ?? 0) + 1;
        }
      }
      for (let i = 0; i < HEATMAP_BUCKETS; i++) {
        const v = buckets[i] ?? 0;
        heatmap[i] = +(v / scrollRows.length).toFixed(3);
      }
    }

    const refRows = this.db
      .prepare<[string], { source: string; views: number }>(
        `SELECT
           CASE
             WHEN referrer IS NULL OR referrer = '' THEN 'direct'
             ELSE referrer
           END AS source,
           COUNT(*) AS views
         FROM analytics_events
         WHERE slug = ? AND event = 'view'
         GROUP BY source
         ORDER BY views DESC
         LIMIT 20`,
      )
      .all(slug);

    const sourceShort = this.db
      .prepare<[string], { c: number }>(
        `SELECT COUNT(*) AS c FROM analytics_events
          WHERE slug = ? AND event = 'view'
            AND meta_json IS NOT NULL
            AND json_extract(meta_json, '$.via') = 'short'`,
      )
      .get(slug)?.c ?? 0;
    const sourceCanon = (totals.views ?? 0) - sourceShort;

    return {
      slug,
      views: totals.views ?? 0,
      unique_visitors: totals.uniques ?? 0,
      avg_dwell_seconds: totals.dwell_avg ?? 0,
      completion_heatmap: heatmap,
      referrer_breakdown: refRows.map((r) => ({ source: r.source, views: Number(r.views) })),
      short_vs_canonical: {
        short_id_views: sourceShort,
        canonical_views: Math.max(0, sourceCanon),
      },
    };
  }

  // ---------------------------------------------------------------------
  // rollup
  // ---------------------------------------------------------------------

  /**
   * 把指定日期(YYYY-MM-DD)的 events 聚合到 analytics_daily。
   * 幂等:UPSERT 重写整天数据。
   */
  rollupDay(date: string): void {
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;

    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM analytics_daily WHERE date = ?').run(date);
      this.db
        .prepare(
          `INSERT INTO analytics_daily (date, slug, views, unique_visitors, total_dwell_seconds)
           SELECT ?,
                  slug,
                  SUM(CASE WHEN event = 'view' THEN 1 ELSE 0 END),
                  COUNT(DISTINCT CASE WHEN event = 'view' THEN ip_hash END),
                  COALESCE(SUM(CASE WHEN dwell_seconds IS NOT NULL THEN dwell_seconds ELSE 0 END), 0)
             FROM analytics_events
            WHERE ts >= ? AND ts <= ?
            GROUP BY slug`,
        )
        .run(date, start, end);
    });
    tx();
  }
}

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

function rangeStartIso(range: AnalyticsRange): string {
  if (range === 'all') return '1970-01-01T00:00:00.000Z';
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const d = new Date(Date.now() - days * 86400_000);
  return d.toISOString();
}
