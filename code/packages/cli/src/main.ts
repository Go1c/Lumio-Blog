#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openDb } from '@opennote/db';
import { syncAll } from '@opennote/sync';
import { renderSite } from '@opennote/web-public';
import { loadConfig } from '@opennote/server';

const cmd = process.argv[2];
const args = process.argv.slice(3);

function log(msg: string): void {
  console.log(`[opennote] ${msg}`);
}

function resolveCfgPaths(cfgPath: string, p: string): string {
  return p.startsWith('/') ? p : resolve(dirname(resolve(cfgPath)), p);
}

async function init(): Promise<void> {
  const dir = resolve(args[0] ?? './my-vault');
  await mkdir(dir, { recursive: true });
  await mkdir(`${dir}/posts`, { recursive: true });

  await writeFile(
    `${dir}/config.yaml`,
    `site:
  title: My OpenNote
  url: http://localhost:3000
  description: A self-hosted notes blog
  language: zh-CN
author:
  name: Anonymous
paths:
  vault: ./posts
  out: ./.opennote/public
  db: ./.opennote/index.db
`,
  );

  await writeFile(
    `${dir}/posts/hello.md`,
    `---
title: Hello, OpenNote
visibility: public
tags: [meta]
---

# 你好，OpenNote

这是你 vault 里的第一篇笔记。

- 改 frontmatter 里的 \`visibility\` 控制谁能看到
- 用 \`[[wikilink]]\` 链接到其他笔记
- 保存后前台自动重建

试试 \`opennote serve\` 启动本地预览。
`,
  );

  await writeFile(
    `${dir}/posts/private-note.md`,
    `---
title: 一篇私密笔记
visibility: private
---

只有登录后台的你能看到这一篇。
`,
  );

  log(`✓ 初始化完成 → ${dir}`);
  log(`下一步：cd ${dir} && OPENNOTE_PASSWORD=secret OPENNOTE_CONFIG=./config.yaml opennote serve`);
}

async function syncOnce(): Promise<void> {
  const cfgPath = process.env.OPENNOTE_CONFIG ?? './config.yaml';
  const config = await loadConfig(cfgPath);
  const dbPath = resolveCfgPaths(cfgPath, config.paths.db);
  const out = resolveCfgPaths(cfgPath, config.paths.out);
  const vault = resolveCfgPaths(cfgPath, config.paths.vault);
  await mkdir(dirname(dbPath), { recursive: true });
  await mkdir(out, { recursive: true });
  const db = openDb(dbPath);
  const stats = await syncAll({
    vault,
    db,
    onLog: (level, msg, meta) =>
      console.log(JSON.stringify({ level, event: msg, ...(meta as object | undefined) })),
  });
  await renderSite({ db, out, config });
  log(`同步完成 → +${stats.added} ~${stats.modified} -${stats.removed} (${stats.duration_ms}ms)`);
}

/**
 * serve 直接 spawn `tsx server/src/main.ts`。
 * 这样 cli 不依赖 server 内部如何启动；只要它在同一个 monorepo。
 */
async function serve(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  // dev: cli/src/main.ts → ../../server/src/main.ts
  // prod: cli/dist/main.js → ../../server/dist/main.js
  const candidates = [
    resolve(here, '../../server/src/main.ts'),
    resolve(here, '../../server/dist/main.js'),
    resolve(here, '../server/src/main.ts'),
    resolve(here, '../server/dist/main.js'),
  ];
  const { existsSync } = await import('node:fs');
  const target = candidates.find((p) => existsSync(p));
  if (!target) {
    throw new Error(
      'cannot locate server entry. set OPENNOTE_SERVER_ENTRY or build the server package.',
    );
  }
  const isTs = target.endsWith('.ts');
  const runner = isTs ? 'tsx' : process.execPath;
  const argv = isTs ? [target] : [target];
  const child = spawn(runner, argv, { stdio: 'inherit', env: process.env });
  child.on('exit', (code) => process.exit(code ?? 0));
}

async function main(): Promise<void> {
  switch (cmd) {
    case 'init':
      return init();
    case 'sync':
      return syncOnce();
    case 'serve':
      return serve();
    case 'version':
    case '--version':
    case '-v':
      console.log('opennote v0.5.0');
      return;
    default:
      console.log(`opennote v0.5

usage:
  opennote init [dir]      新建 vault
  opennote sync            一次性同步（不起 server）
  opennote serve           起本地 server（含 watcher）
  opennote version

env:
  OPENNOTE_CONFIG          config.yaml 路径（默认 ./config.yaml）
  OPENNOTE_PASSWORD        登录密码（serve 时必需）
  PORT                     server 端口（默认 3000）
`);
  }
}

main().catch((e) => {
  console.error(`[opennote] error: ${(e as Error).message}`);
  process.exit(1);
});
