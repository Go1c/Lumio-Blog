# 参与贡献

欢迎 issue / PR / 直接 fork 当自己的博客用。

---

## 项目定位

这是一个**为单作者 + agent 优化**的博客系统。设计上有几个有意识的取舍：

- 内容存储 = 文件系统，不是数据库
- 编辑器 = Obsidian（或任何能写 Markdown 的东西），不是后台富文本
- "评论 / 协作 / 多人编辑"不是核心场景；想要这些请考虑 Ghost / WordPress
- Agent / CLI / MCP 是一等公民，不是事后补丁

如果你的 PR 让某个非核心场景变好但削弱了上面任何一条，会被劝退。

---

## 本地开发

### 前置

- Node 20+
- pnpm 9+
- 一个 Obsidian vault（或者随便一个装着 `.md` 的文件夹）

### 启动

```bash
git clone <repo>
cd <repo>
pnpm install
cp .env.example .env

# 把 .env 里的 VAULT_PATH 改成你本地 vault 的绝对路径
# 例如：VAULT_PATH=/Users/you/Documents/vault

pnpm dev
```

跑起来：

- `http://localhost:3000` — 前台
- `http://localhost:3000/admin` — 后台（首次访问走 `AUTH_PROVIDERS` 配的方式登录；本地开发可设 `AUTH_PROVIDERS=local` 加 `LOCAL_USERS=you:password`）
- `http://localhost:3000/api/changes` — SSE 流，`fast-note-sync` 监听到变更会推这里

### 设计稿

设计稿是独立的 HTML 项目（你正在看的这个）。本地预览：

```bash
# 直接拿浏览器打开 doc/prototype/index.html 就行；
# 或者起个静态 server 避免 file:// 跨域：
python3 -m http.server 8000
```

设计稿不依赖后端，纯前端 React + Babel-in-browser，改完即生效。

---

## 仓库结构

```
apps/
  web/              # 前台 + 后台（Next.js，App Router）
  cli/              # blog CLI
  mcp/              # MCP server
packages/
  fast-note-sync/   # 同步管线（独立 npm 包，可单跑）
  parser/           # frontmatter / wikilink / 渲染
  schema/           # zod schema + TS 类型
docs/               # 你正在看的设计稿和文档
```

> 实际仓库结构以代码仓为准。这里描述的是设计意图。

---

## 提 PR 之前

### 必跑

```bash
pnpm typecheck
pnpm test
pnpm lint
```

### 如果改了 frontmatter schema

- `packages/schema` 里同步改 zod schema
- `doc/CONFIGURATION.md` 里同步改字段表
- 跑 `pnpm test --filter parser` 确认旧笔记能解析

### 如果改了可见性逻辑

- `doc/ARCHITECTURE.md` 里的"可见性矩阵"是规约，改了就要更新表
- 关键 case 必须有测试：
  - `link-only` + `searchable: true` 应当被拒绝
  - `private` 笔记的直链应当 404 而不是 403（不泄露存在性）
  - `unlisted` 不应该出现在 RSS

### 如果加了新 UI

- 设计稿（这个仓库）也要加一个对应的 artboard
- 在 `doc/prototype/app-hifi.jsx` 里塞进对应的 `DCSection`
- 截图丢到 `doc/img/`，README.md 加一行

---

## Issue 模板

### Bug

```
环境：node 版本 / OS / 浏览器
最小重现：vault 里放了什么 / 怎么操作 / 期望 vs 实际
日志：fast-note-sync 控制台输出 / 浏览器 console
```

### 功能请求

```
我想做什么（用户故事）
为什么现在的方案做不到 / 不顺手
我能想到的实现方向（可选）
```

把"我做了 X 但失败"和"我想要 Y"分清楚——前者是 bug，后者是 RFD。

---

## 风格

### 代码

- TypeScript，strict
- 不写 class（除非是真的 stateful 业务对象）
- React 组件优先用 function + hooks
- CSS：Tailwind + 极少量手写 module（前台样式表 < 200 行）
- 文件命名：`kebab-case.ts`，组件文件 `PascalCase.tsx`

### Commit

- 中文 / 英文都行，保持一致
- 一句话点题，不写 type/scope 前缀（不强制 conventional commits）
- 大改动配 PR 描述讲清"为什么"

### 文档

- 中文优先（这个项目的目标用户大部分写中文）
- 但代码注释、错误信息、CLI 输出 = 英文
- README / 设计文档可以带表情符号，但不要泛滥

---

## 不接受的 PR

- "把 React 换成 Vue / Svelte / Solid"
- "把 SQLite 换成 Postgres"（除非是可选 backend）
- 引入新的 npm 包来做能 50 行代码搞定的事
- "我用 AI 一键生成了 30 个文件" —— 拒绝
- 大段注释 / TODO / `console.log` 没清

---

## 快速联系

- Issue 讨论 / 设计 RFD
- 微信 / Telegram 群（暂不开放，先在 Issue 里讨论清楚再说）
- 邮件兜底：`hi@<domain>`
