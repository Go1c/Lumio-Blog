import { createHmac } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { SyncEvent } from '@opennote/core';

interface WebhookRow {
  id: number;
  url: string;
  secret: string;
  events: string;
  disabled_at: string | null;
}

/**
 * 退避策略:立即 → 30s → 5min → 30min → 6h
 * 共 5 次尝试(包括 attempt=1 的首次)。超过仍失败则放弃,等待人工 redeliver。
 */
const BACKOFF_MS = [0, 30_000, 5 * 60_000, 30 * 60_000, 6 * 60 * 60_000];
export const MAX_ATTEMPTS = BACKOFF_MS.length;

interface DeliveryRow {
  id: number;
  webhook_id: number;
  event_kind: string;
  payload: string;
  status: number | null;
  response: string | null;
  attempt: number;
  attempted_at: string;
  next_attempt_at: string | null;
}

/**
 * WebhookService —— WS-E 扩:
 *   - 持久化 delivery(含 attempt / next_attempt_at)
 *   - 失败时按 BACKOFF_MS 计划重试(setTimeout,内存定时器,进程重启会失效)
 *   - 进程启动时扫一次 next_attempt_at <= now 的待重发,重新排程
 *   - 暴露 listDeliveries / redeliver,供 webhooks-admin.ts 路由使用
 */
export class WebhookService {
  /** 已计划的内存定时器,key = delivery id,用于避免重复排程 */
  private timers = new Map<number, NodeJS.Timeout>();
  private booted = false;

  constructor(private db: Database) {
    this.ensureSchema();
  }

  /** 启动时调用一次:扫已到点的延迟投递 */
  bootResume(): void {
    if (this.booted) return;
    this.booted = true;
    try {
      const rows = this.db
        .prepare<unknown[], DeliveryRow>(
          `SELECT * FROM webhook_deliveries
           WHERE next_attempt_at IS NOT NULL
             AND (status IS NULL OR status < 200 OR status >= 300)
             AND attempt < ?`,
        )
        .all(MAX_ATTEMPTS);
      const now = Date.now();
      for (const d of rows) {
        if (!d.next_attempt_at) continue;
        const t = new Date(d.next_attempt_at).getTime();
        const wait = Math.max(0, t - now);
        this.scheduleRetry(d.id, wait);
      }
    } catch (e) {
      console.error('[webhooks] bootResume failed', e);
    }
  }

  /** 加列(idempotent)— 不动 db migration */
  private ensureSchema(): void {
    const cols = this.db
      .prepare<unknown[], { name: string }>('PRAGMA table_info(webhook_deliveries)')
      .all()
      .map((r) => r.name);
    const add = (sql: string) => {
      try { this.db.exec(sql); } catch (e) { console.error('[webhooks] alter failed', e); }
    };
    if (!cols.includes('attempt')) {
      add('ALTER TABLE webhook_deliveries ADD COLUMN attempt INTEGER NOT NULL DEFAULT 1');
    }
    if (!cols.includes('next_attempt_at')) {
      add('ALTER TABLE webhook_deliveries ADD COLUMN next_attempt_at TEXT');
    }
  }

  list(): WebhookRow[] {
    return this.db.prepare<unknown[], WebhookRow>('SELECT * FROM webhooks ORDER BY id').all();
  }

  get(id: number): WebhookRow | null {
    const row = this.db
      .prepare<[number], WebhookRow>('SELECT * FROM webhooks WHERE id = ?')
      .get(id);
    return row ?? null;
  }

  create(url: string, events: string[], secret: string): number {
    const r = this.db
      .prepare(
        'INSERT INTO webhooks (url, secret, events, created_at) VALUES (?, ?, ?, ?)',
      )
      .run(url, secret, JSON.stringify(events), new Date().toISOString());
    return r.lastInsertRowid as number;
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM webhooks WHERE id = ?').run(id);
    // 清理可能仍在排程的定时器
    for (const [did, t] of this.timers) {
      const row = this.db
        .prepare<[number], { webhook_id: number }>('SELECT webhook_id FROM webhook_deliveries WHERE id = ?')
        .get(did);
      if (!row || row.webhook_id === id) {
        clearTimeout(t);
        this.timers.delete(did);
      }
    }
  }

  /** 列出某 webhook 最近 N 条投递(包括 retry 后的更新行) */
  listDeliveries(webhookId: number, limit = 20): DeliveryRow[] {
    return this.db
      .prepare<[number, number], DeliveryRow>(
        `SELECT * FROM webhook_deliveries
         WHERE webhook_id = ?
         ORDER BY id DESC
         LIMIT ?`,
      )
      .all(webhookId, Math.max(1, Math.min(limit, 200)));
  }

