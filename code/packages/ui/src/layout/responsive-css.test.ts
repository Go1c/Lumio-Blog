import { describe, expect, it } from 'vitest';
import { ALL_CSS } from '../ssg.js';

describe('shared responsive shell CSS', () => {
  it('collapses the admin shell on phone widths', () => {
    expect(ALL_CSS).toContain('@media (max-width: 720px)');
    expect(ALL_CSS).toContain('.ui-admin {');
    expect(ALL_CSS).toContain('grid-template-columns: 1fr');
    expect(ALL_CSS).toContain('.ui-admin__sidebar');
    expect(ALL_CSS).toContain('position: static');
  });

  it('keeps public nav compact and uncut on phone widths', () => {
    expect(ALL_CSS).toContain('.ui-public__nav');
    expect(ALL_CSS).toContain('overflow-x: auto');
    expect(ALL_CSS).toContain('.ui-public__brand span:last-child');
  });
});
