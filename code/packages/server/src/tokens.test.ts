import type { Database } from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { TokenService } from './tokens.js';

function fakeDb(onRun: () => void): Database {
  return {
    prepare: () => ({
      all: () => [],
      get: () => undefined,
      run: () => {
        onRun();
        return { changes: 1, lastInsertRowid: 1 };
      },
    }),
  } as unknown as Database;
}

describe('TokenService', () => {
  it('only creates admin-scoped tokens', () => {
    let writes = 0;
    const tokens = new TokenService(fakeDb(() => { writes += 1; }));

    expect(() => tokens.create('readonly', 'read', 90)).toThrow(/admin scope/);
    expect(() => tokens.create('writer', 'write', 90)).toThrow(/admin scope/);
    expect(writes).toBe(0);
  });
});
