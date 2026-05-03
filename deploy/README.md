# Lumio-Blog 部署说明

## 架构

```
Obsidian (本地)
   │  插件双向同步
   ↓
FastNoteSync Service          ← 你已有的部署:https://fastnode.zeabur.app
   │  WebSocket /api/user/sync
   ↓
[FNS Supervisor]    ←──── 跑在 Lumio-Blog 容器里(Node 进程管理 Python 子进程)
   │  从后台读 fns-config.yaml,自动 spawn fns_cli 子进程
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

| 变量 | 说明 |
|---|---|
| `OPENNOTE_PASSWORD` | Lumio-Blog 后台登录密码,自定 |

**其他 FNS 相关配置走后台 UI**(`/admin/#/settings/fns`),不再用环境变量。

可选的兜底环境变量(只在容器**首次启动**且 `/data/fns-config.yaml` 不存在时,会被写入文件作为初始值):

| 变量 | 说明 |
|---|---|
| `FNS_API_URL` | 初始 FastNoteSync Service URL |
| `FNS_TOKEN` | 初始 JWT bearer |
| `FNS_VAULT` | 初始 vault 名(默认 `notes`)|

之后改动一律登录后台 → 设置 → FNS 同步 改。

## Zeabur 配置示例

1. Zeabur 项目 → 新建 Service → Git repo → 选你的 Lumio-Blog
2. Service settings:
   - Build: Docker(自动检测)
   - Persistent volume: 挂 `/data`(笔记 + sqlite + 媒体 + fns-config)
   - Public domain: `lumio-blog.zeabur.app`(或自定)
3. Environment:
   ```
   OPENNOTE_PASSWORD=<你定的>
   ```
4. Deploy

## 第一次进入后台配 FNS

1. 等 Zeabur 部署完,打开 `https://lumio-blog.zeabur.app/admin/`
2. 用 `OPENNOTE_PASSWORD` 登录
3. 左栏点 **设置 → FNS 同步**
4. 填:
   - **启用 FNS 同步** ✅
   - **FastNoteSync Service URL**:`https://fastnode.zeabur.app`
   - **JWT Token**:从 FNS 后台拿
   - **Vault 名称**:`notes`(和 Obsidian 插件一致)
5. **保存**

保存后:
- `fns-config.yaml` 写到 `/data/`
- server 收到 `settings.changed` 事件,自动重启 fns_cli 子进程
- 几秒内连上 FNS,开始拉笔记

回到日志(Zeabur 控制台),应该看到:

```
{"event":"fns.supervisor.spawn","python":"python3","args":["-m","fns_cli.main","run","-c","/data/fns-runtime-config.yaml"]}
[fns] FastNodeSync CLI v0.1.0
[fns]   Server : https://fastnode.zeabur.app
[fns]   Vault  : notes
[fns]   Path   : /data/posts
[fns] Connected.
[fns] Authenticated.
```

## 关掉同步

后台 → 设置 → FNS 同步 → 取消勾"启用 FNS 同步" → 保存。

子进程立即停。已经同步到 `/data/posts` 的笔记不动,Lumio-Blog 还是会发布它们。

## 测试同步

1. 在 Obsidian 改一篇 markdown
2. Obsidian 插件推到 FNS Service
3. fns_cli 几秒内拉到 `/data/posts`
4. Lumio-Blog watcher 触发重渲染
5. 刷新 `https://lumio-blog.zeabur.app/posts/<slug>.html` 看到改动

整条链路延迟约 5-15 秒。

## 常见问题

**保存了配置,但状态一直是"未知" / "断开"**
- 检查后台日志(Zeabur 控制台 → Logs)有没有 `[fns]` 前缀的报错
- 最常见:JWT 过期(看 token 的 `exp` 字段);去 FNS 后台重发 token 替换

**笔记同步过来了,但前台不更新**
- Lumio-Blog 的 watcher 用 chokidar,某些文件系统(如某些 NFS)不支持 inotify
- 日志里看 `sync.completed` 事件,如果一直没有,可能是 watcher 没起

**OG 图都是空白**
- `deploy/fns-sync/og/fonts/` 是空目录(占位 README)。要真正渲染,得把 Inter / Noto Sans SC 的 ttf 放进去
- 或者在 Zeabur 部署后用 admin 后台 OG 生成器批量重生成

**S3 媒体上传 401 / forbidden**
- `S3_BUCKET` 设了但没设 `S3_REGION` `AWS_ACCESS_KEY_ID` 等
- 不用 S3 的话别设 `S3_BUCKET`,会自动 fallback 到 `/data/media` 本地存储

## 文件位置(容器内)

```
/app/code/                       Lumio-Blog 源码 + dist
/app/fns-sync/                   vendored 的 FastNodeSync CLI(Python)
/app/entrypoint.sh               启动脚本

/data/posts/                     vault 共享目录(fns 写入,Lumio 读)
/data/public/                    SSG 输出
/data/opennote/index.db          SQLite
/data/media/                     本地媒体存储
/data/og/                        OG 缓存
/data/backups/                   备份产物
/data/fns-config.yaml            FNS 配置(后台管理)←  关键
/data/fns-runtime-config.yaml    Supervisor 渲染给 fns_cli 的临时 config
```

## 工作原理(FNS Supervisor)

`code/packages/server/src/fns-supervisor.ts` 做的事:

1. server 启动时:
   - 读 `/data/fns-config.yaml`
   - 如果 `enabled: true` 且 URL/token 都填了,渲染一份运行时 config 写到 `/data/fns-runtime-config.yaml`
   - `child_process.spawn('python3', ['-m', 'fns_cli.main', 'run', '-c', '...'])`
2. 监听 `settings.changed` 事件,如果 sections 含 `fns`:
   - SIGTERM 当前子进程
   - 重新读配置 → 重新 spawn
3. 子进程意外退出时:指数退避重启(1s / 5s / 15s / 30s / 60s)
4. 解析子进程 stdout 里的 `Authenticated`/`Connection lost` 等关键字,更新 `fns.last_status` 字段
5. SIGTERM/SIGINT 时优雅停掉

后台 UI 看到的"已连接 / 断开 / 错误 / 未知"状态,就是 supervisor 解析子进程日志后写回 `fns-config.yaml` 的 `last_status` 字段。
