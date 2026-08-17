import type { NoteRow, SiteConfig } from '@opennote/core';

/**
 * schema.org 实体构造器。
 *
 * 所有节点用稳定 `@id` 串联(`<site>/#person`、`<site>/posts/<slug>.html#article`),
 * 跨页面指向同一实体。被引用的节点都在本页内联完整定义,不留悬空 `@id`。
 */

const CONTEXT = 'https://schema.org';

/** 站点根 URL,去掉尾部斜杠 */
export function siteBase(config: SiteConfig): string {
  return (config.site.url ?? '').trim().replace(/\/+$/, '');
}

/** 站内路径 → 绝对 URL */
export function absoluteUrl(config: SiteConfig, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = siteBase(config);
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function personId(config: SiteConfig): string {
  return `${siteBase(config)}/#person`;
}

export function organizationId(config: SiteConfig): string {
  return `${siteBase(config)}/#organization`;
}

export function websiteId(config: SiteConfig): string {
  return `${siteBase(config)}/#website`;
}

/** 作者 Person 节点。带 @id,可被 BlogPosting.author 直接内联复用。 */
export function personNode(config: SiteConfig): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@type': 'Person',
    '@id': personId(config),
    name: config.author.name,
    url: absoluteUrl(config, '/about.html'),
  };
  const bio = config.author.bio ?? config.author.bio_md;
  if (bio) node.description = bio;
  if (config.author.avatar) node.image = absoluteUrl(config, config.author.avatar);
  const sameAs = (config.author.social ?? []).map((s) => s.url).filter(Boolean);
  if (sameAs.length) node.sameAs = sameAs;
  return node;
}

/** 站点 Organization 节点,用作 BlogPosting.publisher。 */
export function organizationNode(config: SiteConfig): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': organizationId(config),
    name: config.site.title,
    url: `${siteBase(config)}/`,
  };
  if (config.author.avatar) {
    node.logo = { '@type': 'ImageObject', url: absoluteUrl(config, config.author.avatar) };
  }
  return node;
}

/** WebSite 节点(精简版,供 isPartOf 引用) */
export function websiteRefNode(config: SiteConfig): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': websiteId(config),
    name: config.site.title,
    url: `${siteBase(config)}/`,
  };
}

/** 首页 WebSite,带站内搜索的 SearchAction */
export function websiteNode(config: SiteConfig): Record<string, unknown> {
  const base = siteBase(config);
  const node: Record<string, unknown> = {
    '@context': CONTEXT,
    '@type': 'WebSite',
    '@id': websiteId(config),
    url: `${base}/`,
    name: config.site.title,
    inLanguage: config.site.language ?? 'zh-CN',
    publisher: personNode(config),
  };
  if (config.site.description) node.description = config.site.description;
  node.potentialAction = {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${base}/search/index.html?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  };
  return node;
}

/** 首页作者 Person(顶层实体,带 @context) */
export function authorEntity(config: SiteConfig): Record<string, unknown> {
  return { '@context': CONTEXT, ...personNode(config) };
}

export interface BlogPostingInput {
  note: NoteRow;
  config: SiteConfig;
  tags: string[];
  /** 已解析好的分享图(相对路径或绝对 URL) */
  image?: string | null;
  /** ISO 8601 发布时间 */
  datePublished: string;
  /** ISO 8601 更新时间 */
  dateModified: string;
}

export function blogPostingEntity(input: BlogPostingInput): Record<string, unknown> {
  const { note, config, tags } = input;
  const pageUrl = absoluteUrl(config, `/posts/${note.slug}.html`);
  const node: Record<string, unknown> = {
    '@context': CONTEXT,
    '@type': 'BlogPosting',
    '@id': `${pageUrl}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    headline: note.title,
    url: pageUrl,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: personNode(config),
    publisher: organizationNode(config),
    inLanguage: config.site.language ?? 'zh-CN',
    isPartOf: websiteRefNode(config),
  };
  if (note.summary) node.description = note.summary;
  if (input.image) node.image = [absoluteUrl(config, input.image)];
  if (tags.length) node.keywords = tags;
  if (note.word_count > 0) node.wordCount = note.word_count;
  return node;
}

export interface CrumbItem {
  name: string;
  /** 末级(当前页)不带 path */
  path?: string;
}

/**
 * BreadcrumbList。必须与页面上可见的 `<nav class="crumb">` 层级逐级一致。
 * 末级按 Google 建议只给 name,不给 item。
 */
export function breadcrumbEntity(
  config: SiteConfig,
  pagePath: string,
  crumbs: CrumbItem[],
): Record<string, unknown> {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(config, pagePath)}#breadcrumb`,
    itemListElement: crumbs.map((crumb, index) => {
      const item: Record<string, unknown> = {
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
      };
      if (crumb.path) item.item = absoluteUrl(config, crumb.path);
      return item;
    }),
  };
}

export interface CollectionInput {
  config: SiteConfig;
  /** 页面路径,例如 /articles/index.html */
  path: string;
  name: string;
  description: string;
  items: Array<{ title: string; path: string }>;
}

/** CollectionPage + ItemList 一对,ItemList 由 CollectionPage.mainEntity 指过去 */
export function collectionEntities(input: CollectionInput): Record<string, unknown>[] {
  const { config } = input;
  const pageUrl = absoluteUrl(config, input.path);
  const listId = `${pageUrl}#list`;
  const list: Record<string, unknown> = {
    '@context': CONTEXT,
    '@type': 'ItemList',
    '@id': listId,
    name: input.name,
    numberOfItems: input.items.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: input.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.title,
      url: absoluteUrl(config, item.path),
    })),
  };
  const page: Record<string, unknown> = {
    '@context': CONTEXT,
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#collection`,
    url: pageUrl,
    name: input.name,
    description: input.description,
    inLanguage: config.site.language ?? 'zh-CN',
    isPartOf: websiteRefNode(config),
    mainEntity: { '@id': listId },
  };
  return [page, list];
}
