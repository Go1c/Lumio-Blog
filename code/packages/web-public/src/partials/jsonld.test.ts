import type { NoteRow, SiteConfig } from '@opennote/core';
import { describe, expect, it } from 'vitest';
import { renderPost } from '../templates/post.js';
import { renderHome } from '../templates/home.js';
import { renderArticles } from '../templates/articles.js';
import { renderTagPage } from '../templates/tag.js';

const config: SiteConfig = {
  site: {
    title: 'Lumio Blog',
    url: 'https://blog.lumio.games',
    description: 'Game systems and engineering notes.',
    language: 'zh-CN',
  },
  author: {
    name: 'Lumio',
    bio: 'Games, tools, engineering notes.',
    social: [{ platform: 'github', url: 'https://github.com/Go1c' }],
  },
  features: { comments: false },
  paths: { vault: '/vault', out: '/out', db: '/db.sqlite' },
};

function note(overrides: Partial<NoteRow> = {}): NoteRow {
  return {
    slug: 'hello',
    title: 'Hello <世界>',
    summary: 'A standalone answer.',
    body_html: '<h2 id="intro">Intro</h2><p>Body</p>',
    body_text: 'Body',
    visibility: 'public',
    searchable: 1,
    seo_indexable: 1,
    rss_includable: 1,
    featured_on_home: 0,
    short_id: null,
    source_path: 'blog/hello.md',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-06-02T00:00:00.000Z',
    published_at: '2026-05-01T00:00:00.000Z',
    scheduled_at: null,
    word_count: 1200,
    reading_minutes: 5,
    cover: null,
    hash: 'hash',
    kind: 'markdown',
    ...overrides,
  } as NoteRow;
}

/** 抓出页面里所有 application/ld+json 块并解析 */
function extractJsonLd(html: string): Record<string, unknown>[] {
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  const out: Record<string, unknown>[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push(JSON.parse(m[1]!) as Record<string, unknown>);
  }
  return out;
}

/** 页面内定义过的所有 @id */
function definedIds(entities: unknown): Set<string> {
  const ids = new Set<string>();
  walk(entities, (node) => {
    // 只有一个 @id 的对象是引用,不是定义
    if (typeof node['@id'] === 'string' && Object.keys(node).length > 1) {
      ids.add(node['@id']);
    }
  });
  return ids;
}

/** 只有 @id 的裸引用 */
function referencedIds(entities: unknown): string[] {
  const refs: string[] = [];
  walk(entities, (node) => {
    if (typeof node['@id'] === 'string' && Object.keys(node).length === 1) {
      refs.push(node['@id']);
    }
  });
  return refs;
}

function walk(value: unknown, visit: (node: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>;
    visit(node);
    for (const child of Object.values(node)) walk(child, visit);
  }
}

function byType(entities: Record<string, unknown>[], type: string): Record<string, unknown> {
  const found = entities.find((e) => e['@type'] === type);
  expect(found, `expected a ${type} entity`).toBeTruthy();
  return found!;
}

function expectIsoDate(value: unknown): void {
  expect(typeof value).toBe('string');
  expect(Number.isFinite(Date.parse(value as string))).toBe(true);
}

