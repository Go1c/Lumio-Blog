import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NoteRow, SiteConfig } from '@opennote/core';
import { describe, expect, it } from 'vitest';
import {
  AI_CRAWLER_TOKENS,
  isMarkdownNote,
  readNoteMarkdown,
  renderLlmsFullTxt,
  renderLlmsTxt,
  renderPostMarkdown,
  renderRobotsTxt,
  renderSitemap,
  stripFrontmatter,
} from './geo-outputs.js';

const config: SiteConfig = {
  site: {
    title: 'Lumio Blog',
    url: 'https://blog.lumio.games',
    description: 'Game systems and engineering notes.',
    language: 'zh-CN',
  },
  author: { name: 'Lumio' },
  paths: { vault: '/vault', out: '/out', db: '/db.sqlite' },
};

function note(overrides: Partial<NoteRow> = {}): NoteRow {
  const now = '2026-06-01T00:00:00.000Z';
  return {
    slug: 'slug',
    title: 'Title',
    summary: '',
    body_html: '<p>Body</p>',
    body_text: 'Body',
    visibility: 'public',
    searchable: 1,
    seo_indexable: 1,
    rss_includable: 1,
    featured_on_home: 0,
    short_id: null,
    source_path: 'blog/slug.md',
    created_at: now,
    updated_at: now,
    published_at: now,
    scheduled_at: null,
    word_count: 100,
    reading_minutes: 1,
    cover: null,
    hash: 'hash',
    ...overrides,
  } as NoteRow;
}

describe('renderLlmsTxt', () => {
  const notes = [
    note({ slug: 'a', title: '第一篇', summary: '关于渲染管线的笔记。', source_path: 'blog/a.md' }),
    note({ slug: 'b', title: '第二篇', summary: '', source_path: 'blog/b.md' }),
    note({ slug: 'c', title: '第三篇', summary: '工具链', source_path: 'notes/c.md' }),
  ];

  it('follows the llmstxt.org shape: H1 site name, blockquote summary, link sections', () => {
    const txt = renderLlmsTxt(notes, config);
    const lines = txt.split('\n');

    expect(lines[0]).toBe('# Lumio Blog');
    expect(txt).toContain('> Game systems and engineering notes.');
    expect(txt).toContain('## blog');
    expect(txt).toContain('## notes');
    expect(txt).toContain('## 可选');
  });

  it('emits absolute URLs with the summary as the link description', () => {
    const txt = renderLlmsTxt(notes, config);

    expect(txt).toContain('- [第一篇](https://blog.lumio.games/posts/a.html): 关于渲染管线的笔记。');
    // 没有 summary 时不留下悬空的冒号
    expect(txt).toContain('- [第二篇](https://blog.lumio.games/posts/b.html)\n');
    expect(txt).toContain('- [第三篇](https://blog.lumio.games/posts/c.html): 工具链');
    expect(txt).not.toContain('](/posts/');
  });

  it('points agents at the raw markdown endpoint and the optional resources', () => {
    const txt = renderLlmsTxt(notes, config);

    expect(txt).toContain('/posts/<slug>.md');
    expect(txt).toContain('https://blog.lumio.games/llms-full.txt');
    expect(txt).toContain('https://blog.lumio.games/sitemap.xml');
    expect(txt).toContain('https://blog.lumio.games/feed.xml');
  });
});

describe('stripFrontmatter', () => {
  it('drops a leading YAML block and keeps the body', () => {
    const raw = '---\ntitle: Hi\ntags: [a]\n---\n\n# Heading\n\nBody text.\n';
    expect(stripFrontmatter(raw)).toBe('# Heading\n\nBody text.\n');
  });

  it('leaves content without frontmatter untouched', () => {
    expect(stripFrontmatter('# Heading\n\nBody.')).toBe('# Heading\n\nBody.');
  });

  it('does not eat a horizontal rule that is not frontmatter', () => {
    const raw = '# Heading\n\n---\n\nBody.';
    expect(stripFrontmatter(raw)).toBe(raw);
  });
});

describe('readNoteMarkdown', () => {
  it('reads the vault source file and strips its frontmatter', async () => {
    const vault = await mkdtemp(join(tmpdir(), 'opennote-vault-'));
    await mkdir(join(vault, 'blog'), { recursive: true });
    await writeFile(
      join(vault, 'blog', 'a.md'),
      '---\ntitle: 第一篇\n---\n\n## 背景\n\n正文段落。\n',
      'utf-8',
    );

    const body = await readNoteMarkdown(note({ slug: 'a', source_path: 'blog/a.md' }), vault);

    expect(body).toBe('## 背景\n\n正文段落。');
  });

  it('falls back to body_text when the vault file is missing', async () => {
    const body = await readNoteMarkdown(
      note({ slug: 'gone', source_path: 'blog/gone.md', body_text: 'plain text body' }),
      '/definitely/not/a/vault',
    );

    expect(body).toBe('plain text body');
  });
});

