import { Hono, type Context, type MiddlewareHandler, type Next } from 'hono';
import type { Database } from 'better-sqlite3';
import { TagsRepo } from '@opennote/db';
import { AuthService, getSessionToken } from '../auth.js';
import { TokenService, requireToken } from '../tokens.js';

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

function actorMw(
  auth: AuthService,
  tokens: TokenService,
  minScope: 'read' | 'write' | 'admin',
): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const cookie = getSessionToken(c);
    if (cookie && auth.isValidSession(cookie)) {
      c.set('actor', 'owner');
      return next();
    }
    return requireToken(tokens, minScope)(c, async () => {
      c.set('actor', `token:${c.get('tokenScope')}`);
      await next();
    });
  };
}
