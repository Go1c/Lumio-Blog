/**
 * NoteRepo 测试 — 重点覆盖 WS-G2 新增的 searchFTS / searchSuggest / getGraph。
 *
 * 测试用 in-memory DB,跑现有 migrations + migration 005(因为 main agent
 * 还没集成到 migrate.ts 的 MIGRATIONS 数组)。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';
import { runMigrations } from './migrate.js';
import { migration005 } from './migrations/005_search_fts.js';
import { NoteRepo } from './queries.js';
import type { NoteRow, LinkEdge } from '@opennote/core';

function freshDb(): DB {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  // 手动应用 005 (main agent 的 migrate.ts 集成尚未完成)
  const tx = db.transaction(() => {
    db.exec(migration005.up);
    db.prepare(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
    ).run(migration005.version, migration005.name, new Date().toISOString());
  });
  tx();
  return db;
}

function makeNote(overrides: Partial<NoteRow>): NoteRow {
  const now = new Date().toISOString();
  return {
    slug: overrides.slug ?? 'test',
    title: overrides.title ?? 'Test',
    summary: overrides.summary ?? null,
    body_html: overrides.body_html ?? '<p>body</p>',
    body_text: overrides.body_text ?? 'body',
    visibility: overrides.visibility ?? 'public',
    searchable: overrides.searchable ?? 1,
    seo_indexable: overrides.seo_indexable ?? 1,
    rss_includable: overrides.rss_includable ?? 1,
    featured_on_home: overrides.featured_on_home ?? 0,
    short_id: overrides.short_id ?? null,
    source_path: overrides.source_path ?? `posts/${overrides.slug ?? 'test'}.md`,
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
    published_at: overrides.published_at ?? now,
    scheduled_at: overrides.scheduled_at ?? null,
    word_count: overrides.word_count ?? 1,
    reading_minutes: overrides.reading_minutes ?? 1,
    cover: overrides.cover ?? null,
    hash: overrides.hash ?? 'h',
  };
}

describe('NoteRepo.searchFTS', () => {
  let db: DB;
  let repo: NoteRepo;

  beforeEach(() => {
    db = freshDb();
    repo = new NoteRepo(db);
  });

  it('returns hits for FTS match (happy path)', () => {
    repo.upsert(
      makeNote({
        slug: 'mcts-tree',
        title: 'Monte Carlo tree search',
        body_text: 'Monte Carlo tree search is a heuristic algorithm.',
      }),
      ['ai', 'algorithms'],
      [],
    );
    repo.upsert(
      makeNote({
        slug: 'unrelated',
        title: 'Cooking pasta',
        body_text: 'Boil water and add salt.',
      }),
      ['food'],
      [],
    );

    const hits = repo.searchFTS('Monte');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.slug).toBe('mcts-tree');
    expect(hits[0]?.type).toBe('note');
    expect(hits[0]?.title).toBe('Monte Carlo tree search');
    expect(hits[0]?.tags).toEqual(expect.arrayContaining(['ai']));
    expect(hits[0]?.snippets.length).toBeGreaterThan(0);
    // body snippet should contain <mark>
    expect(hits[0]?.snippets.some((s) => s.includes('<mark>'))).toBe(true);
  });

  it('excludes non-public visibility from public search', () => {
    repo.upsert(
      makeNote({
        slug: 'private-note',
        title: 'Secret monte project',
        body_text: 'monte private',
        visibility: 'private',
        searchable: 0,
      }),
      [],
      [],
    );
    repo.upsert(
      makeNote({
        slug: 'unlisted-note',
        title: 'Unlisted monte project',
        body_text: 'monte unlisted',
        visibility: 'unlisted',
      }),
      [],
      [],
    );
    const hits = repo.searchFTS('monte');
    // 默认只返回 public,所以 unlisted 也不出现
    expect(hits.find((h) => h.slug === 'private-note')).toBeUndefined();
    expect(hits.find((h) => h.slug === 'unlisted-note')).toBeUndefined();
  });

  it('honors visibility option', () => {
    repo.upsert(
      makeNote({
        slug: 'unlisted-x',
        title: 'Unlisted page about monte',
        body_text: 'content monte',
        visibility: 'unlisted',
      }),
      [],
      [],
    );
    const hits = repo.searchFTS('monte', { visibility: ['public', 'unlisted'] });
    expect(hits.find((h) => h.slug === 'unlisted-x')).toBeDefined();
  });

  it('filters by tags', () => {
    repo.upsert(
      makeNote({ slug: 'a', title: 'About monte foo', body_text: 'body' }),
      ['ai'],
      [],
    );
    repo.upsert(
      makeNote({ slug: 'b', title: 'About monte bar', body_text: 'body' }),
      ['food'],
      [],
    );
    const hits = repo.searchFTS('monte', { tags: ['ai'] });
    expect(hits.map((h) => h.slug)).toEqual(['a']);
  });

  it('filters by date range (fromDate/toDate)', () => {
    repo.upsert(
      makeNote({
        slug: 'old-monte',
        title: 'Old monte',
        body_text: 'body',
        published_at: '2023-01-01T00:00:00Z',
      }),
      [],
      [],
    );
    repo.upsert(
      makeNote({
        slug: 'new-monte',
        title: 'New monte',
        body_text: 'body',
        published_at: '2025-01-01T00:00:00Z',
      }),
      [],
      [],
    );
    const hits = repo.searchFTS('monte', { fromDate: '2024-01-01T00:00:00Z' });
    expect(hits.map((h) => h.slug)).toEqual(['new-monte']);
  });

  it('returns [] for empty query', () => {
    expect(repo.searchFTS('')).toEqual([]);
    expect(repo.searchFTS('   ')).toEqual([]);
  });

  it('CJK fallback finds match when FTS misses', () => {
    repo.upsert(
      makeNote({
        slug: 'cjk-note',
        title: '游戏开发笔记',
        body_text: '关于 Monte Carlo 的中文讨论',
      }),
      ['cjk'],
      [],
    );
    const hits = repo.searchFTS('游戏');
    expect(hits.find((h) => h.slug === 'cjk-note')).toBeDefined();
  });

  it('does not crash on FTS-special chars', () => {
    repo.upsert(makeNote({ slug: 'a', title: 'safe', body_text: 'body' }), [], []);
    expect(() => repo.searchFTS('"unclosed')).not.toThrow();
  });
});

describe('NoteRepo.listSummaries', () => {
  it('returns list fields without loading rendered body columns', () => {
    const db = freshDb();
    const repo = new NoteRepo(db);
    repo.upsert(
      makeNote({
        slug: 'heavy',
        title: 'Heavy body',
        body_html: '<p>'.repeat(1000),
        body_text: 'body '.repeat(1000),
        visibility: 'public',
      }),
      [],
      [],
    );

    const rows = repo.listSummaries();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      slug: 'heavy',
      title: 'Heavy body',
      visibility: 'public',
      source_path: 'posts/heavy.md',
    });
    expect(rows[0]).not.toHaveProperty('body_html');
    expect(rows[0]).not.toHaveProperty('body_text');
    expect(rows[0]).not.toHaveProperty('hash');
  });
});

describe('NoteRepo.searchSuggest', () => {
  let db: DB;
  let repo: NoteRepo;

  beforeEach(() => {
    db = freshDb();
    repo = new NoteRepo(db);
  });

  it('returns title prefix suggestions', () => {
    repo.upsert(
      makeNote({ slug: 'monte-1', title: 'Monte Carlo basics', body_text: 'b' }),
      [],
      [],
    );
    repo.upsert(
      makeNote({ slug: 'monte-2', title: 'Monte Carlo advanced', body_text: 'b' }),
      [],
      [],
    );
    const out = repo.searchSuggest('mont', 5);
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((s) => s.toLowerCase().includes('monte'))).toBe(true);
  });

  it('returns [] for empty query', () => {
    expect(repo.searchSuggest('')).toEqual([]);
  });
});

describe('NoteRepo.getGraph', () => {
  let db: DB;
  let repo: NoteRepo;

  beforeEach(() => {
    db = freshDb();
    repo = new NoteRepo(db);
  });

  it('builds graph nodes + edges from public + unlisted notes', () => {
    repo.upsert(makeNote({ slug: 'a', title: 'A', body_text: 'a' }), ['ai'], []);
    repo.upsert(
      makeNote({ slug: 'b', title: 'B', body_text: 'b', visibility: 'unlisted' }),
      ['food'],
      [],
    );
    // private 不应出现
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

    // a -> b
    const linkEdge: LinkEdge = { src_slug: 'a', dst_slug: 'b', raw_target: 'B' };
    db.prepare('INSERT INTO links (src_slug, dst_slug, raw_target) VALUES (?, ?, ?)').run(
      linkEdge.src_slug,
      linkEdge.dst_slug,
      linkEdge.raw_target,
    );

    const g = repo.getGraph();
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['a', 'b']);
    expect(g.edges).toEqual([{ src: 'a', dst: 'b', kind: 'wikilink' }]);
    const a = g.nodes.find((n) => n.id === 'a')!;
    expect(a.degree).toBe(1);
    expect(a.cluster).toBe('ai');
    expect(a.tags).toEqual(['ai']);
  });

  it('drops edges where one end is non-public', () => {
    repo.upsert(makeNote({ slug: 'a', title: 'A', body_text: 'a' }), [], []);
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
    db.prepare('INSERT INTO links (src_slug, dst_slug, raw_target) VALUES (?, ?, ?)').run(
      'a',
      'p',
      'P',
    );
    const g = repo.getGraph();
    expect(g.edges).toEqual([]);
    expect(g.nodes.map((n) => n.id)).toEqual(['a']);
  });
});

describe('NoteRepo.listLinks', () => {
  it('returns only resolved links', () => {
    const db = freshDb();
    const repo = new NoteRepo(db);
    repo.upsert(makeNote({ slug: 'a', title: 'A', body_text: 'a' }), [], []);
    repo.upsert(makeNote({ slug: 'b', title: 'B', body_text: 'b' }), [], []);
    db.prepare('INSERT INTO links (src_slug, dst_slug, raw_target) VALUES (?, ?, ?)').run(
      'a',
      'b',
      'B',
    );
    db.prepare('INSERT INTO links (src_slug, dst_slug, raw_target) VALUES (?, ?, ?)').run(
      'a',
      null,
      'unknown',
    );
    const out = repo.listLinks();
    expect(out).toEqual([{ src: 'a', dst: 'b', kind: 'wikilink' }]);
  });
});
