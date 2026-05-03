# WS-H — Docs pages(可选,M5)

> **Owner**: Lead 或 FE-A 后期接手  **Duration**: 2-3 天  **Depends on**: WS-0
> **Touches**: `code/packages/web-public/src/templates/`, `code/packages/web-admin/src/pages/`

## 目标

把 hf-cli / hf-config 的"配置即文档"理念落实到产品。

## 范围

| 页面 | 设计稿 | 实现 |
|---|---|---|
| Blog CLI 文档(后台 + 公开) | `hf-cli.jsx HFBlogCli` | `web-public/src/templates/cli-docs.ts` 或 admin 内嵌 |
| Config 文档(后台直接展示) | `hf-config.jsx HFConfigDocs` | `web-admin/src/pages/config-docs.tsx`,4-tab 切换 |

## 关键点

### CLI docs 页

- 复刻 hf-cli.jsx 的 4 个 section:
  - Quick start(install + first command)
  - 完整命令表(`blog new` / `blog visibility` / `blog publish` / `blog query` / `blog stats` / `blog short-link`)
  - MCP server 接入(暴露的 tools 列表)
  - 实战示例(几个 agent prompt)

### Config docs 页

- 在 settings 上方 / 旁边加"查看 raw 配置"tab
- 4 sub-tab:
  - `.env` — 环境变量
  - `config.yaml` — 站点配置
  - `features.yaml` — 功能开关
  - frontmatter — 笔记前置元数据
- 每节代码块 + 字段说明表(从现有 `doc/CONFIGURATION.md` 复用)
- 一键"复制示例"按钮

## 数据需求

无后端 — 静态内容。可以编译期把 markdown 注入(从 doc/CONFIGURATION.md 读)。

## 验收

- [ ] 视觉对齐 hf-cli / hf-config
- [ ] 配置示例 1:1 与 doc/CONFIGURATION.md 一致(用 build script 检查)

## 文件清单

```
code/packages/web-public/src/templates/cli-docs.ts        (新)
code/packages/web-admin/src/pages/config-docs.tsx          (新)
```
