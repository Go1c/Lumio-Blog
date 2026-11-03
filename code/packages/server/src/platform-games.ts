import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { platformGamesSchema, type PlatformGamesSettings, type PromoGame } from '@opennote/core';

/**
 * 平台游戏推荐数据源 — 从 lumiogames.cn 公开接口拉榜单,合并置顶/屏蔽后给静态渲染用。
 *
 * 接口(无 CORS,只能在服务端拉):
 *   GET {base}/api/rank/hot|new?locale=   → { items: [{ kind: 'game', game }] }
 *   GET {base}/api/feed?locale=&limit=20  → { items: [game] }
 *   GET {base}/api/games/{slug}?locale=   → game(只认 slug;gameKey 仅在 slug === gameKey 时能查到)
 * 游戏页:{base}/g/{slug}(详情,含「开始玩」)/ {base}/g/{slug}/play(直接进游戏)。
 *
 * 约定:get() 永不抛错。拉取失败沿用上一次成功结果(内存 → 磁盘),从未成功过返回 []。
 */

export type ResolvedPlatformGamesSettings = ReturnType<typeof platformGamesSchema.parse>;

/** 规范化后的平台游戏(缓存里存这个;url 依赖配置,合并时才拼)。 */
export interface CatalogGame {
  gameKey: string;
  slug: string;
  title: string;
  oneLiner: string;
  coverUrl: string | null;
  authorName: string;
  authorHandle: string | null;
  plays: number | null;
}

export interface PlatformGamesCache {
  version: 1;
  source: ResolvedPlatformGamesSettings['source'];
  locale: string;
  baseUrl: string;
  fetchedAt: number;
  games: CatalogGame[];
  /** 置顶项单独补查的结果;null = 平台上查不到 */
  lookups: Record<string, CatalogGame | null>;
}

type LogFn = (level: string, msg: string, meta?: unknown) => void;

export interface PlatformGamesFeedOptions {
  /** 每次取数时读当前配置(config.yaml 热更新后立即生效) */
  getSettings: () => PlatformGamesSettings | undefined;
  /** 磁盘缓存路径;不传则只用内存 */
  cacheFile?: string;
  fetch?: typeof fetch;
  now?: () => number;
  /** 缓存有效期,也是定时刷新间隔 */
  ttlMs?: number;
  /** 失败后多久才允许再试,避免接口挂掉时每次渲染都等超时 */
  retryMs?: number;
  timeoutMs?: number;
  log?: LogFn;
}

const USER_AGENT = 'LumioBlog/1.0 (+https://blog.lumio.games)';
const FEED_LIMIT = 20;

/** 配置 → 生效配置;未开启或配置非法返回 null。 */
export function resolvePlatformGamesSettings(
  raw: PlatformGamesSettings | undefined,
): ResolvedPlatformGamesSettings | null {
  if (!raw) return null;
  const parsed = platformGamesSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.enabled) return null;
  return parsed.data;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function httpUrl(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/** 接口里的单个 game 对象 → CatalogGame;缺 gameKey / slug / title 的丢弃。 */
export function normalizeGame(raw: unknown): CatalogGame | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  const gameKey = str(g.gameKey);
  const slug = str(g.slug);
  const title = str(g.title);
  if (!gameKey || !slug || !title) return null;

  const author = g.author && typeof g.author === 'object' ? (g.author as Record<string, unknown>) : {};
  const handle = str(author.handle);
  const stats = g.stats && typeof g.stats === 'object' ? (g.stats as Record<string, unknown>) : {};
  const plays = typeof stats.plays === 'number' && Number.isFinite(stats.plays) && stats.plays >= 0
    ? Math.floor(stats.plays)
    : null;

  return {
    gameKey,
    slug,
    title,
    oneLiner: str(g.oneLiner),
    coverUrl: httpUrl(g.coverUrl),
    authorName: str(author.name) || handle,
    authorHandle: handle || null,
    plays,
  };
}

/**
 * 列表接口响应 → CatalogGame[]。响应结构不对、或有条目但一条都解析不出来时抛错,
 * 让调用方当作失败处理(保留上一次的好结果,而不是用空列表覆盖)。
 */
