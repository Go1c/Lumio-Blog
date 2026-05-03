import type { Database } from 'better-sqlite3';
import type { BackupJob } from '@opennote/core';

/**
 * BackupRepo — backup_jobs 表 CRUD。
 * 实际打 zip 的 worker 在 server/backup-runner.ts。
 */

export class BackupRepo {
  constructor(private db: Database) {}

  insert(job: BackupJob): void {
    this.db
      .prepare(
        `INSERT INTO backup_jobs
         (id, status, progress, bytes, download_url, error, created_at, finished_at)
         VALUES (@id, @status, @progress, @bytes, @download_url, @error, @created_at, @finished_at)`,
      )
      .run(job);
  }

  update(id: string, patch: Partial<Omit<BackupJob, 'id' | 'created_at'>>): void {
    const fields = Object.keys(patch);
    if (fields.length === 0) return;
    const set = fields.map((f) => `${f} = @${f}`).join(', ');
    this.db
      .prepare(`UPDATE backup_jobs SET ${set} WHERE id = @id`)
      .run({ ...patch, id });
  }

  get(id: string): BackupJob | undefined {
    return this.db
      .prepare<[string], BackupJob>(`SELECT * FROM backup_jobs WHERE id = ?`)
      .get(id);
  }

  /** 列出最近 N 个 — 调试 / cleanup 用 */
  recent(limit = 50): BackupJob[] {
    return this.db
      .prepare<[number], BackupJob>(
        `SELECT * FROM backup_jobs ORDER BY created_at DESC LIMIT ?`,
      )
      .all(limit);
  }
}
