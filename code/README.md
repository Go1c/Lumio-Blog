# OpenNote v0.6

Self-hosted, Obsidian-vault-driven 博客 / 笔记平台。

## 它是什么

把 Obsidian vault 当 source of truth：你在 Obsidian 里写 markdown，用 frontmatter 控制可见性，OpenNote 自动同步成静态前台 + 提供后台 + 暴露 API 让 LLM agent 也能操作。

## 一分钟跑起来

```bash
cd code
pnpm install
pnpm --filter @opennote/web-admin build      # → web-admin/dist
pnpm --filter @opennote/cli start init ../sample-vault
cd ../sample-vault

OPENNOTE_PASSWORD=secret \
OPENNOTE_CONFIG=./config.yaml \
pnpm -C ../code --filter @opennote/server dev
```

打开：

- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin/  （密码 `secret`）

## 包结构

```
code/packages/
├── core/        类型 + zod schema + 纯函数（slugify / wikilink / shortid / hash）
├── db/          better-sqlite3 + migrations + NoteRepo + ShortLinkRepo + FTS5
├── sync/        parse(gray-matter) → normalize → render(marked + Shiki + KaTeX + Mermaid)
│                → pipeline → chokidar watcher
├── server/      Hono：公开 API + 短链 + cookie 登录 + bearer token + SSE + webhooks + scheduler + audit
├── web-public/  静态生成：home + post + tag + feed + sitemap + 404
├── web-admin/   Preact + Vite SPA：login / 列表 / 详情 / tokens / webhooks
└── cli/         opennote init / sync / serve
```

## 路径规则

`config.yaml` 里的 `paths.{vault,out,db}` 可以是相对路径——以 **config.yaml 所在目录** 为基准解析。绝对路径原样使用。

## 环境变量

| 名字 | 必需 | 说明 |
|---|---|---|
| `OPENNOTE_CONFIG` | yes | config.yaml 路径，默认 `./config.yaml` |
| `OPENNOTE_PASSWORD` | yes（serve） | 站长登录密码 |
| `OPENNOTE_ADMIN_DIST` | no | web-admin 构建产物目录；不设会自动找 monorepo 内的 `web-admin/dist` |
| `PORT` | no | server 端口，默认 3000 |

## API 概览

公开（无需 auth）:
- `GET  /api/health`
- `GET  /api/posts?limit=&offset=`
- `GET  /api/posts/:slug`
- `GET  /api/search?q=`
- `GET  /n/:short_id` → 302

写（cookie session 或 `Authorization: Bearer <token>` write scope）:
- `PATCH /api/notes/:slug/meta`  body `{ visibility?, searchable? }`

后台（cookie session 或 admin scope token）:
- `GET    /api/admin/notes`
- `GET    /api/admin/notes/:slug`
- `PATCH  /api/admin/notes/:slug/meta`
- `POST   /api/admin/notes/:slug/short-link`
- `POST   /api/admin/sync`
- `GET    /api/admin/tokens`、`POST`、`DELETE /:id`
- `GET    /api/admin/webhooks`、`POST`、`DELETE /:id`
- `GET    /api/admin/audit`
- `GET    /api/admin/changes`（SSE）

## v0.5 已实现

- ✅ 4 档可见性 + searchable，link-only/private 自动强制 searchable=false
- ✅ 5 字符短链：unlisted/link-only 自动分配，撤销走墓碑
- ✅ vault 监听 / 全量构建（增量 v1.0 再做）
- ✅ frontmatter → SQLite（notes/tags/links/short_links/api_tokens/webhooks/sessions/audit/FTS5）
- ✅ Markdown 渲染：GFM + wikilink + Shiki 双主题 + KaTeX SSR + Mermaid 客户端
- ✅ 静态前台：首页 + 文章 + 标签 + RSS + sitemap + robots + 404
- ✅ 后台 SPA：登录 / 列表 / 详情 / tokens / webhooks
- ✅ Auth：站长 cookie session + agent bearer token（read/write/admin 三档）
- ✅ Webhooks：HMAC 签名，事件订阅，投递记录
- ✅ SSE `/api/admin/changes`：实时事件流 + 心跳
- ✅ Scheduler：每分钟扫一次 scheduled_at 到期转 public
- ✅ Audit log：所有写操作记账
- ✅ CLI：opennote init / sync / serve

## v0.6 新增

- ✅ 增量同步：单文件 add/change/unlink → 单笔记处理，hash diff 跳过 no-op
- ✅ Watcher 改事件驱动 + 串行队列 + 同路径合并
- ✅ 重命名/改 slug 检测：source_path 与 slug 错位时清理旧行
- ✅ 断链回填：新笔记出现时自动重渲染之前指它的未解析 wikilink
- ✅ syncAll 仍保留作启动兜底 / 手动触发

## v1.0 路线图

参 [../DevDoc/10-roadmap.md](../DevDoc/10-roadmap.md):

- 增量同步（按 mtime + hash diff，不全量重扫）
- 测试覆盖：服务端集成测试、e2e
- 迁移工具（Hugo / Jekyll / Bear → vault）
- Lighthouse 前台性能优化
- 服务端 FTS / i18n / PWA

## 开发命令

```bash
pnpm typecheck   # tsc 全包
pnpm test        # vitest
pnpm build       # 打包所有 package
```

## 文档

- 需求：[../DevDoc/](../DevDoc/)
- 设计稿：[../doc/img/](../doc/img/)
- 高保真 mock：[../doc/prototype/index.html](../doc/prototype/index.html)
- Zeabur 部署：[ZEABUR.md](./ZEABUR.md)
