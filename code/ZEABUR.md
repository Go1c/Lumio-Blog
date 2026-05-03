# Zeabur Deployment

This project deploys as a Node.js service from the `code/` workspace.

## GitHub Service

The repository includes `../zbpack.json`, so Zeabur should deploy the `code/`
directory with these commands:

```bash
pnpm build
pnpm start
```

`package.json` pins Node.js to `20.x` and pnpm to `9.7.0`.

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
