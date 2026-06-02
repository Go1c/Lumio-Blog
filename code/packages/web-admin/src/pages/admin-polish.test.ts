import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = (...parts: string[]): string =>
  readFileSync(join(import.meta.dirname, ...parts), 'utf8');

describe('admin polish regressions', () => {
  it('labels audit and subscriber table cells for mobile card layouts', () => {
    const audit = src('audit.tsx');
    const subscriptions = src('subscriptions.tsx');

    for (const label of ['展开', '时间', 'Actor', 'Action', 'Target', 'IP']) {
      expect(audit).toContain(`data-label="${label}"`);
    }
    for (const label of ['邮箱', '来源', '状态', '订阅时间', '退订时间', '操作']) {
      expect(subscriptions).toContain(`data-label="${label}"`);
    }
  });

  it('does not hide note row actions behind hover-only state', () => {
    const noteList = src('note-list.tsx');

    expect(noteList).not.toContain("visibility: hover ? 'visible' : 'hidden'");
    expect(noteList).toContain("data-label=\"操作\"");
  });

  it('gives sync actions an aria-live status instead of silently reloading or swallowing errors', () => {
    const app = src('..', 'app.tsx');
    const dashboard = src('dashboard.tsx');

    expect(app).toContain('aria-live="polite"');
    expect(app).not.toContain('api.sync().then(() => location.reload())');
    expect(dashboard).not.toContain("api.sync().catch(() => {/* ignore */})");
  });
});
