import type { Hono, Context } from 'hono';
import type { NewsletterIssue } from '@opennote/core';

export interface NewsletterDeps {
  /** 注入用的:测试 / 自定义 */
  fetchImpl?: typeof fetch;
  /** 测试时跳过环境检查 */
  apiKey?: string;
  /**
   * Buttondown 没配置时 fallback 到本地订阅;由 routes.ts 注入。
   * 拿到 email 字符串,返回 (already?: boolean) 表示是否重复。
   * 不传 = 维持老行为(返回 503)。
   */
  localFallback?: (email: string, c: Context) => Promise<{ already: boolean }>;
}
export type NewsletterRouteDeps = NewsletterDeps;

const BUTTONDOWN_BASE = 'https://api.buttondown.email/v1';

/**
 * Newsletter 端点。
 *
 * 行为:
 * - BUTTONDOWN_API_KEY 配了 → 透传到 Buttondown,做错误归一化
 * - 没配 + 注入了 localFallback → 落本地 subscribers 表
 * - 都没有 → 返回 503 newsletter_disabled
 */
export function register(app: Hono, deps: NewsletterRouteDeps = {}): void {
  const fetcher = deps.fetchImpl ?? fetch;

  app.post('/api/newsletter/subscribe', async (c) => {
    const key = deps.apiKey ?? process.env.BUTTONDOWN_API_KEY;

    // 解析 email(本地 fallback / Buttondown 都要用)
    const body = (await c.req.json<{ email?: string }>().catch(() => ({}))) as { email?: string };
    const email = body.email?.trim();
    if (!email || !/.+@.+\..+/.test(email)) {
      return c.json({ error: { code: 'validation_failed', field: 'email' } }, 400);
    }

    if (!key) {
      if (deps.localFallback) {
        try {
          const r = await deps.localFallback(email, c);
          return c.json({ ok: true, already: r.already, source: 'local' as const });
        } catch (e) {
          return c.json(
            { error: { code: 'subscribe_failed', message: (e as Error).message } },
            500,
          );
        }
      }
      return c.json({ error: { code: 'newsletter_disabled' } }, 503);
    }
    try {
      const r = await fetcher(`${BUTTONDOWN_BASE}/subscribers`, {
        method: 'POST',
        headers: {
          authorization: `Token ${key}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(8000),
      });
      if (r.status === 201 || r.status === 200) return c.json({ ok: true });
      if (r.status === 400) {
        // 重复订阅 / 邮箱不合法 — buttondown 把两类都丢 400
        const j = (await r.json().catch(() => ({}))) as { detail?: string; email?: string[] };
        const detail = j.detail ?? j.email?.[0] ?? 'invalid';
        if (/already/i.test(detail)) return c.json({ ok: true, already: true });
        return c.json({ error: { code: 'validation_failed', message: detail } }, 400);
      }
      const text = await r.text().catch(() => '');
      return c.json(
        { error: { code: 'upstream_error', message: text.slice(0, 200) } },
        502,
      );
    } catch (e) {
      return c.json(
        { error: { code: 'upstream_error', message: (e as Error).message } },
        502,
      );
    }
  });

  app.get('/api/newsletter/recent', async (c) => {
    const key = deps.apiKey ?? process.env.BUTTONDOWN_API_KEY;
    if (!key) {
      return c.json({ error: { code: 'newsletter_disabled' } }, 503);
    }
    const limit = Math.min(Number(c.req.query('limit') ?? 5), 50);
    try {
      const r = await fetcher(`${BUTTONDOWN_BASE}/emails?ordering=-publish_date`, {
        headers: { authorization: `Token ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        return c.json(
          { error: { code: 'upstream_error', message: text.slice(0, 200) } },
          502,
        );
      }
      const j = (await r.json()) as { results?: ButtondownEmail[] };
      const issues: NewsletterIssue[] = (j.results ?? [])
        .slice(0, limit)
        .map(toIssue)
        .filter((x): x is NewsletterIssue => !!x);
      return c.json({ issues });
    } catch (e) {
      return c.json(
        { error: { code: 'upstream_error', message: (e as Error).message } },
        502,
      );
    }
  });
}

interface ButtondownEmail {
  id?: string;
  subject?: string;
  publish_date?: string;
  absolute_url?: string;
  description?: string;
  body?: string;
}

function toIssue(e: ButtondownEmail): NewsletterIssue | null {
  if (!e.id || !e.subject) return null;
  const excerpt = (e.description ?? e.body ?? '').replace(/<[^>]+>/g, '').slice(0, 240);
  return {
    id: e.id,
    subject: e.subject,
    sent_at: e.publish_date ?? '',
    url: e.absolute_url ?? '',
    excerpt,
  };
}
