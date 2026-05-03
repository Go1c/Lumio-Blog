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
