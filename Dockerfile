FROM node:20-bookworm-slim

WORKDIR /app/code

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@9.7.0

COPY code/package.json code/pnpm-lock.yaml code/pnpm-workspace.yaml code/tsconfig.base.json ./
COPY code/packages ./packages
COPY code/config.yaml ./config.yaml

RUN pnpm install --frozen-lockfile --prod=false \
  && pnpm build

RUN mkdir -p /data/posts /data/public /data/opennote

ENV NODE_ENV=production
ENV OPENNOTE_CONFIG=/app/code/config.yaml

EXPOSE 3000

WORKDIR /app/code/packages/server

CMD ["node", "--import", "tsx", "src/main.ts"]
