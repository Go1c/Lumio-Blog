import { describe, expect, it } from 'vitest';
import { columnLabelFromSourcePath, noteTagLinks, NOTE_DETAIL_RESPONSIVE_STYLE } from './note-detail.js';

describe('note detail responsive polish', () => {
  it('stacks control and metadata cards on phone widths', () => {
    expect(NOTE_DETAIL_RESPONSIVE_STYLE).toContain('@media (max-width: 720px)');
    expect(NOTE_DETAIL_RESPONSIVE_STYLE).toContain('.note-detail__controls');
    expect(NOTE_DETAIL_RESPONSIVE_STYLE).toContain('grid-template-columns: 1fr');
    expect(NOTE_DETAIL_RESPONSIVE_STYLE).toContain('.note-detail__links-split');
    expect(NOTE_DETAIL_RESPONSIVE_STYLE).toContain('border-left: 0');
  });
});

describe('note detail column metadata', () => {
  it('derives the column label from the vault source path', () => {
    expect(columnLabelFromSourcePath('Rendering/URP/HUD.md')).toBe('Rendering');
    expect(columnLabelFromSourcePath('RootNote.md')).toBe('未分栏');
    expect(columnLabelFromSourcePath('')).toBe('未分栏');
  });
});

describe('note detail synchronized tags', () => {
  it('builds tag-management links from the note detail tags', () => {
    expect(noteTagLinks(['渲染', 'GPU Pipeline'])).toEqual([
      { tag: '渲染', href: '#/tags/%E6%B8%B2%E6%9F%93' },
      { tag: 'GPU Pipeline', href: '#/tags/GPU%20Pipeline' },
    ]);
  });

  it('ignores blank tag values from legacy responses', () => {
    expect(noteTagLinks(['AI', ' ', ''])).toEqual([
      { tag: 'AI', href: '#/tags/AI' },
    ]);
  });
});
