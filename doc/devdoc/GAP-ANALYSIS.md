# Gap Analysis — 设计稿 ↔ 现状代码

每行 = 一个设计稿功能。三列含义:**前端 UI 是否实现**、**后端 API 是否实现**、**归属 workstream**。

✅ 完整 / 🟡 部分 / ❌ 完全没做 / N/A 不需要

> **最后更新**:2026-06-07。已按 `doc/design_handoff_lumio_blog`、当前代码实现、以及“暂不需要额外自动化接口 / 不新增需求”的收口口径重新评估。

## 本次收口口径

- 已移除暂不需要的额外自动化接口能力；当前验收不包含该方向。
- 博客内容仍以 Obsidian vault / frontmatter / `source_path` 为源头。后台不伪造一套新的专栏或标签写入模型；专栏由一级目录派生，标签由 frontmatter 同步聚合。
- 前台生产态优先使用真实内容、真实统计与站点配置:专栏页来自 vault 一级目录,About 统计来自 public notes / folders / tags,作者卡使用 `author.avatar/social/email`,文章阅读量来自 `analytics_events`。搜索结果不再用相关性分数伪造阅读量,未配置广告时不展示 demo sponsor。
- 设计稿里的后台视图需要具备完整运营视图、路由、筛选、状态、抽屉与操作入口；涉及“后台直接改 frontmatter 标签/目录归属”的能力不作为本次新需求。
- 设计稿未单独列出的已实现后台能力也需要可达:主菜单已覆盖订阅管理、全站 Analytics、媒体库、OG 生成器、API Tokens、Webhooks、审计日志、备份导出与配置文档。
- 设计稿未单独列出的已生成前台工具页也需要可达和可索引:`/graph/index.html`、`/newsletter/index.html`、`/folders/index.html`、`/feed/` 已进入公共页脚;`/search/index.html`、知识图谱、Newsletter、文件夹索引/归档已进入 sitemap。公开 CLI 文档不属于当前收口范围,不再生成或索引;后台配置文档也不再使用旧 Blog CLI 产品文案。
- 设计稿文章/标签/专栏示例仅保留为“完全无内容时”的空态 fallback,不覆盖有真实 vault 内容的生产路径。

## 阅读体验(前台)

| 设计稿位置 | 功能 | 前端 | 后端 | WS |
|---|---|---|---|---|
| hf-home | 三栏首页(目录 / feed / 侧栏) | ✅ | ✅ (列表 API) | A |
| hf-home | hero 区(动画 blob、CTA) | ✅ | N/A | A |
| hf-home | 标签云(右栏) | ✅ | ✅ | A |
| hf-home | 最近笔记侧栏 | ✅ | ✅ | A |
| hf-home | 自家广告卡(HfAd) | ✅ | N/A(配置驱动) | A |
| hf-article | 文章正文 | ✅ | ✅ | A |
| hf-article | 阅读进度条 | ✅ | N/A | A |
| hf-article | 系列 + outline 左栏 | ✅ | ✅ (backlinks 有) | A |
| hf-article | 浮动操作栏(收藏/复制/分享) | ✅ | N/A | A |
| hf-article | 末尾订阅 CTA | ✅ | N/A | A |
| hf-article | 划词高亮 + 侧栏评论(飞书风) | ✅ | ✅ (本地评论 API + 待审) | B |
| hf-article | 反向链接图 | ✅ | ✅ (backlinks API) | A/B |
| hf-extras §3 | 搜索结果页(全文 + 类型筛选) | ✅ | ✅ (FTS5 + facets) | B |
| hf-extras §4 | 标签详情页(按年分组、相关标签) | ✅ | ✅ | A |
| hf-extras §5 | 404 + 私有拦截诊断 | ✅ | ✅ | A |
| hf-extras §12 | 知识图谱全屏可视化 | ✅ | ✅ (`/api/graph`) | B |
| hf-extras2 §7 | RSS 美化阅读页 | ✅ | ✅ (feed.xml + XSL) | C |
| hf-extras2 §15 | About 页 | ✅ (真实站点统计 + 作者配置) | N/A | A |
| (代码已有) | 文件夹索引 / 文件夹归档页 | ✅ | ✅ (vault 一级目录聚合) | A |
| hf-extras §1 | 评论区(设计稿风格,实现为 Lumio 本地评论审核) | ✅ | ✅ (`/api/posts/:slug/comments`) | B |
| hf-extras §2 | Newsletter 订阅页 | ✅ | ✅ (Buttondown bridge) | B/C |
| hf-mobile | 移动端首页 / 文章(media query) | ✅ | N/A | C |
| hf-mobile | 移动端浮动操作 pill | ✅ | N/A | C |

## 写作 / 同步(已实现)

| 设计稿位置 | 功能 | 前端 | 后端 | WS |
|---|---|---|---|---|
| FEATURES | Obsidian → fast-note-sync 同步 | N/A | ✅ | — |
| FEATURES | frontmatter 解析 + 校验 | N/A | ✅ | — |
| FEATURES | 双向链接 / wikilink | N/A | ✅ | — |
| FEATURES | Markdown / Mermaid / KaTeX | N/A | ✅ | — |
| FEATURES | 短链生成 + /n/:id 跳转 | N/A | ✅ | — |
| FEATURES | 4 档可见性 | N/A | ✅ | — |
| FEATURES | 草稿 / 定时发布 | ✅ (UI 有) | ✅ (scheduled_at 已支持 PATCH) | D/E |

## 后台

