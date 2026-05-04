# API 契约总表

> 这是跨 workstream 共享的接口表。**改之前先发 RFC**(在 issue 里 @ 所有 owner)。
>
> ✅ = 已实现并在生产路由中注册。

## 基础 / 公开端点

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| GET | `/api/health` | — | 健康检查 + 笔记计数(按 visibility) | ✅ |
| GET | `/api/posts` | — | 公开文章列表(limit / offset) | ✅ |
| GET | `/api/posts/:slug` | — | 单篇详情(过滤 private) | ✅ |
| GET | `/api/search?q=&type=&from=&to=` | — | FTS5 全文搜索 + 类型 facet + 时间过滤 + 高亮 | ✅ |
| GET | `/api/search/suggest?q=&limit=` | — | 自动联想(前缀) | ✅ |
| GET | `/api/graph` | — | 知识图谱节点 + 边 | ✅ |
| GET | `/n/:short_id` | — | 短链 302 | ✅ |
| POST | `/api/track` | — | 浏览端打点(PV / dwell / scroll) | ✅ |
| POST | `/api/newsletter/subscribe` | — | 邮件订阅(转发至 Buttondown) | ✅ |
| GET | `/api/newsletter/recent` | — | 最近发布的几期(Buttondown) | ✅ |

## 认证

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| POST | `/api/auth/login` | — | 密码登录,写 session cookie | ✅ |
| POST | `/api/auth/logout` | session | 登出,撤销 session | ✅ |
| GET | `/api/auth/me` | — | 当前登录态 | ✅ |

## 后台 Admin(cookie session 或 bearer admin token)

### 笔记管理

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| GET | `/api/admin/notes` | admin | 全部笔记列表(含 visibility / word_count 等) | ✅ |
| GET | `/api/admin/notes/:slug` | admin | 单笔记 + backlinks + outlinks | ✅ |
| PATCH | `/api/admin/notes/:slug/meta` | admin | 改 visibility / searchable / **scheduled_at** | ✅ |
| POST | `/api/admin/notes/:slug/short-link` | admin | 旋转短链(旧链墓碑化) | ✅ |
| POST | `/api/admin/sync` | admin | 手动触发同步 | ✅ |
| GET | `/api/admin/changes` | admin | SSE 实时变更流(ping keepalive 30s) | ✅ |

### 设置

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| GET | `/api/admin/settings` | admin | 整合 config.yaml + features.yaml + fns-config.yaml | ✅ |
| PATCH | `/api/admin/settings` | admin | 局部更新,写回 yaml,emit `settings.changed`,触发 sync | ✅ |

### Analytics

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| GET | `/api/admin/analytics/overview?range=7d\|30d\|90d\|all` | admin | KPI:total_views / unique_visitors / avg_dwell / bounce_rate / top_posts[5] | ✅ |
| GET | `/api/admin/analytics/timeseries?range=&metric=views` | admin | `{ date, value }[]` 时间序列 | ✅ |
| GET | `/api/admin/analytics/posts/:slug` | admin | 单篇:PV / UV / completion_heatmap / referrer_breakdown / short_vs_canonical | ✅ |

### 媒体库

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| GET | `/api/admin/media?cursor=` | admin | 分页媒体列表 + 引用数 | ✅ |
| POST | `/api/admin/media` | admin | 上传(multipart),返回 URL + id | ✅ |
| DELETE | `/api/admin/media/:id` | admin | 删除(有引用时拒绝,除非传 `force=true`) | ✅ |
| GET | `/api/admin/media/:id/refs` | admin | 列出哪些笔记引用了该媒体 | ✅ |

### OG 生成器

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| GET | `/og/:slug.png?template=minimal\|newspaper\|terminal\|magazine` | — | 服务端渲染 PNG,磁盘缓存 | ✅ |
| GET | `/api/admin/og/preview?slug=&template=&...` | admin | 实时预览(带 override 参数) | ✅ |
| POST | `/api/admin/og/batch` | admin | 批量为所有公开笔记生成 OG 图,返回进度 | ✅ |

### 备份 / 导出

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| POST | `/api/admin/backup` | admin | 启动备份任务,返回 `job_id` | ✅ |
| GET | `/api/admin/backup/:job_id/status` | admin | 任务进度(0..1) + 状态 | ✅ |
| GET | `/api/admin/backup/:job_id/download` | admin | 下载 zip 产物 | ✅ |

### API Tokens

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| GET | `/api/admin/tokens` | admin | 列出所有 token | ✅ |
| POST | `/api/admin/tokens` | admin | 创建 token(name / scope / ttl_days) | ✅ |
| DELETE | `/api/admin/tokens/:id` | admin | 撤销 token | ✅ |

### Webhooks

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| GET | `/api/admin/webhooks` | admin | 列出所有 webhook | ✅ |
| POST | `/api/admin/webhooks` | admin | 新建 webhook(url / events / secret) | ✅ |
| DELETE | `/api/admin/webhooks/:id` | admin | 删除 webhook | ✅ |
| GET | `/api/admin/webhooks/:id/deliveries?limit=` | admin | 最近投递历史(成功 + 失败) | ✅ |
| POST | `/api/admin/webhooks/:id/redeliver/:event_id` | admin | 手动重发某次投递 | ✅ |

### Audit log

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| GET | `/api/admin/audit?limit=&actor=&action_prefix=` | admin | 审计日志(含 diff) | ✅ |

## Agent 写 API(bearer write scope)

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| PATCH | `/api/notes/:slug/meta` | bearer:write | 同 admin patchMeta,供 CLI / MCP 调用 | ✅ |

## MCP server(可选)

| Method | Path | Auth | 说明 | 状态 |
|---|---|---|---|---|
| POST | `/mcp` | bearer:MCP_TOKEN | MCP 协议入口 | ❌ 未实现 |

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

## 版本

- 同一 endpoint 的语义变更:增加 `X-API-Version: 2`(老的保留 6 个月)
- 字段添加:不算 breaking,直接加
- 字段删除 / 重命名 / 行为变化:必须 RFC + 通告
