import { describe, expect, it } from 'vitest';
import { NOTE_DETAIL_RESPONSIVE_STYLE } from './note-detail.js';

describe('note detail responsive polish', () => {
  it('stacks control and metadata cards on phone widths', () => {
    expect(NOTE_DETAIL_RESPONSIVE_STYLE).toContain('@media (max-width: 720px)');
    expect(NOTE_DETAIL_RESPONSIVE_STYLE).toContain('.note-detail__controls');
    expect(NOTE_DETAIL_RESPONSIVE_STYLE).toContain('grid-template-columns: 1fr');
    expect(NOTE_DETAIL_RESPONSIVE_STYLE).toContain('.note-detail__links-split');
    expect(NOTE_DETAIL_RESPONSIVE_STYLE).toContain('border-left: 0');
  });
});
