import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown/pipeline.js';
import type { LinkResolver } from './types.js';

const noopResolver: LinkResolver = () => ({ kind: 'broken', raw: '' });

describe('smoke: real Obsidian content patterns', () => {
  it('handles a heavy mixed-content document', async () => {
    const body = `---
title: Test
tags: [foo, bar]
---

# 主标题

正文有 **加粗** / *斜体* / ==高亮==.

> [!tip] 小贴士
> 这是一个 **嵌套** 的 callout 测试。
>
> > [!warning]- 折叠的子级
> > 这条默认折叠。
>
> 跟到这里还属于 tip。

\`\`\`typescript
const x: number = 42;
function greet(name: string): string {
  return \`hello, \${name}\`;
}
\`\`\`

数学公式:行内 $a^2 + b^2 = c^2$,块级:

$$
\\sum_{i=0}^{N} x_i = X
$$

\`\`\`mermaid
graph TD;
  A --> B;
  B --> C;
\`\`\`

| 列 1 | 列 2 |
|---|---|
| a | b |
| c | d |

- [ ] 待办
- [x] 完成
- [/] 进行中
- [-] 取消
- [>] 推迟

[[Other]] / [[Other|别名]] / [[Other#标题]]

#tag #nested/tag

A paragraph with id ^block-1
`;
    const r = await renderMarkdown({ body, resolveLink: noopResolver });

    // 正常起码不抛错,大段内容覆盖 <h1>/<callout>/<pre.shiki>/<table>/<ul>/<mark>
    expect(r.html).toContain('<h1');
    expect(r.html).toContain('callout--tip');
    expect(r.html).toContain('callout--warning');
    expect(r.html).toContain('shiki');
    expect(r.html).toContain('katex');
    expect(r.html).toContain('mermaid');
    expect(r.html).toContain('<table>');
    expect(r.html).toContain('task-x');
    expect(r.html).toContain('cm-highlight');
    expect(r.html).toContain('cm-tag');
    expect(r.html).toContain('block-block-1');

    // 没有 leak 出 source 标记
    expect(r.html).not.toContain('[!tip]');
    expect(r.html).not.toContain('[!warning]');
    expect(r.html).not.toContain('==高亮==');
    expect(r.html).not.toContain('^block-1');
  });
});
