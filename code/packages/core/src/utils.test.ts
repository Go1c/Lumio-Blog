import { describe, expect, it } from 'vitest';
import {
  countWords,
  extractWikilinks,
  generateShortId,
  hashContent,
  slugify,
  stripMarkdown,
} from './utils.js';

describe('slugify', () => {
  it('converts simple titles', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });
  it('drops weird punctuation', () => {
    expect(slugify("It's a test!?")).toBe('its-a-test');
  });
  it('preserves CJK characters', () => {
    expect(slugify('游戏 AI 笔记')).toBe('游戏-ai-笔记');
  });
  it('truncates to 80 chars', () => {
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe('countWords', () => {
  it('counts english words', () => {
    expect(countWords('hello world foo bar').words).toBe(4);
  });
  it('counts chinese chars', () => {
    expect(countWords('游戏开发笔记').words).toBe(6);
  });
  it('mix', () => {
    expect(countWords('游戏 AI notes').words).toBe(4); // 2 cjk + 2 ascii words
  });
});

describe('extractWikilinks', () => {
  it('plain', () => {
    expect(extractWikilinks('see [[note-a]] and [[note-b]]')).toEqual([
      'note-a',
      'note-b',
    ]);
  });
  it('with alias', () => {
    expect(extractWikilinks('[[note-a|My Alias]]')).toEqual(['note-a']);
  });
  it('with anchor', () => {
    expect(extractWikilinks('[[note-a#section]]')).toEqual(['note-a']);
  });
});

describe('generateShortId', () => {
  it('is 5 chars', () => {
    expect(generateShortId()).toHaveLength(5);
  });
  it('is base62', () => {
    expect(generateShortId()).toMatch(/^[A-Za-z0-9]{5}$/);
  });
});

describe('hashContent', () => {
  it('stable', () => {
    expect(hashContent('hello')).toBe(hashContent('hello'));
  });
  it('different inputs differ', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });
});

describe('stripMarkdown', () => {
  it('strips code blocks', () => {
    expect(stripMarkdown('hi\n```\ncode\n```\nbye')).toBe('hi bye');
  });
  it('keeps link text', () => {
    expect(stripMarkdown('see [my note](http://x)')).toBe('see my note');
  });
});
