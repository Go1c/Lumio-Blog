#!/usr/bin/env bash
# Lumio-Blog 容器启动脚本
#
# 一个容器跑两个进程:
#   1) FastNodeSync CLI(Python)→ wss 同步 FNS Service 到 /data/posts
#   2) Lumio-Blog Node server   → watch /data/posts、渲染、HTTP 服务
#
# 共享磁盘卷 /data。两个进程之间通过文件系统通信。
#
# 必须的环境变量:
#   FNS_API_URL   FNS Service 的 https URL(如 https://fastnode.zeabur.app)
#   FNS_TOKEN     JWT bearer
#   FNS_VAULT     vault 名称(默认 "notes")
#   OPENNOTE_PASSWORD 后台密码(也可由 Lumio-Blog 的 config 提供)
#
# 可选:
#   FNS_DISABLED  设成 "1" 跳过 FNS 同步(本地纯文件部署)
#   LUMIO_VAULT_PATH  默认 /data/posts;改了的话 Lumio-Blog 的 config.yaml 也要同步改

set -euo pipefail

LUMIO_VAULT_PATH="${LUMIO_VAULT_PATH:-/data/posts}"
FNS_VAULT="${FNS_VAULT:-notes}"
export LUMIO_VAULT_PATH FNS_VAULT

# 创建必要目录
mkdir -p "$LUMIO_VAULT_PATH" /data/public /data/opennote /data/media /data/og /data/backups

# ── 1) FNS CLI ────────────────────────────────────────────────
if [[ "${FNS_DISABLED:-0}" == "1" ]]; then
  echo "[entrypoint] FNS_DISABLED=1 — skipping FastNodeSync CLI"
elif [[ -z "${FNS_API_URL:-}" || -z "${FNS_TOKEN:-}" ]]; then
  echo "[entrypoint] WARN: FNS_API_URL or FNS_TOKEN not set, skipping FastNodeSync CLI"
  echo "[entrypoint]       (set FNS_DISABLED=1 to silence this warning)"
else
  CFG=/data/fns-sync-config.yaml
  # 渲染 config — 用 envsubst 替换 ${VAR}
  envsubst < /app/fns-sync/config.template.yaml > "$CFG"

  echo "[entrypoint] starting FastNodeSync CLI..."
  echo "[entrypoint]   server: $FNS_API_URL"
  echo "[entrypoint]   vault:  $FNS_VAULT"
  echo "[entrypoint]   path:   $LUMIO_VAULT_PATH"

  # 后台跑,日志加上 [fns] 前缀方便 Zeabur 日志区分
  (cd /app/fns-sync && python3 -m fns_cli.main run -c "$CFG" 2>&1 | sed 's/^/[fns] /') &
  FNS_PID=$!

  # 容器退出时回收
  trap "kill $FNS_PID 2>/dev/null || true" EXIT TERM INT
fi

# ── 2) Lumio-Blog Node server ─────────────────────────────────
echo "[entrypoint] starting Lumio-Blog server..."
cd /app/code/packages/server
exec node --import tsx src/main.ts
