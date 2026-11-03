import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { platformPromoSchema, type PlatformPromoSettings, type PromoItem } from '@opennote/core';
import { PlatformPromoFeed, appendUtm, combinePromoItems, mergeSourceItems } from './feed.js';
import type { PromoCandidate, PromoSourceFetcher } from './source.js';
import { gameFetcher, normalizeGame } from './sources/game.js';

function rawGame(key: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    gameKey: key,
    slug: `slug-${key}`,
    title: `Title ${key}`,
    oneLiner: `One ${key}`,
    coverUrl: `https://lumiogames.cn/media/${key}`,
    author: { handle: `h-${key}`, name: `Author ${key}` },
    stats: { plays: 10 },
    ...extra,
  };
}

function rankBody(...games: Record<string, unknown>[]): unknown {
  return { board: 'hot', items: games.map((game, i) => ({ kind: 'game', rank: i + 1, score: 1, game })) };
}

function candidate(key: string): PromoCandidate {
  return normalizeGame(rawGame(key))!;
}

function resolved(over: PlatformPromoSettings = {}) {
  return platformPromoSchema.parse({ enabled: true, ...over });
}

function game(over: Record<string, unknown> = {}): PlatformPromoSettings {
  return { enabled: true, sources: [{ kind: 'game', ...over }] };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function mockFetch(route: (url: URL) => Response | Promise<Response>) {
  return vi.fn(async (input: string | URL | Request, _init?: RequestInit) => route(new URL(String(input))));
}

const ids = (items: PromoItem[]) => items.map((i) => i.id);

describe('mergeSourceItems', () => {
  const entry = { items: ['a', 'b', 'c', 'd', 'e'].map(candidate), lookups: {} };
  const merge = (src: Record<string, unknown> = {}, e: Parameters<typeof mergeSourceItems>[0] = entry) => {
    const settings = resolved({ sources: [{ kind: 'game', ...src }] });
    return mergeSourceItems(e, settings.sources[0]!, gameFetcher as PromoSourceFetcher, settings.utm);
  };

  it('maps candidates to PromoItem with per-kind utm links', () => {
    expect(merge({ limit: 1 })).toEqual([
      {
        kind: 'game',
        id: 'a',
        title: 'Title a',
        subtitle: 'One a',
        coverUrl: 'https://lumiogames.cn/media/a',
        authorName: 'Author a',
        authorHandle: 'h-a',
        metric: { label: '游玩次数', value: 10 },
        url: 'https://lumiogames.cn/g/slug-a?utm_source=blog&utm_medium=left_rail&utm_campaign=platform_games',
      },
    ]);
  });

  it('omits metric when the source has none', () => {
    const [item] = merge({}, { items: [normalizeGame({ gameKey: 'x', slug: 'x', title: 'X' })!], lookups: {} });
    expect(item).not.toHaveProperty('metric');
  });

  it('puts pinned first in pinned order, matching id or alias, without duplicates', () => {
    expect(ids(merge({ pinned: ['d', 'slug-b'], limit: 4 }))).toEqual(['d', 'b', 'a', 'c']);
  });

  it('uses lookups for pinned items missing from the list and skips unknown ones', () => {
    const e = { items: entry.items, lookups: { z: candidate('z'), gone: null } };
    expect(ids(merge({ pinned: ['gone', 'z', 'never-fetched'], limit: 3 }, e))).toEqual(['z', 'a', 'b']);
  });

  it('blocks by id or alias, and block wins over pin', () => {
    expect(ids(merge({ pinned: ['c'], blocked: ['a', 'slug-c'] }))).toEqual(['b', 'd', 'e']);
  });

  it('dedupes repeated items and is unlimited without a source limit', () => {
    const e = { items: [candidate('a'), candidate('a'), candidate('b')], lookups: {} };
    expect(ids(merge({}, e))).toEqual(['a', 'b']);
  });

  it('builds play links and custom campaign', () => {
    const [item] = merge({ link: 'play', limit: 1, utm_campaign: 'spring' });
    expect(item?.url).toBe('https://lumiogames.cn/g/slug-a/play?utm_source=blog&utm_medium=left_rail&utm_campaign=spring');
  });
});

describe('combinePromoItems', () => {
  const item = (kind: PromoItem['kind'], id: string): PromoItem => ({
    kind, id, title: id, subtitle: '', coverUrl: null, authorName: '', authorHandle: null, url: 'https://x/',
  });

  it('concatenates in source order, dedupes by kind:id and caps the total', () => {
    const out = combinePromoItems(
      [[item('game', 'a'), item('game', 'b')], [item('game', 'a'), item('music', 'a'), item('music', 'b')]],
      4,
    );
    expect(out.map((i) => `${i.kind}:${i.id}`)).toEqual(['game:a', 'game:b', 'music:a', 'music:b']);
    expect(combinePromoItems([[item('game', 'a'), item('game', 'b')]], 1)).toHaveLength(1);
  });
});

describe('appendUtm', () => {
  it('overrides existing utm params and keeps others', () => {
    expect(appendUtm('https://x.test/p?a=1&utm_source=old', { source: 's', medium: 'm', campaign: 'c' })).toBe(
      'https://x.test/p?a=1&utm_source=s&utm_medium=m&utm_campaign=c',
    );
  });
});

describe('PlatformPromoFeed', () => {
  let dir: string;
  let now: number;
  const clock = () => now;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'platform-promo-'));
    now = 1_000_000;
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(dir, { recursive: true, force: true });
  });

  it('returns [] without fetching when disabled or not configured', async () => {
    const fetch = mockFetch(() => json(rankBody(rawGame('a'))));
    expect(await new PlatformPromoFeed({ getSettings: () => undefined, fetch }).get()).toEqual([]);
    expect(await new PlatformPromoFeed({ getSettings: () => ({ enabled: false }), fetch }).get()).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns [] and logs once on invalid config', async () => {
    const log = vi.fn();
    const fetch = mockFetch(() => json(rankBody(rawGame('a'))));
    const bad = { enabled: true, sources: [{ kind: 'video' }] } as unknown as PlatformPromoSettings;
    const feed = new PlatformPromoFeed({ getSettings: () => bad, fetch, log });
    expect(await feed.get()).toEqual([]);
    expect(await feed.get()).toEqual([]);
    expect(log.mock.calls.filter(([, m]) => m === 'platform_promo.config.invalid')).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('defaults to the hot board, applies the total limit and caches for the ttl', async () => {
    const fetch = mockFetch((url) => {
      expect(url.pathname).toBe('/api/rank/hot');
      return json(rankBody(rawGame('a'), rawGame('b'), rawGame('c'), rawGame('d')));
    });
    const feed = new PlatformPromoFeed({ getSettings: () => ({ enabled: true }), fetch, now: clock, ttlMs: 1000 });

    expect(ids(await feed.get())).toEqual(['a', 'b', 'c']);
    now += 999;
    await feed.get();
    expect(fetch).toHaveBeenCalledTimes(1);
    now += 1;
    await feed.get();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('combines several sources with their own limits and campaigns', async () => {
    const fetch = mockFetch((url) =>
      url.pathname === '/api/rank/new'
        ? json(rankBody(rawGame('n1'), rawGame('shared')))
        : json(rankBody(rawGame('shared'), rawGame('h1'), rawGame('h2'))),
    );
    const feed = new PlatformPromoFeed({
      getSettings: () => ({
        enabled: true,
        limit: 4,
        sources: [
          { kind: 'game', board: 'hot', limit: 2 },
          { kind: 'game', board: 'new', utm_campaign: 'platform_games_new' },
        ],
      }),
      fetch,
    });
    const out = await feed.get();
    expect(ids(out)).toEqual(['shared', 'h1', 'n1']);
    expect(out[2]?.url).toContain('utm_campaign=platform_games_new');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps other sources working when one source fails', async () => {
    const fetch = mockFetch((url) =>
      url.pathname === '/api/rank/new' ? new Response('down', { status: 502 }) : json(rankBody(rawGame('h1'))),
    );
    const feed = new PlatformPromoFeed({
      getSettings: () => ({ enabled: true, sources: [{ kind: 'game', board: 'new' }, { kind: 'game', board: 'hot' }] }),
      fetch,
    });
    expect(ids(await feed.get())).toEqual(['h1']);
  });

  it('dedupes concurrent refreshes', async () => {
    const fetch = mockFetch(() => json(rankBody(rawGame('a'))));
    const feed = new PlatformPromoFeed({ getSettings: () => ({ enabled: true }), fetch });
    await Promise.all([feed.get(), feed.get(), feed.get()]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns [] without throwing when it has never succeeded', async () => {
    const log = vi.fn();
    const fetch = mockFetch(() => {
      throw new TypeError('fetch failed');
    });
    const feed = new PlatformPromoFeed({ getSettings: () => ({ enabled: true }), fetch, log });
    await expect(feed.get()).resolves.toEqual([]);
    expect(log).toHaveBeenCalledWith('warn', 'platform_promo.refresh.failed', expect.objectContaining({ fallback: 'empty' }));
  });

  it('keeps the last success on HTTP errors, bad JSON and bad shapes, and backs off retries', async () => {
    let mode: 'ok' | '500' | 'badjson' | 'shape' = 'ok';
    const fetch = mockFetch(() => {
      if (mode === '500') return new Response('down', { status: 500 });
      if (mode === 'badjson') return new Response('<html>', { status: 200 });
      if (mode === 'shape') return json({ ok: false });
      return json(rankBody(rawGame('a')));
    });
    const feed = new PlatformPromoFeed({
      getSettings: () => ({ enabled: true }),
      fetch,
      now: clock,
      ttlMs: 1000,
      retryMs: 500,
    });
    expect(ids(await feed.get())).toEqual(['a']);

    for (const m of ['500', 'badjson', 'shape'] as const) {
      mode = m;
      now += 1000;
      const calls = fetch.mock.calls.length;
      expect(ids(await feed.get())).toEqual(['a']);
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
    const feed = new PlatformPromoFeed({ getSettings: () => ({ enabled: true }), fetch, timeoutMs: 20 });
    await expect(feed.get()).resolves.toEqual([]);
  });

  it('persists to disk and falls back to the disk cache after a restart', async () => {
    const cacheFile = join(dir, 'cache.json');
    const ok = mockFetch(() => json(rankBody(rawGame('a'), rawGame('b'))));
    await new PlatformPromoFeed({ getSettings: () => ({ enabled: true }), fetch: ok, cacheFile, now: clock }).get();
    const disk = JSON.parse(await readFile(cacheFile, 'utf-8'));
    expect(disk.version).toBe(2);
    expect(Object.values(disk.entries)).toHaveLength(1);

    now += 60 * 60_000;
    const down = mockFetch(() => new Response('', { status: 503 }));
    const feed = new PlatformPromoFeed({ getSettings: () => ({ enabled: true, limit: 1 }), fetch: down, cacheFile, now: clock });
    expect(ids(await feed.get())).toEqual(['a']);
    expect(down).toHaveBeenCalledTimes(1);
  });

  it('uses a fresh disk cache without hitting the network', async () => {
    const cacheFile = join(dir, 'cache.json');
    const first = mockFetch(() => json(rankBody(rawGame('a'))));
    await new PlatformPromoFeed({ getSettings: () => ({ enabled: true }), fetch: first, cacheFile, now: clock }).get();

    const second = mockFetch(() => json(rankBody(rawGame('b'))));
    const feed = new PlatformPromoFeed({ getSettings: () => ({ enabled: true }), fetch: second, cacheFile, now: clock });
    expect(ids(await feed.get())).toEqual(['a']);
    expect(second).not.toHaveBeenCalled();
  });

  it('ignores a corrupt disk cache', async () => {
    const cacheFile = join(dir, 'cache.json');
    await writeFile(cacheFile, '{not json', 'utf-8');
    const fetch = mockFetch(() => json(rankBody(rawGame('a'))));
    const feed = new PlatformPromoFeed({ getSettings: () => ({ enabled: true }), fetch, cacheFile });
    expect(ids(await feed.get())).toEqual(['a']);
  });

  it('looks up pinned items missing from the list, once per ttl', async () => {
    const fetch = mockFetch((url) => {
      if (url.pathname === '/api/rank/hot') return json(rankBody(rawGame('a'), rawGame('b')));
      if (url.pathname === '/api/games/slug-z') return json(rawGame('z'));
      if (url.pathname === '/api/games/gone') return json({ ok: false }, 404);
      throw new Error(`unexpected ${url}`);
    });
    const feed = new PlatformPromoFeed({ getSettings: () => game({ pinned: ['gone', 'slug-z', 'b'] }), fetch, now: clock });
    expect(ids(await feed.get())).toEqual(['z', 'b', 'a']);
    expect(fetch.mock.calls.map(([u]) => new URL(String(u)).pathname)).toEqual([
      '/api/rank/hot',
      '/api/games/gone',
      '/api/games/slug-z',
    ]);
    await feed.get();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('treats a non-404 lookup failure as a failed refresh', async () => {
    const fetch = mockFetch((url) =>
      url.pathname === '/api/rank/hot' ? json(rankBody(rawGame('a'))) : new Response('', { status: 500 }),
    );
    const feed = new PlatformPromoFeed({ getSettings: () => game({ pinned: ['x'] }), fetch });
    expect(await feed.get()).toEqual([]);
  });

  it('refetches when the data-set config changes or an unknown pin is added, not for merge-only changes', async () => {
    let cfg = game();
    const fetch = mockFetch((url) => {
      if (url.pathname.startsWith('/api/rank/')) return json(rankBody(rawGame(url.pathname.slice(-3))));
      return json({}, 404);
    });
    const feed = new PlatformPromoFeed({ getSettings: () => cfg, fetch, now: clock });
    expect(ids(await feed.get())).toEqual(['hot']);
    cfg = game({ board: 'new' });
    expect(ids(await feed.get())).toEqual(['new']);
    cfg = game({ board: 'new', blocked: ['new'], link: 'play' });
    expect(await feed.get()).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
    cfg = game({ board: 'new', pinned: ['x'] });
    await feed.get();
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('works with any fetcher that implements the source contract', async () => {
    const fake: PromoSourceFetcher = {
      kind: 'game',
      cacheKey: () => 'fake',
      list: async () => [candidate('f1'), candidate('f2')],
      lookup: async () => null,
      href: (_s, item) => `https://other.test/item/${item.ref}`,
    };
    const feed = new PlatformPromoFeed({ getSettings: () => ({ enabled: true }), fetchers: { game: fake } });
    const [first] = await feed.get();
    expect(first?.url).toBe(
      'https://other.test/item/slug-f1?utm_source=blog&utm_medium=left_rail&utm_campaign=platform_games',
    );
  });

  it('refreshes on a timer and calls onChange only when rendered output changes', async () => {
    vi.useFakeTimers();
    let plays = 10;
    let key = 'a';
    const fetch = mockFetch(() => json(rankBody(rawGame(key, { stats: { plays } }))));
    const feed = new PlatformPromoFeed({ getSettings: () => ({ enabled: true }), fetch, ttlMs: 1000 });
    const onChange = vi.fn();
    await feed.get();
    feed.start({ onChange });

    plays = 99;
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onChange).not.toHaveBeenCalled();
    expect((await feed.get())[0]?.metric?.value).toBe(99);

    key = 'b';
    await vi.advanceTimersByTimeAsync(1000);
    expect(onChange).toHaveBeenCalledTimes(1);
    feed.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
