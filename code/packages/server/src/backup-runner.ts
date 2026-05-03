import { mkdir, stat } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import { BackupRepo } from '@opennote/db';
import type { BackupJob } from '@opennote/core';
import type { EventBus } from './events.js';

/**
 * BackupRunner — 简单的内存 worker。
 *
 * - 一次只跑一个 job(in-flight 锁)
 * - 进度持久化到 backup_jobs 表(每写入一个 entry 更新一次)
 * - 用 archiver 打 zip:vault 整目录 + sqlite 文件 + 简单 metadata.json
 *
 * archiver 是动态 import,没装时优雅降级为失败状态。
 */

export interface BackupRunnerOptions {
  db: Database;
  bus: EventBus;
  /** vault 目录(笔记源) */
  vaultDir: string;
  /** sqlite 文件 */
  dbPath: string;
  /** 备份 zip 的输出目录(每个 job 一个文件) */
  outDir: string;
}

export class BackupRunner {
  private busy = false;
  private repo: BackupRepo;
  private opts: BackupRunnerOptions;

  constructor(opts: BackupRunnerOptions) {
    this.opts = opts;
    this.repo = new BackupRepo(opts.db);
  }

  /** 创建并立即调度。返回初始 job 状态。 */
  enqueue(): BackupJob {
    const id = `bk_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
    const job: BackupJob = {
      id,
      status: 'pending',
      progress: 0,
      bytes: null,
      download_url: null,
      error: null,
      created_at: new Date().toISOString(),
      finished_at: null,
    };
    this.repo.insert(job);
    setImmediate(() => { void this.runOne(id); });
    return job;
  }

  get(id: string): BackupJob | undefined {
    return this.repo.get(id);
  }

  /** 拼装下载文件的物理路径 */
  filePathFor(id: string): string {
    return resolve(this.opts.outDir, `${id}.zip`);
  }

  // ------- internals --------

  private async runOne(id: string): Promise<void> {
    if (this.busy) {
      // 简单串行:让等的 job 留 pending,下一个完成后没人 trigger,
      // 实际可以排队 — 但 v0.1 简单点,失败掉
      this.repo.update(id, { status: 'failed', error: 'busy' });
      this.opts.bus.emit({ kind: 'backup.failed', job_id: id, error: 'busy' });
      return;
    }
    this.busy = true;
    this.repo.update(id, { status: 'running', progress: 0.05 });
    this.opts.bus.emit({ kind: 'backup.started', job_id: id });

    try {
      await mkdir(this.opts.outDir, { recursive: true });
      const dest = this.filePathFor(id);
      const archiver = await loadArchiver();
      if (!archiver) {
        throw new Error('archiver_not_installed');
      }

      const out = createWriteStream(dest);
      const archive = archiver('zip', { zlib: { level: 6 } });

      // pipe + 进度计算 — archiver 进度走 entry 事件
      archive.pipe(out);

      // 元信息
      archive.append(
        JSON.stringify(
          { id, created_at: new Date().toISOString(), kind: 'opennote-backup' },
          null,
          2,
        ),
        { name: 'metadata.json' },
      );

      // sqlite snapshot:用 sqlite3 .backup() 拿一致性快照
      const snapPath = join(dirname(dest), `${id}.snapshot.sqlite`);
      try {
        await this.opts.db.backup(snapPath);
        archive.file(snapPath, { name: 'opennote.sqlite' });
      } catch {
        // 退回:直接读 dbPath(可能不一致,但能跑)
        if (existsSync(this.opts.dbPath)) {
          archive.file(this.opts.dbPath, { name: 'opennote.sqlite' });
        }
      }

      // vault 整目录
      if (existsSync(this.opts.vaultDir)) {
        archive.directory(this.opts.vaultDir, 'vault');
      }

      let entries = 0;
      archive.on('entry', () => {
        entries += 1;
        // 没法精确算总数,渐进逼近 0.95
        const p = Math.min(0.05 + entries * 0.01, 0.95);
        this.repo.update(id, { progress: p });
      });

      const finished = new Promise<void>((res, rej) => {
        archive.on('error', (...args: unknown[]) => rej(args[0] as Error));
        out.on('close', () => res());
        out.on('error', (e: Error) => rej(e));
      });

      await archive.finalize();
      await finished;

      // snapshot 清掉
      try {
        const { unlink } = await import('node:fs/promises');
        if (existsSync(snapPath)) await unlink(snapPath);
      } catch { /* ignore */ }

      const s = await stat(dest);
      const bytes = s.size;
      const downloadUrl = `/api/admin/backup/${id}/download`;
      this.repo.update(id, {
        status: 'done',
        progress: 1,
        bytes,
        download_url: downloadUrl,
        finished_at: new Date().toISOString(),
      });
      this.opts.bus.emit({ kind: 'backup.done', job_id: id, bytes });
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      this.repo.update(id, {
        status: 'failed',
        error: msg,
        finished_at: new Date().toISOString(),
      });
      this.opts.bus.emit({ kind: 'backup.failed', job_id: id, error: msg });
    } finally {
      this.busy = false;
    }
  }
}

// 动态 archiver 加载:没装就返回 null,让 job 优雅失败(测试 / 没 deps 不挂)
type ArchiverFactory = (
  format: string,
  opts?: { zlib?: { level?: number } },
) => {
  pipe(out: NodeJS.WritableStream): unknown;
  append(src: string | Buffer | NodeJS.ReadableStream, opts: { name: string }): unknown;
  file(path: string, opts: { name: string }): unknown;
  directory(path: string, dest: string): unknown;
  finalize(): Promise<void>;
  on(event: string, handler: (...args: unknown[]) => void): unknown;
};

async function loadArchiver(): Promise<ArchiverFactory | null> {
  try {
    const mod = (await import('archiver' as string)) as unknown as
      | { default: ArchiverFactory }
      | ArchiverFactory;
    return typeof mod === 'function' ? (mod as ArchiverFactory) : (mod.default as ArchiverFactory);
  } catch {
    return null;
  }
}

/** 测试 / fingerprint 用:hash 单文件 */
export async function hashFile(path: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  const buf = await readFile(path);
  return createHash('sha256').update(buf).digest('hex');
}
