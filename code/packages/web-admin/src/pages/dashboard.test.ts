import { describe, expect, it } from 'vitest';
import type { AdminSettings } from '@opennote/core';
import { DASHBOARD_RESPONSIVE_STYLE } from './dashboard.js';
import * as dashboard from './dashboard.js';

type Health = {
  note_count: number;
  visibility_counts: { public: number; unlisted: number; 'link-only': number; private: number };
};

function buildRows(home: AdminSettings['home']) {
  const fn = (dashboard as {
    buildDashboardAdRows?: (home: AdminSettings['home']) => Array<{
      name: string;
      detail: string;
      stat: string;
      statLabel: string;
      href: string;
      enabled: boolean;
    }>;
  }).buildDashboardAdRows;
  if (typeof fn !== 'function') throw new Error('buildDashboardAdRows is not exported');
  return fn(home);
}

function buildOverview(input: {
  health: Health | null;
  notes: Array<{ source_path?: string; slug: string }>;
  views30d: number | null;
  syncAt: string | null;
  filesScanned: number;
}) {
  const fn = (dashboard as {
    buildDashboardOverview?: (input: {
      health: Health | null;
      notes: Array<{ source_path?: string; slug: string }>;
      views30d: number | null;
      syncAt: string | null;
      filesScanned: number;
      now?: Date;
    }) => Array<{ label: string; value: string; delta: string }>;
  }).buildDashboardOverview;
  if (typeof fn !== 'function') throw new Error('buildDashboardOverview is not exported');
  return fn({ ...input, now: new Date('2026-06-07T12:00:00.000Z') });
}

function buildSyncSummary(input: Parameters<NonNullable<(typeof dashboard)['buildSyncSummary']>>[0]) {
  const fn = dashboard.buildSyncSummary;
  if (typeof fn !== 'function') throw new Error('buildSyncSummary is not exported');
  return fn(input);
}

describe('dashboard responsive polish', () => {
  it('stacks Lumio admin panels on tablet and phone widths', () => {
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('@media (max-width: 1100px)');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('@media (max-width: 680px)');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('.stat-row');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('.two-col');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('grid-template-columns: 1fr');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('.adrow');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('.tbl');
  });

  it('builds the dashboard ad panel from configured settings ads', () => {
    const rows = buildRows({
      ads: [
        {
          id: 'home-unity',
          enabled: true,
          variant: 'native',
          slot: 'home',
          title: 'Unity 6 性能套件',
          impressions: 18420,
          clicks: 728,
        },
        {
          id: 'article-shader',
          name: '侧栏方图',
          enabled: false,
          variant: 'native',
          slot: 'article',
          title: 'Shader 训练营',
          impressions: 9260,
          clicks: 214,
        },
      ],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: 'Unity 6 性能套件',
      detail: '首页 · 开启 · 曝光 18,420',
      stat: '728',
      statLabel: '点击 / 周',
      href: '#/ads',
      enabled: true,
    });
    expect(rows[1]).toMatchObject({
      name: '侧栏方图',
      detail: '文章页 · 暂停 · 曝光 9,260',
      stat: '214',
      statLabel: '点击 / 周',
      href: '#/ads',
      enabled: false,
    });
  });

  it('does not seed demo ads on the dashboard when no ads are configured', () => {
    expect(buildRows({})).toEqual([]);
  });

  it('summarizes the dashboard from real notes, analytics, and sync diagnostics', () => {
    const rows = buildOverview({
      health: {
        note_count: 7,
        visibility_counts: { public: 3, unlisted: 1, 'link-only': 1, private: 2 },
      },
      notes: [
        { slug: 'a', source_path: 'render/a.md' },
        { slug: 'b', source_path: 'render/b.md' },
        { slug: 'c', source_path: 'tools/c.md' },
        { slug: 'root' },
      ],
      views30d: 1234,
      syncAt: '2026-06-07T08:30:00.000Z',
      filesScanned: 42,
    });

    expect(rows.map((row) => row.label)).toEqual(['笔记总数', '今日同步扫描', '近 30 日浏览', '活跃专栏']);
    expect(rows.map((row) => row.value)).toEqual(['7', '42', '1.2k', '3']);
    expect(rows[0]).toMatchObject({ delta: '3 篇公开 · 2 篇待公开' });
    expect(rows[1]).toMatchObject({ delta: '最近 08:30' });
  });

  it('does not pretend old sync diagnostics are today activity', () => {
    const rows = buildOverview({
      health: null,
      notes: [],
      views30d: null,
      syncAt: '2026-06-06T23:59:00.000Z',
      filesScanned: 42,
    });

    expect(rows[1]).toMatchObject({
      label: '今日同步扫描',
      value: '0',
      delta: '最近 06-06 23:59',
    });
  });

  it('turns sync diagnostics into an operations status without hiding failures', () => {
    const summary = buildSyncSummary({
      at: '2026-06-07T08:30:00.000Z',
      diag: {
        files_scanned: 9,
        parse_failed: [{ source_path: 'bad.md', message: 'bad frontmatter' }],
        normalize_warnings: [{ source_path: 'warn.md', message: 'slug normalized' }],
        slug_conflicts: [],
        process_failed: [],
        removed_slugs: ['gone'],
      },
    });

    expect(summary).toMatchObject({
      title: '最近同步有 2 个问题',
      tone: 'warn',
      scanned: '9',
      removed: '1',
    });
    expect(summary.detail).toContain('bad.md');
    expect(summary.detail).toContain('warn.md');
  });
});
