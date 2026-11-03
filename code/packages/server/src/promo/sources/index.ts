import type { PromoFetcherRegistry } from '../source.js';
import { gameFetcher } from './game.js';

/** 新增内容源:core schema 加 kind → 这里登记 fetcher。合并逻辑与渲染契约不用动。 */
export const PROMO_FETCHERS: PromoFetcherRegistry = {
  game: gameFetcher,
};
