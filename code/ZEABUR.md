# Zeabur Deployment

This project deploys from the Dockerfile in the repository root.

## GitHub Service

In Zeabur, keep the service **Root Directory** empty or `/` so the platform sees:

```text
Dockerfile
```

Zeabur should detect the root Dockerfile automatically. Clear any manually set
build/start command overrides; the Dockerfile owns installation, build, and startup.

The container runs:

```bash
pnpm install --frozen-lockfile --prod=false
pnpm build
pnpm start
```

`package.json` pins Node.js to `20.x` and pnpm to `9.7.0`.

If Zeabur serves files from the repository root instead of the Node service, set
the service root manually:

```text
Root Directory=/
Builder=Dockerfile
```

The runtime logs should contain `opennote v0.5 -> http://localhost:<port>`. If
you only see Caddy logs, Zeabur is not using the Dockerfile yet.

## Persistent Data

Add a Zeabur volume mounted at:

```text
/data
```

OpenNote stores the Obsidian vault, generated static site, and SQLite database
there:

```yaml
paths:
  vault: /data/posts
  out: /data/public
  db: /data/opennote/index.db
```

## Environment Variables

Set these in Zeabur:

```text
OPENNOTE_PASSWORD=<strong admin password>
NODE_ENV=production
```

`OPENNOTE_CONFIG` is optional now. By default the server reads `./config.yaml`
from the `code` directory. For a custom domain, edit `config.yaml` and replace
`site.url` with the public URL Zeabur assigns or your custom domain.

## First Content

After the service starts, put Markdown files in `/data/posts`. The server
creates missing data directories on startup, runs an initial sync, then watches
the vault for changes.
