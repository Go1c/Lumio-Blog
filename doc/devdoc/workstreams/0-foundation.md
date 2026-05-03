# WS-0 — Foundation

> **Owner**: Lead (主 agent 自己跑,不分发)
> **Duration**: 3-5 天
> **Depends on**: 无
> **Blocks**: 所有其他 WS

## 目标

建立所有 workstream 共享的基础设施。完成之后,其他 8 条 WS 可以同时启动而不互相阻塞。

## 范围

### 1. 设计 token 统一(三套 CSS 对齐)

把 `doc/prototype/styles-hifi.css` 的 token 体系搬到生产代码:
- `code/packages/web-public/src/render-site.ts` 里的 `CSS` 常量 → 完整迁过去
- `code/packages/web-admin/public/style.css` → 同步使用同一套 token
- 字体 `Noto Sans SC` + `JetBrains Mono` 加载(自托管或 Google Fonts)

### 2. 共享 UI 库(新加 package)

新建 `code/packages/ui/`(所有 UI 共享)。导出:

```ts
// 通用 primitives(对应 hf-* 里反复出现的)
Button  Tag  Card  Input  Toggle  Checkbox  Avatar  Kbd  Dot  Badge

// 复合组件
HfIcon (35+ 图标,从 hf-shared.jsx 搬)
Dropdown  Toast  Modal  Tooltip

// Layout
PublicLayout (header + main + footer + skip-link)
AdminShell   (sidebar + topbar + main)

// Hooks
useTheme()   // 'light' | 'dark' | 'auto'
useToast()
```

每个 primitive **必须**:
- 真按钮用 `<button>`,真链接用 `<a>`,checkbox 用 `<input type="checkbox" role="switch">` 等
- 触控目标 ≥ 36px
- 全部用 token,不写 hex
- focus-visible 由全局规则提供
- 支持 light / dark
- 暴露 `aria-label` / `aria-describedby` 等 prop

### 3. AdminShell

替换现有 `web-admin/src/app.tsx` 里的扁平 `<header>`,改为 hf-admin 设计稿那样的:
- 左侧固定 sidebar(logo + 折叠 + 菜单)
- 顶部 topbar(面包屑 + 搜索框 + 主题切换 + 用户菜单)
- main 区域占满剩余

菜单分组(从 hf-admin.jsx 搬):
```
仪表盘
内容
  ├── 笔记
  ├── 标签
  └── 媒体
互动
  ├── 评论
  └── 订阅
分析
  └── 文章数据
设置
  ├── 站点
  ├── 外观
  ├── SEO
  ├── Tokens
  ├── Webhooks
  └── 备份
```

未实现的菜单项先留 disabled stub,不要 404。

### 4. PublicLayout

`web-public/src/templates/layout.ts` 重构,加 `<HfNav>` 等价物作为 partial:
- header(logo + 主导航 + 搜索按钮 + 主题切换 + RSS)
- main + skip-link
- footer

### 5. 主题切换实现

- CSS:`html[data-theme="dark"]` 切到暗模式 token
- JS:`useTheme` hook,持久化 `localStorage.theme = 'dark' | 'light' | 'auto'`,初次访问按 `prefers-color-scheme`
- 后台 + 前台都用同一个 hook(从 `@opennote/ui` 导出)

### 6. core/types.ts 扩展

按 `contracts/data-model.md` 追加:
- `Features` `AdminSettings`
- `AnalyticsRange` `AnalyticsOverview` `TimeSeriesPoint` `ArticleAnalytics` `TrackEvent`
- `MediaItem` `MediaListPage` `MediaReference`
- `SearchType` `SearchHit` `SearchResponse`
- `GraphNode` `GraphEdge` `GraphData`
- `BackupJob` `NewsletterIssue`

## 不在范围

- 实际后端 API 实现(WS-G)
- 任何业务页面的实现(下游 WS)
- 富文本编辑器

## 验收

- [ ] `import { Button, AdminShell, useTheme } from '@opennote/ui'` 在 admin 和 public 都能用
- [ ] AdminShell 装上后,现有的 5 个 page 视觉上要明显改善但不挂(渐进迁移)
- [ ] PublicLayout 改完,现有的 home/post/tag 页面打开看上去仍正常(只是 nav 变了)
- [ ] 主题切换按钮工作,刷新后保持
- [ ] tsc 全绿,axe-core 扫无 critical