describe('renderPostMarkdown', () => {
  it('prepends a human-readable header block above the markdown body', () => {
    const doc = renderPostMarkdown(
      note({
        slug: 'a',
        title: '第一篇',
        summary: '一句话摘要。',
        published_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-06-02T00:00:00.000Z',
      }),
      config,
      '## 背景\n\n正文。',
      ['Unity', '渲染'],
    );

    expect(doc).toContain('# 第一篇');
    expect(doc).toContain('> 一句话摘要。');
    expect(doc).toContain('- 来源: https://blog.lumio.games/posts/a.html');
    expect(doc).toContain('- 作者: Lumio');
    expect(doc).toContain('- 发布: 2026-05-01');
    expect(doc).toContain('- 更新: 2026-06-02');
    expect(doc).toContain('- 标签: Unity, 渲染');
    expect(doc).toContain('## 背景\n\n正文。');
    expect(doc).not.toContain('---\ntitle:');
  });
});

describe('renderLlmsFullTxt', () => {
  it('joins documents with a rule and reports the article count', () => {
    const full = renderLlmsFullTxt(config, ['# A\n\nbody a\n', '# B\n\nbody b\n']);

    expect(full).toContain('# Lumio Blog — 全文合集');
    expect(full).toContain('共 2 篇');
    expect(full).toContain('body a');
    expect(full).toContain('body b');
    expect(full.split('\n---\n').length).toBe(3);
  });
});

describe('renderRobotsTxt', () => {
  it('explicitly allows every AI crawler token and blocks admin surfaces', () => {
    const txt = renderRobotsTxt(config, { sitemap: true });

    for (const token of AI_CRAWLER_TOKENS) {
      expect(txt).toContain(`User-agent: ${token}`);
    }
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Disallow: /admin/');
    expect(txt).toContain('Disallow: /api/');
    expect(txt).toContain('Disallow: /n/');
    expect(txt).toContain('Sitemap: https://blog.lumio.games/sitemap.xml');
    expect(txt).toContain('# llms.txt: https://blog.lumio.games/llms.txt');
    expect(txt.endsWith('\n')).toBe(true);
  });

  it('drops the Sitemap line when sitemap generation is off', () => {
    const txt = renderRobotsTxt(config, { sitemap: false });

    expect(txt).not.toContain('Sitemap:');
    expect(txt).toContain('User-agent: GPTBot');
  });

  it('lets config.seo.robots replace the whole file', () => {
    const txt = renderRobotsTxt(
      { ...config, seo: { robots: 'User-agent: *\nDisallow: /' } },
      { sitemap: true },
    );

    expect(txt).toBe('User-agent: *\nDisallow: /\n');
    expect(txt).not.toContain('GPTBot');
  });
});

describe('renderSitemap', () => {
  const posts = [
    note({ slug: 'a', updated_at: '2026-06-02T10:00:00.000Z', published_at: '2026-05-01T00:00:00.000Z' }),
    note({ slug: 'b', updated_at: '2026-04-02T10:00:00.000Z' }),
  ];
  const byTag = new Map<string, NoteRow[]>([['Unity', [posts[0]!]]]);

  it('carries lastmod on every post entry', () => {
    const xml = renderSitemap(posts, byTag, config);

    expect(xml).toContain(
      '<url><loc>https://blog.lumio.games/posts/a.html</loc><lastmod>2026-06-02T10:00:00.000Z</lastmod></url>',
    );
    expect(xml).toContain('<loc>https://blog.lumio.games/posts/b.html</loc>');
    expect(xml).toContain('<lastmod>2026-04-02T10:00:00.000Z</lastmod>');
  });

  it('includes the folders index and dates tag pages by their newest note', () => {
    const xml = renderSitemap(posts, byTag, config);

    expect(xml).toContain('<loc>https://blog.lumio.games/folders/index.html</loc>');
    expect(xml).toContain(
      '<url><loc>https://blog.lumio.games/tags/Unity.html</loc><lastmod>2026-06-02T10:00:00.000Z</lastmod></url>',
    );
  });

  it('is well-formed XML with one url element per entry', () => {
    const xml = renderSitemap(posts, byTag, config);
    const urlCount = (xml.match(/<url>/g) ?? []).length;

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(urlCount).toBe((xml.match(/<\/url>/g) ?? []).length);
    // 7 个固定页 + 2 篇文章 + 1 个标签
    expect(urlCount).toBe(10);
  });
});

describe('isMarkdownNote', () => {
  it('treats a missing kind as markdown but excludes canvas and html', () => {
    expect(isMarkdownNote({})).toBe(true);
    expect(isMarkdownNote({ kind: 'markdown' })).toBe(true);
    expect(isMarkdownNote({ kind: 'canvas' })).toBe(false);
    expect(isMarkdownNote({ kind: 'html' })).toBe(false);
  });
});
