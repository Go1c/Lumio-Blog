import { describe, expect, it } from 'vitest';
import { DASHBOARD_RESPONSIVE_STYLE } from './dashboard.js';

describe('dashboard responsive polish', () => {
  it('stacks Lumio admin panels on tablet and phone widths', () => {
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('@media (max-width: 1100px)');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('@media (max-width: 680px)');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('.stat-row');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('.two-col');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('grid-template-columns: 1fr');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('.adrow');
    expect(DASHBOARD_RESPONSIVE_STYLE).toContain('.tbl');
  });
});
