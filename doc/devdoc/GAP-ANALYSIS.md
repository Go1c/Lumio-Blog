# Gap Analysis — 设计稿 ↔ 现状代码

每行 = 一个设计稿功能。三列含义:**前端 UI 是否实现**、**后端 API 是否实现**、**归属 workstream**。

✅ 完整 / 🟡 部分 / ❌ 完全没做 / N/A 不需要

## 阅读体验(前台)

| 设计稿位置 | 功能 | 前端 | 后端 | WS |
|---|---|---|---|---|
| hf-home | 三栏首页(目录 / feed / 侧栏) | ❌ | 🟡 (列表 API 有) | A |
| hf-home | hero 区(动画 blob、CTA) | ❌ | N/A | A |
| hf-home | 标签云(右栏) | ❌ | 🟡 | A |
| hf-home | 最近笔记侧栏 | ❌ | 🟡 | A |
| hf-home | 自家广告卡(HfAd) | ❌ | N/A(配置驱动) | A |
| hf-article | 文章正文 | 🟡 (基础 prose) | ✅ | A |
| hf-article | 阅读进度条 | ❌ | N/A | A |
| hf-article | 系列 + outline 左栏 | ❌ | 🟡 (backlinks 有) | A |
| hf-article | 浮动操作栏(收藏/复制) | ❌ | N/A | A |
| hf-article | 划词高亮 + 侧栏评论(飞书风) | ❌ | ❌ | B |
| hf-article | 末尾订阅 CTA | ❌ | ❌ | B |
| hf-article | 反向链接图 | ❌ | ✅ (backlinks API) | A/B |
| hf-extras §3 | 搜索结果页(全文 + 类型筛选) | ❌ | 🟡 (search API 有,无 facet) | B |
| hf-extras §4 | 标签详情页(按年分组、相关标签) | 🟡 (基础有) | 🟡 | A |
| hf-extras §5 | 404 + 私有拦截诊断 | 🟡 (基础 404) | 🟡 (server 有 intercept) | A |
| hf-extras §12 | 知识图谱全屏可视化 | ❌ | ❌ (need graph API) | B |
| hf-extras2 §7 | RSS 美化阅读页 | ❌ | ✅ (feed.xml 有) | C |
| hf-extras2 §15 | About 页 | ❌ | N/A | A |
| hf-extras §1 | 评论区(Giscus 风) | ❌ | ❌ (Giscus 客户端集成) | B |
| hf-extras §2 | Newsletter 订阅页 | ❌ | ❌ (Buttondown bridge) | B/C |
| hf-mobile | 移动端首页 / 文章 / 后台 | ❌ | N/A | C |

## 写作 / 同步(已实现)

| 设计稿位置 | 功能 | 前端 | 后端 | WS |
|---|---|---|---|---|
| FEATURES | Obsidian → fast-note-sync 同步 | N/A | ✅ | — |
| FEATURES | frontmatter 解析 + 校验 | N/A | ✅ | — |
| FEATURES | 双向链接 / wikilink | N/A | ✅ | — |
| FEATURES | Markdown / Mermaid / KaTeX | N/A | ✅ | — |
| FEATURES | 短链生成 + /n/:id 跳转 | N/A | ✅ | — |
| FEATURES | 4 档可见性 | N/A | ✅ | — |
| FEATURES | 草稿 / 定时发布 | N/A | 🟡 (字段有,scheduler 待验证) | E |

## 后台

