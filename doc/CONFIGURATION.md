# 配置参考

仓库根目录会读三个配置 + 笔记自身的 frontmatter。

```
.env             # 密钥、连接串
config.yaml      # 站点身份 / 主题 / SEO
features.yaml    # 功能开关
posts/*.md       # 笔记 frontmatter
```

---

## `.env`

```bash
# 站点
SITE_URL=https://lumio.games
DATABASE_URL=sqlite:./data/index.db

# 同步
VAULT_PATH=/vault
SYNC_MODE=watch          # watch | git | manual
GIT_WEBHOOK_SECRET=…

# Auth（后台）
AUTH_SECRET=…            # 32+ random bytes
AUTH_PROVIDERS=github    # github | google | local

# 第三方
GISCUS_REPO=lumio/blog
BUTTONDOWN_API_KEY=…
PLAUSIBLE_DOMAIN=lumio.games

# Agent
MCP_TOKEN=…              # 给 agent 用的 bearer，不要和后台 cookie 混用
```

---

## `config.yaml`

```yaml
site:
  title: "LumioGames blog"
  description: "在游戏 AI、渲染管线和引擎源码之间 <thinking/>"
  url: "https://lumio.games"
  locale: "zh-CN"
  timezone: "Asia/Shanghai"

author:
  name: "Lumio"
  email: "hi@lumio.games"
  avatar: "/static/avatar.png"
  bio_md: |
    在做一款独立游戏。喜欢渲染、游戏 AI 和不写完的代码。
  social:
    - { kind: "github",   handle: "@lumio-games" }
    - { kind: "twitter",  handle: "@lumio_games" }
    - { kind: "mastodon", handle: "@lumio@hachyderm.io" }

theme:
  default: "auto"              # light | dark | auto
  accent: "#0066ff"
  font_serif: "Source Serif 4"
  font_mono: "JetBrains Mono"

seo:
  default_og_template: "minimal"
  twitter_card: "summary_large_image"
  robots: "index,follow"
  sitemap: true

home:
  hero_title_md: |
    在 [游戏 AI](/tags/game-ai)、渲染管线
    和引擎源码之间 `<thinking/>`
  hero_intro_md: |
    我是 **{{author.name}}**。
    这里是我用 Obsidian 写、通过 `fast-note-sync` 同步上来的文章和笔记。
  hero_cta_primary: "看最新文章"
  hero_cta_secondary: "逛笔记库"
  show_recent_posts: 6
  show_categories: true
```

---

## `features.yaml`

每行一个开关，全是布尔；默认全 `true`。如果你不想要某个能力，关掉即可，相关 UI 会消失，相关 API 会 404。

```yaml
content:
  comments: true             # Giscus
  newsletter: true           # 第三方订阅
  rss: true
  graph: true                # 关系图
  search: true               # 站内搜索
  short_links: true

admin:
  analytics: true            # 单篇 Analytics 页
  media_library: true
  api_tokens: true
  webhooks: true
  og_generator: true

agent:
  cli_enabled: true          # Blog CLI
  mcp_enabled: true          # 暴露 MCP server，给 agent 调用
  mcp_tools:
    - blog_search
    - blog_read
    - blog_write             # 写权限谨慎开
    - blog_patch_meta

webhooks:
  - { event: "post.published", url: "https://hooks..." }
  - { event: "post.updated",   url: "https://discord..." }
```

---

## 笔记 frontmatter

最小：

```yaml
---
title: "用 MCTS + LLM 给 RTS 做战术决策"
---
```

完整：

```yaml
---
title: "用 MCTS + LLM 给 RTS 做战术决策"
slug: "mcts-llm-rts"            # 默认从文件路径生成
summary: "把 LLM 当 policy network 试一下..."
cover: "/static/covers/mcts.png"
tags: [游戏 AI, MCTS, 引擎]

# 可见性 — 4 档
visibility: public              # public | unlisted | link-only | private
searchable: true                # 默认跟随 visibility，可单独覆盖

# 短链 — public/unlisted 自动分配，可手动覆盖
short_id: g7k2x

# 状态
draft: false
scheduled_at: null              # ISO 8601；设了即定时发布

# 时间（同步时自动写入，可手动覆盖）
created_at: 2025-04-28T10:23:00+08:00
updated_at: 2025-04-30T14:11:00+08:00

# 可选 — 文章设定
toc: true                       # false 关闭目录
comments: true                  # 单篇关闭评论
og_template: "newspaper"        # 覆盖默认 OG 模板
---
```

### 字段语义

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `title` | string | 必填 | |
| `slug` | string | 文件路径 | URL 段 |
| `summary` | string \| null | null | 列表页摘要；不填则取正文前 N 字 |
| `cover` | string \| null | null | 封面图 URL（绝对或相对） |
| `tags` | string[] | `[]` | |
| `visibility` | enum | `public` | 见下表 |
| `searchable` | bool | 跟随 visibility | 是否进搜索索引 |
| `short_id` | string \| null | 自动 | 5 位 base32 |
| `draft` | bool | `false` | true 时仅后台可见 |
| `scheduled_at` | ISODate \| null | null | 到点自动 unfurl draft |
| `toc` / `comments` / `og_template` | 单篇覆盖 | 跟随全局 | |

### `visibility` 含义

| 值 | 含义 |
|---|---|
| `public` | 出现在首页、列表、RSS、搜索（如果 `searchable`）。任何人能看。 |
| `unlisted` | 不出现在列表，但有直链就能看。RSS 不收录。 |
| `link-only` | 只能通过短链访问。直链 URL 故意 404。 |
| `private` | 只有后台能看。前台 404 + 拦截诊断。 |

### `searchable` 默认表

| visibility | searchable 默认 |
|---|---|
| `public` | `true` |
| `unlisted` | `true` |
| `link-only` | `false` |
| `private` | `false` |

> _设为 `link-only` + `searchable: true` 是非法组合，会被同步管线拒绝（搜出来等于公开）。_

---

## 优先级

读取顺序，下面的覆盖上面的：

1. 内置默认
2. `config.yaml` / `features.yaml`
3. `.env`
4. 笔记 frontmatter（仅作用于该笔记）

---

## 配置即文档

设计稿里 `config.png` 那张就是把这份文档当 UI 直接展示——开源用户进后台不用切到 README，按 tab 看 4 种配置就够了。
