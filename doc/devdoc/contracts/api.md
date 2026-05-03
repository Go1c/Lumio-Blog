# API 契约总表

> 这是跨 workstream 共享的接口表。**改之前先发 RFC**(在 issue 里 @ 所有 owner)。

## 现状已有(server/src/routes.ts)

| Method | Path | Auth | 说明 | Owner |
|---|---|---|---|---|
| GET | `/api/health` | — | 健康检查 + 计数 | server |
| GET | `/api/posts` | — | 公开文章列表 | server |
| GET | `/api/posts/:slug` | — | 单篇详情(过滤 private) | server |
| GET | `/api/search?q=` | — | 简易搜索(仅 LIKE) | server / WS-G 升级 |
| GET | `/n/:short_id` | — | 短链 302 | server |
| POST | `/api/auth/login` | — | 登录 | server |
| POST | `/api/auth/logout` | session | 登出 | server |
| GET | `/api/auth/me` | — | 登录态 | server |
| GET | `/api/admin/notes` | admin | 全部笔记列表 | server |
| GET | `/api/admin/notes/:slug` | admin | 单笔记 + backlinks | server |
| PATCH | `/api/admin/notes/:slug/meta` | admin | 改 visibility / searchable | server |
| POST | `/api/admin/notes/:slug/short-link` | admin | 旋转短链 | server |
| POST | `/api/admin/sync` | admin | 触发同步 | server |
| GET | `/api/admin/tokens` | admin | 列出 token | server |
| POST | `/api/admin/tokens` | admin | 建 token | server |
| DELETE | `/api/admin/tokens/:id` | admin | 撤销 token | server |
| GET | `/api/admin/webhooks` | admin | 列出 webhook | server |
| POST | `/api/admin/webhooks` | admin | 建 webhook | server |
| DELETE | `/api/admin/webhooks/:id` | admin | 删 webhook | server |
| GET | `/api/admin/audit?limit=` | admin | 审计日志 | server |
| GET | `/api/admin/changes` | admin | SSE 变更流 | server |
| PATCH | `/api/notes/:slug/meta` | bearer:write | Agent 友好的 patchMeta | server |

## 待新增(WS-G 实现)

### Settings(WS-E 消费)

| Method | Path | Auth | 说明 |
|---|---|---|---|
| GET | `/api/admin/settings` | admin | 返回 `{ site, author, theme, seo, home, features }`(整合 config.yaml + features.yaml) |
| PATCH | `/api/admin/settings` | admin | 局部更新,写回对应 yaml 文件,触发 sync |

### Analytics(WS-D 消费)

| Method | Path | Auth | 说明 |
|---|---|---|---|
| GET | `/api/admin/analytics/overview?range=7d\|30d\|90d` | admin | KPI:total_views, unique_visitors, avg_dwell, bounce_rate, top_posts[5] |
| GET | `/api/admin/analytics/timeseries?range=&metric=views` | admin | 数组 `{ date, value }[]` |
| GET | `/api/admin/analytics/posts/:slug` | admin | 单篇:PV / UV / completion_heatmap[N] / referrer_breakdown[] / short_vs_canonical |
| POST | `/api/track` | — | 浏览端打点(若选自托管模式) |

### Media(WS-F 消费)

| Method | Path | Auth | 说明 |
|---|---|---|---|
| GET | `/api/admin/media?cursor=` | admin | 分页媒体列表 + 引用数 |
| POST | `/api/admin/media` | admin | 上传(multipart),返回 R2/S3 URL + ref_id |
| DELETE | `/api/admin/media/:id` | admin | 删除(带 force flag,有引用时拒绝) |
| GET | `/api/admin/media/:id/refs` | admin | 列出哪些笔记引用了它 |

### Search(WS-B 消费)

| Method | Path | Auth | 说明 |
|---|---|---|---|
| GET | `/api/search?q=&type=post\|note\|tag&from=&to=` | — | 升级:FTS5 + 类型 facet + 时间过滤 + 高亮 |
| GET | `/api/search/suggest?q=` | — | 自动联想(前缀 + 拼音) |

### Graph(WS-B 消费)

| Method | Path | Auth | 说明 |
|---|---|---|---|
| GET | `/api/graph` | — | 完整图:`{ nodes:[{id,title,tags,degree}], edges:[{src,dst}] }` |

### OG Generator(WS-F 消费)

| Method | Path | Auth | 说明 |
|---|---|---|---|
| GET | `/og/:slug.png?template=minimal\|newspaper\|terminal\|magazine` | — | 服务端 renderer(satori 或 puppeteer)输出 PNG |
| GET | `/api/admin/og/preview?slug=&template=` | admin | 预览,返回 PNG bytes |

### Backup / Export(WS-F 消费)

| Method | Path | Auth | 说明 |
|---|---|---|---|
| POST | `/api/admin/backup` | admin | 启动备份任务(zip vault + db dump),返回 job_id |
| GET | `/api/admin/backup/:job_id/status` | admin | 进度 |
| GET | `/api/admin/backup/:job_id/download` | admin | 下载产物 |

### Newsletter(WS-B/C 消费)

| Method | Path | Auth | 说明 |
|---|---|---|---|
| POST | `/api/newsletter/subscribe` | — | 投递到 Buttondown / Listmonk |
| GET | `/api/newsletter/recent` | — | 最近发出的几期(用于 newsletter 页) |

### MCP server(WS-G optional / Agent 工具)

| Method | Path | Auth | 说明 |
|---|---|---|---|
| POST | `/mcp` | bearer:MCP_TOKEN | MCP 协议入口 |

## 错误格式约定

```json
{ "error": { "code": "string", "field": "string?", "message": "string?" } }
```

错误 code 词表(必须从中选):

```
unauthorized | forbidden | not_found | validation_failed |
conflict | rate_limited | upstream_error | internal_error
```

## 鉴权约定

- **admin scope**:cookie session 或 bearer admin token
- **write scope**:bearer write/admin token(Agent 用)
- **read scope**:bearer read/write/admin
- **public**:无 auth

passkey/OAuth 暂不支持,见 `doc/CONFIGURATION.md` `AUTH_PROVIDERS=local` 默认值。

## 版本

- 同一 endpoint 的语义变更:增加 `X-API-Version: 2`(老的保留 6 个月)
- 字段添加:不算 breaking,直接加
- 字段删除 / 重命名 / 行为变化:必须 RFC + 通告
