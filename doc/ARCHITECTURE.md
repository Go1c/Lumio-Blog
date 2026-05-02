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
│  │ git diff │  │ validate   │  │ KaTeX/Code │  │ JSON Feed / OG  │   │
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
   ┌─────────────┼──────────────────┬─────────────────┐
   ▼             ▼                  ▼                 ▼
┌────────┐  ┌──────────┐      ┌──────────┐      ┌─────────────┐
│ 前台   │  │ 后台 SPA │      │ MCP      │      │ Webhook     │
│ 静态站 │  │ /admin   │      │ server   │      │ outbound    │
│ + RSS  │  │          │      │ (agent)  │      │             │
└────────┘  └──────────┘      └──────────┘      └─────────────┘
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
8. **发 webhook** —— `post.published` / `post.updated` 等事件

## 前台

**纯静态**。每次同步都重新构建，输出到 `public/`。

- 路由：`/`, `/posts/:slug`, `/notes/:slug`, `/tags/:tag`, `/n/:short_id`（短链 302）
- 主题切换：CSS variables + `prefers-color-scheme` + `localStorage`
- 搜索：客户端用 `pagefind` 或调用 `/api/search`（如果开了）
- 评论：Giscus（GitHub Discussions）或自托管
- Newsletter：第三方（Buttondown / Listmonk）

## 后台

**SPA**（React），与前台分离。

- 走 `/admin/*`，需登录（cookie + CSRF）
- 实时反映 vault 内容（轮询 `/api/changes` 或 SSE）
- 写操作：直接 patch 文件 frontmatter，重新触发同步
- 不直接编辑 Markdown 正文（用 Obsidian 编辑），只编辑 meta

## API 表面

```
GET  /api/posts                  # 列表，可加 ?tag=&visibility=
GET  /api/posts/:slug            # 单篇
PATCH /api/posts/:slug/meta      # 改 frontmatter
GET  /api/search?q=&type=        # 全文搜索
POST /api/short-links            # 手动创建短链
GET  /n/:short_id                # 302 到正经 URL

# Agent 友好
POST /mcp                        # MCP 协议
GET  /api/changes  (SSE)         # 实时推送变更
```

## 构建产物

```
public/
├── index.html              # 首页
├── posts/2025/...html      # 文章
├── tags/.../index.html     # 标签页
├── n/g7k2x.html            # 短链跳转页（meta refresh，便于爬虫）
├── feed.xml / atom.xml / feed.json
├── sitemap.xml
├── og/<slug>.png           # 预生成的 OG 图
└── static/...              # 用户上传 + 主题资源
```

## 部署形态

三种推荐姿势：

1. **极简**：Cloudflare Pages / Vercel + 一台跑 `fast-note-sync` 的小盒子（家用 NAS / VPS）
2. **自托管**：单机 Docker compose，nginx + node + sqlite
3. **多人协作**：Postgres 替换 SQLite，Redis 缓存，多副本 fast-note-sync
