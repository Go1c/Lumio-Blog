import { httpUrl, record, str, type PromoCandidate, type PromoSourceFetcher, type ResolvedPromoSource } from '../source.js';

/**
 * 游戏源 — lumiogames.cn 公开接口(无 CORS,只能在服务端拉):
 *   GET {base}/api/rank/hot|new?locale=   → { items: [{ kind: 'game', game }] }
 *   GET {base}/api/feed?locale=&limit=20  → { items: [game] }
 *   GET {base}/api/games/{slug}?locale=   → game(只认 slug;gameKey 仅在 slug === gameKey 时能查到)
 * 落地页:{base}/g/{slug}(详情,含「开始玩」)/ {base}/g/{slug}/play(直接进游戏)。
 */

type GameSource = Extract<ResolvedPromoSource, { kind: 'game' }>;

const FEED_LIMIT = 20;

/** 接口里的单个 game 对象 → PromoCandidate;缺 gameKey / slug / title 的丢弃。 */
export function normalizeGame(raw: unknown): PromoCandidate | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  const gameKey = str(g.gameKey);
  const slug = str(g.slug);
  const title = str(g.title);
  if (!gameKey || !slug || !title) return null;

  const author = record(g.author);
  const handle = str(author.handle);
  const plays = record(g.stats).plays;

  return {
    id: gameKey,
    aliases: slug === gameKey ? [] : [slug],
    ref: slug,
    title,
    subtitle: str(g.oneLiner),
    coverUrl: httpUrl(g.coverUrl),
    authorName: str(author.name) || handle,
    authorHandle: handle || null,
    metric: typeof plays === 'number' && Number.isFinite(plays) && plays >= 0
      ? { label: '游玩次数', value: Math.floor(plays) }
      : null,
  };
}

/**
 * 列表响应 → PromoCandidate[]。结构不对、或有条目但一条都解析不出来时抛错,
 * 让通用层当作失败处理(保留上一次的好结果,而不是用空列表覆盖)。
 */
export function extractGames(board: GameSource['board'], body: unknown): PromoCandidate[] {
  const items = record(body).items;
  if (!Array.isArray(items)) throw new Error('unexpected response shape: items is not an array');

  const games: PromoCandidate[] = [];
  for (const item of items) {
    let raw: unknown = item;
    if (board !== 'feed') {
      const entry = record(item);
      if (entry.kind !== 'game') continue;
      raw = entry.game;
    }
    const g = normalizeGame(raw);
    if (g) games.push(g);
  }
  if (items.length > 0 && games.length === 0) {
    throw new Error('unexpected response shape: no valid games in items');
  }
  return games;
}

export const gameFetcher: PromoSourceFetcher<GameSource> = {
  kind: 'game',

  cacheKey(source) {
    return [source.board, source.locale, source.base_url].join('|');
  },

  async list(source, http) {
    const path = source.board === 'feed' ? '/api/feed' : `/api/rank/${source.board}`;
    const url = new URL(path, source.base_url);
    url.searchParams.set('locale', source.locale);
    if (source.board === 'feed') url.searchParams.set('limit', String(FEED_LIMIT));
    return extractGames(source.board, await http.getJson(url.toString()));
  },

  async lookup(source, key, http) {
    const url = new URL(`/api/games/${encodeURIComponent(key)}`, source.base_url);
    url.searchParams.set('locale', source.locale);
    return normalizeGame(await http.getJson(url.toString(), { allowNotFound: true }));
  },

  href(source, item) {
    const path = `/g/${encodeURIComponent(item.ref)}${source.link === 'play' ? '/play' : ''}`;
    return new URL(path, source.base_url).toString();
  },
};
