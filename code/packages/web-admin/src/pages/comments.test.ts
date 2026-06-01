import { describe, expect, it } from 'vitest';
import { DEFAULT_COMMENT_TAB, emptyCommentMessage } from './comments.js';

describe('comments page defaults', () => {
  it('opens on all comments so approved conversations are not hidden', () => {
    expect(DEFAULT_COMMENT_TAB).toBe('all');
  });

  it('uses status-specific empty copy instead of claiming every comment is missing', () => {
    expect(emptyCommentMessage('pending')).toContain('没有待审评论');
    expect(emptyCommentMessage('approved')).toContain('没有已通过评论');
    expect(emptyCommentMessage('all')).toContain('还没有任何评论');
  });
});
