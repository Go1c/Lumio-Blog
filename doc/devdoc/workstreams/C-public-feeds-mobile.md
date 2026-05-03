# WS-C — Public RSS 阅读页 + 移动端

> **Owner**: FE-C agent  **Duration**: 4-6 天  **Depends on**: WS-0  **Touches**: `code/packages/web-public/`

## 目标

实现 RSS 美化阅读页 + 全套移动端响应式。Newsletter / OG 等其它由 WS-B 和 WS-F 拿走。

## 范围

| 页面 | 设计稿 | 实现位置 |
|---|---|---|
| RSS 美化页 | `hf-extras2.jsx §7 HFRssPage` | `web-public/src/templates/rss-reader.ts`(新) |
| 移动端首页 | `hf-mobile.jsx HFHomeMobile` | media query in home.ts |
| 移动端文章 | `hf-mobile.jsx HFArticleMobile` | media query in post.ts |
| 浮动操作 pill(移动) | `hf-mobile.jsx` | 在 post.ts 加 mobile-only fragment |

## 关键点

### RSS 美化页

- 直接访问 `/feed.xml` 浏览器渲染会出 raw XML — 加 `<?xml-stylesheet href="/feed.xsl"?>` 让浏览器用 XSL 渲染成可读列表
- 或者:做一个 `/feed/` HTML 页面,提供 RSS / Atom / JSON Feed 三种链接 + 每种的简短解释 + 客户端订阅工具(Feedly / Inoreader 等)按钮
- 设计稿 §7 是后者,本 WS 实现 `/feed/` 页面

### 移动端响应式

- 不写独立 mobile 模板,统一用 media query
- breakpoint:`@media (max-width: 768px)`
- 主要变化:
  - 三栏 → 单栏(home / article)
  - sidebar 折叠到底部 / 用 drawer
  - 字号略放大(可读性)
  - 浮动操作 pill(底部固定),取代浮动操作栏
  - hero 区简化(去 blob 或缩小)

### 浮动操作 pill(article 移动)

- 位置:屏幕底部居中
- 内容:喜欢 / 分享 / 收藏 / 反馈
- 真按钮,触控目标 ≥ 44px
- `position: sticky; bottom: 16px` (不要 `fixed` — `fixed` 在某些浏览器有 z 轴问题)

## 数据需求

无新 API。复用现有。

## 验收

- [ ] 移动端 375px / 414px 下,home / article / tag 全部不溢出、不水平滚动
- [ ] 浮动操作 pill 在文章页底部正确显示
- [ ] `/feed/` 页面可访问,提供三种 feed 链接 + 客户端订阅按钮
- [ ] 直接访问 `/feed.xml` 在 Safari/Chrome 显示美化版(XSL / 备选 HTML 重定向)
- [ ] axe-core 全过

## 文件清单

```
code/packages/web-public/src/templates/rss-reader.ts        (新)
code/packages/web-public/src/templates/feed.ts              (改:增 XSL 引用)
code/packages/web-public/src/templates/home.ts              (改:加 mobile media query)
code/packages/web-public/src/templates/post.ts              (改:加 mobile pill)
code/packages/web-public/public/feed.xsl                    (新)
```

## 协调

- `home.ts` / `post.ts` 主要由 WS-A 写,WS-C 在 WS-A 完成后追加 mobile-only CSS 块。两个 WS 不同时改同一文件,WS-A 先合,WS-C 再 rebase
- 或者:WS-A 在自己的 PR 里就把 mobile CSS 块预留好(WS-C 只需要填内容)→ 推荐这种
