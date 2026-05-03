import type { Database } from 'better-sqlite3';
import { AnalyticsRepo } from '@opennote/db';

export interface AnalyticsRollupDeps {
  db: Database;
  /** 默认 00:30 本地时间;为方便测试可注入(0..23 整点 + 0..59 分) */
  hour?: number;
  minute?: number;
  /** 注入 logger,默认 console.log JSON */
  log?: (level: string, msg: string, meta?: Record<string, unknown>) => void;
}

interface Stop {
  stop: () => void;
}

const ONE_MIN = 60_000;

/**
 * 启动 daily rollup:每分钟检查一次,到点(默认 00:30)
 * 跑 yesterday 的 rollup。重启后第一次会立即检查,
 * 若当天的「触发分钟」已过,补跑 yesterday(幂等 — DELETE+INSERT)。
 *
 * main.ts 集成由主 agent 做。
 */
export function startAnalyticsRollup(deps: AnalyticsRollupDeps): Stop {
  const repo = new AnalyticsRepo(deps.db);
  const hour = deps.hour ?? 0;
  const minute = deps.minute ?? 30;
  const log =
    deps.log ??
    ((level, msg, meta) =>
      console.log(
        JSON.stringify({ ts: new Date().toISOString(), level, event: msg, ...(meta ?? {}) }),
      ));

  let lastRunDate: string | null = null;

  const run = (): void => {
    const now = new Date();
    const todayKey = isoDate(now);
    if (lastRunDate === todayKey) return;
    if (now.getHours() < hour || (now.getHours() === hour && now.getMinutes() < minute)) return;

    const yesterday = isoDate(new Date(now.getTime() - 86400_000));
    try {
      repo.rollupDay(yesterday);
      lastRunDate = todayKey;
      log('info', 'analytics.rollup.ok', { date: yesterday });
    } catch (e) {
      log('error', 'analytics.rollup.failed', { date: yesterday, err: String(e) });
    }
  };

  // 立即触发一次(若已过点)
  run();
  const id = setInterval(run, ONE_MIN);
  return { stop: () => clearInterval(id) };
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
