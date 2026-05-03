import { Hono } from 'hono';
import type { Database } from 'better-sqlite3';
import { TagsRepo } from '@opennote/db';
import { AuthService } from '../auth.js';
import { TokenService } from '../tokens.js';
import { actorMw } from '../route-utils.js';

export interface TagsDeps {
  db: Database;
}

export function register(app: Hono, deps: TagsDeps): void {
  const repo = new TagsRepo(deps.db);
  const auth = new AuthService(deps.db);
  const tokens = new TokenService(deps.db);

  const r = new Hono();
  r.use('*', actorMw(auth, tokens, 'admin'));

  r.get('/', (c) => {
    return c.json({ tags: repo.list() });
  });

  r.get('/:tag', (c) => {
    const tag = c.req.param('tag');
    if (!tag) return c.json({ error: { code: 'validation_failed', field: 'tag' } }, 400);
    return c.json({ tag, notes: repo.notesForTag(tag) });
  });

  app.route('/api/admin/tags', r);
}
