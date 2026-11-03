import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { platformPromoSchema, type PlatformPromoSettings, type PromoItem } from '@opennote/core';
import { PROMO_FETCHERS } from './sources/index.js';
import type {
  PromoCandidate,
  PromoFetcherRegistry,
  PromoHttp,
  PromoSourceFetcher,
  ResolvedPromoSettings,
  ResolvedPromoSource,
} from './source.js';

/**
 * 平台内容推荐 — 按 config.platform_promo.sources 逐个 source 拉取,合并置顶/屏蔽后给静态渲染用。
 *
 * 约定:get() 永不抛错。每个 source 独立缓存与回退:拉取失败沿用该 source 上一次成功结果
 * (内存 → 磁盘),从未成功过则该 source 贡献 []。
 */

/** 单个 source 数据集的缓存。 */
export interface PromoCacheEntry {
  fetchedAt: number;
  items: PromoCandidate[];
  /** 置顶项单独补查的结果;null = 平台上查不到 */
  lookups: Record<string, PromoCandidate | null>;
}

type LogFn = (level: string, msg: string, meta?: unknown) => void;

export interface PlatformPromoFeedOptions {
  /** 每次取数时读当前配置(config.yaml 热更新后立即生效) */
  getSettings: () => PlatformPromoSettings | undefined;
  /** 磁盘缓存路径;不传则只用内存 */
  cacheFile?: string;
  fetch?: typeof fetch;
  fetchers?: PromoFetcherRegistry;
  now?: () => number;
  /** 缓存有效期,也是定时刷新间隔 */
  ttlMs?: number;
  /** 失败后多久才允许再试,避免接口挂掉时每次渲染都等超时 */
  retryMs?: number;
  timeoutMs?: number;
  log?: LogFn;
}

const USER_AGENT = 'LumioBlog/1.0 (+https://blog.lumio.games)';
const CACHE_VERSION = 2;

export function appendUtm(href: string, utm: { source: string; medium: string; campaign: string }): string {
  const url = new URL(href);
  url.searchParams.set('utm_source', utm.source);
  url.searchParams.set('utm_medium', utm.medium);
  url.searchParams.set('utm_campaign', utm.campaign);
  return url.toString();
}

/**
 * 单个 source 的合并:先 pinned(按顺序;列表里没有就用补查结果,都没有跳过),
 * 再列表;blocked 优先级最高;id 和别名都可用于 pinned / blocked;按 id 去重;截断到 source.limit。
 */
export function mergeSourceItems(
  entry: Pick<PromoCacheEntry, 'items' | 'lookups'>,
  source: ResolvedPromoSource,
  fetcher: PromoSourceFetcher,
  utm: ResolvedPromoSettings['utm'],
): PromoItem[] {
  const limit = source.limit ?? Infinity;
  const blocked = new Set(source.blocked);
  const byKey = new Map<string, PromoCandidate>();
  for (const c of entry.items) {
    for (const k of [c.id, ...c.aliases]) if (!byKey.has(k)) byKey.set(k, c);
  }

  const out: PromoItem[] = [];
  const seen = new Set<string>();
  const push = (c: PromoCandidate | null | undefined): void => {
    if (!c || out.length >= limit || seen.has(c.id)) return;
    if (blocked.has(c.id) || c.aliases.some((a) => blocked.has(a))) return;
    seen.add(c.id);
    out.push({
      kind: source.kind,
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      coverUrl: c.coverUrl,
      authorName: c.authorName,
      authorHandle: c.authorHandle,
      ...(c.metric ? { metric: c.metric } : {}),
      url: appendUtm(fetcher.href(source, c), {
        source: utm.source,
        medium: utm.medium,
        campaign: source.utm_campaign,
      }),
    });
  };

  for (const key of source.pinned) push(byKey.get(key) ?? entry.lookups[key]);
  for (const c of entry.items) push(c);
  return out;
}

