import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './pipeline.js';
import type { LinkResolver } from '../types.js';

const resolver: LinkResolver = ({ target, anchor, alias, embed }) => {
  if (target === 'image.png') {
    const r: { kind: 'asset'; url: string; mime: string; filename: string; bytes: number; alias?: string } = {
      kind: 'asset',
      url: '/_attachments/image.abc123.png',
      mime: 'image/png',
      filename: 'image.png',
      bytes: 1234,
    };
    if (alias) r.alias = alias;
    return r;
  }
  if (target === 'video.mp4') {
    return { kind: 'asset', url: '/_attachments/video.mp4', mime: 'video/mp4', filename: 'video.mp4' };
  }
  if (target === 'doc.pdf') {
    return { kind: 'asset', url: '/_attachments/doc.pdf', mime: 'application/pdf', filename: 'doc.pdf' };
  }
  if (target === 'OtherNote') {
    const r: { kind: 'note'; slug: string; title: string; anchor?: string; alias?: string } = {
      kind: 'note', slug: 'other-note', title: 'OtherNote',
    };
    if (anchor) r.anchor = anchor;
    if (alias) r.alias = alias;
    return r;
  }
  void embed;
  return { kind: 'broken', raw: target };
};

describe('renderMarkdown', () => {
  it('renders headings with auto IDs', async () => {
    const r = await renderMarkdown({ body: '# Hello\n\nworld', resolveLink: resolver });
    expect(r.html).toMatch(/<h1 id="hello">Hello/);
    expect(r.headings[0]).toEqual({ level: 1, id: 'hello', text: 'Hello' });
  });

  it('handles wikilinks (resolved + broken)', async () => {
    const r = await renderMarkdown({
      body: 'See [[OtherNote]] and [[Missing]] and [[OtherNote#chapter|alias]]',
      resolveLink: resolver,
    });
    expect(r.html).toContain('class="internal-link"');
    expect(r.html).toContain('href="/posts/other-note.html"');
    expect(r.html).toContain('href="/posts/other-note.html#chapter"');
    expect(r.html).toContain('class="internal-link is-unresolved"');
    expect(r.links.find((l) => l.kind === 'note')?.resolved).toBe('other-note');
    expect(r.links.find((l) => l.kind === 'broken')?.resolved).toBe('Missing');
  });

  it('renders image embed with alias as alt or width', async () => {
    const r1 = await renderMarkdown({ body: '![[image.png]]', resolveLink: resolver });
    expect(r1.html).toContain('<img src="/_attachments/image.abc123.png"');
    const r2 = await renderMarkdown({ body: '![[image.png|400]]', resolveLink: resolver });
    expect(r2.html).toContain('width="400"');
    const r3 = await renderMarkdown({ body: '![[image.png|some alt]]', resolveLink: resolver });
    expect(r3.html).toContain('alt="some alt"');
  });

  it('renders video / pdf embed', async () => {
    const r1 = await renderMarkdown({ body: '![[video.mp4]]', resolveLink: resolver });
    expect(r1.html).toMatch(/<video[^>]+controls/);
    const r2 = await renderMarkdown({ body: '![[doc.pdf]]', resolveLink: resolver });
    expect(r2.html).toMatch(/<iframe[^>]+src="\/_attachments\/doc\.pdf/);
  });

  it('renders Obsidian callouts', async () => {
    const r = await renderMarkdown({
      body: '> [!warning] Title\n> body line',
      resolveLink: resolver,
    });
    expect(r.html).toContain('class="callout callout--warning"');
    expect(r.html).toContain('Title');
    expect(r.html).toContain('body line');
  });

  it('renders highlights and inline tags', async () => {
    const r = await renderMarkdown({
      body: 'this is ==important==. tag #foo and #bar/baz',
      resolveLink: resolver,
    });
    expect(r.html).toContain('<mark class="cm-highlight">important</mark>');
    expect(r.html).toContain('class="cm-tag"');
    expect(r.inlineTags).toContain('foo');
    expect(r.inlineTags).toContain('bar/baz');
  });

  it('removes %% comments %%', async () => {
    const r = await renderMarkdown({
      body: 'before %%hidden%% after',
      resolveLink: resolver,
    });
    expect(r.html).not.toContain('hidden');
    expect(r.html).toContain('before');
    expect(r.html).toContain('after');
  });

  it('captures block ids ^foo', async () => {
    const r = await renderMarkdown({
      body: 'A paragraph with id ^myblock\n\nAnother',
      resolveLink: resolver,
    });
    expect(r.blockIds).toContain('myblock');
    expect(r.html).toContain('id="block-myblock"');
    expect(r.html).not.toContain('^myblock');
  });

  it('Obsidian extended task states', async () => {
    const r = await renderMarkdown({
      body: '- [ ] todo\n- [x] done\n- [/] in progress\n- [-] cancelled\n- [>] forwarded',
      resolveLink: resolver,
    });
    expect(r.html).toContain('class="task-list-item task-unchecked"');
    expect(r.html).toContain('task-x');
    expect(r.html).toContain('task-slash');
    expect(r.html).toContain('task-cancelled');
    expect(r.html).toContain('task-forwarded');
  });

  it('mermaid block becomes div placeholder', async () => {
    const r = await renderMarkdown({
      body: '```mermaid\ngraph TD;A-->B\n```',
      resolveLink: resolver,
    });
    expect(r.html).toContain('class="mermaid"');
    expect(r.html).toContain('graph TD');
  });

  it('shiki code highlight (shell)', async () => {
    const r = await renderMarkdown({
      body: '```bash\necho hello\n```',
      resolveLink: resolver,
    });
    // shiki 输出 <pre class="shiki ..."> + 内联 style 或 css var
    expect(r.html).toMatch(/<pre[^>]*class="[^"]*shiki[^"]*"/);
  });

  it('katex math block', async () => {
    const r = await renderMarkdown({
      body: 'inline $a + b$ and block:\n\n$$\nE = mc^2\n$$',
      resolveLink: resolver,
    });
    expect(r.html).toContain('class="katex');
  });

  it('katex math block with backslashes inside larger doc', async () => {
    const body = `# Top

## Math

$$
\\sum_{i=0}^{N} x_i = X
$$

after`;
    const r = await renderMarkdown({ body, resolveLink: resolver });
    // 必须真的走 KaTeX 而不是被当代码块给 shiki 吃掉
    expect(r.html).toContain('class="katex');
    expect(r.html).not.toMatch(/<pre[^>]*language-text[^>]*>[\s\S]*?\\sum/);
  });

});
