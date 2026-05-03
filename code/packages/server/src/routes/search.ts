/**
 * WS-G2 — Search API
 *
 * Endpoints:
 * - GET /api/search?q=&type=&from=&to=&tags=&limit=&offset= → SearchResponse
 * - GET /api/search/suggest?q=&limit= → string[]
 *
 * 都是 public,无需鉴权。
 */
import type { Hono } from 'hono';
import type { Database } from 'better-sqlite3';
import { NoteRepo } from '@opennote/db';
import type { SearchResponse, SearchType } from '@opennote/core';

export interface SearchDeps {
  db: Database;
}

const VALID_TYPES: SearchType[] = ['post', 'note', 'tag', 'media'];

export function register(app: Hono, deps: SearchDeps): void {
  const repo = new NoteRepo(deps.db);

  app.get('/api/search', (c) => {
    const q = (c.req.query('q') ?? '').trim();
    const limit = clampInt(c.req.query('limit'), 30, 1, 100);
    const offset = clampInt(c.req.query('offset'), 0, 0, 10_000);
    const typeRaw = c.req.query('type');
    const fromDate = c.req.query('from');
    const toDate = c.req.query('to');
    const tagsRaw = c.req.query('tags');

    const type =
      typeRaw && VALID_TYPES.includes(typeRaw as SearchType)
        ? (typeRaw as SearchType)
        : undefined;

    const tags = tagsRaw
      ? tagsRaw.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
      : undefined;

    if (!q) {
      const empty: SearchResponse = {
        query: '',
        total: 0,
        hits: [],
        facets: { type: { post: 0, note: 0, tag: 0, media: 0 }, tags: {} },
      };
      return c.json(empty);
    }

    const hits = repo.searchFTS(q, {
      ...(type !== undefined ? { type } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(fromDate !== undefined ? { fromDate } : {}),
      ...(toDate !== undefined ? { toDate } : {}),
      limit,
      offset,
      visibility: ['public'], // 公开端点只返回 public
    });

    // facets — 简单从 hits 内统计
    const typeFacet: Record<SearchType, number> = {
      post: 0,
      note: 0,
      tag: 0,
      media: 0,
    };
    const tagFacet: Record<string, number> = {};
    for (const h of hits) {
      typeFacet[h.type] = (typeFacet[h.type] ?? 0) + 1;
      for (const t of h.tags ?? []) {
        tagFacet[t] = (tagFacet[t] ?? 0) + 1;
      }
    }

    const resp: SearchResponse = {
      query: q,
      total: hits.length,
      hits,
      facets: { type: typeFacet, tags: tagFacet },
    };
    return c.json(resp);
  });

  app.get('/api/search/suggest', (c) => {
    const q = (c.req.query('q') ?? '').trim();
    const limit = clampInt(c.req.query('limit'), 10, 1, 50);
    if (!q) return c.json([]);
    return c.json(repo.searchSuggest(q, limit));
  });
}

function clampInt(raw: string | undefined, def: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}
