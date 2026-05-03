#!/usr/bin/env bash
# Lumio-Blog 容器启动脚本
#
# FastNodeSync 的配置已经由后台管理(/admin/#/settings/fns),
# server 启动后从 /data/fns-config.yaml 读取,自动 spawn Python 子进程。
# 这里只需要前台启动 Lumio server 即可。
#
# 第一次启动时,如果环境里有 FNS_API_URL / FNS_TOKEN / FNS_VAULT,
# 会被写到 /data/fns-config.yaml(只在文件不存在时,作为初始化兜底)。
# 之后改动一律走后台 UI。

set -euo pipefail

LUMIO_VAULT_PATH="${LUMIO_VAULT_PATH:-/data/posts}"
FNS_CONFIG_PATH="${OPENNOTE_FNS_CONFIG:-/data/fns-config.yaml}"
export LUMIO_VAULT_PATH OPENNOTE_FNS_CONFIG="$FNS_CONFIG_PATH"

# 创建必要目录
mkdir -p "$LUMIO_VAULT_PATH" /data/public /data/opennote /data/media /data/og /data/backups

# ── 首次启动:env → fns-config.yaml(只迁移一次) ────────────────
if [[ ! -f "$FNS_CONFIG_PATH" ]] && [[ -n "${FNS_API_URL:-}" ]] && [[ -n "${FNS_TOKEN:-}" ]]; then
  echo "[entrypoint] first-boot: seeding fns-config.yaml from env"
  cat > "$FNS_CONFIG_PATH" <<EOF
enabled: true
api_url: "${FNS_API_URL}"
token: "${FNS_TOKEN}"
vault: "${FNS_VAULT:-notes}"
EOF
fi

# ── 启动 Lumio-Blog server(它会自己管 fns 子进程)─────────────
echo "[entrypoint] starting Lumio-Blog server..."
cd /app/code/packages/server
exec node --import tsx src/main.ts
