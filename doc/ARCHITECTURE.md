# 架构

## 总览

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Obsidian Vault (本地)                          │
│   posts/2025/*.md   notes/*.md   drafts/*.md   media/*.{png,jpg}     │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ git push / fast-note-sync watch
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       fast-note-sync (服务端)                        │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────────┐   │
│  │ ingest   │→ │ normalize  │→ │ render     │→ │ output          │   │
│  │ FS watch │  │ frontmatter│  │ MD/Mermaid │  │ HTML / RSS /    │   │
│  │ git diff │  │ validate   │  │ KaTeX/Code │  │ OG images       │   │
│  └──────────┘  └────────────┘  └────────────┘  └─────────────────┘   │
│                       │                                              │
│                       ▼                                              │
│              ┌──────────────────┐         ┌───────────────────┐      │
│              │ SQLite index     │         │ 静态文件输出       │      │
│              │ posts, tags,     │ ←——————→│ public/...        │      │
│              │ links, search    │         │                   │      │
│              └──────────────────┘         └───────────────────┘      │
└────────────────┬─────────────────────────────────────────────────────┘
                 │
   ┌─────────────┼──────────────────┐
   ▼             ▼                  ▼
┌────────┐  ┌──────────┐      ┌─────────────┐
│ 前台   │  │ 后台 SPA │      │ Webhook     │
│ 静态站 │  │ /admin   │      │ outbound    │
│ + RSS  │  │          │      │             │
└────────┘  └──────────┘      └─────────────┘
```

## 数据模型

### Note

每篇笔记 = 一个 `.md` 文件 + frontmatter。同步时被 `fast-note-sync` 解析为：

```ts
type Note = {
  // 来自 frontmatter
  title: string;
  slug: string;            // 默认从文件路径生成
  tags: string[];
  visibility: 'public' | 'unlisted' | 'link-only' | 'private';
  searchable: boolean;
  short_id: string | null; // public/unlisted 才有
  scheduled_at: ISODate | null;
  draft: boolean;
  summary: string | null;
  cover: string | null;
  created_at: ISODate;
  updated_at: ISODate;

  // 来自文件
  source_path: string;     // posts/2025/mcts-llm-rts.md
  body_md: string;         // 原始 markdown
  body_html: string;       // 渲染后

  // 解析得到
  outgoing_links: Link[];  // [[wikilink]] / [md](link) 都规范化
  incoming_links: Link[];  // 反向计算
  word_count: number;
  reading_time_min: number;
  toc: TocEntry[];
};
```

### 可见性矩阵

| visibility | 前台首页 | 直链可访问 | 站内搜索 | 短链 | 出现在 RSS |
|---|---|---|---|---|---|
| `public`     | ✅ | ✅ | 看 `searchable` | ✅ | ✅ |
| `unlisted`   | ❌ | ✅ | 看 `searchable` | ✅ | ❌ |
| `link-only`  | ❌ | 仅短链 | ❌ | ✅ | ❌ |
| `private`    | ❌ | 后台才能看 | ❌ | ❌ | ❌ |

`searchable` 默认跟随 visibility，但可以单独覆盖。

## 同步管线

`fast-note-sync` 是同步管线的核心。它负责：

1. **监听文件系统**（或接收 git 推送 webhook）
2. **解析 frontmatter** —— 校验字段、补全默认值
3. **分配短链** —— 新的 `public` / `unlisted` 笔记会从短链池里抽一个
4. **解析双向链接** —— 处理 `[[wikilink]]` 和 `![[image]]` 嵌入
5. **渲染** —— Markdown → HTML，含 Mermaid、KaTeX、代码高亮、内嵌引用
6. **写索引** —— 更新 SQLite，含全文搜索（FTS5）
7. **触发构建** —— 增量重建受影响的静态页面 + RSS + sitemap
8. **发 webhook** —— `note.published` / `note.updated` 等事件

## 前台

**纯静态**。每次同步都重新构建，输出到 `public/`。

- 路由：`/`, `/posts/:slug`, `/notes/:slug`, `/tags/:tag`, `/n/:short_id`（短链 302）
- 主题切换：CSS variables + `prefers-color-scheme` + `localStorage`
- 搜索：客户端调用 `/api/search`（如果开了）
- 评论：Lumio 本地评论接口，公开提交默认待审，后台审核后展示
- Newsletter：Buttondown bridge；未配置 Buttondown 时公开订阅落本地 subscribers 表

## 后台

**SPA**（Preact + Vite），与前台分离。

- 走 `/admin` 静态入口，调用 `/api/admin/*`，需登录（cookie session 或 bearer admin token）
- 实时反映 vault 内容（`/api/admin/changes` SSE）
- 后台只写服务端索引里的运营元数据：可见性、可发现性、定时发布、短链、站点配置等；修改后触发同步 / 静态站重建
- 不直接编辑 Markdown 正文，也不伪写 Obsidian frontmatter 标签或移动 vault 文件；正文、标签和目录归属仍以 Obsidian vault 为源头

## API 表面

```
GET   /api/posts                         # 公开文章列表
GET   /api/posts/:slug                   # 单篇，过滤 private
GET   /api/search?q=&type=               # 全文搜索
GET   /n/:short_id                       # 短链 302

GET   /api/admin/notes                   # 后台笔记列表
GET   /api/admin/notes/tree              # vault 目录树
GET   /api/admin/notes/:slug             # 单篇 + backlinks/outlinks/tags
PATCH /api/admin/notes/:slug/meta        # 改运营元数据，不改 Markdown/frontmatter 文件
POST  /api/admin/notes/:slug/short-link  # 创建 / 旋转短链
POST  /api/admin/sync                    # 手动触发同步
GET   /api/admin/changes  (SSE)          # 后台实时推送变更
```

## 构建产物

```
public/
├── index.html              # 首页
├── posts/<slug>.html       # 文章
├── articles/index.html     # 文章列表
├── columns/index.html      # 专栏列表
├── tags/index.html         # 标签索引
├── tags/<tag>.html         # 标签页
├── folders/index.html      # vault 顶层目录索引
├── folders/<folder>.html   # 目录归档页
├── feed.xml / feed/index.html
├── sitemap.xml
├── og/<slug>.png           # 预生成的 OG 图
└── static/...              # 用户上传 + 主题资源
```

## 部署形态

三种推荐姿势：

1. **极简**：Cloudflare Pages / Vercel + 一台跑 `fast-note-sync` 的小盒子（家用 NAS / VPS）
2. **自托管**：单机 Docker compose，nginx + node + sqlite
3. **多人协作**：Postgres 替换 SQLite，Redis 缓存，多副本 fast-note-sync
