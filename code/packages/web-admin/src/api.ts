import type {
  AdminSettings,
  AnalyticsOverview,
  AnalyticsRange,
  ArticleAnalytics,
  TimeSeriesPoint,
} from '@opennote/core';

export type Visibility = 'public' | 'unlisted' | 'link-only' | 'private';

export interface NoteSummary {
  slug: string;
  title: string;
  visibility: Visibility;
  searchable: boolean;
  short_id: string | null;
  updated_at: string;
  word_count: number;
}

export interface NoteDetail {
  slug: string;
  title: string;
  summary: string | null;
  body_html: string;
  visibility: Visibility;
  searchable: 0 | 1;
  short_id: string | null;
  source_path: string;
  word_count: number;
  reading_minutes: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  scheduled_at: string | null;
  cover: string | null;
}

export interface HealthInfo {
  ok: boolean;
  note_count: number;
  visibility_counts: Record<Visibility, number>;
}

export interface AuditEntry {
  id: number;
  ts: string;
  actor: string;
  action: string;
  target: string | null;
  ip: string | null;
  /** WS-E:用于行内展开 diff */
  diff?: string | null;
  ua?: string | null;
}

/** WS-E:tokens 行(对应 server.tokens.list 的返回) */
export interface TokenRow {
  id: number;
  name: string;
  scope: 'read' | 'write' | 'admin';
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
}

/** WS-E:webhook 行 */
export interface WebhookRow {
  id: number;
  url: string;
  secret?: string;
  events: string;
  created_at: string;
  disabled_at: string | null;
}

export interface AuditListOpts {
  limit?: number;
  /** 精确匹配 actor */
  actor?: string;
  /** 前缀匹配,如 'auth.' / 'note.' */
  action_prefix?: string;
}

export interface WebhookDelivery {
  id: number;
  webhook_id: number;
  event_kind: string;
  payload: string;
  status: number | null;
  response: string | null;
  attempt: number;
  attempted_at: string;
  /** ISO date,null = 不再重试 */
  next_attempt_at: string | null;
}

export interface MediaItem {
  id: string;
  filename: string;
  mime: string;
  bytes: number;
  url: string;
  uploaded_at: string;
  reference_count: number;
}

export interface MediaListPage {
  items: MediaItem[];
  next_cursor: string | null;
}

export interface MediaReference {
  slug: string;
  title: string;
}

export type OgTemplate = 'minimal' | 'newspaper' | 'terminal' | 'magazine';

export interface OgPreviewParams {
  slug: string;
  template: OgTemplate;
  overrides?: Record<string, string>;
}

export interface BackupJob {
  id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  progress: number;
  bytes: number | null;
  download_url: string | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}

