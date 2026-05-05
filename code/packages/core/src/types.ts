/**
 * 核心领域类型。所有 package 共享这一份定义。
 * 与 DevDoc/01-data-model.md 严格对应。
 */

export type Visibility = 'public' | 'unlisted' | 'link-only' | 'private';

/** 一篇笔记在 SQLite 里的形态 */
export interface NoteRow {
  slug: string;            // 唯一主键，一般从标题自动生成
  title: string;
  summary: string | null;
  body_html: string;       // 已渲染好的 HTML
  body_text: string;       // 纯文本，用于全文搜索
  visibility: Visibility;
  searchable: 0 | 1;       // bool（SQLite 不区分）— 站内搜索可见
  /** 是否允许搜索引擎抓取(sitemap / 不带 noindex meta) */
  seo_indexable: 0 | 1;
  /** 是否进 RSS feed */
  rss_includable: 0 | 1;
  /** 是否上首页推荐位 */
  featured_on_home: 0 | 1;
  short_id: string | null; // 5 字符短链
  source_path: string;     // 相对 vault 根的路径，例如 "posts/mcts.md"
  created_at: string;      // ISO 8601
  updated_at: string;
  published_at: string | null;
  scheduled_at: string | null;
  word_count: number;
  reading_minutes: number;
  cover: string | null;    // 媒体路径
  hash: string;            // 源文件内容 sha256，用于增量
}

/** frontmatter（原 .md 顶部的 YAML） */
export interface Frontmatter {
  title?: string;
  slug?: string;
  summary?: string;
  visibility?: Visibility;
  searchable?: boolean;
  seo_indexable?: boolean;
  rss_includable?: boolean;
  featured_on_home?: boolean;
  short_id?: string;
  tags?: string[];
  cover?: string;
  created_at?: string;
  published_at?: string;
  scheduled_at?: string;
  /** 原 yaml 文档里出现的、我们没显式认识的字段，原样保留 */
  [key: string]: unknown;
}

/** 解析后的笔记（normalize 之前 / 之后都用这个） */
export interface ParsedNote {
  source_path: string;
  frontmatter: Frontmatter;
  body: string;            // 去掉 frontmatter 的 markdown
  hash: string;
}

export interface NormalizedNote extends ParsedNote {
  slug: string;
  title: string;
  visibility: Visibility;
  searchable: boolean;
  seo_indexable: boolean;
  rss_includable: boolean;
  featured_on_home: boolean;
  short_id: string | null;
  tags: string[];
  word_count: number;
  reading_minutes: number;
}

/** 同步管线产出的事件，给 webhook / SSE 用 */
export type SyncEvent =
  | { kind: 'note.published'; slug: string; visibility: Visibility }
  | { kind: 'note.updated'; slug: string }
  | { kind: 'note.unpublished'; slug: string; reason: string }
  | { kind: 'sync.started' }
  | { kind: 'sync.completed'; stats: SyncStats }
  | { kind: 'sync.failed'; err: string }
  | { kind: 'settings.changed'; sections: SettingsSection[] }
  | { kind: 'media.uploaded'; id: string; filename: string; mime: string; bytes: number }
  | { kind: 'media.deleted'; id: string }
  | { kind: 'backup.started'; job_id: string }
  | { kind: 'backup.done'; job_id: string; bytes: number }
  | { kind: 'backup.failed'; job_id: string; error: string };

/** AdminSettings 顶层 section 名,用于 settings.changed 事件 + 审计 diff 划分 */
export type SettingsSection =
  | 'site'
  | 'author'
  | 'theme'
  | 'seo'
  | 'home'
  | 'features'
  | 'fns';

/**
 * FastNoteSync(Obsidian → 中央 FNS Service)同步设置。
 * 之前从 env 读,改放后台管理。token 是敏感字段 → 单独存 fns-config.yaml,
 * 不进 git、不进 config.yaml。
 */
export interface FnsSettings {
  /** 启用 FNS 同步;关掉就跳过 supervisor */
  enabled: boolean;
  /** FastNoteSync Service URL,如 https://fastnode.zeabur.app */
  api_url: string;
  /** JWT bearer,从 FNS 后台拿 */
  token: string;
  /** vault 名称,与 Obsidian 插件设的一致 */
  vault: string;
  /** 上次连接结果(server 写,前端只读) */
  last_status?: 'connected' | 'disconnected' | 'error' | 'unknown';
  /** 上次状态时间戳 */
  last_status_at?: string;
  /** 最近一次错误信息(只在 last_status='error' 时有) */
  last_error?: string;
}

export interface SyncStats {
  added: number;
  modified: number;
  removed: number;
  failed: number;
  duration_ms: number;
}

/** 短链 */
export interface ShortLink {
  short_id: string;
  slug: string;
  created_at: string;
  tombstoned_at: string | null;
  /** 密码保护(scrypt 哈希,格式 `scrypt$<saltB64>$<keyB64>`);null = 无密码 */
  password_hash?: string | null;
  /** 累计访问次数(/n/:short_id 命中即 +1) */
  access_count?: number;
  /** 上次访问时间 ISO,null = 从未被访问 */
  last_accessed_at?: string | null;
}

/** 链接（出链）边 */
export interface LinkEdge {
  src_slug: string;
  dst_slug: string | null;     // 解析失败 = null（断链）
  raw_target: string;          // 原 [[...]] 内容
}

