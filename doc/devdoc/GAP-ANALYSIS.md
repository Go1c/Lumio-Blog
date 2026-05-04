# Gap Analysis — 设计稿 ↔ 现状代码

每行 = 一个设计稿功能。三列含义:**前端 UI 是否实现**、**后端 API 是否实现**、**归属 workstream**。

✅ 完整 / 🟡 部分 / ❌ 完全没做 / N/A 不需要

> **最后更新**:已对照 PR #5 合并后的实际代码重新评估。

## 阅读体验(前台)

| 设计稿位置 | 功能 | 前端 | 后端 | WS |
|---|---|---|---|---|
| hf-home | 三栏首页(目录 / feed / 侧栏) | ✅ | ✅ (列表 API) | A |
| hf-home | hero 区(动画 blob、CTA) | ✅ | N/A | A |
| hf-home | 标签云(右栏) | ✅ | ✅ | A |
| hf-home | 最近笔记侧栏 | ✅ | ✅ | A |
| hf-home | 自家广告卡(HfAd) | ❌ | N/A(配置驱动) | A |
| hf-article | 文章正文 | ✅ | ✅ | A |
| hf-article | 阅读进度条 | ✅ | N/A | A |
| hf-article | 系列 + outline 左栏 | ✅ | ✅ (backlinks 有) | A |
| hf-article | 浮动操作栏(收藏/复制/分享) | ✅ | N/A | A |
| hf-article | 末尾订阅 CTA | ✅ | N/A | A |
| hf-article | 划词高亮 + 侧栏评论(飞书风) | ✅ | ✅ (Giscus) | B |
| hf-article | 反向链接图 | ❌ | ✅ (backlinks API) | A/B |
| hf-extras §3 | 搜索结果页(全文 + 类型筛选) | ✅ | ✅ (FTS5 + facets) | B |
| hf-extras §4 | 标签详情页(按年分组、相关标签) | ✅ | ✅ | A |
| hf-extras §5 | 404 + 私有拦截诊断 | ✅ | ✅ | A |
| hf-extras §12 | 知识图谱全屏可视化 | ✅ | ✅ (`/api/graph`) | B |
| hf-extras2 §7 | RSS 美化阅读页 | ✅ | ✅ (feed.xml + XSL) | C |
| hf-extras2 §15 | About 页 | ✅ | N/A | A |
| hf-extras §1 | 评论区(Giscus 风) | ✅ | ✅ (Giscus 客户端集成) | B |
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
| hf-admin Dashboard | Top 5 文章 | ✅ | ✅ | D |
| hf-admin Dashboard | 实时活动流(SSE) | ✅ | ✅ (`/api/admin/changes`) | D |
| hf-admin Dashboard | 同步状态卡 + 手动同步 | ✅ | ✅ (`/api/admin/sync`) | D |
| hf-admin NoteDetail | 元数据 patch UI(visibility/searchable) | ✅ | ✅ | D |
| hf-admin NoteDetail | 短链管理(显示 / 旋转 / 复制) | ✅ | ✅ | D |
| hf-admin NoteDetail | 定时发布选择器 | ✅ | ✅ (scheduled_at 已修复) | D |
| hf-admin NoteDetail | 反向链接 / 出链查看 | ✅ | ✅ (backlinks + outlinks) | D |
| hf-extras2 §9 | 单篇 Analytics(PV/UV/热力) | ✅ | ✅ | D |
| hf-extras §8 | 媒体库(网格 + 引用计数 + 上传) | ✅ | ✅ | F |
| hf-extras §10 | API Tokens | ✅ | ✅ | E |
| hf-admin/extras | Webhooks + 投递历史 + 重发 | ✅ | ✅ | E |
| hf-extras2 §11 | 备份 / 导出 / 危险区 | ✅ | ✅ | F |
| hf-extras2 §13 | 设置(站点/作者/外观/SEO/Home/Features/FNS) | ✅ | ✅ | E |
| hf-og | OG 图生成器 + 4 模板 + 预览 | ✅ | ✅ | F |
| (server 已有) | Audit log 浏览页 | ✅ | ✅ (`/api/admin/audit`) | E |
| (新增) | 标签管理页 | ✅ | ✅ | D |
| (新增) | 评论管理页 | ✅ | ✅ | E/B |
| (新增) | 订阅者管理页 | ✅ | ✅ | E/B |
| (新增) | 全站 Analytics 概览页 | ✅ | ✅ | D |
| (新增) | 配置文档内嵌页(Config Docs) | ✅ | N/A | H |

## Agent / 自动化

| 设计稿位置 | 功能 | 前端 | 后端 | WS |
|---|---|---|---|---|
| hf-cli | Blog CLI 文档展示 | ✅ | N/A | H |
| hf-config | Config docs 在后台直接展示 | ✅ | N/A | H |
| FEATURES | MCP server | N/A | ❌ (`/mcp` 端点未实现) | G |
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

- **设计稿覆盖功能数**:约 **50 项**
- **完整实现**:约 43 项
- **部分实现**:2 项
- **完全没做**:2 项(HfAd 自家广告卡、MCP server)
- **完成度**:约 **85%**(前端) / **95%**(后端 API)

## 剩余缺口

| 优先级 | 功能 | 说明 |
|---|---|---|
| 低 | 自家广告卡(HfAd) | 首页右栏，从 config 读取，纯前端 |
| 低 | MCP server(`/mcp`) | 需要较大工程量，功能可选 |
| 低 | 文章内反向链接图 | 前台 post 页面内嵌迷你图(非全屏) |
