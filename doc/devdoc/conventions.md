# Conventions

## 分支

- 主分支:`main`(受保护,只接 PR)
- 工作分支:`<ws-id>/<short-name>`,例如 `ws-d/admin-shell`、`ws-g/analytics-api`
- 长期 feature flag:`feat/<ws-id>-<thing>` 也可

## 提交信息

```
<scope>: <一句话总结>

<可选正文,解释为什么这么做>

WS: D
Refs: #123
```

scope 取自:`a11y` / `admin` / `public` / `server` / `db` / `sync` / `core` / `cli` / `docs`。多个 scope 用逗号 `admin,server`。

## PR

- 标题:`[WS-D] admin: 重写 shell + 加左侧导航`
- 正文必含:
  1. **What**:做了什么
  2. **Why**:为什么(链回 workstream doc 或设计稿)
  3. **截图**:如果改了 UI,贴前后对比 + hf-* 设计稿截图三联
  4. **测试**:跑了什么测试,axe-core 结果,Lighthouse 分数(public 改动)
  5. **Breaking**:有没有破坏性改动(API、数据模型、CSS class 名)
- 至少跑 CI 通过 + 视觉差异审过再合

## 测试

- 单测:`*.test.ts`,Vitest(已配)。新写的纯函数必须有
- 集成测试:server 路由测试,放 `code/packages/server/test/`
- 视觉回归:用 Playwright 截 hf-* 设计稿对应页面 + 实际页面,人工比对(暂不上 visual regression 工具)
- 无障碍:每个 PR 自动跑 axe-core,有 critical/serious 问题不让合
- E2E:M3 后开始上 Playwright,点击主要流程

## 代码风格

- TypeScript strict,`tsc --noEmit` 必过
- 不允许 `any`(必要时用 `unknown` + narrowing)
- 不允许在生产代码用 `console.log`(用 logger)
- 文件命名:kebab-case(`note-detail.tsx`)
- 组件命名:PascalCase(`NoteDetail`)
- CSS class:kebab-case + workstream 前缀避免冲突,公共 token 用 `--` 变量
- 不要新加深色 hex 字面量 — 一律用 token

## 无障碍

不要造旧账。每个新 UI 必须:

1. 真按钮用 `<button>`,真链接用 `<a>`,标签用 `<label htmlFor>`
2. focus-visible 由全局规则提供,不要 disable
3. 装饰性视觉加 `aria-hidden="true"`
4. 有意义的图标加 `aria-label`
5. 表单错误用 `role="alert"` + `aria-describedby`
6. landmark 至少 `<nav> <main> <footer>`
7. 时间用 `<time datetime>`
8. 触控目标 ≥ 24×24,推荐 36×36
9. 颜色对比 ≥ 4.5:1(普通文字),≥ 3:1(大字 / UI 边框)

参见 `doc/ACCESSIBILITY-AUDIT.md`。

## API 契约变更

- 改 `code/packages/core/src/types.ts` 或 `schema.ts` 之前,先在 PR 里评估对其他 workstream 的影响
- 增加 endpoint:更新 `contracts/api.md`,bumper version 字段(API 头 `X-API-Version`)
- 删除 / 改语义:发协调 issue,所有 owner ack 之后再合

## 数据库迁移

- 新加表 / 列:在 `code/packages/db/src/migrate.ts` 加一条,不可改已有迁移
- 测试本地 + 一份生产备份还原后跑过

## 依赖

- 加新依赖:在 PR 描述里说明 ① 为啥需要 ② 替代方案 ③ 大小影响
- 不允许加 jQuery、moment(用 Day.js 或 native Intl)、lodash(用 native)
- React 系:坚持 Preact(admin)+ 模板字符串(public),不要混 React

## 文件 / 目录

- `code/packages/web-admin/src/components/`:跨 page 共享的组件
- `code/packages/web-admin/src/pages/`:每个路由一个文件
- `code/packages/web-admin/src/hooks/`:可复用 hooks
- `code/packages/web-public/src/templates/`:每种页面一个 .ts 文件,导出函数返回 HTML 字符串
- `code/packages/web-public/src/partials/`(新):header / footer / nav 等可复用片段
- `code/packages/server/src/routes/`(新,如果 routes.ts 太大):按 workstream 拆成 `analytics.ts` / `media.ts` 等
