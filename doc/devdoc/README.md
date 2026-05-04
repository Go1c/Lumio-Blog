# DevDoc — 把设计稿落地到产品

这是把 `doc/prototype/` 里的设计稿落到 `code/` 真实代码的开发计划。**主要面向多 agent / 多人并行开发**。

## 这里有什么

```
doc/devdoc/
├── README.md             ← 你正在读
├── ROADMAP.md            ← 工作流总览 + 阶段图 + 验收标准
├── GAP-ANALYSIS.md       ← 设计稿每个功能 ↔ 现状代码的逐项对照
├── conventions.md        ← 编码 / 测试 / PR / 提交信息约定
├── contracts/            ← workstream 之间的接口契约
│   ├── api.md            ← HTTP API 总表
│   ├── data-model.md     ← 共享数据类型(扩展自 core/)
│   └── events.md         ← SSE / webhook 事件目录
└── workstreams/          ← 每条独立工作流一份文档
    ├── 0-foundation.md
    ├── A-public-content.md
    ├── B-public-interactivity.md
    ├── C-public-feeds-mobile.md
    ├── D-admin-shell-dashboard.md
    ├── E-admin-settings-tokens.md
    ├── F-admin-media-og-backup.md
    ├── G-server-apis.md
    └── H-docs-pages.md
```

## 怎么用

### 项目负责人(规划者)
1. 先读 `ROADMAP.md` — 看清整张图、阶段、并行性
2. 看 `GAP-ANALYSIS.md` — 确认设计稿的每个功能都被某个 workstream 覆盖
3. 把每个 workstream 分配给一个 agent / 开发者(可以同一人多个,但 P0 阶段建议至少 3 路并行)

### 开发者 / agent(执行者)
1. 拿到分配的 workstream(例如 "WS-D")
2. 读 `workstreams/D-admin-shell-dashboard.md` — 全部依赖、数据契约、UI 还原参考、验收标准都在里头
3. 读 `contracts/` — 跨 workstream 的接口契约(只读,改要发协调 issue)
4. 读 `conventions.md` — PR / commit / 测试要求
5. 开干

### 多 agent 并行约束

| 同时改 | 风险 | 怎么办 |
|---|---|---|
| 同一文件 | 高(冲突) | workstream 切割时已避免;若必须,先发 PR 占位 |
| `code/packages/core/src/types.ts` | 中(共享类型) | 改前发协调 issue,改完发广播 |
| `contracts/*.md` | 高(契约) | 先 RFC 后改,获得 lead 同意 |
| 同一 server route | 中 | 路由按 workstream 切前缀(`/api/admin/analytics/*` 归 D) |
| `package.json` 增加依赖 | 低(允许) | 加之前在 PR 描述里说为啥需要 |

## 现状(截至 PR #5)

- **后端 API**:全部 WS-G 路由已实现 — Settings / Analytics / Search(FTS5) / Media / Graph / OG / Backup / Newsletter / Tags / Comments / Subscribers / Webhooks(含投递历史+重发)
- **同步管线**:fast-note-sync 已实现 — 见 `code/packages/sync/`
- **前台静态站**:≈ 85% 完成 — 首页三栏、文章页、标签、404、About、搜索、图谱、评论、Newsletter、移动端 CSS
- **后台 SPA**:≈ 90% 完成 — 所有导航页面(仪表盘/笔记/标签/媒体/评论/订阅/Analytics/设置/Tokens/Webhooks/审计/OG/备份/配置文档)均已实现

**剩余缺口**:自家广告卡(HfAd)、MCP server(`/mcp` 端点)。详见 `GAP-ANALYSIS.md`。
