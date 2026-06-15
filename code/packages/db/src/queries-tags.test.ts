import { describe, expect, it } from 'vitest';
import { NoteRepo } from './queries.js';

describe('NoteRepo.tagsForSlug', () => {
  it('reads synchronized frontmatter tags for a single note slug', () => {
    const db = {
      prepare(sql: string) {
        expect(sql).toContain('FROM tags');
        return {
          all(...slugs: string[]) {
            expect(slugs).toEqual(['rendering-note']);
            return [
              { slug: 'rendering-note', tag: '渲染' },
              { slug: 'rendering-note', tag: 'GPU' },
            ];
          },
        };
      },
    };
    const repo = new NoteRepo(db as never);

    expect(repo.tagsForSlug('rendering-note')).toEqual(['渲染', 'GPU']);
  });
});
