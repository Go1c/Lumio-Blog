# WS-B — Public 交互(搜索/图谱/评论/订阅)

> **Owner**: FE-B agent  **Duration**: 7-10 天  **Depends on**: WS-0, WS-G(search / graph)  **Touches**: `code/packages/web-public/`, 部分 `server/`

## 目标

实现 hf-* 中带交互的高级功能:搜索结果页、知识图谱、文章侧边评论(飞书风)、newsletter 订阅。

## 范围

| 页面 / 组件 | 设计稿 | 实现位置 |
|---|---|---|
| 搜索页面 + 自动联想 | `hf-extras.jsx §3 HFSearchResults` | `web-public/src/templates/search.ts`(新) + 客户端 JS bundle |
| 知识图谱(全屏 SVG) | `hf-extras.jsx §12 HFGraph` | `web-public/src/templates/graph.ts`(新) + d3 客户端 |
| 文章侧栏评论(高亮+评论卡) | `hf-article.jsx` 评论部分 + `hf-extras.jsx §1` | `web-public/src/partials/article-comments.ts`,在 post.ts 嵌入 |
| Newsletter 订阅 | `hf-extras.jsx §2 HFNewsletter` | `web-public/src/templates/newsletter.ts`(新) |

## 实现要点

### 搜索

- 服务端渲染初始结果页骨架(无关键词时空状态)
- 客户端用 `<input>` 实时调 `GET /api/search?q=&type=&from=&to=`(WS-G 提供)
- 高亮 `<mark>` 由后端切片返回
- 自动联想用 `GET /api/search/suggest?q=`,300ms debounce
- Facet:type / tag / 时间范围;选中后再请求一次

### 图谱

- 力导向图,d3-force
- 节点用 `data.nodes`,边 `data.edges`,从 `GET /api/graph` 拿
- 集群按 `cluster` 字段上色,图例可点击筛选
- 节点点击 → 右侧详情侧栏(标题/摘要/出入度)
- 鼠标悬停高亮邻居(浅色 + 加粗连线)
- 注意 a11y:键盘导航 — Tab 走节点,Enter 进文章
- d3 通过 esm.sh 加载

### 文章侧边评论(飞书风)

- 选中文本浮 bubble:复制 / 高亮 / 评论
- 高亮的句子 ↔ 右侧评论卡通过 `data-mid` 关联
- 评论 hover 时左侧高亮变 active
- 后端走 Giscus(GitHub Discussions API)— 客户端 JS 引入 giscus.js,但 UI 用我们自己的设计稿,不用 giscus 的默认样式
- 如果 `features.comments=false`,整块不渲染

### Newsletter

- Hero + 表单(submit 到 `/api/newsletter/subscribe`)+ 往期回顾(`GET /api/newsletter/recent`)
- 表单:`<input type="email" required>` + `<label>`,错误提示 `aria-live`
- 第三方桥(Buttondown / Listmonk)在 server 实现,本 WS 只 fetch

## 数据需求

需要 WS-G 完成的 API:
- `GET /api/search` 增强版
- `GET /api/search/suggest`
- `GET /api/graph`
- `POST /api/newsletter/subscribe`
- `GET /api/newsletter/recent`

启动条件:WS-G 上述端点 stable + Postman 集合验过。

## 验收

- [ ] 搜索框输入 → 200ms 内出建议 / 1s 内出完整结果
- [ ] 图谱 100+ 节点流畅渲染(60fps)
- [ ] 评论高亮 ↔ 卡片联动正确,选中后浮 bubble 出现
- [ ] Newsletter 表单 happy path 通,失败有可读错误
- [ ] 全部带客户端 JS 的页面在 JS 关闭后有合理 fallback(搜索退化为传统 form GET、图谱显示静态列表)

## 文件清单

```
code/packages/web-public/src/templates/search.ts          (新)
code/packages/web-public/src/templates/graph.ts           (新)
code/packages/web-public/src/templates/newsletter.ts      (新)
code/packages/web-public/src/partials/article-comments.ts (新)
code/packages/web-public/public/search.js                 (新,客户端 bundle)
code/packages/web-public/public/graph.js                  (新)
```

## 不要碰

- `templates/home.ts/post.ts/tag.ts`(WS-A,但 post.ts 需 WS-A 给 article-comments 留容器)
- 任何 admin 代码
