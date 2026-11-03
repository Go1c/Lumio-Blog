import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformGamesSettings } from '@opennote/core';
import {
  PlatformGamesFeed,
  extractGames,
  mergePromoGames,
  normalizeGame,
  resolvePlatformGamesSettings,
  type CatalogGame,
} from './platform-games.js';

function rawGame(key: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    gameKey: key,
    slug: `slug-${key}`,
    title: `Title ${key}`,
    oneLiner: `One ${key}`,
    coverUrl: `https://lumiogames.cn/media/${key}`,
    author: { handle: `h-${key}`, name: `Author ${key}`, verified: false },
    stats: { plays: 10 },
    ...extra,
  };
}

function rankBody(...games: Record<string, unknown>[]): unknown {
  return { board: 'hot', items: games.map((game, i) => ({ kind: 'game', rank: i + 1, score: 1, game })) };
}

function catalog(key: string): CatalogGame {
  return normalizeGame(rawGame(key))!;
}

function settings(over: PlatformGamesSettings = {}) {
  return resolvePlatformGamesSettings({ enabled: true, ...over })!;
}

type Route = (url: URL) => Response | Promise<Response>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function mockFetch(route: Route) {
  return vi.fn(async (input: string | URL | Request) => route(new URL(String(input))));
}

describe('normalizeGame', () => {
  it('maps upstream fields', () => {
    expect(normalizeGame(rawGame('g-1'))).toEqual({
      gameKey: 'g-1',
      slug: 'slug-g-1',
      title: 'Title g-1',
      oneLiner: 'One g-1',
      coverUrl: 'https://lumiogames.cn/media/g-1',
      authorName: 'Author g-1',
      authorHandle: 'h-g-1',
      plays: 10,
    });
  });

  it('tolerates missing optional fields', () => {
    expect(normalizeGame({ gameKey: 'g-1', slug: 's', title: ' T ' })).toEqual({
      gameKey: 'g-1',
      slug: 's',
      title: 'T',
      oneLiner: '',
      coverUrl: null,
      authorName: '',
      authorHandle: null,
      plays: null,
    });
  });

  it('falls back to handle, rejects non-http cover and bad plays', () => {
    const g = normalizeGame(
      rawGame('g-1', {
        coverUrl: 'javascript:alert(1)',
        author: { handle: 'only-handle', name: null },
        stats: { plays: 'many' },
      }),
    );
    expect(g?.coverUrl).toBeNull();
    expect(g?.authorName).toBe('only-handle');
    expect(g?.plays).toBeNull();
  });

  it('drops games without gameKey, slug or title', () => {
    expect(normalizeGame(rawGame('g-1', { gameKey: '' }))).toBeNull();
    expect(normalizeGame(rawGame('g-1', { slug: undefined }))).toBeNull();
    expect(normalizeGame(rawGame('g-1', { title: 42 }))).toBeNull();
    expect(normalizeGame(null)).toBeNull();
    expect(normalizeGame('g-1')).toBeNull();
  });
});

describe('extractGames', () => {
  it('reads rank boards and skips non-game entries and malformed games', () => {
    const body = {
      items: [
        { kind: 'game', game: rawGame('a') },
        { kind: 'banner', game: rawGame('x') },
        { kind: 'game', game: { title: 'no key' } },
        { kind: 'game', game: rawGame('b') },
      ],
    };
    expect(extractGames('hot', body).map((g) => g.gameKey)).toEqual(['a', 'b']);
  });

  it('reads the feed as plain games', () => {
    expect(extractGames('feed', { items: [rawGame('a'), rawGame('b')] }).map((g) => g.gameKey)).toEqual(['a', 'b']);
  });

  it('accepts an empty list', () => {
    expect(extractGames('new', { items: [] })).toEqual([]);
  });

  it('throws on unexpected shapes so the caller keeps the last good result', () => {
    expect(() => extractGames('hot', { ok: false })).toThrow();
    expect(() => extractGames('hot', null)).toThrow();
    expect(() => extractGames('hot', { items: [{ kind: 'game', game: {} }] })).toThrow();
  });
});

