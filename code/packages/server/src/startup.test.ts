import { describe, expect, it } from 'vitest';
import { runStartupSync } from './startup.js';

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
