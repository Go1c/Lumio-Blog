# Zeabur Deployment

This project deploys as a Node.js service. The repository root contains a small
deployment wrapper that installs and starts the real app in `code/`.

## GitHub Service

The repository includes `../zbpack.json`, so Zeabur should deploy the repository
root as a Node.js service with these commands:

```bash
pnpm build
pnpm start
```

`package.json` pins Node.js to `20.x` and pnpm to `9.7.0`.

If Zeabur still serves the repository root `index.html` static mockup instead
of the Node service, set these variables manually on the service:

```text
ZBPACK_APP_DIR=/
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
OPENNOTE_CONFIG=./config.zeabur.example.yaml
NODE_ENV=production
```

For a real domain, edit `config.zeabur.example.yaml` and replace
`site.url` with the public URL Zeabur assigns or your custom domain.

## First Content

After the service starts, put Markdown files in `/data/posts`. The server
creates missing data directories on startup, runs an initial sync, then watches
the vault for changes.