describe('mergePromoGames', () => {
  const pool = ['a', 'b', 'c', 'd', 'e'].map(catalog);

  it('takes pool order up to limit with utm links', () => {
    const out = mergePromoGames({ games: pool, lookups: {} }, settings());
    expect(out.map((g) => g.gameKey)).toEqual(['a', 'b', 'c']);
    expect(out[0]).toEqual({
      gameKey: 'a',
      title: 'Title a',
      oneLiner: 'One a',
      coverUrl: 'https://lumiogames.cn/media/a',
      authorName: 'Author a',
      authorHandle: 'h-a',
      plays: 10,
      url: 'https://lumiogames.cn/g/slug-a?utm_source=blog&utm_medium=left_rail&utm_campaign=platform_games',
    });
  });

  it('puts pinned first in pinned order, matching gameKey or slug, without duplicates', () => {
    const out = mergePromoGames({ games: pool, lookups: {} }, settings({ pinned: ['d', 'slug-b'], limit: 4 }));
    expect(out.map((g) => g.gameKey)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('uses lookups for pinned games missing from the pool and skips unknown ones', () => {
    const out = mergePromoGames(
      { games: pool, lookups: { z: catalog('z'), gone: null } },
      settings({ pinned: ['gone', 'z', 'never-fetched'] }),
    );
    expect(out.map((g) => g.gameKey)).toEqual(['z', 'a', 'b']);
  });

  it('blocks by gameKey or slug, and block wins over pin', () => {
    const out = mergePromoGames(
      { games: pool, lookups: {} },
      settings({ pinned: ['c'], blocked: ['a', 'slug-c'] }),
    );
    expect(out.map((g) => g.gameKey)).toEqual(['b', 'd', 'e']);
  });

  it('dedupes repeated games in the pool', () => {
    const out = mergePromoGames({ games: [catalog('a'), catalog('a'), catalog('b')], lookups: {} }, settings());
    expect(out.map((g) => g.gameKey)).toEqual(['a', 'b']);
  });

  it('builds play links and custom utm', () => {
    const [g] = mergePromoGames(
      { games: pool, lookups: {} },
      settings({ link: 'play', limit: 1, utm: { medium: 'rail' } }),
    );
    expect(g?.url).toBe(
      'https://lumiogames.cn/g/slug-a/play?utm_source=blog&utm_medium=rail&utm_campaign=platform_games',
    );
  });
});

describe('resolvePlatformGamesSettings', () => {
  it('returns null when missing, disabled or invalid', () => {
    expect(resolvePlatformGamesSettings(undefined)).toBeNull();
    expect(resolvePlatformGamesSettings({})).toBeNull();
    expect(resolvePlatformGamesSettings({ enabled: true, limit: 0 })).toBeNull();
    expect(resolvePlatformGamesSettings({ enabled: true })?.source).toBe('hot');
  });
});

describe('PlatformGamesFeed', () => {
  let dir: string;
  let now: number;
  const clock = () => now;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'platform-games-'));
    now = 1_000_000;
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(dir, { recursive: true, force: true });
  });

  it('returns [] without fetching when disabled or not configured', async () => {
    const fetch = mockFetch(() => json(rankBody(rawGame('a'))));
    expect(await new PlatformGamesFeed({ getSettings: () => undefined, fetch }).get()).toEqual([]);
    expect(await new PlatformGamesFeed({ getSettings: () => ({ enabled: false }), fetch }).get()).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns [] and logs once on invalid config', async () => {
    const log = vi.fn();
    const fetch = mockFetch(() => json(rankBody(rawGame('a'))));
    const bad = { enabled: true, source: 'nope' } as unknown as PlatformGamesSettings;
    const feed = new PlatformGamesFeed({ getSettings: () => bad, fetch, log });
    expect(await feed.get()).toEqual([]);
    expect(await feed.get()).toEqual([]);
    expect(log.mock.calls.filter(([, m]) => m === 'platform_games.config.invalid')).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches the configured board and caches it for the ttl', async () => {
    const fetch = mockFetch((url) => {
      expect(url.pathname).toBe('/api/rank/new');
      expect(url.searchParams.get('locale')).toBe('zh-CN');
      return json(rankBody(rawGame('a'), rawGame('b')));
    });
    const feed = new PlatformGamesFeed({
      getSettings: () => ({ enabled: true, source: 'new' }),
      fetch,
      now: clock,
      ttlMs: 1000,
    });

    expect((await feed.get()).map((g) => g.gameKey)).toEqual(['a', 'b']);
    now += 999;
    await feed.get();
    expect(fetch).toHaveBeenCalledTimes(1);
    now += 1;
    await feed.get();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('fetches the feed endpoint with a limit', async () => {
    const fetch = mockFetch((url) => {
      expect(url.pathname).toBe('/api/feed');
      expect(url.searchParams.get('limit')).toBe('20');
      return json({ items: [rawGame('a')] });
    });
    const feed = new PlatformGamesFeed({ getSettings: () => ({ enabled: true, source: 'feed' }), fetch });
    expect((await feed.get()).map((g) => g.gameKey)).toEqual(['a']);
  });

  it('dedupes concurrent refreshes', async () => {
    const fetch = mockFetch(() => json(rankBody(rawGame('a'))));
    const feed = new PlatformGamesFeed({ getSettings: () => ({ enabled: true }), fetch });
    await Promise.all([feed.get(), feed.get(), feed.get()]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns [] without throwing when it has never succeeded', async () => {
    const log = vi.fn();
    const fetch = mockFetch(() => {
      throw new TypeError('fetch failed');
    });
    const feed = new PlatformGamesFeed({ getSettings: () => ({ enabled: true }), fetch, log });
    await expect(feed.get()).resolves.toEqual([]);
    expect(log).toHaveBeenCalledWith('warn', 'platform_games.refresh.failed', expect.objectContaining({ fallback: 'empty' }));
  });

  it('keeps the last success on HTTP errors, bad JSON and bad shapes, and backs off retries', async () => {
    let mode: 'ok' | '500' | 'badjson' | 'shape' = 'ok';
    const fetch = mockFetch(() => {
      if (mode === '500') return new Response('down', { status: 500 });
      if (mode === 'badjson') return new Response('<html>', { status: 200 });
      if (mode === 'shape') return json({ ok: false });
      return json(rankBody(rawGame('a')));
    });
    const feed = new PlatformGamesFeed({
      getSettings: () => ({ enabled: true }),
      fetch,
      now: clock,
      ttlMs: 1000,
      retryMs: 500,
    });
    expect((await feed.get()).map((g) => g.gameKey)).toEqual(['a']);

    for (const m of ['500', 'badjson', 'shape'] as const) {
      mode = m;
      now += 1000;
      const calls = fetch.mock.calls.length;
      expect((await feed.get()).map((g) => g.gameKey)).toEqual(['a']);
      expect(fetch.mock.calls.length).toBe(calls + 1);
      // 失败后 retryMs 内不再打接口
      now += 100;
      await feed.get();
      expect(fetch.mock.calls.length).toBe(calls + 1);
    }
  });

  it('times out slow requests', async () => {
    const fetch = vi.fn(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );
    const feed = new PlatformGamesFeed({ getSettings: () => ({ enabled: true }), fetch, timeoutMs: 20 });
    await expect(feed.get()).resolves.toEqual([]);
  });

  it('persists to disk and falls back to the disk cache after a restart', async () => {
    const cacheFile = join(dir, 'cache.json');
    const ok = mockFetch(() => json(rankBody(rawGame('a'), rawGame('b'))));
    await new PlatformGamesFeed({ getSettings: () => ({ enabled: true }), fetch: ok, cacheFile, now: clock }).get();
    expect(JSON.parse(await readFile(cacheFile, 'utf-8')).games).toHaveLength(2);

    now += 60 * 60_000;
    const down = mockFetch(() => new Response('', { status: 503 }));
    const feed = new PlatformGamesFeed({
      getSettings: () => ({ enabled: true, limit: 1 }),
      fetch: down,
      cacheFile,
      now: clock,
    });
    expect((await feed.get()).map((g) => g.gameKey)).toEqual(['a']);
    expect(down).toHaveBeenCalledTimes(1);
  });

  it('uses a fresh disk cache without hitting the network', async () => {
    const cacheFile = join(dir, 'cache.json');
    const first = mockFetch(() => json(rankBody(rawGame('a'))));
    await new PlatformGamesFeed({ getSettings: () => ({ enabled: true }), fetch: first, cacheFile, now: clock }).get();

    const second = mockFetch(() => json(rankBody(rawGame('b'))));
    const feed = new PlatformGamesFeed({ getSettings: () => ({ enabled: true }), fetch: second, cacheFile, now: clock });
    expect((await feed.get()).map((g) => g.gameKey)).toEqual(['a']);
    expect(second).not.toHaveBeenCalled();
  });

  it('ignores a corrupt disk cache', async () => {
    const cacheFile = join(dir, 'cache.json');
    await writeFile(cacheFile, '{not json', 'utf-8');
    const fetch = mockFetch(() => json(rankBody(rawGame('a'))));
    const feed = new PlatformGamesFeed({ getSettings: () => ({ enabled: true }), fetch, cacheFile });
    expect((await feed.get()).map((g) => g.gameKey)).toEqual(['a']);
  });

  it('looks up pinned games missing from the board, once per ttl', async () => {
    const fetch = mockFetch((url) => {
      if (url.pathname === '/api/rank/hot') return json(rankBody(rawGame('a'), rawGame('b')));
      if (url.pathname === '/api/games/slug-z') return json(rawGame('z'));
      if (url.pathname === '/api/games/gone') return json({ ok: false }, 404);
      throw new Error(`unexpected ${url}`);
    });
    const feed = new PlatformGamesFeed({
      getSettings: () => ({ enabled: true, pinned: ['gone', 'slug-z', 'b'] }),
      fetch,
      now: clock,
    });
    expect((await feed.get()).map((g) => g.gameKey)).toEqual(['z', 'b', 'a']);
    expect(fetch.mock.calls.map(([u]) => new URL(String(u)).pathname)).toEqual([
      '/api/rank/hot',
      '/api/games/gone',
      '/api/games/slug-z',
    ]);
    await feed.get();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('refetches when config changes source or adds an unknown pin', async () => {
    let cfg: PlatformGamesSettings = { enabled: true };
    const fetch = mockFetch((url) => {
      if (url.pathname.startsWith('/api/rank/')) return json(rankBody(rawGame(url.pathname.slice(-3))));
      return json({}, 404);
    });
    const feed = new PlatformGamesFeed({ getSettings: () => cfg, fetch, now: clock });
    expect((await feed.get()).map((g) => g.gameKey)).toEqual(['hot']);
    cfg = { enabled: true, source: 'new' };
    expect((await feed.get()).map((g) => g.gameKey)).toEqual(['new']);
    cfg = { enabled: true, source: 'new', blocked: ['new'] };
    expect(await feed.get()).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
    cfg = { enabled: true, source: 'new', pinned: ['x'] };
    await feed.get();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('refreshes on a timer and calls onChange only when rendered output changes', async () => {
    vi.useFakeTimers();
    let plays = 10;
    let key = 'a';
    const fetch = mockFetch(() => json(rankBody(rawGame(key, { stats: { plays } }))));
    const feed = new PlatformGamesFeed({ getSettings: () => ({ enabled: true }), fetch, ttlMs: 1000 });
    const onChange = vi.fn();
    await feed.get();
    feed.start({ onChange });

    plays = 99;
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onChange).not.toHaveBeenCalled();
    expect((await feed.get())[0]?.plays).toBe(99);

    key = 'b';
    await vi.advanceTimersByTimeAsync(1000);
    expect(onChange).toHaveBeenCalledTimes(1);
    feed.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
