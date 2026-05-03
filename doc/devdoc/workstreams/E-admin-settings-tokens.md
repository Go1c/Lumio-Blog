# WS-E — Admin 设置 / Tokens / Webhooks / Audit

> **Owner**: ADM-B agent  **Duration**: 5-7 天  **Depends on**: WS-0, WS-G(settings API)
> **Touches**: `code/packages/web-admin/src/pages/`, 部分 `server/`(audit + webhook 重试)

## 范围

| 页面 | 设计稿 | 实现位置 |
|---|---|---|
| 设置(站点 / 作者 / 外观 / SEO / Home) | `hf-extras2.jsx §13 HFSettings` | `web-admin/src/pages/settings.tsx`(新) |
| Tokens(漂亮版) | `hf-extras.jsx §10 HFApiTokens` | `web-admin/src/pages/tokens.tsx`(重写) |
| Webhooks(漂亮版 + 重试 / 历史) | `hf-extras` 衍生 | `web-admin/src/pages/webhooks.tsx`(重写) |
| Audit log 浏览页 | hf-admin 衍生 | `web-admin/src/pages/audit.tsx`(新) |

## Settings 关键点

按 §13:
- 左侧子导航(站点 / 作者 / 外观 / SEO / Home / Features)
- 右侧表单(每节一个 form)
- 改完点保存 → `PATCH /api/admin/settings` (WS-G 提供)
- Theme 子节:accent 颜色选择器、暗模式默认值、字体下拉
- Features 子节:每个开关一个 toggle,关掉 + 保存 → 服务端把对应 UI 隐藏(features.yaml 写盘)
- 校验:URL 形式、邮箱形式、accent 必须是 hex
- 保存成功后 toast,失败 inline error

## Tokens 关键点

按 §10:
- 顶部:用法说明卡(read/write/admin scope 各能干什么)
- 中间:列表(name / scope / 创建时间 / 最后使用 / 过期时间)
- 行操作:撤销 / 复制 ID(注意:secret 创建后只显示一次)
- 底部:新建表单(name + scope + ttl_days)
- 创建后弹模态显示完整 token,有"我已复制"按钮才能关闭

## Webhooks 关键点

- 列表:URL / 事件 / 状态(active/failed/paused) / 最近成功
- 行展开 → 最近 20 条投递(成功 + 失败,失败的可点重试)
- 新建表单:URL / 事件多选 / secret 自动生成 + 显示一次
- 详情侧栏:HMAC 签名格式说明、cURL 调试命令
- 后端配合(本 WS 加):
  - `GET /api/admin/webhooks/:id/deliveries?limit=20`
  - `POST /api/admin/webhooks/:id/redeliver/:event_id`
  - 重试退避策略(见 `contracts/events.md`)

## Audit log 关键点

- 服务端 `GET /api/admin/audit?limit=` 已有
- 表格:时间 / actor / action / target / diff
- 顶部过滤:按 actor / 按 action prefix(`auth.*`/`note.*`)
- 点行展开看 diff(JSON pretty)

## 数据需求

需要 WS-G 实现:
- `GET /api/admin/settings`
- `PATCH /api/admin/settings`
- `POST /api/admin/settings/theme/test-accent`(可选,验证 contrast)

本 WS 自己加(因为属于 webhooks 增强):
- `GET /api/admin/webhooks/:id/deliveries`
- `POST /api/admin/webhooks/:id/redeliver/:event_id`
- 在 server `webhooks.ts` 实现重试 + 持久化

## 验收

- [ ] 设置改完保存,刷新前台看到生效(标题、accent、社交链接等)
- [ ] Token / Webhook 列表 + 新建 / 撤销 happy path
- [ ] Webhook 详情显示重试历史
- [ ] Audit log 过滤工作

## 文件清单

```
code/packages/web-admin/src/pages/settings.tsx     (新)
code/packages/web-admin/src/pages/audit.tsx        (新)
code/packages/web-admin/src/pages/tokens.tsx       (重写)
code/packages/web-admin/src/pages/webhooks.tsx     (重写)
code/packages/server/src/webhooks.ts                (扩:重试 + delivery 持久化)
code/packages/server/src/routes.ts                  (改:增 deliveries / redeliver 路由)
code/packages/db/src/migrate.ts                     (改:加 webhook_deliveries 表)
```

## 不要碰

- 仪表盘 / 笔记详情(WS-D)
- media / og / backup(WS-F)
- public 模板(其他 WS)
