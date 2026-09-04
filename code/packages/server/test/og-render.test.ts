import { describe, expect, it } from 'vitest';
import { renderOg, OG_TEMPLATES } from '../src/og/render.js';
import { buildOgCardSvg } from '../src/og/card-svg.js';
import { encodeOgFallbackPng, isOgSizedPng } from '../src/og/png.js';

function pngSize(buf: Buffer): { width: number; height: number } {
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('renderOg core', () => {
  it('每个模板都返回 1200×630 PNG(不再降级成 1x1 空白图)', async () => {
    for (const t of OG_TEMPLATES) {
      const buf = await renderOg(t, { title: 'Hi', description: 'desc' });
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.byteLength).toBeGreaterThan(100);
      expect(pngSize(buf)).toEqual({ width: 1200, height: 630 });
    }
  });

  it('fallback encoder itself is a valid 1200×630 PNG', () => {
    const buf = encodeOgFallbackPng();
    expect(pngSize(buf)).toEqual({ width: 1200, height: 630 });
    expect(isOgSizedPng(buf)).toBe(true);
  });

  it('rejects the historical 1x1 placeholder as undersized', () => {
    const oneByOne = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
      'hex',
    );
    expect(isOgSizedPng(oneByOne)).toBe(false);
  });
});

describe('buildOgCardSvg', () => {
  it('embeds the article title in a 1200×630 card', () => {
    const svg = buildOgCardSvg({
      title: 'HUD3DUI 排序异常 <分析>',
      site: 'blog.lumio.games',
      author: 'Lumio',
      date: '2026-06-01',
    });

    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
    expect(svg).toContain('HUD3DUI 排序异常 &lt;分析&gt;');
    expect(svg).toContain('blog.lumio.games');
    expect(svg).not.toContain('HUD3DUI 排序异常 <分析>');
  });
});
