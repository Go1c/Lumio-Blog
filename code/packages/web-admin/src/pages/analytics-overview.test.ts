import { describe, expect, it } from 'vitest';
import { ANALYTICS_OVERVIEW_RESPONSIVE_STYLE } from './analytics-overview.js';

describe('analytics overview responsive polish', () => {
  it('stacks KPI/chart sections and turns the top table into cards on phones', () => {
    expect(ANALYTICS_OVERVIEW_RESPONSIVE_STYLE).toContain('@media (max-width: 720px)');
    expect(ANALYTICS_OVERVIEW_RESPONSIVE_STYLE).toContain('.analytics-overview__kpis');
    expect(ANALYTICS_OVERVIEW_RESPONSIVE_STYLE).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(ANALYTICS_OVERVIEW_RESPONSIVE_STYLE).toContain('.analytics-overview__table td::before');
    expect(ANALYTICS_OVERVIEW_RESPONSIVE_STYLE).toContain('content: attr(data-label)');
  });
});
