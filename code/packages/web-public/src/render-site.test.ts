import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { composeStyles, HTML_ALIAS_FILES, removeStaleHtmlFiles, STATIC_ASSETS } from './render-site.js';

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

describe('static assets', () => {
  it('includes a root favicon so browsers do not hit a 404', () => {
    expect(STATIC_ASSETS).toContain('favicon.ico');
  });

  it('publishes extensionless-friendly aliases for about and RSS URLs', () => {
    expect(HTML_ALIAS_FILES).toContainEqual({ source: 'about.html', alias: 'about/index.html' });
    expect(HTML_ALIAS_FILES).toContainEqual({ source: 'feed.xml', alias: 'rss.xml' });
  });
});

describe('composeStyles', () => {
  it('keeps Lumio text tokens scoped after global dark-mode fallback', () => {
    const styles = composeStyles('');
    const darkFallbackIndex = styles.indexOf('@media (prefers-color-scheme: dark)');
    const lumioBodyIndex = styles.indexOf('body.ui-public.lumio-public {\n  --primary: #7C8CFF;');

    expect(darkFallbackIndex).toBeGreaterThan(-1);
    expect(lumioBodyIndex).toBeGreaterThan(darkFallbackIndex);
    expect(styles.slice(lumioBodyIndex)).toContain('--ink: #1E2A3A;');
    expect(styles.slice(lumioBodyIndex)).toContain('color-scheme: light;');
  });

  it('appends Lumio article contrast overrides after Obsidian prose defaults', () => {
    const obsidianCss = '.hf-prose { color: var(--ob-text-normal); }';
    const styles = composeStyles(obsidianCss);
    const obsidianIndex = styles.indexOf(obsidianCss);
    const lumioIndex = styles.indexOf('body.ui-public.lumio-public .post-prose {');

    expect(obsidianIndex).toBeGreaterThan(-1);
    expect(lumioIndex).toBeGreaterThan(obsidianIndex);
    expect(styles).toContain('--ob-text-normal: #1E2A3A');
    expect(styles).toContain('body.ui-public.lumio-public .post-prose.hf-prose p');
    expect(styles).toContain('color: #1E2A3A');
  });
});
