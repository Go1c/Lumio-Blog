import { describe, expect, it } from 'vitest';
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
