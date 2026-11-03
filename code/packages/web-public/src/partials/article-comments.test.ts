import type { SiteConfig } from '@opennote/core';
import { describe, expect, it } from 'vitest';
import { renderArticleComments } from './article-comments.js';

const config = { site: { title: 'Lumio Blog', url: 'https://blog.lumio.games' } } as unknown as SiteConfig;

describe('renderArticleComments', () => {
  const html = renderArticleComments({ slug: 'hello-world' }, config);

  it('渲染不登录的表单:一个名字框 + 骰子 + 内容 + 发布,没有职能下拉', () => {
    expect(html).toContain('data-cmt ');
    expect(html).toContain('data-slug="hello-world"');
    expect(html.match(/<input /g)).toHaveLength(1);
    expect(html).toMatch(/<input class="cmt__name" data-cmt-name[^>]*maxlength="40"/);
    expect(html).not.toContain('<select');
    expect(html).not.toContain('data-cmt-role');
    expect(html).toContain('data-cmt-dice');
    expect(html).toContain('placeholder="说点什么…"');
    expect(html).toContain('>发布</button>');
    expect(html).toContain('<script src="/comments.js" defer></script>');
  });

  it('初次渲染时错误位是空的', () => {
    expect(html).toMatch(/<span class="cmt__err" data-cmt-err[^>]*><\/span>/);
    expect(html).not.toContain('评论不能为空');
    expect(html).not.toContain('写点内容再发');
  });

  it('带空列表文案(默认隐藏,脚本拉完列表后再决定是否显示)', () => {
    expect(html).toMatch(/<p class="cmt__empty" data-cmt-empty hidden>还没有人留言，来当第一个<\/p>/);
  });

  it('去掉划词评论、登录入口和 Lumio 小标签', () => {
    expect(html).not.toContain('划线评论');
    expect(html).not.toContain('选段评论');
    expect(html).not.toContain('匿名');
    expect(html).not.toContain('登录');
    expect(html).not.toContain('wsb-selbubble');
    expect(html).not.toContain('ui-tag');
    expect(html).not.toContain('>Lumio<');
  });

  it('转义 slug', () => {
    const out = renderArticleComments({ slug: 'a"><script>x</script>' }, config);
    expect(out).not.toContain('<script>x</script>');
    expect(out).toContain('data-slug="a&quot;&gt;&lt;script&gt;x&lt;/script&gt;"');
  });
});

describe('script cache busting', () => {
  it('loads comments.js with the content version so a stale cached script is never paired with new markup', async () => {
    const { setScriptsVersion } = await import('../templates/layout.js');
    setScriptsVersion('abc123def456');
    try {
      const html = renderArticleComments({ slug: 'a' }, {} as never);
      expect(html).toContain('src="/comments.js?v=abc123def456"');
    } finally {
      setScriptsVersion('');
    }
  });
});
