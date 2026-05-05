import { describe, it, expect } from 'vitest';
import {
  AssetPipeline,
  buildVaultIndex,
  extractSubtree,
  makeVaultLinkResolver,
  prerenderTransclusions,
  renderMarkdown,
  type VaultAsset,
  type VaultNoteRef,
} from './index.js';

function fakeVault(notes: Record<string, string>): {
  index: ReturnType<typeof buildVaultIndex>;
  bodies: Map<string, string>;
} {
  const refs: VaultNoteRef[] = [];
  const assets: VaultAsset[] = [];
  const bodies = new Map<string, string>();
  for (const path of Object.keys(notes)) {
    const stem = path.split('/').pop()!.replace(/\.md$/i, '');
    refs.push({ source_path: path, basename: path.split('/').pop()!, stem, slug: stem.toLowerCase(), kind: 'markdown' });
    bodies.set(path, notes[path] ?? '');
  }
  return { index: buildVaultIndex(refs, assets), bodies };
}

describe('extractSubtree', () => {
  it('returns the section under a heading until next same-level', () => {
    const md = `# Top

intro

## Section A

a body

## Section B

b body
`;
    const out = extractSubtree(md, 'Section A');
    expect(out).toContain('Section A');
    expect(out).toContain('a body');
    expect(out).not.toContain('Section B');
  });

  it('returns single-line block for ^block-id', () => {
    const md = `paragraph one ^foo

paragraph two`;
    expect(extractSubtree(md, '^foo')).toBe('paragraph one');
  });

  it('returns empty when anchor not found', () => {
    expect(extractSubtree('# A\n\ntext', 'B')).toBe('');
    expect(extractSubtree('# A\n\ntext', '^missing')).toBe('');
  });
});

describe('prerenderTransclusions', () => {
  it('renders embedded note body, supports heading subset', async () => {
    const { index, bodies } = fakeVault({
      'Other.md': '# Other Note\n\n## Highlighted Section\n\nthe content I want\n\n## Skip This\n\ndo not show',
    });
    const map = await prerenderTransclusions({
      body: 'See ![[Other]] and just ![[Other#Highlighted Section]]',
      ctx: {
        index,
        pipeline: new AssetPipeline({ outRoot: '/tmp', subdir: '_a', urlPrefix: '/_a' }),
        publishedByPath: new Map(),
        readNoteBody: async (sp) => bodies.get(sp) ?? null,
        maxDepth: 1,
      },
    });
    expect(map.has('Other')).toBe(true);
    expect(map.has('Other#Highlighted Section')).toBe(true);

    const fullEmbed = map.get('Other')!;
    expect(fullEmbed).toContain('Other Note');
    expect(fullEmbed).toContain('the content I want');
    expect(fullEmbed).toContain('Skip This');

    const sectionEmbed = map.get('Other#Highlighted Section')!;
    expect(sectionEmbed).toContain('Highlighted Section');
    expect(sectionEmbed).toContain('the content I want');
    expect(sectionEmbed).not.toContain('Skip This');
  });

  it('breaks cycles: A embeds B which embeds A', async () => {
    const { index, bodies } = fakeVault({
      'A.md': 'A says hi\n\n![[B]]',
      'B.md': 'B replies\n\n![[A]]',
    });
    const map = await prerenderTransclusions({
      body: '![[A]]',
      ctx: {
        index,
        pipeline: new AssetPipeline({ outRoot: '/tmp', subdir: '_a', urlPrefix: '/_a' }),
        publishedByPath: new Map(),
        readNoteBody: async (sp) => bodies.get(sp) ?? null,
        maxDepth: 3, // 给足深度,但 visited set 阻止环
      },
    });
    expect(map.has('A')).toBe(true);
    const html = map.get('A')!;
    expect(html).toContain('A says hi');
    // B 被嵌入了
    expect(html).toContain('B replies');
    // A 不应在 B 的嵌入里再一次出现(stub OK,不可能再次完整)
    const aOccurrences = (html.match(/A says hi/g) ?? []).length;
    expect(aOccurrences).toBe(1);
  });

  it('full pipeline: ![[Other]] in a markdown body produces embed-note html', async () => {
    const { index, bodies } = fakeVault({
      'Other.md': '# Other\n\nbody\n\n![[image.png]]',
    });
    const pipeline = new AssetPipeline({ outRoot: '/tmp', subdir: '_a', urlPrefix: '/_a' });
    const publishedByPath = new Map<string, { url: string; bytes: number; filename: string; mime: string }>();

    const transclusionMap = await prerenderTransclusions({
      body: 'Wrapper:\n\n![[Other]]\n\nthen tail',
      ctx: {
        index,
        pipeline,
        publishedByPath,
        readNoteBody: async (sp) => bodies.get(sp) ?? null,
        maxDepth: 1,
      },
    });
    expect(transclusionMap.size).toBe(1);

    const resolveLink = makeVaultLinkResolver({
      index,
      pipeline,
      publishedByPath,
      transclusionMap,
    });

    const r = await renderMarkdown({
      body: 'Wrapper:\n\n![[Other]]\n\nthen tail',
      resolveLink,
    });

    expect(r.html).toContain('class="internal-embed embed-note"');
    expect(r.html).toContain('embed-note__title');
    // 内嵌的 # Other heading 也被渲染了
    expect(r.html).toContain('Other');
    expect(r.html).toContain('body');
    expect(r.html).not.toContain('is-stub'); // 已展开,不应是 stub
  });

  it('falls back to stub for missing target', async () => {
    const { index, bodies } = fakeVault({});
    const map = await prerenderTransclusions({
      body: '![[NonExistent]]',
      ctx: {
        index,
        pipeline: new AssetPipeline({ outRoot: '/tmp', subdir: '_a', urlPrefix: '/_a' }),
        publishedByPath: new Map(),
        readNoteBody: async (sp) => bodies.get(sp) ?? null,
      },
    });
    expect(map.size).toBe(0);

    // 主 render:走 broken 分支
    const r = await renderMarkdown({
      body: '![[NonExistent]]',
      resolveLink: makeVaultLinkResolver({
        index,
        pipeline: new AssetPipeline({ outRoot: '/tmp', subdir: '_a', urlPrefix: '/_a' }),
        publishedByPath: new Map(),
        transclusionMap: map,
      }),
    });
    expect(r.html).toContain('is-unresolved');
  });
});
