# Roadmap

按"独立可并行 workstream"组织,共 8 条。下面这张图是核心:

```
                 ┌─────────────────────────────┐
                 │   WS-0  Foundation          │   (P0,先行 3-5 天)
                 │   设计 token / 共享组件 /   │
                 │   admin shell / 主题 / 字体 │
                 └─────────────┬───────────────┘
                               │  WS-0 stable 后,下面 4 条立刻并行启动
       ┌───────────────────────┼─────────────────┬────────────────────┐
       ▼                       ▼                 ▼                    ▼
┌─────────────┐       ┌─────────────┐   ┌─────────────┐       ┌──────────────┐
│ WS-A        │       │ WS-D        │   │ WS-G        │       │ WS-H (可选)  │
│ Public      │       │ Admin shell │   │ Server APIs │       │ Docs pages   │
│ home/article│       │ dashboard / │   │ analytics / │       │ CLI / config │
│ tag/404/    │       │ note detail │   │ media /     │       │ docs page    │
│ about       │       │ analytics   │   │ search      │       └──────────────┘
└──────┬──────┘       └──────┬──────┘   └──────┬──────┘
       │                     │                 │
       │     等 WS-G 输出契约后,下面 3 条并行启动
       │                     │                 │
       ▼                     ▼                 ▼
┌─────────────┐       ┌─────────────┐   ┌──────────────┐
│ WS-B        │       │ WS-E        │   │ WS-F         │
│ Public:     │       │ Admin:      │   │ Admin:       │
│ search /    │       │ settings /  │   │ media /      │
│ graph /     │       │ tokens /    │   │ OG gen /     │
│ comments /  │       │ webhooks /  │   │ backup       │
│ newsletter  │       │ audit       │   │              │
└─────────────┘       └─────────────┘   └──────────────┘
       │
       ▼
┌─────────────┐
│ WS-C        │
│ Public RSS, │
│ mobile,     │
│ newsletter  │
└─────────────┘
```

## Workstream 一览

| ID | Name | Owner | Duration | Depends on | Touches |
|----|------|-------|----------|------------|---------|
| **WS-0** | Foundation: tokens / 共享组件 / admin shell / 主题 | Lead | 3-5 天 | — | new shared package, web-public/templates/layout, web-admin/src/components |
| **WS-A** | Public 内容页面 | FE-A | 5-7 天 | WS-0 | web-public/templates |
| **WS-B** | Public 交互(搜索/图谱/评论/订阅) | FE-B | 7-10 天 | WS-0, WS-G(部分) | web-public, server, third-party |
| **WS-C** | Public RSS / mobile / OG 公用 | FE-C | 4-6 天 | WS-0 | web-public/templates |
| **WS-D** | Admin shell + 仪表盘 + 笔记详情 + analytics | ADM-A | 7-10 天 | WS-0, WS-G(analytics) | web-admin |
| **WS-E** | Admin 设置 + tokens + webhooks + audit | ADM-B | 5-7 天 | WS-0, WS-G(settings) | web-admin, server |
| **WS-F** | Admin 媒体库 + OG 生成器 + 备份导出 | ADM-C | 7-10 天 | WS-0, WS-G(media/og/backup) | web-admin, server |
| **WS-G** | Server APIs:analytics / search / media / settings / og / backup | BE | 7-10 天 | core/db | server, db, sync |
| **WS-H** | (可选) CLI / Config 文档站 | Lead/FE-A | 2-3 天 | WS-0 | web-public 或独立 docs 站 |

## 阶段化(milestone)

### M1 — Foundation 完成(week 1)

- WS-0 全部交付:tokens 三套对齐 / `<AdminShell>` / `<PublicLayout>` / 主题切换 / mobile 响应基线 / 字体加载

完成定义:WS-A、WS-D、WS-G 的 PR 模板里能直接 `import { AdminShell } from '@opennote/ui'`。

### M2 — Public 内容侧上线(week 2-3)

- WS-A:首页 / 文章 / 标签 / 404 / about 全部按 hf-* 视觉还原
- WS-G:server 提供 search / graph data / analytics ingest / settings 读端的 API

完成定义:线上博客打开,看上去 ≥ 95% 还原 hf-home / hf-article / hf-tag / hf-about

### M3 — Admin 主体上线(week 3-4)

- WS-D:admin shell + dashboard + 笔记详情 + analytics
- WS-E:settings + tokens + webhooks + audit log

完成定义:登录后台,KPI 实时,改 visibility / 可见性 / 短链 / settings 都能动,所有 hf-admin / hf-extras2 settings 还原

### M4 — Public 交互 + Admin 增强(week 4-5)

- WS-B:search results / graph / 文章侧边评论 / newsletter
- WS-F:media library / OG generator / backup
- WS-C:RSS reader page / mobile views / OG 调用

完成定义:所有 hf-* 页面在线上能看到对应实现

### M5 — 收尾(week 5+)

- WS-H 文档站
- 全站无障碍 reaudit
- Lighthouse / axe / VoiceOver 巡检
- 性能优化(图片、prefetch、SSR)

## 并行粒度

- **绝对独立**(同时启动也不冲突):WS-A ↔ WS-G,WS-D ↔ WS-G,WS-A ↔ WS-D
- **共享后端**(共享 server,但路由分前缀):WS-B / WS-E / WS-F 都依赖 server,但每条只动 `/api/admin/{自己前缀}` 或 `/api/{自己前缀}`
- **顺序敏感**(必须等):
  - WS-B 需要 WS-G 的 search/graph API stable
  - WS-D dashboard 需要 WS-G 的 analytics API stable
  - WS-F 需要 WS-G 的 media/og/backup API stable

## 验收 / 完成定义

每个 workstream 必须满足:

1. **视觉还原** — 与对应 hf-*.jsx 设计稿对比,布局 / 间距 / 颜色误差 ≤ 5%(过审看截图对比)
2. **无障碍** — 通过 ACCESSIBILITY-AUDIT.md 已立的标准,新增页面 axe-core 扫无 critical / serious 问题
3. **API 契约** — `contracts/api.md` 描述的接口 100% 实现,Postman / Bruno 集合全过
4. **测试** — 关键路径单测覆盖,集成测试至少跑通"happy path"
5. **文档** — 每个新组件 / API 改动同步更新 ROADMAP / contracts
6. **Lighthouse** — Performance / Accessibility / Best Practices / SEO 都 ≥ 90(public 页面)

## 不在范围

- 多人协作 / 多用户编辑(`ARCHITECTURE.md` 提到的 Postgres + Redis 多副本)→ 留 v2
- 移动端 native app
- 第三方 OAuth(目前只有 password / token 登录)
- 富文本所见即所得编辑器(本项目坚持 Obsidian 写作)
