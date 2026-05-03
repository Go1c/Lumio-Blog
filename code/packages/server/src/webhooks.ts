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

export class WebhookService {
  constructor(private db: Database) {}

  list(): WebhookRow[] {
    return this.db.prepare<unknown[], WebhookRow>('SELECT * FROM webhooks ORDER BY id').all();
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
  }

  async deliver(event: SyncEvent): Promise<void> {
    const hooks = this.list().filter((h) => !h.disabled_at);
    const payload = JSON.stringify(event);
    await Promise.all(
      hooks.map(async (h) => {
        const events = JSON.parse(h.events) as string[];
        if (events.length > 0 && !events.includes(event.kind)) return;
        const sig = createHmac('sha256', h.secret).update(payload).digest('hex');
        try {
          const r = await fetch(h.url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-opennote-signature': `sha256=${sig}`,
              'x-opennote-event': event.kind,
            },
            body: payload,
            signal: AbortSignal.timeout(5000),
          });
          this.recordDelivery(h.id, event.kind, payload, r.status, await r.text().catch(() => ''));
        } catch (e) {
          this.recordDelivery(h.id, event.kind, payload, 0, (e as Error).message);
        }
      }),
    );
  }

  private recordDelivery(id: number, kind: string, payload: string, status: number, response: string): void {
    this.db
      .prepare(
        `INSERT INTO webhook_deliveries (webhook_id, event_kind, payload, status, response, attempted_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, kind, payload, status, response.slice(0, 500), new Date().toISOString());
  }
}
