import type { platformPromoSchema } from '@opennote/core';

/**
 * 平台内容推荐 · source 契约。
 * 每个内容源(游戏、以后的音乐……)实现一个 PromoSourceFetcher 并登记到 sources/index.ts;
 * 缓存、失败回退、置顶/屏蔽合并、UTM 都在通用层(feed.ts),fetcher 只管「拉列表 / 补查单条 / 拼落地页」。
 */

export type ResolvedPromoSettings = ReturnType<typeof platformPromoSchema.parse>;
export type ResolvedPromoSource = ResolvedPromoSettings['sources'][number];
export type PromoSourceKind = ResolvedPromoSource['kind'];

/** fetcher 规范化后的条目(缓存里存这个;url 依赖配置,合并时才拼)。 */
export interface PromoCandidate {
  id: string;
  /** pinned / blocked 里除 id 外也认的别名(游戏 = slug) */
  aliases: string[];
  /** 交给 fetcher.href 拼落地页用(游戏 = slug) */
  ref: string;
  title: string;
  subtitle: string;
  coverUrl: string | null;
  authorName: string;
  authorHandle: string | null;
  metric: { label: string; value: number } | null;
}

export interface PromoHttp {
  /** GET JSON(带超时);非 2xx 抛错;allowNotFound 时 404 返回 null */
  getJson(url: string, opts?: { allowNotFound?: boolean }): Promise<unknown>;
}

export interface PromoSourceFetcher<S extends ResolvedPromoSource = ResolvedPromoSource> {
  kind: S['kind'];
  /** 决定数据集的配置部分(接口 / 榜单 / 语言等),变了就重新拉;不要包含 pinned / blocked / limit / link 这类合并期参数 */
  cacheKey(source: S): string;
  /** 拉列表;响应结构不对时抛错,通用层会沿用上次成功结果 */
  list(source: S, http: PromoHttp): Promise<PromoCandidate[]>;
  /** 按 pinned 里的 key 补查列表里没有的条目;查不到返回 null */
  lookup(source: S, key: string, http: PromoHttp): Promise<PromoCandidate | null>;
  /** 落地页(不含 UTM,UTM 由通用层追加) */
  href(source: S, item: PromoCandidate): string;
}

/** 每个 kind 必须有一个 fetcher — schema 里加了新 kind 而这里没登记,类型检查会报错。 */
export type PromoFetcherRegistry = {
  [K in PromoSourceKind]: PromoSourceFetcher<Extract<ResolvedPromoSource, { kind: K }>>;
};

export function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 只接受 http(s) URL,其他(javascript: 等)一律 null。 */
export function httpUrl(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function record(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}