export function extractGames(source: ResolvedPlatformGamesSettings['source'], body: unknown): CatalogGame[] {
  const items = body && typeof body === 'object' ? (body as { items?: unknown }).items : undefined;
  if (!Array.isArray(items)) throw new Error('unexpected response shape: items is not an array');

  const games: CatalogGame[] = [];
  for (const item of items) {
    let raw: unknown = item;
    if (source !== 'feed') {
      const entry = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
      if (!entry || entry.kind !== 'game') continue;
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

export function buildGameUrl(slug: string, settings: ResolvedPlatformGamesSettings): string {
  const path = `/g/${encodeURIComponent(slug)}${settings.link === 'play' ? '/play' : ''}`;
  const url = new URL(path, settings.base_url);
  url.searchParams.set('utm_source', settings.utm.source);
  url.searchParams.set('utm_medium', settings.utm.medium);
  url.searchParams.set('utm_campaign', settings.utm.campaign);
  return url.toString();
}

/**
 * 合并规则:先 pinned(按顺序;接口列表里没有就用补查结果,都没有跳过),
 * 再接口列表;blocked 优先级最高;按 gameKey 去重;截断到 limit。
 */
export function mergePromoGames(
  cache: Pick<PlatformGamesCache, 'games' | 'lookups'>,
  settings: ResolvedPlatformGamesSettings,
): PromoGame[] {
  const blocked = new Set(settings.blocked);
  const byKey = new Map<string, CatalogGame>();
  for (const g of cache.games) {
    if (!byKey.has(g.gameKey)) byKey.set(g.gameKey, g);
    if (!byKey.has(g.slug)) byKey.set(g.slug, g);
  }

  const out: PromoGame[] = [];
  const seen = new Set<string>();
  const push = (g: CatalogGame | null | undefined): void => {
    if (!g || out.length >= settings.limit) return;
    if (blocked.has(g.gameKey) || blocked.has(g.slug) || seen.has(g.gameKey)) return;
    seen.add(g.gameKey);
    out.push({
      gameKey: g.gameKey,
      title: g.title,
      oneLiner: g.oneLiner,
      coverUrl: g.coverUrl,
      authorName: g.authorName,
      authorHandle: g.authorHandle,
      plays: g.plays,
      url: buildGameUrl(g.slug, settings),
    });
  };

  for (const key of settings.pinned) push(byKey.get(key) ?? cache.lookups[key]);
  for (const g of cache.games) push(g);
  return out;
}

/** 渲染结果里影响 HTML 的部分(不含 plays,避免游玩数一涨就整站重渲染)。 */
function signature(games: PromoGame[]): string {
  return games.map((g) => [g.gameKey, g.title, g.oneLiner, g.coverUrl, g.authorName, g.url].join('\u0000')).join('\n');
}

function isCatalogGame(v: unknown): v is CatalogGame {
  if (!v || typeof v !== 'object') return false;
  const g = v as Record<string, unknown>;
  return typeof g.gameKey === 'string' && typeof g.slug === 'string' && typeof g.title === 'string';
}

function parseDiskCache(raw: string): PlatformGamesCache | null {
  const data = JSON.parse(raw) as Partial<PlatformGamesCache> | null;
  if (!data || data.version !== 1 || !Array.isArray(data.games)) return null;
  if (typeof data.fetchedAt !== 'number' || typeof data.source !== 'string') return null;
  const lookups: Record<string, CatalogGame | null> = {};
  for (const [k, v] of Object.entries(data.lookups ?? {})) {
    if (v === null || isCatalogGame(v)) lookups[k] = v;
  }
  return {
    version: 1,
    source: data.source,
    locale: String(data.locale ?? ''),
    baseUrl: String(data.baseUrl ?? ''),
    fetchedAt: data.fetchedAt,
    games: data.games.filter(isCatalogGame),
    lookups,
  };
}

class NotFoundError extends Error {}

export class PlatformGamesFeed {
  private readonly getSettings: () => PlatformGamesSettings | undefined;
  private readonly cacheFile: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly ttlMs: number;
  private readonly retryMs: number;
  private readonly timeoutMs: number;
  private readonly log: LogFn;

  private cache: PlatformGamesCache | null = null;
  private diskLoaded = false;
  private lastFailureAt = -Infinity;
  private inflight: Promise<void> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: PlatformGamesFeedOptions) {
    this.getSettings = opts.getSettings;
    this.cacheFile = opts.cacheFile;
    this.fetchImpl = opts.fetch ?? fetch;
    this.now = opts.now ?? Date.now;
    this.ttlMs = opts.ttlMs ?? 30 * 60_000;
    this.retryMs = opts.retryMs ?? 5 * 60_000;
    this.timeoutMs = opts.timeoutMs ?? 8_000;
    this.log = opts.log ?? (() => {});
  }

  /** 供 renderSite 调用。未开启 → [];缓存过期会先刷新(最多等 timeoutMs);永不抛错。 */
  async get(): Promise<PromoGame[]> {
    try {
      const settings = resolvePlatformGamesSettings(this.getSettings());
      if (!settings) return [];
      await this.loadDiskOnce();
      if (this.isStale(settings) && this.now() - this.lastFailureAt >= this.retryMs) {
        await this.refresh(settings);
      }
      return this.cache ? mergePromoGames(this.cache, settings) : [];
    } catch (error) {
      this.log('warn', 'platform_games.get.failed', { message: errorMessage(error) });
      return [];
    }
  }

  /**
   * 定时刷新。刷新后渲染结果有变化(换了游戏 / 标题 / 封面等)时调 onChange,
   * 由调用方决定是否重渲染站点。
   */
  start(opts: { onChange?: () => unknown } = {}): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick(opts.onChange);
    }, this.ttlMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(onChange?: () => unknown): Promise<void> {
    const settings = resolvePlatformGamesSettings(this.getSettings());
    if (!settings) return;
    await this.loadDiskOnce();
    const before = this.cache ? signature(mergePromoGames(this.cache, settings)) : '';
    await this.refresh(settings);
    const after = this.cache ? signature(mergePromoGames(this.cache, settings)) : '';
    if (before !== after && onChange) {
      try {
        await onChange();
      } catch (error) {
        this.log('error', 'platform_games.on_change.failed', { message: errorMessage(error) });
      }
    }
  }

  private isStale(settings: ResolvedPlatformGamesSettings): boolean {
    const c = this.cache;
    if (!c) return true;
    if (c.source !== settings.source || c.locale !== settings.locale || c.baseUrl !== settings.base_url) return true;
    if (this.now() - c.fetchedAt >= this.ttlMs) return true;
    const known = new Set(c.games.flatMap((g) => [g.gameKey, g.slug]));
    return settings.pinned.some((k) => !known.has(k) && !(k in c.lookups));
  }

  private refresh(settings: ResolvedPlatformGamesSettings): Promise<void> {
    this.inflight ??= this.doRefresh(settings).finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async doRefresh(settings: ResolvedPlatformGamesSettings): Promise<void> {
    try {
      const games = extractGames(settings.source, await this.fetchJson(this.listUrl(settings)));
      const known = new Set(games.flatMap((g) => [g.gameKey, g.slug]));
      const lookups: Record<string, CatalogGame | null> = {};
      for (const key of settings.pinned) {
        if (known.has(key) || key in lookups) continue;
        lookups[key] = await this.lookup(key, settings);
      }
      this.cache = {
        version: 1,
        source: settings.source,
        locale: settings.locale,
        baseUrl: settings.base_url,
        fetchedAt: this.now(),
        games,
        lookups,
      };
      this.log('info', 'platform_games.refreshed', { source: settings.source, count: games.length });
      await this.saveDisk();
    } catch (error) {
      this.lastFailureAt = this.now();
      this.log('warn', 'platform_games.refresh.failed', {
        source: settings.source,
        message: errorMessage(error),
        fallback: this.cache ? 'last_success' : 'empty',
      });
    }
  }

  /** 置顶项补查;404 记为 null(查不到),其他错误向上抛,整次刷新算失败。 */
  private async lookup(key: string, settings: ResolvedPlatformGamesSettings): Promise<CatalogGame | null> {
    const url = new URL(`/api/games/${encodeURIComponent(key)}`, settings.base_url);
    url.searchParams.set('locale', settings.locale);
    try {
      return normalizeGame(await this.fetchJson(url.toString()));
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  private listUrl(settings: ResolvedPlatformGamesSettings): string {
    const path = settings.source === 'feed' ? '/api/feed' : `/api/rank/${settings.source}`;
    const url = new URL(path, settings.base_url);
    url.searchParams.set('locale', settings.locale);
    if (settings.source === 'feed') url.searchParams.set('limit', String(FEED_LIMIT));
    return url.toString();
  }

  private async fetchJson(url: string): Promise<unknown> {
    const res = await this.fetchImpl(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (res.status === 404) throw new NotFoundError(`404 ${url}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.json();
  }

  private async loadDiskOnce(): Promise<void> {
    if (this.diskLoaded) return;
    this.diskLoaded = true;
    if (!this.cacheFile || this.cache) return;
    try {
      this.cache = parseDiskCache(await readFile(this.cacheFile, 'utf-8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.log('warn', 'platform_games.cache.read_failed', { message: errorMessage(error) });
      }
    }
  }

  private async saveDisk(): Promise<void> {
    if (!this.cacheFile || !this.cache) return;
    try {
      await mkdir(dirname(this.cacheFile), { recursive: true });
      const tmp = `${this.cacheFile}.tmp`;
      await writeFile(tmp, JSON.stringify(this.cache), 'utf-8');
      await rename(tmp, this.cacheFile);
    } catch (error) {
      this.log('warn', 'platform_games.cache.write_failed', { message: errorMessage(error) });
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
