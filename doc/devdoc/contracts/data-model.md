# Data Model 共享契约

来源:`code/packages/core/src/types.ts`(产品已有的) + 本文档新增的(供 WS-G 实现)。

## 已有(core/types.ts)

```ts
type Visibility = 'public' | 'unlisted' | 'link-only' | 'private';

type NoteRow = {
  // 主键 / 路径
  id: number;
  slug: string;
  source_path: string;
  short_id: string | null;

  // 元数据
  title: string;
  summary: string | null;
  cover: string | null;
  visibility: Visibility;
  searchable: 0 | 1;
  draft: 0 | 1;
  scheduled_at: string | null;

  // 计算
  word_count: number;
  reading_minutes: number;

  // 时间
  created_at: string;
  updated_at: string;
  published_at: string | null;

  // 渲染产物
  body_md: string;
  body_html: string;
};

type Tag = { slug: string; tag: string };
type Link = { src_slug: string; dst_slug: string; kind: 'wikilink' | 'mdlink' | 'embed' };
type ShortLink = { short_id: string; slug: string; created_at: string; tombstone_at: string | null };
type SyncEvent = { kind: string; slug?: string; payload?: unknown; ts: string };

type SiteConfig = {
  site: { title: string; description?: string; url: string; locale?: string; timezone?: string; language?: string };
  author: { name: string; email?: string; avatar?: string; bio_md?: string; social?: { kind: string; handle: string }[] };
  theme?: { default?: 'light' | 'dark' | 'auto'; accent?: string; font_serif?: string; font_mono?: string };
  seo?: { default_og_template?: string; twitter_card?: string; robots?: string; sitemap?: boolean };
  home?: { hero_title_md?: string; hero_intro_md?: string; hero_cta_primary?: string; hero_cta_secondary?: string; show_recent_posts?: number; show_categories?: boolean };
};
```

> 改这些 = breaking。改之前发 RFC。

## 新增(WS-G 实现 + 各 WS 消费)

### Analytics

```ts
type AnalyticsRange = '7d' | '30d' | '90d' | 'all';

type AnalyticsOverview = {
  range: AnalyticsRange;
  total_views: number;
  unique_visitors: number;
  avg_dwell_seconds: number;
  bounce_rate: number;       // 0..1
  top_posts: Array<{ slug: string; title: string; views: number }>;
};

type TimeSeriesPoint = { date: string /* ISO date */; value: number };

type ArticleAnalytics = {
  slug: string;
  views: number;
  unique_visitors: number;
  avg_dwell_seconds: number;
  // 滚动深度热力,长度为 N(默认 10),0..1
  completion_heatmap: number[];
  referrer_breakdown: Array<{ source: string; views: number }>;
  short_vs_canonical: { short_id_views: number; canonical_views: number };
};

type TrackEvent = {
  slug: string;
  event: 'view' | 'dwell' | 'scroll' | 'click';
  // 可选:UA、referrer、视口、停留秒、滚动比例
  meta?: Record<string, string | number>;
};
```

### Media

```ts
type MediaItem = {
  id: string;             // R2/S3 key 或 hash
  filename: string;
  mime: string;
  bytes: number;
  url: string;            // 可访问的 URL
  uploaded_at: string;    // ISO
  reference_count: number;
};

type MediaListPage = {
  items: MediaItem[];
  next_cursor: string | null;
};

type MediaReference = { slug: string; title: string };
```

### Settings(整合 config.yaml + features.yaml)

```ts
type Features = {
  content: { comments: boolean; newsletter: boolean; rss: boolean; graph: boolean; search: boolean; short_links: boolean };
  admin: { analytics: boolean; media_library: boolean; api_tokens: boolean; webhooks: boolean; og_generator: boolean };
  agent: { cli_enabled: boolean; mcp_enabled: boolean; mcp_tools: string[] };
  webhooks: Array<{ event: string; url: string }>;
};

type AdminSettings = {
  site: SiteConfig['site'];
  author: SiteConfig['author'];
  theme: SiteConfig['theme'];
  seo: SiteConfig['seo'];
  home: SiteConfig['home'];
  features: Features;
};
```

### Search

```ts
type SearchType = 'post' | 'note' | 'tag' | 'media';

type SearchHit = {
  type: SearchType;
  slug: string;
  title: string;
  // 高亮片段(HTML,前后端约定:仅 <mark> 标签)
  snippets: string[];
  score: number;
  // 仅 post/note 有
  visibility?: Visibility;
  tags?: string[];
  updated_at?: string;
};

type SearchResponse = {
  query: string;
  total: number;
  hits: SearchHit[];
  facets: { type: Record<SearchType, number>; tags: Record<string, number> };
};
```

### Graph

```ts
type GraphNode = {
  id: string;            // slug
  title: string;
  tags: string[];
  degree: number;
  // 主标签用于上色
  cluster: string | null;
};

type GraphEdge = { src: string; dst: string; kind: 'wikilink' | 'mdlink' | 'embed' };

type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  // 可选:聚类中心(预计算的 force layout)
  layout?: Record<string, { x: number; y: number }>;
};
```

### Newsletter

```ts
type NewsletterIssue = {
  id: string;
  subject: string;
  sent_at: string;
  url: string;       // 第三方系统的可访问 URL
  excerpt: string;
};
```

### Backup

```ts
type BackupJob = {
  id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  progress: number;       // 0..1
  bytes: number | null;
  download_url: string | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};
```

## 落实位置

新加的类型 → 写到 `code/packages/core/src/types.ts`,WS-G 实现的人负责加,其他 workstream `import { ... } from '@opennote/core'` 消费。

DB 迁移(由 WS-G 起):

| 改动 | 文件 |
|---|---|
| `analytics_events` 表 | `db/src/migrate.ts` 新加 migration |
| `analytics_daily` 物化视图 | 同上 |
| `media` 表 | 同上 |
| `media_refs` 表(笔记 ↔ 媒体引用) | 同上 |
| `backup_jobs` 表 | 同上 |
| `settings_audit` 表(可选) | 同上 |
