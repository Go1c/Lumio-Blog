import { describe, it, expect, beforeEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  AssetPipeline,
  buildVaultIndex,
  makeVaultLinkResolver,
  parseCanvas,
  prepublishMarkdownAssets,
  prepublishCanvasAssets,
  renderCanvas,
  renderHtmlNote,
  renderMarkdown,
  walkVault,
} from './index.js';

let tmp: string;
let vault: string;
let out: string;

beforeEach(async () => {
  tmp = await mkdtemp();
  vault = join(tmp, 'vault');
  out = join(tmp, 'out');
  await mkdir(vault, { recursive: true });
  await mkdir(out, { recursive: true });
});

async function mkdtemp(): Promise<string> {
  const p = join(tmpdir(), `obsidian-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(p, { recursive: true });
  return p;
}

async function buildVault(files: Record<string, string | Buffer>): Promise<void> {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(vault, rel);
    await mkdir(join(abs, '..'), { recursive: true });
    await writeFile(abs, content);
  }
}

describe('full vault → render pipeline', () => {
  it('walks vault, indexes notes + assets, resolves wikilinks and embeds, copies assets', async () => {
    await buildVault({
      'OtherNote.md': '# Other\n\nbody',
      'Sub/Embedded.md': 'embed body',
      '附件/Pasted image 20260326.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02]),
      '附件/clip.mp4': Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
      'Main.md': [
        '# Main',
        '',
        'See [[OtherNote]] and [[OtherNote|alias]].',
        '',
        '![[附件/Pasted image 20260326.png]]',
        '',
        '![[附件/clip.mp4]]',
        '',
        '> [!warning] Heads up',
        '> careful here',
        '',
        '==important== text and a #foo tag',
        '',
        '- [ ] todo',
        '- [/] in progress',
        '- [x] done',
      ].join('\n'),
    });

    const { notes, assets } = await walkVault(vault);
    expect(notes.length).toBe(3);
    expect(assets.length).toBe(2);

    const indexed = notes.map((n) => ({ ...n, slug: n.stem.toLowerCase() }));
    const index = buildVaultIndex(indexed, assets);
    const pipeline = new AssetPipeline({ outRoot: out, subdir: '_attachments', urlPrefix: '/_attachments' });
    const publishedByPath = new Map<string, { url: string; bytes: number; filename: string; mime: string }>();

    const body = (await readFromVault('Main.md'));

    await prepublishMarkdownAssets({ body, index, pipeline, publishedByPath });
    expect(publishedByPath.size).toBe(2);

    const resolveLink = makeVaultLinkResolver({ index, pipeline, publishedByPath });
    const r = await renderMarkdown({ body, resolveLink });

    // wikilink
    expect(r.html).toContain('class="internal-link"');
    expect(r.html).toContain('href="/posts/othernote.html"');
    // embed image
    expect(r.html).toMatch(/<img[^>]+src="\/_attachments\/Pasted%20image%2020260326\.[a-f0-9]+\.png"/);
    // embed video
    expect(r.html).toMatch(/<video[^>]+controls/);
    // callout
    expect(r.html).toContain('callout--warning');
    expect(r.html).toContain('Heads up');
    // highlight
    expect(r.html).toContain('<mark class="cm-highlight">important</mark>');
    // tag
    expect(r.html).toContain('class="cm-tag"');
    // tasks
    expect(r.html).toContain('task-unchecked');
    expect(r.html).toContain('task-slash');
    expect(r.html).toContain('task-x');
    // headings
    expect(r.headings.find((h) => h.text === 'Main')?.id).toBe('main');

    // backlinks (notes only)
    expect(r.links.find((l) => l.kind === 'note')?.resolved).toBe('othernote');
    // asset refs
    expect(r.links.filter((l) => l.kind === 'asset').length).toBe(2);
  });

  it('renders canvas with text/file/link nodes and arrows', async () => {
    await buildVault({
      'OtherNote.md': '# Other',
      'graph.canvas': JSON.stringify({
        nodes: [
          { id: 'n1', type: 'text', text: '# Hello\n\nfrom canvas', x: 0, y: 0, width: 200, height: 100, color: '1' },
          { id: 'n2', type: 'file', file: 'OtherNote.md', x: 300, y: 0, width: 200, height: 100, color: '4' },
          { id: 'n3', type: 'link', url: 'https://example.com', x: 0, y: 200, width: 200, height: 100 },
          { id: 'g1', type: 'group', label: 'Cluster A', x: -20, y: -20, width: 540, height: 360, color: '2' },
        ],
        edges: [
          { id: 'e1', fromNode: 'n1', toNode: 'n2', label: 'links to' },
          { id: 'e2', fromNode: 'n2', toNode: 'n3', fromSide: 'bottom', toSide: 'top' },
        ],
      }),
    });

    const { notes, assets } = await walkVault(vault);
    const indexed = notes.map((n) => ({ ...n, slug: n.stem.toLowerCase() }));
    const index = buildVaultIndex(indexed, assets);
    const pipeline = new AssetPipeline({ outRoot: out, subdir: '_attachments', urlPrefix: '/_attachments' });
    const publishedByPath = new Map<string, { url: string; bytes: number; filename: string; mime: string }>();

    const json = await readFromVault('graph.canvas');

    const doc = parseCanvas(json);
    expect(doc.nodes.length).toBe(4);
    expect(doc.edges.length).toBe(2);

    await prepublishCanvasAssets({ json, index, pipeline, publishedByPath });

    const resolveLink = makeVaultLinkResolver({ index, pipeline, publishedByPath });
    const html = await renderCanvas({
      json,
      resolveLink,
      renderInlineMarkdown: async (md) => (await renderMarkdown({ body: md, resolveLink })).html,
    });

    expect(html).toContain('class="ob-canvas"');
    expect(html).toContain('Hello'); // markdown rendered text node
    expect(html).toContain('href="/posts/othernote.html"'); // file node
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('Cluster A');
    expect(html).toContain('marker-end');
  });

  it('renders html note: rewrites <img src=> to published assets, wraps in iframe', async () => {
    await buildVault({
      'attach/photo.jpg': Buffer.from([0xff, 0xd8, 0xff]),
      'OtherNote.md': '# Other',
      'report.html': '<!doctype html><html><body><h1>Report</h1><img src="attach/photo.jpg"><a href="OtherNote.md">other</a></body></html>',
    });

    const { notes, assets } = await walkVault(vault);
    const indexed = notes.map((n) => ({ ...n, slug: n.stem.toLowerCase() }));
    const index = buildVaultIndex(indexed, assets);
    const pipeline = new AssetPipeline({ outRoot: out, subdir: '_attachments', urlPrefix: '/_attachments' });

    const html = await readFromVault('report.html');

    // simulate first pass to publish referenced assets
    const r1 = renderHtmlNote({
      html,
      source_path: 'report.html',
      index,
      toAssetUrl: (a) => `/_attachments/${encodeURIComponent(a.basename)}`, // fallback
    });
    for (const a of r1.referenced) await pipeline.publish(a);

    const publishedByPath = new Map<string, { url: string; bytes: number; filename: string; mime: string }>();
    for (const a of r1.referenced) {
      const pub = pipeline.lookup(a);
      if (pub) publishedByPath.set(a.source_path, { url: pub.url, bytes: pub.bytes, filename: pub.filename, mime: pub.mime });
    }

    const r2 = renderHtmlNote({
      html,
      source_path: 'report.html',
      index,
      toAssetUrl: (a) => publishedByPath.get(a.source_path)?.url ?? `/_attachments/${a.basename}`,
    });

    expect(r2.html).toContain('<iframe');
    expect(r2.rewritten).toMatch(/src=["']\/_attachments\/photo\.[a-f0-9]+\.jpg["']/);
    expect(r2.rewritten).toContain('href="/posts/othernote.html"');
    expect(r2.referenced.length).toBe(1);
  });
});

async function readFromVault(rel: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  return readFile(join(vault, rel), 'utf-8');
}

// cleanup tmp dirs after each suite (best-effort)
import { afterEach } from 'vitest';
afterEach(async () => {
  try { await rm(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
});
