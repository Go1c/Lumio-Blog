import { chmodSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { EventBus } from './events.js';
import { FnsSupervisor } from './fns-supervisor.js';

let tmp: string;
let cfgPath: string;
let fnsPath: string;

function writeBaseConfig(): void {
  writeFileSync(
    cfgPath,
    `site:\n  title: Test\n  url: https://example.test\nauthor:\n  name: Tester\npaths:\n  vault: ./vault\n  out: ./out\n  db: ./test.db\n`,
  );
}

function writeFnsConfig(extra = ''): void {
  writeFileSync(
    fnsPath,
    `enabled: true\napi_url: https://fast-note.example\ntoken: secret-token\nvault: notes\n${extra}`,
  );
}

function readFnsStatus(): {
  last_status?: string;
  last_status_at?: string;
  last_error?: string;
} {
  return (parseYaml(readFileSync(fnsPath, 'utf-8')) ?? {}) as {
    last_status?: string;
    last_status_at?: string;
    last_error?: string;
  };
}

function writeFakePython(source: string): string {
  const path = join(tmp, 'fake-python');
  writeFileSync(path, `#!${process.execPath}\n${source}`);
  chmodSync(path, 0o755);
  return path;
}

async function waitForStatus(status: string): Promise<void> {
  const deadline = Date.now() + 1200;
  while (Date.now() < deadline) {
    if (readFnsStatus().last_status === status) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for fns status ${status}; got ${readFnsStatus().last_status}`);
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'opennote-fns-'));
  cfgPath = join(tmp, 'config.yaml');
  fnsPath = join(tmp, 'fns-config.yaml');
  writeBaseConfig();
  process.env.OPENNOTE_CONFIG = cfgPath;
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  delete process.env.OPENNOTE_CONFIG;
});

describe('FnsSupervisor startup status', () => {
  it('writes an error status when the configured fns cli directory is missing', async () => {
    writeFnsConfig();

    const supervisor = new FnsSupervisor({
      vaultDir: join(tmp, 'vault'),
      configOutPath: join(tmp, 'runtime-fns.yaml'),
      cliDir: join(tmp, 'missing-cli'),
      bus: new EventBus(),
      log: () => undefined,
    });

    await supervisor.start();

    const fns = readFnsStatus();
    expect(fns.last_status).toBe('error');
    expect(fns.last_status_at).toBeTruthy();
    expect(fns.last_error).toContain('cli dir missing');
  });

  it('marks the service connected from the current Python client auth logs', async () => {
    writeFnsConfig();
    const fakePython = writeFakePython(`
console.log('WebSocket connected, sending auth');
console.log('Authentication successful');
setInterval(() => {}, 1000);
`);

    const supervisor = new FnsSupervisor({
      vaultDir: join(tmp, 'vault'),
      configOutPath: join(tmp, 'runtime-fns.yaml'),
      cliDir: tmp,
      python: fakePython,
      bus: new EventBus(),
      log: () => undefined,
    });

    try {
      await supervisor.start();
      await waitForStatus('connected');
      expect(readFnsStatus().last_error).toBeUndefined();
    } finally {
      await supervisor.stop();
    }
  });

  it('marks the service disconnected when the Python client reports connection loss', async () => {
    writeFnsConfig();
    const fakePython = writeFakePython(`
console.log('Authentication successful');
setTimeout(() => console.log('Connection lost: websocket listener ended'), 20);
setInterval(() => {}, 1000);
`);

    const supervisor = new FnsSupervisor({
      vaultDir: join(tmp, 'vault'),
      configOutPath: join(tmp, 'runtime-fns.yaml'),
      cliDir: tmp,
      python: fakePython,
      bus: new EventBus(),
      log: () => undefined,
    });

    try {
      await supervisor.start();
      await waitForStatus('disconnected');
      expect(readFnsStatus().last_error).toContain('Connection lost');
    } finally {
      await supervisor.stop();
    }
  });
});
