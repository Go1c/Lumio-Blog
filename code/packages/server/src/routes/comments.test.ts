import { describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { Hono } from 'hono';
import type { NoteRow } from '@opennote/core';
import { register } from './comments.js';

function makeNote(overrides: Partial<NoteRow> = {}): NoteRow {
  const now = new Date().toISOString();
  return {
    slug: overrides.slug ?? 'hello-comments',
    title: overrides.title ?? 'Hello Comments',
    summary: overrides.summary ?? null,
    body_html: overrides.body_html ?? '<p>body</p>',
    body_text: overrides.body_text ?? 'body',
    kind: overrides.kind ?? 'markdown',
    visibility: overrides.visibility ?? 'public',
    searchable: overrides.searchable ?? 1,
    seo_indexable: overrides.seo_indexable ?? 1,
    rss_includable: overrides.rss_includable ?? 1,
    featured_on_home: overrides.featured_on_home ?? 0,
    short_id: overrides.short_id ?? null,
    source_path: overrides.source_path ?? 'notes/hello-comments.md',
    created_at: overrides.created_at ?? now,
    updated_at: overrides.updated_at ?? now,
    published_at: overrides.published_at ?? now,
    scheduled_at: overrides.scheduled_at ?? null,
    word_count: overrides.word_count ?? 1,
    reading_minutes: overrides.reading_minutes ?? 1,
    cover: overrides.cover ?? null,
    hash: overrides.hash ?? 'hash',
  };
}

interface StoredComment {
  id: number;
  slug: string;
  parent_id: number | null;
  author: string;
  email: string | null;
  website: string | null;
  body: string;
  status: string;
  anchor: string | null;
  ip_hash: string | null;
  ua: string | null;
  created_at: string;
  moderated_at: string | null;
}

class FakeDb {
  note = makeNote();
  comments: StoredComment[] = [];
  private nextCommentId = 1;

  asDatabase(): Database {
    return this as unknown as Database;
  }

  prepare(sql: string): {
    run: (...args: unknown[]) => { lastInsertRowid: number };
    get: (...args: unknown[]) => unknown;
    all: (...args: unknown[]) => unknown[];
  } {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    return {
      run: (...args: unknown[]) => {
        if (normalized.startsWith('INSERT INTO comments')) {
          const id = this.nextCommentId++;
          this.comments.push({
            id,
            slug: String(args[0]),
            parent_id: args[1] == null ? null : Number(args[1]),
            author: String(args[2]),
            email: args[3] == null ? null : String(args[3]),
            website: args[4] == null ? null : String(args[4]),
            body: String(args[5]),
            status: String(args[6]),
            anchor: args[7] == null ? null : String(args[7]),
            ip_hash: args[8] == null ? null : String(args[8]),
            ua: args[9] == null ? null : String(args[9]),
            created_at: String(args[10]),
            moderated_at: null,
          });
          return { lastInsertRowid: id };
        }
        return { lastInsertRowid: 0 };
      },
      get: (...args: unknown[]) => {
        if (normalized.startsWith('SELECT * FROM notes WHERE slug = ?')) {
          return args[0] === this.note.slug ? this.note : undefined;
        }
        if (normalized.startsWith('SELECT * FROM comments WHERE id = ?')) {
          return this.comments.find((comment) => comment.id === Number(args[0]));
        }
        return undefined;
      },
      all: (...args: unknown[]) => {
        if (normalized.includes("WHERE slug = ? AND status = 'approved'")) {
          const slug = String(args[0]);
          return this.comments
            .filter((comment) => comment.slug === slug && comment.status === 'approved')
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map(({ id, parent_id, author, website, body, anchor, created_at }) => ({
              id,
              parent_id,
              author,
              website,
              body,
              anchor,
              created_at,
            }));
        }
        return [];
      },
    };
  }
}

describe('comments routes', () => {
  it('defaults public submissions to pending moderation', async () => {
    const fake = new FakeDb();
    const app = new Hono();
    register(app, { db: fake.asDatabase() });

    const post = await app.request('/api/posts/hello-comments/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ author: 'Reader', body: 'Needs review first.' }),
    });

    expect(post.status).toBe(200);
    expect(await post.json()).toMatchObject({ ok: true, status: 'pending' });

    const publicList = await app.request('/api/posts/hello-comments/comments');
    expect(await publicList.json()).toEqual({ comments: [] });

    expect(fake.comments).toHaveLength(1);
    expect(fake.comments[0]).toMatchObject({
      slug: 'hello-comments',
      author: 'Reader',
      body: 'Needs review first.',
      status: 'pending',
    });
  });
});
