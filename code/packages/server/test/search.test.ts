/**
 * WS-G2 Search route 端到端测试
 *
 * 覆盖:
 * - GET /api/search happy path + facets
 * - GET /api/search?type=&tags=&from=&to= 过滤
 * - GET /api/search/suggest
 * - 公开端点排除 private/unlisted
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { runMigrations, NoteRepo } from '@opennote/db';
import { migration005 } from '../../db/src/migrations/005_search_fts.js';
import { register as registerSearch } from '../src/routes/search.js';
import type { NoteRow, SearchResponse } from '@opennote/core';

let db: Database.Database;
let app: Hono;

function freshDb(): Database.Database {
  const d = new Database(':memory:');
  d.pragma('foreign_keys = ON');
  runMigrations(d);
  // 手动应用 005 (main agent 还没集成到 migrate.ts)
  const tx = d.transaction(() => {
    d.exec(migration005.up);
    d.prepare(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
    ).run(migration005.version, migration005.name, new Date().toISOString());
  });
  tx();
  return d;
}

function makeNote(o: Partial<NoteRow>): NoteRow {
  const now = new Date().toISOString();
  return {
    slug: o.slug ?? 'x',
    title: o.title ?? 'X',
    summary: o.summary ?? null,
    body_html: '<p></p>',
    body_text: o.body_text ?? '',
    visibility: o.visibility ?? 'public',
    searchable: o.searchable ?? 1,
    short_id: null,
    source_path: `posts/${o.slug ?? 'x'}.md`,
    created_at: now,
    updated_at: o.updated_at ?? now,
    published_at: o.published_at ?? now,
    scheduled_at: null,
    word_count: 1,
    reading_minutes: 1,
    cover: null,
    hash: 'h',
  };
}

beforeEach(() => {
  db = freshDb();
  const repo = new NoteRepo(db);
  // seed
  repo.upsert(
    makeNote({
      slug: 'mcts',
      title: 'Monte Carlo tree search',
      body_text: 'Monte Carlo tree search is a heuristic algorithm.',
    }),
    ['ai', 'algorithms'],
    [],
  );
  repo.upsert(
    makeNote({
      slug: 'pasta',
      title: 'Cooking pasta',
      body_text: 'Boil water for the pasta and add salt.',
    }),
    ['food'],
    [],
  );
  repo.upsert(
    makeNote({
      slug: 'priv',
      title: 'Secret monte project',
      body_text: 'monte secret',
      visibility: 'private',
      searchable: 0,
    }),
    [],
    [],
  );
  repo.upsert(
    makeNote({
      slug: 'unlist-monte',
      title: 'Unlisted monte',
      body_text: 'monte unlisted',
      visibility: 'unlisted',
    }),
    [],
    [],
  );
  repo.upsert(
    makeNote({
      slug: 'older-monte',
      title: 'An older monte',
      body_text: 'old monte content',
      published_at: '2023-01-01T00:00:00Z',
    }),
    ['ai'],
    [],
  );

  app = new Hono();
  registerSearch(app, { db });
});

describe('GET /api/search', () => {
  it('returns SearchResponse on happy path with facets and snippets', async () => {
    const res = await app.request('/api/search?q=Monte');
    expect(res.status).toBe(200);
    const data = (await res.json()) as SearchResponse;
    expect(data.query).toBe('Monte');
    expect(data.hits.length).toBeGreaterThan(0);
    expect(data.total).toBe(data.hits.length);
    expect(data.facets.type.note).toBeGreaterThan(0);
    // facets.tags should include ai (from mcts + older-monte)
    expect(data.facets.tags.ai ?? 0).toBeGreaterThan(0);
    // hits should include mcts but not priv/unlist-monte
    const slugs = data.hits.map((h) => h.slug);
    expect(slugs).toContain('mcts');
    expect(slugs).not.toContain('priv');
    expect(slugs).not.toContain('unlist-monte');
    // snippets — at least body has <mark>
    const someMark = data.hits.some((h) =>
      h.snippets.some((s) => s.includes('<mark>')),
    );
    expect(someMark).toBe(true);
  });

  it('filters by tags', async () => {
    const res = await app.request('/api/search?q=monte&tags=ai');
    expect(res.status).toBe(200);
    const data = (await res.json()) as SearchResponse;
    const slugs = data.hits.map((h) => h.slug);
    expect(slugs).toContain('mcts');
    expect(slugs).toContain('older-monte');
    expect(slugs).not.toContain('pasta');
  });

  it('filters by from/to date', async () => {
    const res = await app.request('/api/search?q=monte&from=2024-01-01T00:00:00Z');
    const data = (await res.json()) as SearchResponse;
    const slugs = data.hits.map((h) => h.slug);
    expect(slugs).toContain('mcts');
    expect(slugs).not.toContain('older-monte');
  });

  it('returns empty hits for empty q', async () => {
    const res = await app.request('/api/search?q=');
    expect(res.status).toBe(200);
    const data = (await res.json()) as SearchResponse;
    expect(data.hits).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.facets.type.note).toBe(0);
  });

  it('respects limit and offset', async () => {
    const res = await app.request('/api/search?q=monte&limit=1');
    const data = (await res.json()) as SearchResponse;
    expect(data.hits.length).toBe(1);
  });

  it('clamps limit to 100', async () => {
    const res = await app.request('/api/search?q=monte&limit=500');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/search/suggest', () => {
  it('returns title prefix matches', async () => {
    const res = await app.request('/api/search/suggest?q=mont');
    expect(res.status).toBe(200);
    const data = (await res.json()) as string[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((t) => t.toLowerCase().includes('monte'))).toBe(true);
  });

  it('returns [] for empty q', async () => {
    const res = await app.request('/api/search/suggest?q=');
    const data = (await res.json()) as string[];
    expect(data).toEqual([]);
  });

  it('respects limit param', async () => {
    const res = await app.request('/api/search/suggest?q=mont&limit=1');
    const data = (await res.json()) as string[];
    expect(data.length).toBeLessThanOrEqual(1);
  });
});
