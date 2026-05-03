# WS-A — Public 内容页面

> **Owner**: FE-A agent  **Duration**: 5-7 天  **Depends on**: WS-0  **Touches**: `code/packages/web-public/src/templates/`

## 目标

把 `doc/prototype/hf-home.jsx` / `hf-article.jsx` / `hf-extras.jsx §4-§5` / `hf-extras2.jsx §15` 的设计稿,在生产 SSG 里 1:1 还原。

## 范围

| 页面 | 设计稿 | 实现位置 |
|---|---|---|
| 首页 | `hf-home.jsx` | `web-public/src/templates/home.ts` |
| 文章详情 | `hf-article.jsx`(不含侧栏评论 — WS-B) | `web-public/src/templates/post.ts` |
| 标签列表 | `hf-extras.jsx §4 HFTagDetail` | `web-public/src/templates/tag.ts` |
| 404 | `hf-extras.jsx §5 HFNotFound` | `web-public/src/templates/notfound.ts`(新) + `render-site.ts` 替换 render404 |
| About | `hf-extras2.jsx §15 HFAbout` | `web-public/src/templates/about.ts`(新) |

## 关键 UI 还原点

### Home
- 三栏布局:左目录 220px / 中文章流 / 右作者+广告+最近笔记+标签云 260px
- Hero 区动画 blob(注意 prefers-reduced-motion)
- 置顶卡 + 列表卡两种样式
- 标签 chip 点击跳标签页
- 右栏自家广告(`HfAd` 等价物,从 config 读取)

### Article
- 阅读进度条(JS 计算,sticky top: 56)
- 左栏:系列(同 tag 文章) + outline(从 toc 数据)
- 中栏:文章正文(prose 类)+ 末尾订阅 CTA
- 右栏:留位置给 WS-B 的评论(空预留容器即可)
- 浮动操作栏(收藏/复制链接/分享/更多)→ button 真按钮

### Tag detail
- 按年分组(`groupBy(year)`)
- 顶部:标签描述、相关标签、笔记数 / 字数 / 最近活跃
- 列表风同 home

### 404
- 区分 4 种情况:URL 不存在 / private 拦截 / 短链失效 / 链接已过期
- 服务端把具体原因传进来,模板分流
- 给替代链接(从 `popular_posts` 渲染)

### About
- 单页:作者信息(从 `config.author`)+ bio_md + 社交 + RSS / Newsletter / Github 链接
- 配置驱动,无后端 API

## 数据需求

全部从已有 server API 取:
- `GET /api/posts` 列表
- `GET /api/posts/:slug` 单篇
- 标签数据从 SSG 时的 db query 取(同 `render-site.ts` 现状)

不需要新 API。

## 验收

- [ ] 截图对比 hf-* 设计稿,布局/色彩误差 ≤ 5%
- [ ] axe-core 扫每个页面无 critical / serious
- [ ] Lighthouse perf ≥ 90,a11y = 100,SEO ≥ 90
- [ ] 暗模式正常(切换主题刷新后仍生效)
- [ ] 移动端响应式不崩(详细移动端在 WS-C)

## 文件清单(本 WS owns,其他人不要碰)

```
code/packages/web-public/src/templates/home.ts
code/packages/web-public/src/templates/post.ts
code/packages/web-public/src/templates/tag.ts
code/packages/web-public/src/templates/notfound.ts  (新)
code/packages/web-public/src/templates/about.ts     (新)
code/packages/web-public/src/render-site.ts          (新加 about / notfound 路由)
```

## 不要碰

- `templates/feed.ts`(WS-C 改)
- `templates/layout.ts`(WS-0 已经定型)
- `code/packages/web-admin/*`(其他 WS)
- `code/packages/server/*`(WS-G)
