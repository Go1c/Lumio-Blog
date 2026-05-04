/**
 * WS-G2 Graph route 端到端测试
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { runMigrations, NoteRepo } from '@opennote/db';
import { migration005 } from '../../db/src/migrations/005_search_fts.js';
import { register as registerGraph } from '../src/routes/graph.js';
import type { GraphData, NoteRow } from '@opennote/core';

let db: Database.Database;
let app: Hono;

function freshDb(): Database.Database {
  const d = new Database(':memory:');
  d.pragma('foreign_keys = ON');
  runMigrations(d);
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
    summary: null,
    body_html: '<p></p>',
    body_text: o.body_text ?? '',
    visibility: o.visibility ?? 'public',
    searchable: o.searchable ?? 1,
    seo_indexable: o.seo_indexable ?? 1,
    rss_includable: o.rss_includable ?? 1,
    featured_on_home: o.featured_on_home ?? 0,
    short_id: null,
    source_path: `posts/${o.slug ?? 'x'}.md`,
    created_at: now,
    updated_at: now,
    published_at: now,
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
  repo.upsert(makeNote({ slug: 'a', title: 'A', body_text: 'a' }), ['ai'], []);
  repo.upsert(
    makeNote({ slug: 'b', title: 'B', body_text: 'b', visibility: 'unlisted' }),
    ['food'],
    [],
  );
  repo.upsert(
    makeNote({
      slug: 'p',
      title: 'P',
      body_text: 'p',
      visibility: 'private',
      searchable: 0,
    }),
    [],
    [],
  );
  // a -> b (resolved)
  db.prepare(
    'INSERT INTO links (src_slug, dst_slug, raw_target) VALUES (?, ?, ?)',
  ).run('a', 'b', 'B');
  // a -> p (private, should be filtered out)
  db.prepare(
    'INSERT INTO links (src_slug, dst_slug, raw_target) VALUES (?, ?, ?)',
  ).run('a', 'p', 'P');
  // a -> ??? (unresolved)
  db.prepare(
    'INSERT INTO links (src_slug, dst_slug, raw_target) VALUES (?, ?, ?)',
  ).run('a', null, 'unknown');

  app = new Hono();
  registerGraph(app, { db });
});

describe('GET /api/graph', () => {
  it('returns GraphData with public + unlisted nodes only', async () => {
    const res = await app.request('/api/graph');
    expect(res.status).toBe(200);
    const data = (await res.json()) as GraphData;
    const ids = data.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(['a', 'b']);
    // edges: only a->b survives (p filtered out, unresolved filtered out)
    expect(data.edges).toEqual([{ src: 'a', dst: 'b', kind: 'wikilink' }]);
  });

  it('node degree counts neighbors correctly', async () => {
    const res = await app.request('/api/graph');
    const data = (await res.json()) as GraphData;
    const a = data.nodes.find((n) => n.id === 'a')!;
    const b = data.nodes.find((n) => n.id === 'b')!;
    expect(a.degree).toBe(1);
    expect(b.degree).toBe(1);
  });

  it('node cluster is the first tag (or null)', async () => {
    const res = await app.request('/api/graph');
    const data = (await res.json()) as GraphData;
    const a = data.nodes.find((n) => n.id === 'a')!;
    expect(a.cluster).toBe('ai');
    expect(a.tags).toEqual(['ai']);
  });
});
