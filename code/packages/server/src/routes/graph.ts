/**
 * WS-G2 — Graph API
 *
 * Endpoints:
 * - GET /api/graph → GraphData(只含 public + unlisted 节点)
 *
 * Public endpoint, 无需鉴权。
 */
import type { Hono } from 'hono';
import type { Database } from 'better-sqlite3';
import { NoteRepo } from '@opennote/db';
import type { GraphData } from '@opennote/core';

export interface GraphDeps {
  db: Database;
}

export function register(app: Hono, deps: GraphDeps): void {
  const repo = new NoteRepo(deps.db);

  app.get('/api/graph', (c) => {
    const data: GraphData = repo.getGraph();
    return c.json(data);
  });
}