/** 多个 source 按配置顺序拼接,按 kind:id 去重,截断到总 limit。 */
export function combinePromoItems(lists: PromoItem[][], limit: number): PromoItem[] {
  const out: PromoItem[] = [];
  const seen = new Set<string>();
  for (const item of lists.flat()) {
    if (out.length >= limit) break;
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** 渲染结果里影响 HTML 的部分(不含 metric,避免游玩数一涨就整站重渲染)。 */
function signature(items: PromoItem[]): string {
  return items
    .map((i) => [i.kind, i.id, i.title, i.subtitle, i.coverUrl, i.authorName, i.url].join('\u0000'))
    .join('\n');
}

function isCandidate(v: unknown): v is PromoCandidate {
  if (!v || typeof v !== 'object') return false;
  const c = v as Record<string, unknown>;
  return typeof c.id === 'string' && typeof c.ref === 'string' && typeof c.title === 'string' && Array.isArray(c.aliases);
}

function parseDiskCache(raw: string): Map<string, PromoCacheEntry> {
  const out = new Map<string, PromoCacheEntry>();
  const data = JSON.parse(raw) as { version?: unknown; entries?: Record<string, Partial<PromoCacheEntry>> } | null;
  if (!data || data.version !== CACHE_VERSION || !data.entries) return out;
  for (const [key, e] of Object.entries(data.entries)) {
    if (typeof e?.fetchedAt !== 'number' || !Array.isArray(e.items)) continue;
    const lookups: Record<string, PromoCandidate | null> = {};
    for (const [k, v] of Object.entries(e.lookups ?? {})) {
      if (v === null || isCandidate(v)) lookups[k] = v;
    }
    out.set(key, { fetchedAt: e.fetchedAt, items: e.items.filter(isCandidate), lookups });
  }
  return out;
}

export class PlatformPromoFeed {
  private readonly getSettings: () => PlatformPromoSettings | undefined;
  private readonly cacheFile: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly fetchers: PromoFetcherRegistry;
  private readonly now: () => number;
  private readonly ttlMs: number;
  private readonly retryMs: number;
  private readonly timeoutMs: number;
  private readonly log: LogFn;
  private readonly http: PromoHttp;

  private readonly cache = new Map<string, PromoCacheEntry>();
  private readonly lastFailureAt = new Map<string, number>();
  private readonly inflight = new Map<string, Promise<void>>();
  private diskLoaded = false;
  private lastConfigError: string | null = null;
  private saving: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: PlatformPromoFeedOptions) {
    this.getSettings = opts.getSettings;
    this.cacheFile = opts.cacheFile;
    this.fetchImpl = opts.fetch ?? fetch;
    this.fetchers = opts.fetchers ?? PROMO_FETCHERS;
    this.now = opts.now ?? Date.now;
    this.ttlMs = opts.ttlMs ?? 30 * 60_000;
    this.retryMs = opts.retryMs ?? 5 * 60_000;
    this.timeoutMs = opts.timeoutMs ?? 8_000;
    this.log = opts.log ?? (() => {});
    this.http = { getJson: (url, o) => this.getJson(url, o) };
  }

  /** 供 renderSite 调用。未开启 → [];缓存过期会先刷新(每个 source 最多等 timeoutMs);永不抛错。 */
  async get(): Promise<PromoItem[]> {
    try {
      const settings = this.resolveSettings();
      if (!settings) return [];
      await this.loadDiskOnce();
      await Promise.all(
        settings.sources.map((s) => {
          const key = this.keyOf(s);
          const failedAt = this.lastFailureAt.get(key) ?? -Infinity;
          return this.isStale(key, s) && this.now() - failedAt >= this.retryMs ? this.refresh(key, s) : undefined;
        }),
      );
      return this.compose(settings);
    } catch (error) {
      this.log('warn', 'platform_promo.get.failed', { message: errorMessage(error) });
      return [];
    }
  }

  /**
   * 定时刷新所有 source。刷新后渲染结果有变化(换了条目 / 标题 / 封面等)时调 onChange,
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
    try {
      const settings = this.resolveSettings();
      if (!settings) return;
      await this.loadDiskOnce();
      const before = signature(this.compose(settings));
      await Promise.all(settings.sources.map((s) => this.refresh(this.keyOf(s), s)));
      const after = signature(this.compose(settings));
      if (before !== after && onChange) await onChange();
    } catch (error) {
      this.log('error', 'platform_promo.tick.failed', { message: errorMessage(error) });
    }
  }

  /** 配置 → 生效配置;未开启或非法返回 null(非法时记一次 warn,同样的错误不重复记)。 */
  private resolveSettings(): ResolvedPromoSettings | null {
    const raw = this.getSettings();
    if (!raw) return null;
    const parsed = platformPromoSchema.safeParse(raw);
    if (!parsed.success) {
      const message = parsed.error.message;
      if (message !== this.lastConfigError) {
        this.lastConfigError = message;
        this.log('warn', 'platform_promo.config.invalid', { message });
      }
      return null;
    }
    this.lastConfigError = null;
    return parsed.data.enabled ? parsed.data : null;
  }

  private fetcherOf(source: ResolvedPromoSource): PromoSourceFetcher {
    return this.fetchers[source.kind] as PromoSourceFetcher;
  }

  private keyOf(source: ResolvedPromoSource): string {
    return `${source.kind}:${this.fetcherOf(source).cacheKey(source)}`;
  }

  private compose(settings: ResolvedPromoSettings): PromoItem[] {
    const lists = settings.sources.map((s) => {
      const entry = this.cache.get(this.keyOf(s));
      return entry ? mergeSourceItems(entry, s, this.fetcherOf(s), settings.utm) : [];
    });
    return combinePromoItems(lists, settings.limit);
  }

  private isStale(key: string, source: ResolvedPromoSource): boolean {
    const entry = this.cache.get(key);
    if (!entry || this.now() - entry.fetchedAt >= this.ttlMs) return true;
    const known = new Set(entry.items.flatMap((c) => [c.id, ...c.aliases]));
    return source.pinned.some((k) => !known.has(k) && !(k in entry.lookups));
  }

  private refresh(key: string, source: ResolvedPromoSource): Promise<void> {
    let p = this.inflight.get(key);
    if (!p) {
      p = this.doRefresh(key, source).finally(() => this.inflight.delete(key));
      this.inflight.set(key, p);
    }
    return p;
  }

  private async doRefresh(key: string, source: ResolvedPromoSource): Promise<void> {
    const fetcher = this.fetcherOf(source);
    try {
      const items = await fetcher.list(source, this.http);
      const known = new Set(items.flatMap((c) => [c.id, ...c.aliases]));
      const lookups: Record<string, PromoCandidate | null> = {};
      for (const k of source.pinned) {
        if (known.has(k) || k in lookups) continue;
        lookups[k] = await fetcher.lookup(source, k, this.http);
      }
      this.cache.set(key, { fetchedAt: this.now(), items, lookups });
      this.lastFailureAt.delete(key);
      this.log('info', 'platform_promo.refreshed', { source: key, count: items.length });
      await this.saveDisk();
    } catch (error) {
      this.lastFailureAt.set(key, this.now());
      this.log('warn', 'platform_promo.refresh.failed', {
        source: key,
        message: errorMessage(error),
        fallback: this.cache.has(key) ? 'last_success' : 'empty',
      });
    }
  }

  private async getJson(url: string, opts: { allowNotFound?: boolean } = {}): Promise<unknown> {
    const res = await this.fetchImpl(url, {
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (res.status === 404 && opts.allowNotFound) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.json();
  }

  private async loadDiskOnce(): Promise<void> {
    if (this.diskLoaded) return;
    this.diskLoaded = true;
    if (!this.cacheFile) return;
    try {
      for (const [k, e] of parseDiskCache(await readFile(this.cacheFile, 'utf-8'))) {
        if (!this.cache.has(k)) this.cache.set(k, e);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.log('warn', 'platform_promo.cache.read_failed', { message: errorMessage(error) });
      }
    }
  }

  /** 多个 source 并发刷新时串行写盘,避免互相覆盖临时文件。 */
  private saveDisk(): Promise<void> {
    const file = this.cacheFile;
    if (!file) return Promise.resolve();
    this.saving = this.saving.then(async () => {
      try {
        await mkdir(dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        const data = { version: CACHE_VERSION, entries: Object.fromEntries(this.cache) };
        await writeFile(tmp, JSON.stringify(data), 'utf-8');
        await rename(tmp, file);
      } catch (error) {
        this.log('warn', 'platform_promo.cache.write_failed', { message: errorMessage(error) });
      }
    });
    return this.saving;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
