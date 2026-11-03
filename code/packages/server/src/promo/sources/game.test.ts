import { describe, expect, it, vi } from 'vitest';
import { platformPromoSchema } from '@opennote/core';
import type { PromoHttp } from '../source.js';
import { extractGames, gameFetcher, normalizeGame } from './game.js';

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

function gameSource(over: Record<string, unknown> = {}) {
  const s = platformPromoSchema.parse({ sources: [{ kind: 'game', ...over }] }).sources[0]!;
  if (s.kind !== 'game') throw new Error('expected game source');
  return s;
}

describe('normalizeGame', () => {
  it('maps upstream fields', () => {
    expect(normalizeGame(rawGame('g-1'))).toEqual({
      id: 'g-1',
      aliases: ['slug-g-1'],
      ref: 'slug-g-1',
      title: 'Title g-1',
      subtitle: 'One g-1',
      coverUrl: 'https://lumiogames.cn/media/g-1',
      authorName: 'Author g-1',
      authorHandle: 'h-g-1',
      metric: { label: '游玩次数', value: 10 },
    });
  });

  it('tolerates missing optional fields', () => {
    expect(normalizeGame({ gameKey: 'g-1', slug: 'g-1', title: ' T ' })).toEqual({
      id: 'g-1',
      aliases: [],
      ref: 'g-1',
      title: 'T',
      subtitle: '',
      coverUrl: null,
      authorName: '',
      authorHandle: null,
      metric: null,
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
    expect(g?.metric).toBeNull();
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
    expect(extractGames('hot', body).map((g) => g.id)).toEqual(['a', 'b']);
  });

  it('reads the feed as plain games', () => {
    expect(extractGames('feed', { items: [rawGame('a'), rawGame('b')] }).map((g) => g.id)).toEqual(['a', 'b']);
  });

  it('accepts an empty list', () => {
    expect(extractGames('new', { items: [] })).toEqual([]);
  });

  it('throws on unexpected shapes so the feed keeps the last good result', () => {
    expect(() => extractGames('hot', { ok: false })).toThrow();
    expect(() => extractGames('hot', null)).toThrow();
    expect(() => extractGames('hot', { items: [{ kind: 'game', game: {} }] })).toThrow();
  });
});

describe('gameFetcher', () => {
  function http(body: unknown) {
    const getJson = vi.fn(async (_url: string, _opts?: { allowNotFound?: boolean }) => body);
    return { getJson } satisfies PromoHttp;
  }

  it('requests the configured board', async () => {
    const h = http({ items: [{ kind: 'game', game: rawGame('a') }] });
    await gameFetcher.list(gameSource({ board: 'new', locale: 'en' }), h);
    expect(h.getJson).toHaveBeenCalledWith('https://lumiogames.cn/api/rank/new?locale=en');
  });

  it('requests the feed with a limit', async () => {
    const h = http({ items: [rawGame('a')] });
    expect((await gameFetcher.list(gameSource({ board: 'feed' }), h)).map((g) => g.id)).toEqual(['a']);
    expect(h.getJson).toHaveBeenCalledWith('https://lumiogames.cn/api/feed?locale=zh-CN&limit=20');
  });

  it('looks up a single game by slug and maps 404 to null', async () => {
    const found = http(rawGame('z'));
    expect((await gameFetcher.lookup(gameSource(), 'slug-z', found))?.id).toBe('z');
    expect(found.getJson).toHaveBeenCalledWith('https://lumiogames.cn/api/games/slug-z?locale=zh-CN', {
      allowNotFound: true,
    });
    expect(await gameFetcher.lookup(gameSource(), 'gone', http(null))).toBeNull();
  });

  it('links to the detail page or the play page by slug', () => {
    const item = normalizeGame(rawGame('a'))!;
    expect(gameFetcher.href(gameSource(), item)).toBe('https://lumiogames.cn/g/slug-a');
    expect(gameFetcher.href(gameSource({ link: 'play' }), item)).toBe('https://lumiogames.cn/g/slug-a/play');
  });

  it('keys the cache by data-set settings only', () => {
    expect(gameFetcher.cacheKey(gameSource({ pinned: ['x'], blocked: ['y'], limit: 1, link: 'play' }))).toBe(
      gameFetcher.cacheKey(gameSource()),
    );
    expect(gameFetcher.cacheKey(gameSource({ board: 'new' }))).not.toBe(gameFetcher.cacheKey(gameSource()));
  });
});
