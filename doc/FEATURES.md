# 功能清单

按"用户做的事"组织，不按"页面"。每条都标注了在设计稿里出现的位置。

---

## 写作 / 发布

### 写
- 在本地 Obsidian 里写 `.md`。完。
- frontmatter 字段被 `fast-note-sync` 解析（详见 [`CONFIGURATION.md`](./CONFIGURATION.md)）

### 同步
- 文件保存 → `fast-note-sync` 监听 → 几秒内同步上线
- 也支持 git push 触发（CI 模式）
- 后台仪表盘有"同步状态"卡片，显示最近一次同步时间和差异

### 草稿 / 定时发布
- `draft: true` → 仅后台可见
- `scheduled_at: "2025-05-10T08:00"` → 到点自动发
- 后台单笔记页有时间选择器 → 见 `hifi-note.png`

### 可见性 4 档
- `public` / `unlisted` / `link-only` / `private`
- 后台单笔记页有专门的"可见性"卡片 → 见 `hifi-note.png`
- 移动端也支持 → 见 `m-admin.png`

### 可搜索独立开关
- 与可见性正交。可以"公开但不可搜"（如个人日记式的 unlisted）
- 默认跟随可见性

---

## 阅读体验

### 文章详情（`hifi-article.png`）
- 顶部进度条，跟随滚动
- 行内代码 / 代码块（高亮 + 复制按钮 + 行号 + 文件名标注）
- Mermaid 图表（流程图 / 时序图 / Gantt）
- KaTeX 数学公式
- 自动生成 TOC（右侧浮动）
- 反向链接图（页脚显示哪些笔记引用了本篇）
- 阅读时间估算

### 关系图（`graph.png`）
- 全屏 SVG 力导向图
- 集群按标签上色，图例可点击筛选
- 节点详情侧栏（标题 / 摘要 / 出入度）
- 鼠标悬停高亮邻居

### 标签页（`tag.png`）
- 按年份分组
- 标签描述 + 相关标签
- 该标签下笔记总数 / 字数 / 最近活跃

### 搜索（`search.png`）
- 全文 + 标题 + frontmatter 字段
- 关键词高亮
- 类型筛选（文章 / 笔记 / 标签 / 媒体）
- 时间过滤
- 自动联想（前缀 + 拼音）

---

## 互动

### 评论（`comments.png`）
- Giscus（GitHub Discussions 后端）
- 作者回复气泡高亮
- Markdown + 代码块支持
- features.yaml 一键关闭

### Newsletter（`newsletter.png`）
- Buttondown / Listmonk 等第三方
- Hero + 表单 + 往期回顾
- 也支持 RSS-only 模式（不要邮件就关掉）

### RSS / Atom / JSON Feed（`rss.png`）
- 三种 feed 同时输出
- 美化预览页（直接访问 `/feed.xml` 在浏览器打开会渲染成可读列表）

---

## 后台

### 仪表盘（`hifi-dashboard.png`）
- KPI：总笔记数 / 今日同步 / 总浏览
- 7 / 30 / 90 天趋势图
- Top 5 文章
- 实时活动流

### 单笔记编辑（`hifi-note.png`）
- 元数据 patch（不动正文 — 正文还是去 Obsidian 编辑）
- 可见性 4 档 toggle
- 短链编辑（自动生成 / 手动指定）
- 定时发布
- 反向链接 / 出链查看

### 单篇 Analytics（`analytics.png`）
- PV / UV / 平均停留 / 跳出率
- 流量来源分布
- 阅读完成度热力
- 短链点击 vs 直链对比

### 媒体库（`media.png`）
- 网格 / 列表视图
- 引用计数（哪些笔记用了这张图）
- 选中状态栏（批量删除 / 移动）
- 拖拽上传

### Tokens / Webhook（`tokens.png`）
- API token 一次性显示
- 表格列出所有 token（带最近使用时间，方便撤销）
- Webhook 配置 + 重发

### OG 图生成器（`og.png`）
- 4 个模板（极简 / 报纸 / 终端 / 杂志）
- 模板变量：标题 / 标签 / 作者 / 日期
- 社交平台预览（Twitter / 微信 / Telegram）
- 静默模式：构建时为每篇文章自动生成

### 设置（`settings.png`）
- 站点（标题 / URL / 时区）
- 作者（名 / 邮箱 / 头像 / 简介 / 社交）
- 外观（主题 / accent 色 / 字体）
- SEO（默认 OG / sitemap / robots）
- Analytics 后端（Plausible / Umami / 自托管）

---

## Agent / 自动化

### Blog CLI（`cli.png`）
```bash
blog new "标题"
blog visibility note.md unlisted
blog publish --schedule "2d"
blog query "tag:游戏 AI && month:2025-04"
blog stats note.md
blog short-link list
```

### MCP server（同 `cli.png`）
- 标准 MCP 协议，Claude / Cursor / Continue 直接接入
- 工具暴露：`blog_search` / `blog_read` / `blog_write` / `blog_patch_meta`
- 写权限可在 `features.yaml` 单独开关

### Webhook
- `post.published` / `post.updated` / `post.unpublished`
- 用例：发 Discord / Telegram、触发其他 CI、增量重建子域名

---

## 开源用户友好

### 配置文件参考（`config.yaml`/`features.yaml`/`.env`/frontmatter）（`config.png`）
- 设计稿里直接当文档展示
- 每个字段一行注释
- 切 tab 看 4 类配置

### 本地开发
```bash
git clone …
cp .env.example .env
docker compose up
# 把 obsidian vault 路径挂到 /vault
```

---

## 错误 / 边缘情况

### 404 / 私有拦截（`404.png`）
- 区分 4 种情况：URL 不存在 / 笔记被设为私有 / 短链失效 / 链接已过期
- 诊断面板告诉用户具体原因（不泄露敏感信息）
- 建议替代链接

### 移动端
- 完整覆盖：首页 / 文章 / 后台 / 设置（`m-*.png`）
- 浮动操作 pill（喜欢 / 分享 / 收藏 / 反馈）
- iOS list 风设置页
