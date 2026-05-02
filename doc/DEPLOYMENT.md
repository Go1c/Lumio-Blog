# 部署

三种推荐姿势：

1. [**Cloudflare Pages + 家用盒子**](#1-cloudflare-pages--家用盒子) — 极简，前台 CDN 免费，后端只跑同步
2. [**Docker compose 单机自托管**](#2-docker-compose-单机自托管) — 一台 VPS 全包
3. [**生产级多副本**](#3-生产级多副本可选) — 多人协作 / 高流量

无论哪种，核心都是：**`fast-note-sync` 监听文件变更 → 重新生成静态站点 + 索引**。

---

## 1. Cloudflare Pages + 家用盒子

最便宜、最快、维护最少。适合个人写作。

```
[你电脑 / NAS]                   [Cloudflare]
┌────────────────┐               ┌─────────────────┐
│ Obsidian vault │               │ Pages (CDN)     │
│      ↓         │  git push     │ — 前台 HTML/RSS │
│ fast-note-sync ├──────────────→│ — OG 图静态资源 │
│ 构建 public/   │               │                 │
│      ↓         │               │ Workers / D1    │
│ git push       │               │ — /api/* 后台   │
└────────────────┘               │ — 搜索 (D1)     │
                                 └─────────────────┘
```

### 步骤

#### 1.1 Vault 仓库

```bash
cd ~/Documents/vault
git init
git remote add origin git@github.com:you/vault.git   # 私有仓库
git add . && git commit -m "init"
git push -u origin main
```

#### 1.2 站点仓库（Lumio）

```bash
git clone https://github.com/you/Lumio-Blog
cd Lumio-Blog
pnpm install
cp .env.example .env

# .env 改这几个：
# SITE_URL=https://your.domain
# VAULT_GIT_URL=git@github.com:you/vault.git
# VAULT_DEPLOY_KEY=<base64 私钥>
# AUTH_PROVIDERS=github
# GITHUB_OAUTH_ID=...
# GITHUB_OAUTH_SECRET=...
```

#### 1.3 部署到 Cloudflare

```bash
# 一次性配置
pnpm wrangler pages project create lumio-blog
pnpm wrangler d1 create lumio-index
# 把生成的 database_id 填回 wrangler.toml

# 推上去
git push   # GitHub Actions 自动跑 build + 部署
```

GitHub Actions（仓库自带 `.github/workflows/deploy.yml`）会：

1. checkout `vault` 仓库（用 deploy key）
2. 跑 `fast-note-sync build --vault ./vault --out ./public`
3. 推 `public/` 到 Cloudflare Pages
4. 把 SQLite 索引 sync 到 D1

#### 1.4 自动同步

vault 这边装个 git hook 或者直接用 Obsidian Git 插件，写完按下"sync"就推，几分钟后站点更新。

如果你想**实时**同步（保存即上线），跑本地 `fast-note-sync watch` daemon，它会监听文件 → 自动 commit + push。

---

## 2. Docker compose 单机自托管

一台 VPS 跑全套。适合不想吃 Cloudflare 账户的人。

### 2.1 docker-compose.yml

```yaml
version: "3.9"

services:
  web:
    image: ghcr.io/you/lumio-blog:latest
    restart: unless-stopped
    environment:
      SITE_URL: https://lumio.games
      DATABASE_URL: sqlite:/data/index.db
      VAULT_PATH: /vault
      AUTH_PROVIDERS: github
      AUTH_SECRET: ${AUTH_SECRET}
      GITHUB_OAUTH_ID: ${GITHUB_OAUTH_ID}
      GITHUB_OAUTH_SECRET: ${GITHUB_OAUTH_SECRET}
    volumes:
      - ./data:/data
      - ./vault:/vault:ro          # 只读挂你的 vault
      - ./public:/app/public       # 构建产物（被 nginx 读）
    ports:
      - "127.0.0.1:3000:3000"

  sync:
    image: ghcr.io/you/fast-note-sync:latest
    restart: unless-stopped
    command: ["watch", "--vault", "/vault", "--out", "/app/public", "--db", "/data/index.db"]
    volumes:
      - ./data:/data
      - ./vault:/vault:ro
      - ./public:/app/public

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./public:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on: [web]
```

### 2.2 nginx.conf 关键路由

```nginx
server {
  listen 443 ssl http2;
  server_name lumio.games;

  ssl_certificate     /etc/nginx/certs/fullchain.pem;
  ssl_certificate_key /etc/nginx/certs/privkey.pem;

  # 静态文件直出
  location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ $uri.html =404;
  }

  # 后台 + API → web container
  location ~ ^/(admin|api|n)/ {
    proxy_pass http://web:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # SSE 长连接
  location /api/changes {
    proxy_pass http://web:3000;
    proxy_buffering off;
    proxy_read_timeout 24h;
  }
}
```

### 2.3 起服务

```bash
docker compose up -d
docker compose logs -f sync       # 看初次全量同步
```

### 2.4 备份

只需要备份两样：

- `vault/` — 你的笔记（你应该已经在 git 里了）
- `data/index.db` — 不重要，丢了重新跑 `fast-note-sync rebuild` 即可

媒体文件如果不在 vault 里，记得把 `public/static/` 也备一下。

---

## 3. 生产级多副本（可选）

如果你真的有多人协作 / 高流量需求：

```
                     ┌───────────────┐
                     │  Postgres     │
                     │  + Redis      │
                     └───────┬───────┘
                             │
        ┌────────────────────┼─────────────────────┐
        ▼                    ▼                     ▼
 ┌──────────────┐    ┌──────────────┐     ┌──────────────┐
 │ web (副本 1) │    │ web (副本 2) │     │ sync         │
 │              │    │              │     │ (单实例)     │
 └──────┬───────┘    └──────┬───────┘     └──────┬───────┘
        │                   │                    │
        └───────────────────┴────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │ S3 / R2 (媒体)    │
                  │ + 共享文件系统    │
                  │ (vault NFS / EFS) │
                  └───────────────────┘
```

差异：

- `DATABASE_URL=postgres://...`
- `REDIS_URL=redis://...`（缓存 + pub/sub 通知 web 副本"内容变了"）
- vault 挂在共享文件系统，sync 只跑一个实例（避免重复构建）
- 媒体走 S3 / R2

不推荐普通用户用这套。Lumio 的设计就是给单作者优化的，多副本属于"可以但没必要"。

---

## 域名 + HTTPS

### 自托管走 Caddy 比较省心

把 nginx 换成 caddy：

```
lumio.games {
  reverse_proxy /admin/* web:3000
  reverse_proxy /api/* web:3000
  reverse_proxy /n/* web:3000
  root * /usr/share/nginx/html
  try_files {path} {path}.html
  file_server
}
```

Caddy 自动申请 / 续期 Let's Encrypt 证书，不用自己配 certbot。

### Cloudflare 部署

证书 / DNS Cloudflare 都帮你搞定。Pages 自带 \*.pages.dev 域名，绑你的自定义域名只需 DNS CNAME。

---

## 监控 / 日志

最低配置：

- `docker compose logs web sync` — 直接看
- 把 `web` 的 stdout 接到 Loki / Vector / journald
- `fast-note-sync` 输出 JSON 行日志，方便后处理

如果上线想加：

- Plausible / Umami — 站点流量
- Sentry — 后端异常
- Healthcheck endpoint：`GET /api/health` 返回 `{ ok: true, last_sync: "...", note_count: N }`

---

## 升级

```bash
# 自托管
docker compose pull
docker compose up -d
docker compose exec sync fast-note-sync rebuild   # 万一 schema 变了

# Cloudflare
git pull && git push   # GitHub Actions 自动 deploy
```

升级前看 [`CHANGELOG.md`](../CHANGELOG.md)，里面会标 frontmatter / config 的破坏性变更。
