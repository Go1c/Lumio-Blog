import type { Database } from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../routes.js';
import type { SiteConfig } from '@opennote/core';
import type { EventBus } from '../events.js';

const statement = {
  all: () => [],
  get: () => undefined,
  run: () => ({ changes: 0, lastInsertRowid: 0 }),
};

function fakeDb(): Database {
  return {
    prepare: () => statement,
    exec: () => undefined,
    transaction: (fn: () => void) => () => fn(),
  } as unknown as Database;
}

function fakeBus(): EventBus {
  return {
    subscribe: () => () => undefined,
    emit: () => undefined,
  } as unknown as EventBus;
}

describe('public write routes', () => {
  it('does not expose note meta patch outside the admin namespace', async () => {
    const app = buildApp({
      db: fakeDb(),
      config: {
        site: { title: 'x', url: 'https://example.test' },
        author: { name: 'x' },
        paths: { vault: '', out: '', db: '' },
      } as SiteConfig,
      bus: fakeBus(),
      triggerSync: async () => undefined,
    });

    const res = await app.request('/api/notes/demo/meta', { method: 'PATCH' });

    expect(res.status).toBe(404);
  });
});
