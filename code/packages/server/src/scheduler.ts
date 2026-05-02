import type { Database } from 'better-sqlite3';
import type { EventBus } from './events.js';

/**
 * 每分钟扫一次：scheduled_at <= now 的 draft/private/unlisted 笔记
 * 自动转 public，触发同步事件。
 */
export function startScheduler(db: Database, bus: EventBus, triggerSync: () => Promise<void>): { stop: () => void } {
  const tick = async () => {
    const due = db
      .prepare<unknown[], { slug: string }>(
        `SELECT slug FROM notes
         WHERE scheduled_at IS NOT NULL
           AND scheduled_at <= datetime('now')
           AND visibility != 'public'`,
      )
      .all();
    if (due.length === 0) return;
    const tx = db.transaction(() => {
      for (const { slug } of due) {
        db.prepare(
          `UPDATE notes SET visibility = 'public', published_at = ?, scheduled_at = NULL,
                            updated_at = ? WHERE slug = ?`,
        ).run(new Date().toISOString(), new Date().toISOString(), slug);
      }
    });
    tx();
    for (const { slug } of due) {
      bus.emit({ kind: 'note.published', slug, visibility: 'public' });
    }
    await triggerSync();
  };
  const id = setInterval(() => { void tick(); }, 60_000);
  void tick();
  return { stop: () => clearInterval(id) };
}