  /** 取某条 delivery */
  getDelivery(id: number): DeliveryRow | null {
    const r = this.db
      .prepare<[number], DeliveryRow>('SELECT * FROM webhook_deliveries WHERE id = ?')
      .get(id);
    return r ?? null;
  }

  /** SyncEvent 来了 - 投递到所有 active 且事件匹配的 hook */
  async deliver(event: SyncEvent): Promise<void> {
    const hooks = this.list().filter((h) => !h.disabled_at);
    const payload = JSON.stringify(event);
    await Promise.all(
      hooks.map(async (h) => {
        const events = JSON.parse(h.events) as string[];
        if (events.length > 0 && !events.includes(event.kind)) return;
        const did = this.insertDelivery(h.id, event.kind, payload, 1);
        await this.attemptDeliver(did);
      }),
    );
  }

  /** 手动重发某条 delivery —— 重置 attempt 计数 + 立刻发 */
  async redeliver(deliveryId: number): Promise<void> {
    const d = this.getDelivery(deliveryId);
    if (!d) throw new Error('delivery not found');
    const h = this.get(d.webhook_id);
    if (!h) throw new Error('webhook not found');
    // 新插一条(保留历史)
    const newId = this.insertDelivery(h.id, d.event_kind, d.payload, 1);
    await this.attemptDeliver(newId);
  }

  // ---------- 私有:发送 + 失败排程 ----------

  private insertDelivery(
    webhookId: number,
    kind: string,
    payload: string,
    attempt: number,
  ): number {
    const r = this.db
      .prepare(
        `INSERT INTO webhook_deliveries
           (webhook_id, event_kind, payload, status, response, attempt, attempted_at, next_attempt_at)
         VALUES (?, ?, ?, NULL, NULL, ?, ?, NULL)`,
      )
      .run(webhookId, kind, payload, attempt, new Date().toISOString());
    return r.lastInsertRowid as number;
  }

  private updateDelivery(
    id: number,
    patch: { status?: number | null; response?: string | null; next_attempt_at?: string | null },
  ): void {
    this.db
      .prepare(
        `UPDATE webhook_deliveries
         SET status = COALESCE(?, status),
             response = COALESCE(?, response),
             next_attempt_at = ?,
             attempted_at = ?
         WHERE id = ?`,
      )
      .run(
        patch.status ?? null,
        patch.response ?? null,
        patch.next_attempt_at ?? null,
        new Date().toISOString(),
        id,
      );
  }

  private async attemptDeliver(deliveryId: number): Promise<void> {
    const d = this.getDelivery(deliveryId);
    if (!d) return;
    const h = this.get(d.webhook_id);
    if (!h) return;

    const sig = createHmac('sha256', h.secret).update(d.payload).digest('hex');
    let status = 0;
    let response = '';
    try {
      const r = await fetch(h.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-opennote-signature': `sha256=${sig}`,
          'x-opennote-event': d.event_kind,
          'x-opennote-delivery': String(d.id),
          'x-opennote-attempt': String(d.attempt),
        },
        body: d.payload,
        signal: AbortSignal.timeout(5000),
      });
      status = r.status;
      response = (await r.text().catch(() => '')).slice(0, 500);
    } catch (e) {
      status = 0;
      response = (e as Error).message.slice(0, 500);
    }

    const ok = status >= 200 && status < 300;
    if (ok || d.attempt >= MAX_ATTEMPTS) {
      this.updateDelivery(deliveryId, { status, response, next_attempt_at: null });
      return;
    }

    // 安排下一次尝试
    const nextAttempt = d.attempt + 1;
    const wait = BACKOFF_MS[nextAttempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1] ?? 0;
    const nextTs = new Date(Date.now() + wait).toISOString();
    this.updateDelivery(deliveryId, { status, response, next_attempt_at: nextTs });

    // 写一条新行,代表"下一次尝试"
    const nextId = this.insertDelivery(d.webhook_id, d.event_kind, d.payload, nextAttempt);
    this.scheduleRetry(nextId, wait);
  }

  private scheduleRetry(deliveryId: number, waitMs: number): void {
    if (this.timers.has(deliveryId)) return;
    const t = setTimeout(() => {
      this.timers.delete(deliveryId);
      this.attemptDeliver(deliveryId).catch((e) => console.error('[webhooks] retry failed', e));
    }, Math.max(0, waitMs));
    // 不阻塞 process.exit
    if (typeof t.unref === 'function') t.unref();
    this.timers.set(deliveryId, t);
  }
}
