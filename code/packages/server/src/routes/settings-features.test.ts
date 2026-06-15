import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { loadFeaturesYaml, saveFeaturesYaml } from './settings.js';

describe('features.yaml compatibility', () => {
  it('migrates legacy agent CLI config to local workflow config', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'opennote-features-'));
    const file = join(dir, 'features.yaml');
    await writeFile(
      file,
      [
        'content:',
        '  comments: true',
        '  newsletter: true',
        '  rss: true',
        '  graph: true',
        '  search: true',
        '  short_links: true',
        '  post_summary: false',
        'admin:',
        '  analytics: true',
        '  media_library: true',
        '  api_tokens: true',
        '  webhooks: true',
        '  og_generator: true',
        'agent:',
        '  cli_enabled: false',
        'webhooks: []',
        '',
      ].join('\n'),
      'utf-8',
    );

    const features = await loadFeaturesYaml(file);

    expect(features.workflow).toEqual({ cli_enabled: false });
    expect(features).not.toHaveProperty('agent');

    await saveFeaturesYaml(features, file);
    const saved = await readFile(file, 'utf-8');
    expect(saved).toContain('workflow:');
    expect(saved).not.toContain('agent:');
  });
});
