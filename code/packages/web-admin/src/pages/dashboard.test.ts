import { describe, expect, it } from 'vitest';
import { DASHBOARD_RESPONSIVE_STYLE } from './dashboard.js';

describe('dashboard responsive polish', () => {
  it('stacks dashboard grids and compresses top posts on phone widths', () => {
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('@media (max-width: 720px)');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('.dash__kpis');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('.dash__main-grid');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('grid-template-columns: 1fr');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('.dash__top-row');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('grid-template-columns: auto minmax(0, 1fr) auto');
  });
});
