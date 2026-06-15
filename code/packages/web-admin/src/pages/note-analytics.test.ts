import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { NOTE_ANALYTICS_RESPONSIVE_STYLE } from './note-analytics.js';

describe('note analytics responsive polish', () => {
  it('stacks single-note analytics grids and wraps the header controls on phones', () => {
    expect(NOTE_ANALYTICS_RESPONSIVE_STYLE).toContain('@media (max-width: 720px)');
    expect(NOTE_ANALYTICS_RESPONSIVE_STYLE).toContain('.note-analytics__header');
    expect(NOTE_ANALYTICS_RESPONSIVE_STYLE).toContain('flex-wrap: wrap');
    expect(NOTE_ANALYTICS_RESPONSIVE_STYLE).toContain('.note-analytics__kpis');
    expect(NOTE_ANALYTICS_RESPONSIVE_STYLE).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(NOTE_ANALYTICS_RESPONSIVE_STYLE).toContain('.note-analytics__main-grid');
    expect(NOTE_ANALYTICS_RESPONSIVE_STYLE).toContain('grid-template-columns: 1fr');
  });
});

describe('note analytics source-of-truth boundary', () => {
  it('does not render all-site timeseries as a single-note trend', () => {
    const source = readFileSync(new URL('./note-analytics.tsx', import.meta.url), 'utf-8');

    expect(source).not.toContain('api.analytics.timeseries');
    expect(source).not.toContain('浏览趋势');
    expect(source).not.toContain('单篇 timeseries 暂回退到全站');
  });
});
