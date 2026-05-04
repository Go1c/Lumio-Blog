import { z } from 'zod';

export const visibilitySchema = z.enum(['public', 'unlisted', 'link-only', 'private']);

export const frontmatterSchema = z
  .object({
    title: z.string().optional(),
    slug: z.string().optional(),
    summary: z.string().optional(),
    visibility: visibilitySchema.optional(),
    searchable: z.boolean().optional(),
    short_id: z.string().length(5).optional(),
    tags: z.array(z.string()).optional(),
    cover: z.string().optional(),
    created_at: z.string().optional(),
    published_at: z.string().optional(),
    scheduled_at: z.string().optional(),
  })
  .passthrough();

export const siteConfigSchema = z.object({
  site: z.object({
    title: z.string(),
    url: z.string().url(),
    description: z.string().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
  }),
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    avatar: z.string().optional(),
    bio: z.string().optional(),
    social: z
      .array(z.object({ platform: z.string(), url: z.string().url() }))
      .optional(),
  }),
  features: z
    .object({
      comments: z.boolean().optional(),
      newsletter: z.boolean().optional(),
      search: z.boolean().optional(),
      graph: z.boolean().optional(),
    })
    .optional(),
  auth: z
    .object({
      github: z
        .object({
          client_id: z.string(),
          allowed_users: z.array(z.string()),
        })
        .optional(),
    })
    .optional(),
  paths: z.object({
    vault: z.string(),
    out: z.string(),
    db: z.string(),
  }),
});

// =====================================================================
// Settings(WS-G1):config.yaml + features.yaml -> AdminSettings
// =====================================================================

/** 单条社交链接 — config.yaml 里既见 platform/url 也见 kind/handle,二者都接受。 */
export const socialLinkSchema = z
  .object({
    platform: z.string().optional(),
    kind: z.string().optional(),
    url: z.string().url().optional(),
    handle: z.string().optional(),
  })
  .refine((s) => s.platform || s.kind, { message: 'platform or kind required' })
  .refine((s) => s.url || s.handle, { message: 'url or handle required' });

export const siteSectionSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  locale: z.string().optional(),
});

export const authorSectionSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  bio_md: z.string().optional(),
  social: z.array(socialLinkSchema).optional(),
});

export const themeSectionSchema = z.object({
  default: z.enum(['light', 'dark', 'auto']).optional(),
  accent: z.string().optional(),
  font_serif: z.string().optional(),
  font_mono: z.string().optional(),
});

export const seoSectionSchema = z.object({
  default_og_template: z.string().optional(),
  twitter_card: z.string().optional(),
  robots: z.string().optional(),
  sitemap: z.boolean().optional(),
});

/** 自家广告(HfAd) — 嵌在 home.ad 下,可选。enabled !== true 时不渲染。 */
export const hfAdSchema = z.object({
  enabled: z.boolean().default(false),
  variant: z.enum(['hero', 'native']).default('hero'),
  emoji: z.string().optional(),
  title: z.string().min(1),
  body: z.string().optional(),
  cta_label: z.string().optional(),
  cta_href: z.string().url().optional(),
  /** CSS 颜色(#hex / rgb()/var(--token)/named),默认 var(--accent) */
  accent: z.string().optional(),
});

export const homeSectionSchema = z.object({
  hero_title_md: z.string().optional(),
  hero_intro_md: z.string().optional(),
  hero_cta_primary: z.string().optional(),
  hero_cta_secondary: z.string().optional(),
  show_recent_posts: z.number().int().nonnegative().optional(),
  show_categories: z.boolean().optional(),
  ad: hfAdSchema.optional(),
});

/** features.yaml 的 schema(PATCH 时 partial,GET 时填默认值) */
export const featuresSchema = z.object({
  content: z.object({
    comments: z.boolean(),
    newsletter: z.boolean(),
    rss: z.boolean(),
    graph: z.boolean(),
    search: z.boolean(),
    short_links: z.boolean(),
  }),
  admin: z.object({
    analytics: z.boolean(),
    media_library: z.boolean(),
    api_tokens: z.boolean(),
    webhooks: z.boolean(),
    og_generator: z.boolean(),
  }),
  agent: z.object({
    cli_enabled: z.boolean(),
    mcp_enabled: z.boolean(),
    mcp_tools: z.array(z.string()),
  }),
  webhooks: z.array(z.object({ event: z.string(), url: z.string().url() })),
});

/** FNS(FastNoteSync)同步设置 — 单独存,token 是敏感字段 */
export const fnsSettingsSchema = z.object({
  enabled: z.boolean(),
  api_url: z.string().refine((s) => s === '' || /^https?:\/\//.test(s), 'must be http(s) URL or empty'),
  token: z.string(),
  vault: z.string().min(1, 'vault name required'),
  last_status: z.enum(['connected', 'disconnected', 'error', 'unknown']).optional(),
  last_status_at: z.string().optional(),
  last_error: z.string().optional(),
});

/** AdminSettings(GET 返回的形态) — 全字段 */
export const adminSettingsSchema = z.object({
  site: siteSectionSchema,
  author: authorSectionSchema,
  theme: themeSectionSchema,
  seo: seoSectionSchema,
  home: homeSectionSchema,
  features: featuresSchema,
  fns: fnsSettingsSchema.optional(),
});

/** PATCH body — 任何顶层 section 都可省略,被传入的 section 内部仍按全 schema 校验。
 *  TODO: 后续支持 deep partial(目前要求 PATCH 一个 section 时,该 section 是完整对象) */
export const adminSettingsPatchSchema = z
  .object({
    site: siteSectionSchema.partial().optional(),
    author: authorSectionSchema.partial().optional(),
    theme: themeSectionSchema.partial().optional(),
    seo: seoSectionSchema.partial().optional(),
    home: homeSectionSchema.partial().optional(),
    features: featuresSchema.partial().optional(),
    fns: fnsSettingsSchema.partial().optional(),
  })
  .strict();

/** FNS 缺省 — disabled,空字符串 */
export function defaultFns(): z.infer<typeof fnsSettingsSchema> {
  return {
    enabled: false,
    api_url: '',
    token: '',
    vault: 'notes',
    last_status: 'unknown',
  };
}

/** features.yaml 缺省 — 全 true,mcp_tools 默认列表,webhooks 空数组 */
export function defaultFeatures(): z.infer<typeof featuresSchema> {
  return {
    content: { comments: true, newsletter: true, rss: true, graph: true, search: true, short_links: true },
    admin: { analytics: true, media_library: true, api_tokens: true, webhooks: true, og_generator: true },
    agent: { cli_enabled: true, mcp_enabled: true, mcp_tools: ['blog_search', 'blog_read', 'blog_write', 'blog_patch_meta'] },
    webhooks: [],
  };
}

/**
 * 关键约束：link-only / private 笔记不能 searchable: true
 * 在 normalize 阶段强制纠正，违反时记 warning。
 */
export function enforceVisibilityRules(
  visibility: z.infer<typeof visibilitySchema>,
  searchable: boolean,
): { searchable: boolean; warning: string | null } {
  if ((visibility === 'link-only' || visibility === 'private') && searchable) {
    return {
      searchable: false,
      warning: `visibility=${visibility} 不允许 searchable=true，已强制改为 false`,
    };
  }
  return { searchable, warning: null };
}
