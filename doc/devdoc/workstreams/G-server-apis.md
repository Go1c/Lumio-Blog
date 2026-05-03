# WS-G — Server APIs(后端关键能力)

> **Owner**: BE agent(可分 4 个子 agent 并行)  **Duration**: 7-10 天
> **Depends on**: core / db 现状  **Blocks**: WS-B / WS-D / WS-E / WS-F

## 目标

建好所有前端依赖的服务端能力。**这是关键路径** — 越早稳越早不阻塞前端。

## 子任务(可拆 4 个 agent 并行)

### G1 — Settings API + DB

- `GET /api/admin/settings` — 整合 `config.yaml` + `features.yaml` 返回 `AdminSettings`
- `PATCH /api/admin/settings` — 局部更新,写回对应 yaml,emit `settings.changed` 事件,触发 sync
- 文件锁(避免与 sync 写竞态)— `proper-lockfile` 或自己实现
- 校验(zod schema 见 core/schema.ts,扩展)
- 路由文件:`server/src/routes/settings.ts`

### G2 — Search FTS5 + Graph

- DB:加 `notes_fts` 虚拟表(better-sqlite3 FTS5)
- 迁移脚本:populate 现有数据
- 路由:
  - `GET /api/search` 升级:支持 `type=` `from=` `to=` facet 查询,返回 `SearchResponse`
  - `GET /api/search/suggest` 前缀联想(用 FTS prefix tokens)
  - `GET /api/graph` 返回完整图(从现有 links 表 + tags 表组装)
- 路由文件:`server/src/routes/search.ts` + `server/src/routes/graph.ts`

### G3 — Analytics

- DB:`analytics_events` 表(slug / event / ts / meta) + `analytics_daily` 物化(每日 cron rollup)
- 路由:
  - `POST /api/track` 接收浏览端打点(可关闭 / 可桥接 Plausible)
  - `GET /api/admin/analytics/overview?range=`
  - `GET /api/admin/analytics/timeseries?range=&metric=`
  - `GET /api/admin/analytics/posts/:slug`
- 防滥用:rate limit + IP fingerprint
- 路由文件:`server/src/routes/analytics.ts`

### G4 — Media + Backup + OG + Newsletter

- Media:R2/S3 适配器(单文件 `media-store.ts`,实现 put/get/delete/list)
  - `GET/POST/DELETE /api/admin/media*`
  - 引用数:解析 body_md / body_html 找 `media://...` 或 `/static/...`
  - 路由:`server/src/routes/media.ts`
- Backup:用 `archiver` 打 zip;sqlite 用 `.backup`
  - 后台 job 队列(简单内存即可,持久化到 backup_jobs 表)
  - 路由:`server/src/routes/backup.ts`
- OG:用 `satori` + `resvg-js` 服务端渲染 PNG
  - 4 个 React-style 模板(.tsx)
  - `GET /og/:slug.png` 缓存到磁盘(/data/og/)
  - 路由:`server/src/routes/og.ts`
- Newsletter:Buttondown bridge
  - `POST /api/newsletter/subscribe` 投递到 Buttondown API
  - `GET /api/newsletter/recent` 拉 Buttondown 最近 issues
  - 路由:`server/src/routes/newsletter.ts`

## 协调

`server/src/routes.ts` 是 monolith。每个 G 子 agent 都把自己的路由放新文件 `routes/<name>.ts`,导出 `register(app, deps)`。**主 agent**(我)负责修改 `routes.ts` 调用各 register。子 agent 不要互相改 routes.ts。

DB 迁移:每个子 agent 加自己的 migration 文件 `migrations/004_<name>.sql` 等。**migration 序号由主 agent 协调分配**:
- G1: `004_settings_audit.sql`
- G2: `005_search_fts.sql`
- G3: `006_analytics.sql`
- G4: `007_media_backup.sql`

## 数据契约

完全按 `contracts/api.md` + `contracts/data-model.md`,不偏离。变更必须先改契约。

## 验收

- [ ] 所有 endpoint 在 contracts/api.md 列出的都实现
- [ ] Postman / Bruno 集合一遍过
- [ ] 单测:每个路由 happy path + 1 个 error case
- [ ] tsc 全绿
- [ ] migrations 在空库 + 有数据库上都能跑
- [ ] 文档:`server/README.md` 更新

## 文件清单

```
code/packages/server/src/routes/settings.ts        (G1)
code/packages/server/src/routes/search.ts          (G2)
code/packages/server/src/routes/graph.ts           (G2)
code/packages/server/src/routes/analytics.ts       (G3)
code/packages/server/src/routes/media.ts           (G4)
code/packages/server/src/routes/backup.ts          (G4)
code/packages/server/src/routes/og.ts              (G4)
code/packages/server/src/routes/newsletter.ts      (G4)
code/packages/server/src/media-store.ts            (G4)
code/packages/server/src/og-templates/*.tsx        (G4)
code/packages/db/src/migrations/004-007*.sql       (各)
code/packages/core/src/types.ts                     (扩,所有 G 共同补)
```

主 agent 负责改:
```
code/packages/server/src/routes.ts                  (注册各 register)
code/packages/server/src/main.ts                    (启动 cron / job runner)
```
