import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
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
    writeFileSync(
      fnsPath,
      `enabled: true\napi_url: https://fast-note.example\ntoken: secret-token\nvault: notes\n`,
    );

    const supervisor = new FnsSupervisor({
      vaultDir: join(tmp, 'vault'),
      configOutPath: join(tmp, 'runtime-fns.yaml'),
      cliDir: join(tmp, 'missing-cli'),
      bus: new EventBus(),
      log: () => undefined,
    });

    await supervisor.start();

    const fns = parseYaml(readFileSync(fnsPath, 'utf-8')) as {
      last_status?: string;
      last_status_at?: string;
      last_error?: string;
    };
    expect(fns.last_status).toBe('error');
    expect(fns.last_status_at).toBeTruthy();
    expect(fns.last_error).toContain('cli dir missing');
  });
});