| 设计稿位置 | 功能 | 前端 | 后端 | WS |
|---|---|---|---|---|
| hf-admin Dashboard | KPI 卡(总笔记 / 同步 / 浏览) | ✅ | ✅ | D |
| hf-admin Dashboard | 7/30/90 天趋势图 | ✅ (AreaChart) | ✅ (analytics API) | D |
| hf-admin Dashboard | 广告位管理摘要 + `#/ads` 入口 | ✅ | ✅ (`settings.home.ads`) | D/E |
| hf-admin Dashboard | Top 5 文章 | ✅ | ✅ | D |
| hf-admin Dashboard | 最近活动流(审计日志) | ✅ | ✅ (`/api/admin/audit`) | D/E |
| hf-admin Dashboard | 同步状态卡 + 最近同步诊断 | ✅ | ✅ (`/api/admin/sync`, `/api/admin/sync/diagnostics`) | D |
| hf-admin NoteDetail | 元数据 patch UI(visibility/searchable) | ✅ | ✅ | D |
| hf-admin NoteDetail | 短链管理(显示 / 旋转 / 复制) | ✅ | ✅ | D |
| hf-admin NoteDetail | 定时发布选择器 | ✅ | ✅ (scheduled_at 已修复) | D |
| hf-admin NoteDetail | 反向链接 / 出链查看 | ✅ | ✅ (backlinks + outlinks) | D |
| hf-admin NoteDetail | 投递专栏 / 标签编辑 | 🟡 | N/A | 当前实现展示由 `source_path` 派生的专栏,并展示 / 跳转由 frontmatter 同步来的标签；标签/目录归属仍以 Obsidian frontmatter 与 vault 目录为源头,不在后台伪写 |
| Admin `#/vault` | 目录 / 平铺视图、folder hash、可见性 chips、排序、搜索 | ✅ | ✅ (`/api/admin/notes/tree`) | D |
| Admin `#/columns` | 专栏卡片、可见性、分类、指标、设置抽屉、已收录笔记 | ✅ | N/A(从 notes 派生) | D |
| Admin `#/tags` | 标签云、可搜索表格、占比条、趋势、操作入口说明 | ✅ | ✅(只读聚合) | D |
| Admin `#/comments` | 待审 / 已通过 / 垃圾 / 全部、审核动作、删除 | ✅ | ✅ | E/B |
| Admin `#/ads` | 首页/文章/专栏广告位分组、开关、编辑抽屉、前台渲染 | ✅ | ✅(settings.home.ads) | E |
| hf-extras2 §9 | 单篇 Analytics(PV/UV/热力) | ✅ | ✅ | D |
| hf-extras §8 | 媒体库(网格 + 引用计数 + 上传) | ✅ | ✅ | F |
| hf-extras §10 | API Tokens | ✅ | ✅ | E |
| hf-admin/extras | Webhooks + 投递历史 + 重发 | ✅ | ✅ | E |
| hf-extras2 §11 | 备份 / 导出 | ✅ | ✅ | F |
| hf-extras2 §13 | 设置(站点/作者/外观/SEO/Home/Features/FNS) | ✅ | ✅ | E |
| hf-og | OG 图生成器 + 4 模板 + 预览 | ✅ | ✅ | F |
| (server 已有) | Audit log 浏览页 | ✅ | ✅ (`/api/admin/audit`) | E |
| (新增) | 订阅者管理页 | ✅ | ✅ | E/B |
| (新增) | 全站 Analytics 概览页 | ✅ | ✅ | D |
| (新增) | 配置文档内嵌页(Config Docs) | ✅ | N/A | H |

> 备份页不再暴露未接后端的清空 / 重置 / 删除整站按钮；破坏性运维操作不作为本轮新增需求。

## 本地工具 / 集成

| 设计稿位置 | 功能 | 前端 | 后端 | WS |
|---|---|---|---|---|
| hf-config | Config docs 在后台直接展示 | ✅ | N/A | H |
| FEATURES | Webhook outbound | N/A | ✅ (含重试退避) | E |

## 设计 / 主题 / 共享

| 设计稿位置 | 功能 | 前端 | 后端 | WS |
|---|---|---|---|---|
| styles-hifi.css | 设计 token 系统(已 a11y 修复) | ✅ | N/A | 0 |
| HfNav | 站点头部 + 主题切换 | ✅ | N/A | 0 |
| HfIcon | 图标系统(35+ icon) | ✅ (admin 内集成) | N/A | 0 |
| 暗色模式 | data-theme + prefers-color-scheme | ✅ | N/A | 0 |
| 字体 | Noto Sans SC + JetBrains Mono | ✅ (Google Fonts via public-layout.ts) | N/A | 0 |

## 总览

- **验收状态**:✅ 当前收口范围达标。剩余“部分实现”项是源头策略边界,不是本轮待补功能。
- **设计稿覆盖功能数**:约 **55 项**
- **完整实现**:约 52 项
- **部分实现**:1 项(笔记详情的“投递专栏 / 标签编辑”按当前源头策略展示/跳转,不做后台伪写)
- **完全没做**:0 项(当前收口范围内)
- **完成度**:约 **96%**(前端) / **95%**(后端 API)

## 非阻断后续巡检

| 优先级 | 功能 | 说明 |
|---|---|---|
| 低 | 后台直接改标签 / 专栏归属 | 这会变成“后台写 Obsidian frontmatter / 移动 vault 文件”的新需求,本次不做 |
| 中 | 全站无障碍 reaudit | 重新跑 axe/Lighthouse 并更新审计文档 |
| 中 | 性能巡检 | 图片懒加载、prefetch、OG 缓存策略复核 |
