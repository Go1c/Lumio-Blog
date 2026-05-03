# Zeabur Deployment

This project deploys as a Node.js service from the `code/` directory. Keep the
Git repository root clean; configure Zeabur to use `code` as the service root.

## GitHub Service

In Zeabur, set the service **Root Directory** to:

```text
code
```

Then use these commands:

```bash
pnpm build
pnpm start
```

`package.json` pins Node.js to `20.x` and pnpm to `9.7.0`.

If Zeabur serves files from the repository root instead of the Node service, set
these variables manually on the service:

```text
ZBPACK_APP_DIR=code
ZBPACK_BUILD_COMMAND=pnpm build
ZBPACK_START_COMMAND=pnpm start
ZBPACK_CACHE_DEPENDENCIES=false
```

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
