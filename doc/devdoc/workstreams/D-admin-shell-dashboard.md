# WS-D — Admin 仪表盘 + 笔记详情 + Analytics

> **Owner**: ADM-A agent  **Duration**: 7-10 天  **Depends on**: WS-0, WS-G(analytics)  **Touches**: `code/packages/web-admin/src/`

## 目标

把 hf-admin / hf-extras2 §9 设计稿 1:1 还原到 `web-admin`。这是后台最核心的三个页面。

## 范围

| 页面 | 设计稿 | 实现位置 |
|---|---|---|
| 仪表盘 | `hf-admin.jsx HFDashboard` | `web-admin/src/pages/dashboard.tsx`(新) |
| 笔记详情(替换现有) | `hf-admin.jsx HFNoteDetail` | `web-admin/src/pages/note-detail.tsx`(重写) |
| 笔记列表(增强) | hf-admin 风格 + 现有 | `web-admin/src/pages/note-list.tsx`(重写) |
| 单篇 Analytics | `hf-extras2.jsx §9 HFArticleAnalytics` | `web-admin/src/pages/note-analytics.tsx`(新) |

## Dashboard 关键点

按设计稿 hf-admin §HFDashboard:
- 4 个 KPI 卡(笔记数 / 今日同步 / 浏览 / 评论)
- 7/30/90 天趋势图(Recharts;range 切换 button group)
- Top 5 文章(带 PV bar)
- 实时活动流(订阅 SSE `/api/admin/changes`,显示最近 20 条)
- 同步状态卡(显示最近一次同步 + 手动 sync 按钮)
- 警告区(待发布 draft、scheduled 接近、broken link 数)

数据源:
- `GET /api/admin/analytics/overview?range=7d` (WS-G)
- `GET /api/admin/analytics/timeseries?range=30d&metric=views`
- `GET /api/admin/notes` 取 draft/scheduled 计数(已有)
- SSE `/api/admin/changes` 已有

## Note detail 关键点

- 沿用 visibility radio + searchable toggle
- 加:
  - 短链卡(显示 / 旋转按钮)
  - 定时发布选择器(`<input type="datetime-local">`)
  - 反向链接列表(用 `backlinks`,已有)
  - 出链列表(扩展 db query — WS-D 提 PR 加,如果是 sync 内部数据则联系 WS-G 暴露)
  - 元数据全览卡(slug / source_path / created_at / word_count)
  - 操作按钮:在 Obsidian 打开 / 重新渲染 / 复制 markdown / 在前台预览
- 文章正文区 → iframe 预览或卡片显示

## Note analytics 关键点

按设计稿 §9:
- 顶部:slug + visibility chip + 时间范围切换
- 4 个 KPI:PV / UV / 平均停留 / 跳出率
- 流量来源饼图(referrer_breakdown)
- 阅读完成度热力(completion_heatmap,十段)
- 短链 vs 直链对比柱状
- 时间序列(同 dashboard,但只看本篇)

数据:`GET /api/admin/analytics/posts/:slug`(WS-G)

## Note list 增强

- 替换扁平 `<table>` 为带筛选的 list(按设计稿 hf-admin 顶部样式)
- 顶部 toolbar:搜索框 / 状态过滤 / 标签过滤 / 排序
- 表格:加封面缩略图、字数、阅读时长、最近阅读
- 行 hover 出操作按钮(快捷可见性切换、打开)

## 数据需求

需要 WS-G 实现:
- `GET /api/admin/analytics/overview`
- `GET /api/admin/analytics/timeseries`
- `GET /api/admin/analytics/posts/:slug`
- `GET /api/admin/health/draft-count`(可选,从现有 `/api/health` 扩展)

## 验收

- [ ] Dashboard 视觉与 hf-admin §HFDashboard 误差 ≤ 5%,实时 SSE 工作
- [ ] Note detail 视觉与 hf-admin §HFNoteDetail 误差 ≤ 5%,所有 patch 操作工作
- [ ] Note analytics 视觉与 hf-extras2 §9 误差 ≤ 5%
- [ ] 移动端响应式(WS-C 出 mobile primitives 后)
- [ ] axe-core 全过

## 文件清单

```
code/packages/web-admin/src/pages/dashboard.tsx        (新)
code/packages/web-admin/src/pages/note-detail.tsx      (重写)
code/packages/web-admin/src/pages/note-list.tsx        (重写)
code/packages/web-admin/src/pages/note-analytics.tsx   (新)
code/packages/web-admin/src/app.tsx                    (改:加 dashboard / analytics 路由)
```

## 不要碰

- `pages/login.tsx` / `tokens.tsx` / `webhooks.tsx`(WS-E)
- 新加 settings / media / og(其他 WS)
- server 路由(只能消费 WS-G 提供的)
