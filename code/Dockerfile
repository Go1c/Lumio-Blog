FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@9.7.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY config.yaml ./config.yaml

RUN pnpm install --frozen-lockfile --prod=false \
  && pnpm build

ENV NODE_ENV=production
ENV OPENNOTE_CONFIG=./config.yaml

EXPOSE 3000

CMD ["pnpm", "start"]
