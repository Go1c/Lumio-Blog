import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = (file: string): string => readFileSync(join(import.meta.dirname, file), 'utf8');

describe('visual polish scaffolding', () => {
  it('brands the login page instead of rendering a plain centered form', () => {
    const login = src('login.tsx');

    expect(login).toContain('login__shell');
    expect(login).toContain('login__orb');
    expect(login).toContain('line-height: 1.04;');
    expect(login).toContain('Lumio control room');
  });

  it('gives media and OG pages responsive layout classes instead of fixed desktop grids', () => {
    const media = src('media.tsx');
    const og = src('og.tsx');

    expect(media).toContain('MEDIA_PAGE_STYLE');
    expect(media).toContain('media-page__content');
    expect(media).toContain('@media (max-width: 720px)');

    expect(og).toContain('OG_PAGE_STYLE');
    expect(og).toContain('og-page__layout');
    expect(og).toContain('@media (max-width: 720px)');
  });

  it('opens the OG lab on a public article when one exists', () => {
    const og = src('og.tsx');

    expect(og).toContain("r.notes.find((n) => n.visibility === 'public') ?? r.notes[0]");
  });
});
