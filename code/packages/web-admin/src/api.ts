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
  word_count: number;
  reading_minutes: number;
  updated_at: string;
}

async function req(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, { credentials: 'same-origin', ...init });
  return res;
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message ?? body?.error?.code ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
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
  async listNotes(): Promise<{ notes: NoteSummary[] }> {
    return jsonOrThrow(await req('/api/admin/notes'));
  },
  async getNote(slug: string): Promise<{ note: NoteDetail; backlinks: { src_slug: string; title: string }[] }> {
    return jsonOrThrow(await req(`/api/admin/notes/${encodeURIComponent(slug)}`));
  },
  async patchMeta(slug: string, patch: { visibility?: Visibility; searchable?: boolean }): Promise<void> {
    await jsonOrThrow(
      await req(`/api/admin/notes/${encodeURIComponent(slug)}/meta`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      }),
    );
  },
  async sync(): Promise<void> {
    await jsonOrThrow(await req('/api/admin/sync', { method: 'POST' }));
  },
  async listTokens(): Promise<{ tokens: { id: number; name: string; scope: string; created_at: string; expires_at: string | null; last_used_at: string | null; revoked_at: string | null }[] }> {
    return jsonOrThrow(await req('/api/admin/tokens'));
  },
  async createToken(name: string, scope: 'read' | 'write' | 'admin', ttl_days = 90): Promise<{ id: number; token: string }> {
    return jsonOrThrow(await req('/api/admin/tokens', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, scope, ttl_days }) }));
  },
  async revokeToken(id: number): Promise<void> {
    await jsonOrThrow(await req(`/api/admin/tokens/${id}`, { method: 'DELETE' }));
  },
  async listWebhooks(): Promise<{ webhooks: { id: number; url: string; events: string; created_at: string; disabled_at: string | null }[] }> {
    return jsonOrThrow(await req('/api/admin/webhooks'));
  },
  async createWebhook(url: string, events: string[]): Promise<{ id: number }> {
    return jsonOrThrow(await req('/api/admin/webhooks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, events }) }));
  },
  async deleteWebhook(id: number): Promise<void> {
    await jsonOrThrow(await req(`/api/admin/webhooks/${id}`, { method: 'DELETE' }));
  },
};