describe('post page JSON-LD', () => {
  const html = renderPost(
    { note: note(), byTag: new Map([['Unity', [note()]]]), series: [] },
    config,
  );
  const entities = extractJsonLd(html);

  it('parses as JSON and emits exactly BlogPosting + BreadcrumbList', () => {
    expect(entities.map((e) => e['@type'])).toEqual(['BlogPosting', 'BreadcrumbList']);
    for (const entity of entities) {
      expect(entity['@context']).toBe('https://schema.org');
    }
  });

  it('carries the properties schema.org and Google expect on BlogPosting', () => {
    const article = byType(entities, 'BlogPosting');

    expect(article['@id']).toBe('https://blog.lumio.games/posts/hello.html#article');
    expect(article.headline).toBe('Hello <世界>');
    expect(article.description).toBe('A standalone answer.');
    expect(article.url).toBe('https://blog.lumio.games/posts/hello.html');
    expectIsoDate(article.datePublished);
    expectIsoDate(article.dateModified);
    expect(article.mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id': 'https://blog.lumio.games/posts/hello.html',
    });
    expect((article.author as Record<string, unknown>)['@type']).toBe('Person');
    expect((article.author as Record<string, unknown>).name).toBe('Lumio');
    expect((article.publisher as Record<string, unknown>)['@type']).toBe('Organization');
    expect(article.image).toEqual(['https://blog.lumio.games/og/hello.png']);
    expect(article.keywords).toEqual(['Unity']);
    expect(article.wordCount).toBe(1200);
    expect(article.inLanguage).toBe('zh-CN');
  });

  it('mirrors the visible breadcrumb hierarchy exactly', () => {
    const crumb = byType(entities, 'BreadcrumbList');
    const items = crumb.itemListElement as Record<string, unknown>[];

    // 页面上可见的是 首页 / 文章 / Unity / 标题
    expect(items.map((i) => i.name)).toEqual(['首页', '文章', 'Unity', 'Hello <世界>']);
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4]);
    expect(items[0]!.item).toBe('https://blog.lumio.games/');
    expect(items[1]!.item).toBe('https://blog.lumio.games/articles/index.html');
    expect(items[2]!.item).toBe('https://blog.lumio.games/tags/Unity.html');
    // 末级是当前页,按 Google 的建议不带 item
    expect(items[3]!.item).toBeUndefined();
    for (const item of items) expect(item['@type']).toBe('ListItem');
  });

  it('drops the tag level when the note has no tags, matching the visible crumb', () => {
    const bare = extractJsonLd(renderPost({ note: note(), byTag: new Map(), series: [] }, config));
    const items = byType(bare, 'BreadcrumbList').itemListElement as Record<string, unknown>[];

    expect(items.map((i) => i.name)).toEqual(['首页', '文章', 'Hello <世界>']);
  });

  it('resolves every bare @id reference within the page', () => {
    const ids = definedIds(entities);
    for (const ref of referencedIds(entities)) {
      expect(ids, `dangling @id reference: ${ref}`).toContain(ref);
    }
  });

  it('escapes angle brackets so the payload cannot close the script tag', () => {
    expect(html).toContain('Hello \\u003c世界\\u003e');
    const scriptBody = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1]!;
    expect(scriptBody).not.toContain('<');
  });

  it('emits nothing on a noindex page', () => {
    const hidden = renderPost(
      { note: note({ seo_indexable: 0 }), byTag: new Map(), series: [] },
      config,
    );
    const unlisted = renderPost(
      { note: note({ visibility: 'unlisted' }), byTag: new Map(), series: [] },
      config,
    );

    expect(extractJsonLd(hidden)).toEqual([]);
    expect(extractJsonLd(unlisted)).toEqual([]);
    expect(hidden).toContain('content="noindex,nofollow"');
  });
});

describe('home page JSON-LD', () => {
  const html = renderHome(
    {
      posts: [note()],
      byTag: new Map(),
      recentNotes: [note()],
      totalArticles: 1,
      totalNotes: 1,
      folders: [],
    },
    config,
  );
  const entities = extractJsonLd(html);

  it('emits WebSite and Person with stable cross-page @ids', () => {
    expect(entities.map((e) => e['@type'])).toEqual(['WebSite', 'Person']);

    const site = byType(entities, 'WebSite');
    expect(site['@id']).toBe('https://blog.lumio.games/#website');
    expect(site.url).toBe('https://blog.lumio.games/');
    expect(site.name).toBe('Lumio Blog');
    expect((site.potentialAction as Record<string, unknown>)['@type']).toBe('SearchAction');

    const person = byType(entities, 'Person');
    expect(person['@id']).toBe('https://blog.lumio.games/#person');
    expect(person.name).toBe('Lumio');
    expect(person.sameAs).toEqual(['https://github.com/Go1c']);
  });

  it('resolves every bare @id reference within the page', () => {
    const ids = definedIds(entities);
    for (const ref of referencedIds(entities)) {
      expect(ids, `dangling @id reference: ${ref}`).toContain(ref);
    }
  });
});

describe('collection page JSON-LD', () => {
  it('pairs CollectionPage with an ItemList it points at', () => {
    const entities = extractJsonLd(
      renderArticles([note(), note({ slug: 'second', title: 'Second' })], new Map(), config),
    );

    expect(entities.map((e) => e['@type'])).toEqual(['CollectionPage', 'ItemList']);

    const page = byType(entities, 'CollectionPage');
    const list = byType(entities, 'ItemList');
    expect(page.url).toBe('https://blog.lumio.games/articles/index.html');
    expect(page.mainEntity).toEqual({ '@id': list['@id'] });
    expect(list.numberOfItems).toBe(2);

    const items = list.itemListElement as Record<string, unknown>[];
    expect(items[0]).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      url: 'https://blog.lumio.games/posts/hello.html',
    });

    const ids = definedIds(entities);
    for (const ref of referencedIds(entities)) {
      expect(ids, `dangling @id reference: ${ref}`).toContain(ref);
    }
  });

  it('lists the notes of a tag page in its ItemList', () => {
    const tagged = note({ slug: 'tagged', title: 'Tagged' });
    const entities = extractJsonLd(
      renderTagPage('Unity', [tagged], new Map([['Unity', [tagged]]]), config),
    );

    const list = byType(entities, 'ItemList');
    expect(list.numberOfItems).toBe(1);
    expect(byType(entities, 'CollectionPage').url).toBe(
      'https://blog.lumio.games/tags/Unity.html',
    );
  });
});
