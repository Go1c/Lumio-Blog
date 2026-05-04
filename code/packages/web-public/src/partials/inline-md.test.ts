import { describe, it, expect } from 'vitest';
import { renderInlineMd } from './inline-md.js';

describe('renderInlineMd', () => {
  it('escapes plain text', () => {
    expect(renderInlineMd('Hello & friends')).toBe('Hello &amp; friends');
  });

  it('renders bold and italic', () => {
    expect(renderInlineMd('hello **world**')).toBe('hello <strong>world</strong>');
    expect(renderInlineMd('hello *world*')).toBe('hello <em>world</em>');
    expect(renderInlineMd('hello _world_')).toBe('hello <em>world</em>');
  });

  it('renders code spans', () => {
    expect(renderInlineMd('use `pnpm` here')).toBe('use <code>pnpm</code> here');
  });

  it('renders safe markdown links', () => {
    expect(renderInlineMd('see [docs](https://example.com)')).toBe(
      'see <a href="https://example.com" rel="noopener noreferrer">docs</a>',
    );
  });

  it('rejects javascript: links — does not emit <a>', () => {
    const out = renderInlineMd('[click](javascript:alert(1))');
    // 不能产生 <a> 标签;原始字符按文字保留(经过 esc)即可
    expect(out).not.toMatch(/<a\b/);
  });

  it('rejects data: links', () => {
    const out = renderInlineMd('[x](data:text/html,<script>)');
    expect(out).not.toMatch(/<a\b/);
  });

  it('preserves whitelisted span with safe color', () => {
    const out = renderInlineMd('hi <span style="color: var(--accent)">关键字</span>!');
    expect(out).toBe('hi <span style="color: var(--accent)">关键字</span>!');
  });

  it('strips <script> tags', () => {
    const out = renderInlineMd('<script>alert(1)</script>danger');
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain('danger');
    // 内容(alert(1))保留为文字
    expect(out).toContain('alert(1)');
  });

  it('strips <iframe> tags', () => {
    const out = renderInlineMd('<iframe src="evil"></iframe>x');
    expect(out).not.toMatch(/<iframe/i);
    expect(out).toContain('x');
  });

  it('strips on* event handlers from spans', () => {
    const out = renderInlineMd('<span onclick="x" style="color:red">hi</span>');
    expect(out).not.toMatch(/onclick/i);
    expect(out).toContain('color: red');
  });

  it('rejects bad css colors with quotes/semicolons', () => {
    const out = renderInlineMd('<span style="color: red; background: url(x)">x</span>');
    // background should be dropped; color: red should be kept (red passes)
    expect(out).not.toContain('background');
    expect(out).toContain('color: red');
  });

  it('escapes ambiguous angle brackets', () => {
    // `< 5` 不是任何 tag — 应当被 escape
    const out = renderInlineMd('x < 5 and y > 3');
    expect(out).toContain('&lt;');
    expect(out).toContain('&gt;');
  });

  it('strips dangerous tags but keeps surrounding text', () => {
    const out = renderInlineMd('<style>body{}</style>hello');
    expect(out).not.toMatch(/<style/i);
    expect(out).toContain('hello');
  });
});