async function req(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, { credentials: 'same-origin', ...init });
  return res;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    const msg = body?.error?.message ?? body?.error?.code ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async me(): Promise<{ authenticated: boolean }> {
    return jsonOrThrow(await req('/api/auth/me'));
  },
  async login(password: string): Promise<void> {
    await jsonOrThrow(
      await req('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      }),
    );
  },
  async logout(): Promise<void> {
    await req('/api/auth/logout', { method: 'POST' });
  },
  async health(): Promise<HealthInfo> {
    return jsonOrThrow(await req('/api/health'));
  },
  async listNotes(): Promise<{ notes: NoteSummary[] }> {
    return jsonOrThrow(await req('/api/admin/notes'));
  },
  async getNote(slug: string): Promise<{ note: NoteDetail; backlinks: { src_slug: string; title: string }[] }> {
    return jsonOrThrow(await req(`/api/admin/notes/${encodeURIComponent(slug)}`));
  },
  async patchMeta(
    slug: string,
    patch: { visibility?: Visibility; searchable?: boolean; scheduled_at?: string | null },
  ): Promise<void> {
    await jsonOrThrow(
      await req(`/api/admin/notes/${encodeURIComponent(slug)}/meta`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      }),
    );
  },
  async rotateShortLink(slug: string): Promise<void> {
    await jsonOrThrow(
      await req(`/api/admin/notes/${encodeURIComponent(slug)}/short-link`, { method: 'POST' }),
    );
  },
  async sync(): Promise<void> {
    await jsonOrThrow(await req('/api/admin/sync', { method: 'POST' }));
  },
  async audit(limit = 50): Promise<{ entries: AuditEntry[] }> {
    return jsonOrThrow(await req(`/api/admin/audit?limit=${limit}`));
  },
  /** WS-E:带 actor / action_prefix 过滤的审计列表 */
  async listAudit(opts: AuditListOpts = {}): Promise<{ entries: AuditEntry[] }> {
    const params = new URLSearchParams();
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.actor) params.set('actor', opts.actor);
    if (opts.action_prefix) params.set('action_prefix', opts.action_prefix);
    const qs = params.toString();
    return jsonOrThrow(await req(`/api/admin/audit${qs ? `?${qs}` : ''}`));
  },
  /** WS-E:整合 config.yaml + features.yaml 的设置 */
  settings: {
    async get(): Promise<AdminSettings> {
      return jsonOrThrow(await req('/api/admin/settings'));
    },
    async patch(patch: Partial<AdminSettings>): Promise<{ ok: true; patched: string[] }> {
      return jsonOrThrow(
        await req('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        }),
      );
    },
  },
  analytics: {
    async overview(range: AnalyticsRange = '7d'): Promise<AnalyticsOverview> {
      return jsonOrThrow(await req(`/api/admin/analytics/overview?range=${range}`));
    },
    async timeseries(
      range: AnalyticsRange = '30d',
      metric: 'views' | 'unique_visitors' | 'avg_dwell' = 'views',
    ): Promise<{ range: AnalyticsRange; metric: string; points: TimeSeriesPoint[] }> {
      return jsonOrThrow(
        await req(`/api/admin/analytics/timeseries?range=${range}&metric=${metric}`),
      );
    },
    async article(slug: string): Promise<ArticleAnalytics> {
      return jsonOrThrow(
        await req(`/api/admin/analytics/posts/${encodeURIComponent(slug)}`),
      );
    },
  },
  async listTokens(): Promise<{ tokens: TokenRow[] }> {
    return jsonOrThrow(await req('/api/admin/tokens'));
  },
  async createToken(name: string, scope: 'read' | 'write' | 'admin', ttl_days = 90): Promise<{ id: number; token: string }> {
    return jsonOrThrow(await req('/api/admin/tokens', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, scope, ttl_days }) }));
  },
  async revokeToken(id: number): Promise<void> {
    await jsonOrThrow(await req(`/api/admin/tokens/${id}`, { method: 'DELETE' }));
  },
  async listWebhooks(): Promise<{ webhooks: WebhookRow[] }> {
    return jsonOrThrow(await req('/api/admin/webhooks'));
  },
  async createWebhook(url: string, events: string[], secret?: string): Promise<{ id: number; secret: string }> {
    return jsonOrThrow(
      await req('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, events, secret }),
      }),
    );
  },
  async deleteWebhook(id: number): Promise<void> {
    await jsonOrThrow(await req(`/api/admin/webhooks/${id}`, { method: 'DELETE' }));
  },
  /** WS-E:某 webhook 的最近投递历史 */
  async webhookDeliveries(id: number, limit = 20): Promise<{ deliveries: WebhookDelivery[] }> {
    return jsonOrThrow(
      await req(`/api/admin/webhooks/${id}/deliveries?limit=${limit}`),
    );
  },
  /** WS-E:重新投递某条历史 */
  async redeliverWebhook(id: number, eventId: number): Promise<{ ok: true }> {
    return jsonOrThrow(
      await req(`/api/admin/webhooks/${id}/redeliver/${eventId}`, { method: 'POST' }),
    );
  },

  // ---- media ----
  media: {
    async list(cursor?: string | null, limit = 50): Promise<MediaListPage> {
      const qs = new URLSearchParams();
      if (cursor) qs.set('cursor', cursor);
      qs.set('limit', String(limit));
      return jsonOrThrow(await req(`/api/admin/media?${qs.toString()}`));
    },
    async upload(file: File, onProgress?: (pct: number) => void): Promise<MediaItem> {
      // 用 XMLHttpRequest 以支持上传进度
      return new Promise<MediaItem>((resolve, reject) => {
        const fd = new FormData();
        fd.append('file', file);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/admin/media');
        xhr.withCredentials = true;
        xhr.responseType = 'json';
        if (onProgress && xhr.upload) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(e.loaded / e.total);
          };
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response as MediaItem);
          } else {
            const body = xhr.response as { error?: { message?: string; code?: string } } | null;
            const msg = body?.error?.message ?? body?.error?.code ?? `HTTP ${xhr.status}`;
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => reject(new Error('network_error'));
        xhr.send(fd);
      });
    },
    async delete(id: string, force = false): Promise<void> {
      const qs = force ? '?force=1' : '';
      await jsonOrThrow(await req(`/api/admin/media/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' }));
    },
    async refs(id: string): Promise<{ refs: MediaReference[] }> {
      return jsonOrThrow(await req(`/api/admin/media/${encodeURIComponent(id)}/refs`));
    },
  },

  // ---- og ----
  og: {
    /** 返回 admin 预览的图片 URL(浏览器自己拉) */
    previewUrl(params: OgPreviewParams): string {
      const qs = new URLSearchParams();
      qs.set('slug', params.slug);
      qs.set('template', params.template);
      if (params.overrides) qs.set('overrides', JSON.stringify(params.overrides));
      return `/api/admin/og/preview?${qs.toString()}`;
    },
    publicUrl(slug: string, template?: OgTemplate): string {
      const qs = template ? `?template=${template}` : '';
      return `/og/${encodeURIComponent(slug)}.png${qs}`;
    },
  },

  // ---- backup ----
  backup: {
    async create(): Promise<BackupJob> {
      return jsonOrThrow(await req('/api/admin/backup', { method: 'POST' }));
    },
    async status(jobId: string): Promise<BackupJob> {
      return jsonOrThrow(await req(`/api/admin/backup/${encodeURIComponent(jobId)}/status`));
    },
    downloadUrl(jobId: string): string {
      return `/api/admin/backup/${encodeURIComponent(jobId)}/download`;
    },
  },
};
