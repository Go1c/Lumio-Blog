import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('backup page source-of-truth boundary', () => {
  it('does not expose unimplemented destructive or scheduled backup controls', () => {
    const source = readFileSync(new URL('./backup.tsx', import.meta.url), 'utf-8');

    expect(source).not.toContain('后端动作待实现');
    expect(source).not.toContain('其他 WS');
    expect(source).not.toContain('目前等同');
    expect(source).not.toContain('SQLite dump');
    expect(source).not.toContain('Markdown bundle');
    expect(source).not.toContain('rangeFrom');
    expect(source).not.toContain('rangeTo');
    expect(source).not.toContain('清空所有草稿');
    expect(source).not.toContain('重置统计数据');
    expect(source).not.toContain('删除整站');
    expect(source).not.toContain('auto-freq');
  });
});
