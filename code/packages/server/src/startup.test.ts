import { describe, expect, it } from 'vitest';
import { createShutdownHandler, runStartupSync, stopRuntime } from './startup.js';

describe('runStartupSync', () => {
  it('logs and keeps booting when the initial sync/render fails', async () => {
    const events: Array<{ level: string; event: string; meta?: unknown }> = [];

    await expect(runStartupSync(
      async () => {
        throw new Error('render exploded');
      },
      (level, event, meta) => events.push({ level, event, meta }),
    )).resolves.toBe(false);

    expect(events).toHaveLength(1);
    expect(events[0]?.level).toBe('error');
    expect(events[0]?.event).toBe('startup.sync.failed');
    expect(JSON.stringify(events[0]?.meta)).toContain('render exploded');
  });
});

describe('stopRuntime', () => {
  it('stops background workers and closes the HTTP server', async () => {
    const calls: string[] = [];

    await stopRuntime({
      stopBackground: async () => { calls.push('stop-background'); },
      closeServer: async () => { calls.push('close-server'); },
      log: () => undefined,
    });

    expect(calls).toEqual(['stop-background', 'close-server']);
  });

  it('logs stop failures and still closes the HTTP server', async () => {
    const calls: string[] = [];
    const events: Array<{ level: string; event: string; meta?: unknown }> = [];

    await stopRuntime({
      stopBackground: async () => {
        calls.push('stop-background');
        throw new Error('fns stop failed');
      },
      closeServer: async () => { calls.push('close-server'); },
      log: (level, event, meta) => events.push({ level, event, meta }),
    });

    expect(calls).toEqual(['stop-background', 'close-server']);
    expect(events[0]?.level).toBe('error');
    expect(events[0]?.event).toBe('shutdown.background.failed');
    expect(JSON.stringify(events[0]?.meta)).toContain('fns stop failed');
  });
});

describe('createShutdownHandler', () => {
  it('exits after shutdown work completes', async () => {
    const calls: string[] = [];
    const handler = createShutdownHandler({
      stopRuntime: async () => { calls.push('stop-runtime'); },
      log: () => undefined,
      exit: (code) => { calls.push(`exit:${code}`); },
      setTimeout: () => {
        calls.push('set-timeout');
        return 7;
      },
      clearTimeout: (timer) => { calls.push(`clear-timeout:${timer}`); },
    });

    handler('SIGTERM');
    await new Promise<void>((resolve) => { setImmediate(resolve); });

    expect(calls).toEqual([
      'set-timeout',
      'stop-runtime',
      'clear-timeout:7',
      'exit:0',
    ]);
  });

  it('does not run shutdown twice for repeated signals', async () => {
    let runs = 0;
    const handler = createShutdownHandler({
      stopRuntime: async () => { runs += 1; },
      log: () => undefined,
      exit: () => undefined,
      setTimeout: () => 7,
      clearTimeout: () => undefined,
    });

    handler('SIGTERM');
    handler('SIGINT');
    await new Promise<void>((resolve) => { setImmediate(resolve); });

    expect(runs).toBe(1);
  });
});
