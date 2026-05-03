FROM node:20-bookworm-slim

WORKDIR /app/code

# OS deps:
#   python3 + pip → FastNodeSync CLI(Python)
#   make / g++   → 编 better-sqlite3 之类原生模块
#   gettext-base → entrypoint.sh 用的 envsubst
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       python3 python3-pip python3-venv \
       make g++ \
       gettext-base \
       ca-certificates \
       tini \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@9.7.0

# ── Node side: Lumio-Blog ──────────────────────────────────────────
COPY code/package.json code/pnpm-lock.yaml code/pnpm-workspace.yaml code/tsconfig.base.json ./
COPY code/packages ./packages
COPY code/config.yaml ./config.yaml

RUN pnpm install --frozen-lockfile --prod=false \
  && pnpm build

# ── Python side: FastNodeSync CLI(从仓库 vendor 进来) ──────────
COPY deploy/fns-sync /app/fns-sync
RUN pip3 install --break-system-packages --no-cache-dir -r /app/fns-sync/requirements.txt

# ── 启动脚本 ──────────────────────────────────────────────────────
COPY deploy/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 数据卷
RUN mkdir -p /data/posts /data/public /data/opennote /data/media /data/og /data/backups
VOLUME /data

ENV NODE_ENV=production
ENV OPENNOTE_CONFIG=/app/code/config.yaml
ENV LUMIO_VAULT_PATH=/data/posts

EXPOSE 3000

# tini 当 PID1,优雅处理子进程信号(否则 ctrl-C / kill 时 fns-cli 不退出)
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/app/entrypoint.sh"]
