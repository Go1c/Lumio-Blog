# Lumio-Blog 部署说明

## 架构

```
Obsidian (本地)
   │  插件双向同步
   ↓
FastNoteSync Service          ← 你已有的部署:https://fastnode.zeabur.app
   │  WebSocket /api/user/sync
   ↓
[FastNodeSync CLI]  ←──── 跑在 Lumio-Blog 容器里
   │  把笔记落到磁盘
   ↓
/data/posts/*.md           ← 共享 vault 目录
   ↑  chokidar watch
[Lumio-Blog @opennote/sync]
   │  渲染 markdown → HTML / 索引 / OG
   ↓
HTTP 服务 :3000  →  https://lumio-blog.zeabur.app
```

## Zeabur 必须配的环境变量

| 变量 | 说明 | 示例 |
|---|---|---|
| `FNS_API_URL` | FastNoteSync Service 的 https URL | `https://fastnode.zeabur.app` |
| `FNS_TOKEN` | JWT bearer,从 FNS Service 后台拿 | `eyJhbGc...` |
| `FNS_VAULT` | vault 名称,要和 Obsidian 插件里设的一致 | `notes` |
| `OPENNOTE_PASSWORD` | Lumio-Blog 后台登录密码 | 自定 |

可选:

| 变量 | 默认 | 说明 |
|---|---|---|
| `FNS_DISABLED` | `0` | 设成 `1` 跳过 FNS 同步(纯本地静态部署用) |
| `LUMIO_VAULT_PATH` | `/data/posts` | vault 路径,改了的话 `code/config.yaml` 里 `paths.vault` 也要改 |
| `S3_BUCKET` 等 | 空 | 设了启用 S3/R2 媒体存储,否则用本地 `/data/media` |
| `BUTTONDOWN_API_KEY` | 空 | Newsletter 桥接,空则 newsletter 端点返回 503 |

## Zeabur 配置示例

1. Zeabur 项目 → 新建 Service → Git repo → 选你的 Lumio-Blog
2. Service settings:
   - Build: Docker(自动检测)
   - Persistent volume: 挂 `/data`(笔记 + sqlite + 媒体)
   - Public domain: `lumio-blog.zeabur.app`(或自定)
3. Environment:
   ```
   FNS_API_URL=https://fastnode.zeabur.app
   FNS_TOKEN=<从 FNS 后台拿>
   FNS_VAULT=notes
   OPENNOTE_PASSWORD=<你定的>
   ```
4. Deploy

第一次启动会从 FNS Service **全量拉**笔记到 `/data/posts`,再触发 Lumio-Blog 的 sync 渲染。整个过程几秒到几十秒(看笔记量)。

## 验证部署

成功后查日志,应该看到:

```
[fns] FastNodeSync CLI v0.1.0
[fns]   Server : https://fastnode.zeabur.app
[fns]   Vault  : notes
[fns]   Path   : /data/posts
[fns] Connected.
[fns] Authenticated.
[fns] Pulling remote changes...
[fns] Pulled 12 notes, 3 files.
opennote v0.5 → http://localhost:3000
         admin → http://localhost:3000/admin/
```

## 测试同步

1. 在 Obsidian 改一篇 markdown
2. Obsidian 插件推到 FNS Service
3. CLI 几秒内拉到 `/data/posts`
4. Lumio-Blog watcher 触发重渲染
5. 刷新 https://lumio-blog.zeabur.app/posts/<slug>.html 看到改动

整条链路延迟约 5-15 秒。

## 常见问题

**FNS 同步起不来,日志里 `connection lost`**
- 检查 `FNS_TOKEN` 没过期(JWT exp 字段);过期了去 FNS 后台重发
- 检查 `FNS_API_URL` 拼写,要带 `https://`

**笔记同步过来了,但前台不更新**
- Lumio-Blog 的 watcher 用 chokidar,某些文件系统(如某些 NFS)不支持 inotify。日志里看 `sync.completed` 事件,如果一直没有,可能是 watcher 没起;检查 `code/packages/sync/src/watcher.ts` 报错

**OG 图都是空白**
- `deploy/fns-sync/og/fonts/` 是空目录(占位 README)。要真正渲染,得把 Inter / Noto Sans SC 的 ttf 放进去
- 或者在 Zeabur 部署后用 admin 后台 OG 生成器批量重生成

**S3 媒体上传 401 / forbidden**
- `S3_BUCKET` 设了但没设 `S3_REGION` `AWS_ACCESS_KEY_ID` 等
- 不用 S3 的话别设 `S3_BUCKET`,会自动 fallback 到 `/data/media` 本地存储

## 为啥不直接 Zeabur 多服务?

Zeabur 支持多 service 共享 volume,理论上 FNS-CLI 可以独立成第二个 service。但:
- 多 service 部署成本翻倍
- 共享 volume 在 Zeabur 上要单独配
- 一个容器跑两个进程,内存 / CPU 占用并不大(Python idle ≈ 30MB)

所以打成一个镜像更省事。如果你将来要分开,把 `entrypoint.sh` 拆成 `run-fns.sh` / `run-lumio.sh`,做两份 Dockerfile 就行。