| 设计稿位置 | 功能 | 前端 | 后端 | WS |
|---|---|---|---|---|
| hf-admin Dashboard | KPI 卡(总笔记 / 同步 / 浏览) | 🟡 (4 个朴素卡) | 🟡 (count API 有) | D |
| hf-admin Dashboard | 7/30/90 天趋势图 | ❌ | ❌ (analytics API 缺) | D + G |
| hf-admin Dashboard | Top 5 文章 | ❌ | ❌ | D + G |
| hf-admin Dashboard | 实时活动流(SSE) | ❌ | ✅ (`/api/admin/changes`) | D |
| hf-admin Dashboard | 同步状态卡 + 手动同步 | ❌ | ✅ (`/api/admin/sync`) | D |
| hf-admin NoteDetail | 元数据 patch UI | 🟡 (visibility/searchable 有) | ✅ | D |
| hf-admin NoteDetail | 短链管理(显示 / 旋转) | ❌ | ✅ | D |
| hf-admin NoteDetail | 定时发布选择器 | ❌ | 🟡 | D |
| hf-admin NoteDetail | 反向链接 / 出链查看 | ❌ | ✅ (`backlinks`) | D |
| hf-extras2 §9 | 单篇 Analytics(PV/UV/热力) | ❌ | ❌ | D + G |
| hf-extras §8 | 媒体库(网格 + 引用计数 + 上传) | ❌ | ❌ | F + G |
| hf-extras §10 | API Tokens(漂亮版) | 🟡 (基础表格) | ✅ | E |
| hf-admin/extras | Webhooks(漂亮版) | 🟡 (基础表格) | ✅ | E |
| hf-extras2 §11 | 备份 / 导出 / 危险区 | ❌ | ❌ | F + G |
| hf-extras2 §13 | 设置(站点/作者/外观/SEO) | ❌ | ❌ (config API 缺) | E + G |
| hf-og | OG 图生成器 + 4 模板 + 预览 | ❌ | ❌ | F + G |
| (server 已有) | Audit log 浏览页 | ❌ | ✅ (`/api/admin/audit`) | E |

## Agent / 自动化

| 设计稿位置 | 功能 | 前端 | 后端 | WS |
|---|---|---|---|---|
| hf-cli | Blog CLI 文档展示 | ❌ | N/A (CLI 在 cli 包) | H |
| hf-config | Config docs 在后台直接展示 | ❌ | 🟡 | H |
| FEATURES | MCP server | N/A | ❌ (server 缺 /mcp) | G |
| FEATURES | Webhook outbound | N/A | ✅ (基础有) | E |

## 设计 / 主题 / 共享

| 设计稿位置 | 功能 | 前端 | 后端 | WS |
|---|---|---|---|---|
| styles-hifi.css | 设计 token 系统(已 a11y 修复) | ✅ | N/A | — |
| HfNav | 站点头部 + 主题切换 | 🟡 (已修语义) | N/A | 0 |
| HfIcon | 图标系统(35+ icon) | ❌ (没集成进真实代码) | N/A | 0 |
| 暗色模式 | data-theme + prefers-color-scheme | 🟡 (CSS 有,UI 切换缺) | N/A | 0 |
| 字体 | Noto Sans SC + JetBrains Mono | ❌ (web-public 用系统字体) | N/A | 0 |

## 总览

- **设计稿覆盖功能数**:约 **48 项**
- **完整实现**:6 项(主要是 sync、auth、tokens、webhooks 等后端骨架)
- **部分实现**:13 项
- **完全没做**:29 项
- **完成度**:约 **15-20%**(前端) / **40%**(后端 API 骨架)

## 关键缺口(必须最先做的服务端能力)

这些是阻塞前端的:

1. **Settings API** — `GET / PATCH /api/admin/settings` 暴露 / 更新 config.yaml + features.yaml(WS-G)
2. **Analytics API** — 收集 PV / UV(可对接 Plausible API)+ 查询接口(WS-G)
3. **Search API 增强** — 当前只有简单 LIKE 搜,要加 FTS5、facet、type filter、suggest(WS-G)
4. **Media API** — 列表 / 上传 / 引用计数(WS-G)
5. **Graph API** — `GET /api/graph` 返回节点 + 边 + 标签集群(WS-G)
6. **OG Generator API** — `GET /og/:slug.png?template=…` 服务端渲染(WS-G)
7. **Settings 写盘** — 后台编辑 config.yaml 的写权限(WS-G)
8. **Backup API** — 打包导出(WS-G)
