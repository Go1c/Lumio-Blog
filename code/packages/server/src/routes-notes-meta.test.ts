import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import type { SiteConfig } from '@opennote/core';
import type { NoteRow } from '@opennote/core';
import { NoteRepo, runMigrations } from '@opennote/db';
import { buildApp } from './routes.js';
import { EventBus } from './events.js';
import { AuthService } from './auth.js';

let db: Database.Database;
let repo: NoteRepo;

const config: SiteConfig = {
  site: { title: 'Lumio Blog', url: 'https://blog.lumio.games' },
  author: { name: 'Lumio' },
  paths: { vault: '', out: '', db: '' },
};

beforeEach(() => {
  db = new Database(':memory:');
  runMigrations(db);
  repo = new NoteRepo(db);
  repo.upsert(note({ slug: 'visible-note', visibility: 'public' }), [], []);
});

describe('admin note metadata route', () => {
  it('patches visibility and schedules a static render without a vault resync', async () => {
    const auth = new AuthService(db);
    auth.setPassword('stored-pass-123');
    const session = auth.createSession();
    const triggerSync = vi.fn(async () => undefined);
    const renderSite = vi.fn(async () => undefined);
    const app = buildApp({
      db,
      config,
      bus: new EventBus(),
      triggerSync,
      renderSite,
    });

    const res = await app.request('/api/admin/notes/visible-note/meta', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: `opennote_session=${session}`,
      },
      body: JSON.stringify({
        visibility: 'private',
        searchable: false,
        seo_indexable: false,
        rss_includable: false,
        featured_on_home: false,
      }),
    });

    expect(res.status).toBe(200);
    expect(repo.getBySlug('visible-note')?.visibility).toBe('private');
    expect(triggerSync).not.toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(renderSite).toHaveBeenCalledTimes(1);
    });
  });

  it('returns lightweight admin note summaries without rendered body content', async () => {
    const auth = new AuthService(db);
    auth.setPassword('stored-pass-123');
    const session = auth.createSession();
    const app = buildApp({
      db,
      config,
      bus: new EventBus(),
      triggerSync: async () => undefined,
      renderSite: async () => undefined,
    });

    const res = await app.request('/api/admin/notes', {
      headers: { cookie: `opennote_session=${session}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { notes: Array<Record<string, unknown>> };
    expect(body.notes[0]).toMatchObject({
      slug: 'visible-note',
      visibility: 'public',
      source_path: 'posts/visible-note.md',
    });
    expect(body.notes[0]).not.toHaveProperty('body_html');
    expect(body.notes[0]).not.toHaveProperty('body_text');
    expect(body.notes[0]).not.toHaveProperty('hash');
  });
});

function note(overrides: Partial<NoteRow>): NoteRow {
  const now = '2026-06-01T00:00:00.000Z';
  const slug = overrides.slug ?? 'note';
  return {
    slug,
    title: overrides.title ?? 'Visible Note',
    summary: overrides.summary ?? null,
    body_html: overrides.body_html ?? `<p>${createHash('sha1').update(slug).digest('hex')}</p>`,
    body_text: overrides.body_text ?? 'body',
    visibility: overrides.visibility ?? 'public',
    searchable: overrides.searchable ?? 1,
    seo_indexable: overrides.seo_indexable ?? 1,
    rss_includable: overrides.rss_includable ?? 1,
    featured_on_home: overrides.featured_on_home ?? 0,
    short_id: overrides.short_id ?? null,
    source_path: overrides.source_path ?? `posts/${slug}.md`,
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
    published_at: overrides.published_at ?? now,
    scheduled_at: overrides.scheduled_at ?? null,
    word_count: overrides.word_count ?? 100,
    reading_minutes: overrides.reading_minutes ?? 1,
    cover: overrides.cover ?? null,
    hash: overrides.hash ?? 'hash',
  };
}
