import { describe, expect, it } from 'vitest';
import { renderArticles } from './articles.js';

const config = {
  site: {
    title: 'Lumio Blog',
    url: 'https://blog.lumio.games',
    description: 'Lumio notes',
    language: 'zh-CN',
  },
  author: { name: 'Lumio' },
  paths: { vault: '/vault', out: '/out', db: '/db.sqlite' },
} as const;

function note(overrides: Partial<Record<string, unknown>>) {
  return {
    slug: 'slug',
    title: 'Title',
    visibility: 'public',
    searchable: 1,
    seo_indexable: 1,
    rss_includable: 1,
    featured_on_home: 0,
    short_id: null,
    source_path: 'Work/a.md',
    summary: '',
    body_html: '',
    body_text: '',
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    published_at: null,
    scheduled_at: null,
    reading_minutes: 1,
    word_count: 100,
    cover: null,
    hash: 'hash',
    ...overrides,
  } as any;
}

describe('renderArticles article data', () => {
  it('renders backend posts, counts, and clickable post links when posts exist', () => {
    const livePost = note({
      slug: 'gpu-pipeline',
      title: '真实 GPU 管线拆解',
      summary: '来自后端的真实摘要',
      word_count: 1200,
      reading_minutes: 5,
      updated_at: '2026-06-03T00:00:00.000Z',
    });
    const toolPost = note({
      slug: 'tooling-flow',
      title: '真实工具链流程',
      summary: '自动化流程沉淀',
      word_count: 800,
      reading_minutes: 3,
      updated_at: '2026-06-02T00:00:00.000Z',
    });

    const html = renderArticles(
      [livePost, toolPost],
      new Map([
        ['渲染', [livePost]],
        ['工具链', [toolPost]],
      ]),
      config,
    );

    expect(html).toContain('全部<span class="chip__n">2</span>');
    expect(html).toContain('class="layout"');
    expect(html).toContain('class="alist" id="article-list"');
    expect(html).toContain('class="arow" href="/posts/gpu-pipeline.html"');
    expect(html).toContain('真实 GPU 管线拆解');
    expect(html).toContain('来自后端的真实摘要');
    expect(html).toContain('href="/posts/gpu-pipeline.html"');
    expect(html).toContain('真实工具链流程');
    expect(html).toContain('href="/posts/tooling-flow.html"');
    expect(html).not.toContain('深入 GPU 渲染管线:从顶点到像素的全流程优化');
  });

  it('does not invent design categories or hot tags for real posts without tags', () => {
    const livePost = note({
      slug: 'untagged-real-post',
      title: '无标签真实文章',
      summary: '来自后端但没有标签',
      word_count: 600,
      reading_minutes: 2,
    });

    const html = renderArticles([livePost], new Map(), config);

    expect(html).toContain('无标签真实文章');
    expect(html).toContain('文章<span class="chip__n">1</span>');
    expect(html).toContain('暂无标签');
    expect(html).not.toContain('渲染<span class="chip__n">6</span>');
    expect(html).not.toContain('性能优化');
    expect(html).not.toContain('Shader');
  });

  it('uses Lumio design content only for the empty-state fallback', () => {
    const html = renderArticles([], new Map(), config);

    expect(html).toContain('全部<span class="chip__n">28</span>');
    expect(html).toContain('class="layout"');
    expect(html).toContain('class="alist" id="article-list"');
    expect(html).toContain('class="sortbox"');
    expect(html).toContain('class="side-card"');
    expect(html).toContain('渲染优化实战');
    expect(html).toContain('href="/articles/index.html?cat=');
    expect(html).not.toContain('href="#"');
    expect(html).not.toContain('深入 GPU 渲染管线:从顶点到像素的全流程优化');
  });
});
