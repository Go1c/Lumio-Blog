import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { removeStaleHtmlFiles } from './render-site.js';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('removeStaleHtmlFiles', () => {
  it('removes generated html files that are no longer expected', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'opennote-render-'));
    await mkdir(join(dir, 'nested'));
    await writeFile(join(dir, 'keep.html'), 'keep');
    await writeFile(join(dir, 'stale.html'), 'stale');
    await writeFile(join(dir, 'asset.txt'), 'asset');

    await removeStaleHtmlFiles(dir, new Set(['keep.html']));

    expect(await exists(join(dir, 'keep.html'))).toBe(true);
    expect(await exists(join(dir, 'stale.html'))).toBe(false);
    expect(await readFile(join(dir, 'asset.txt'), 'utf-8')).toBe('asset');
    expect(await exists(join(dir, 'nested'))).toBe(true);
  });
});
