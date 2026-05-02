import chokidar from 'chokidar';
import { resolve } from 'node:path';
import { syncAll, syncOne, syncRemove, type SyncOptions } from './pipeline.js';

/**
 * v0.6 watcher：单文件事件 → 单文件处理。
 * - 初次 ready 时跑一次 syncAll 兜底（捕捉 watcher 启动前的离线变更）
 * - 之后 add/change → syncOne, unlink → syncRemove
 * - 同一文件 200ms 内连续事件合并（chokidar awaitWriteFinish 已经做了，再加一层节流防抖）
 * - 串行队列：单文件处理也走 worker 队列，避免并发写库
 */
export function startWatcher(opts: SyncOptions): { stop: () => Promise<void> } {
  type Job =
    | { kind: 'all' }
    | { kind: 'one'; abs: string }
    | { kind: 'remove'; abs: string };

  const queue: Job[] = [];
  // 同路径合并：已排队的 one/remove 可被覆盖
  const pendingByPath = new Map<string, Job>();
  let running = false;

  const enqueue = (job: Job) => {
    if (job.kind === 'all') {
      // 全量进队列时清空所有单文件 job —— 全量做完它们都被覆盖
      queue.length = 0;
      pendingByPath.clear();
      queue.push(job);
    } else {
      const key = resolve(job.abs);
      const prev = pendingByPath.get(key);
      if (prev) {
        // 替换 queue 里旧 job
        const idx = queue.indexOf(prev);
        if (idx >= 0) queue.splice(idx, 1);
      }
      pendingByPath.set(key, job);
      queue.push(job);
    }
    void drain();
  };

  const drain = async () => {
    if (running) return;
    running = true;
    try {
      while (queue.length > 0) {
        const job = queue.shift()!;
        if (job.kind !== 'all') {
          pendingByPath.delete(resolve(job.abs));
        }
        try {
          if (job.kind === 'all') {
            await syncAll(opts);
          } else if (job.kind === 'one') {
            await syncOne(job.abs, opts);
          } else {
            syncRemove(job.abs, opts);
          }
        } catch (e) {
          opts.onLog?.('error', 'sync.job.failed', {
            kind: job.kind,
            err: (e as Error).message,
          });
          opts.onEvent?.({ kind: 'sync.failed', err: (e as Error).message });
        }
      }
    } finally {
      running = false;
    }
  };

  const watcher = chokidar.watch(`${opts.vault}/**/*.md`, {
    ignoreInitial: true, // ready 后我们手动触发 syncAll，避免对每个文件 add 一次
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  watcher.on('ready', () => enqueue({ kind: 'all' }));
  watcher.on('add', (path) => enqueue({ kind: 'one', abs: path }));
  watcher.on('change', (path) => enqueue({ kind: 'one', abs: path }));
  watcher.on('unlink', (path) => enqueue({ kind: 'remove', abs: path }));

  return {
    stop: async () => {
      await watcher.close();
      // 让在跑的 job 跑完
      while (running) await new Promise((r) => setTimeout(r, 20));
    },
  };
}
