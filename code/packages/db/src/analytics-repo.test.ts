import { describe, expect, it } from 'vitest';
import { AnalyticsRepo } from './analytics-repo.js';

function fakeDb() {
  const topQueries: string[] = [];
  return {
    topQueries,
    prepare(sql: string) {
      if (sql.includes('COALESCE(n.title')) {
        topQueries.push(sql);
        expect(sql).toMatch(/JOIN\s+notes\s+n\s+ON\s+n\.slug\s*=\s*e\.slug/i);
        expect(sql).toMatch(/n\.visibility\s*=\s*'public'/i);
        return { all: () => [{ slug: 'public-post', title: 'Public post', views: 3 }] };
      }
      if (sql.includes('WITH visit')) return { get: () => ({ sessions: 0, bounced: 0 }) };
      return { get: () => ({ views: 3, uniques: 2, dwell_sum: 0, dwell_n: 0 }) };
    },
  } as any;
}

describe('AnalyticsRepo overview', () => {
  it('keeps private or deleted slugs out of top_posts', () => {
    const db = fakeDb();
    const overview = new AnalyticsRepo(db).overview('30d');

    expect(overview.top_posts).toEqual([{ slug: 'public-post', title: 'Public post', views: 3 }]);
    expect(db.topQueries).toHaveLength(1);
  });
});