/** 站点配置（config.yaml） */
export interface SiteConfig {
  site: {
    title: string;
    url: string;
    description?: string;
    timezone?: string;
    language?: string;
    locale?: string;
  };
  author: {
    name: string;
    email?: string;
    avatar?: string;
    bio?: string;
    bio_md?: string;
    social?: { platform: string; url: string }[];
  };
  features?: {
    comments?: boolean;
    newsletter?: boolean;
    search?: boolean;
    graph?: boolean;
    post_summary?: boolean;
  };
  auth?: {
    github?: { client_id: string; allowed_users: string[] };
  };
  paths: {
    vault: string;             // 绝对路径或相对 cwd
    out: string;               // 静态文件输出
    db: string;                // SQLite 文件
  };
  theme?: {
    default?: 'light' | 'dark' | 'auto';
    accent?: string;
    font_serif?: string;
    font_mono?: string;
  };
  seo?: {
    default_og_template?: string;
    twitter_card?: string;
    robots?: string;
    sitemap?: boolean;
  };
  home?: {
    hero_title_md?: string;
    hero_intro_md?: string;
    hero_cta_primary?: string;
    hero_cta_secondary?: string;
    show_recent_posts?: number;
    show_categories?: boolean;
    ad?: HfAdSettings;
  };
}

/** 自家广告(HfAd)配置 — 见 schema.ts hfAdSchema。 */
export interface HfAdSettings {
  enabled: boolean;
  variant: 'hero' | 'native';
  emoji?: string;
  title: string;
  body?: string;
  cta_label?: string;
  cta_href?: string;
  /** CSS 颜色,默认 var(--accent) */
  accent?: string;
}

// =====================================================================
// 以下为 WS-G(server)实现 + 各 WS 消费的契约类型,见 contracts/data-model.md
// =====================================================================

/** Analytics 时间范围 */
export type AnalyticsRange = '7d' | '30d' | '90d' | 'all';

/** 整站 analytics 概览(用于 admin 仪表盘 KPI) */
export interface AnalyticsOverview {
  range: AnalyticsRange;
  total_views: number;
  unique_visitors: number;
  avg_dwell_seconds: number;
  /** 0..1 */
  bounce_rate: number;
  top_posts: Array<{ slug: string; title: string; views: number }>;
}

/** 时序数据点(YYYY-MM-DD) */
export interface TimeSeriesPoint {
  date: string;
  value: number;
}

/** 单篇文章 analytics(详情页用) */
export interface ArticleAnalytics {
  slug: string;
  views: number;
  unique_visitors: number;
  avg_dwell_seconds: number;
  /** 滚动深度热力,长度 N(默认 10),0..1 */
  completion_heatmap: number[];
  referrer_breakdown: Array<{ source: string; views: number }>;
  short_vs_canonical: { short_id_views: number; canonical_views: number };
}

/** 客户端上报的事件(POST /api/track) */
export interface TrackEvent {
  slug: string;
  event: 'view' | 'dwell' | 'scroll' | 'click';
  meta?: Record<string, string | number>;
}

// ---- Media ----

export interface MediaItem {
  /** R2/S3 key 或 hash */
  id: string;
  filename: string;
  mime: string;
  bytes: number;
  url: string;
  uploaded_at: string;
  reference_count: number;
}

export interface MediaListPage {
  items: MediaItem[];
  next_cursor: string | null;
}

export interface MediaReference {
  slug: string;
  title: string;
}

// ---- Settings(config.yaml + features.yaml 整合) ----

export interface Features {
  content: {
    comments: boolean;
    newsletter: boolean;
    rss: boolean;
    graph: boolean;
    search: boolean;
    short_links: boolean;
    post_summary: boolean;
  };
  admin: {
    analytics: boolean;
    media_library: boolean;
    api_tokens: boolean;
    webhooks: boolean;
    og_generator: boolean;
  };
  agent: {
    cli_enabled: boolean;
    mcp_enabled: boolean;
    mcp_tools: string[];
  };
  webhooks: Array<{ event: string; url: string }>;
}

export interface AdminSettings {
  site: SiteConfig['site'];
  author: SiteConfig['author'];
  theme: SiteConfig['theme'];
  seo: SiteConfig['seo'];
  home: SiteConfig['home'];
  features: Features;
  fns?: FnsSettings;
}

// ---- Search ----

export type SearchType = 'post' | 'note' | 'tag' | 'media';

export interface SearchHit {
  type: SearchType;
  slug: string;
  title: string;
  /** 高亮片段(HTML,前后端约定:仅 <mark> 标签) */
  snippets: string[];
  score: number;
  /** 仅 post / note 有 */
  visibility?: Visibility;
  tags?: string[];
  updated_at?: string;
}

export interface SearchResponse {
  query: string;
  total: number;
  hits: SearchHit[];
  facets: {
    type: Record<SearchType, number>;
    tags: Record<string, number>;
  };
}

// ---- Graph ----

export interface GraphNode {
  /** slug */
  id: string;
  title: string;
  tags: string[];
  degree: number;
  /** 主标签,用于上色 */
  cluster: string | null;
}

export interface GraphEdge {
  src: string;
  dst: string;
  kind: 'wikilink' | 'mdlink' | 'embed';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** 可选:聚类中心(预计算的 force layout) */
  layout?: Record<string, { x: number; y: number }>;
}

// ---- Newsletter ----

export interface NewsletterIssue {
  id: string;
  subject: string;
  sent_at: string;
  /** 第三方系统的可访问 URL */
  url: string;
  excerpt: string;
}

// ---- Backup ----

export interface BackupJob {
  id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  /** 0..1 */
  progress: number;
  bytes: number | null;
  download_url: string | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}
