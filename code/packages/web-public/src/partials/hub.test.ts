import { describe, expect, it } from 'vitest';
import type { PromoGame } from '@opennote/core';
import { classifyMedia, renderHubFloat, renderHubPlay, renderHubRail, renderPostMedia } from './hub.js';

const game = (over: Partial<PromoGame> = {}): PromoGame => ({
  gameKey: 'g-1',
  title: '帽王乱斗',
  oneLiner: '',
  coverUrl: 'https://lumiogames.cn/media/a',
  authorName: 'Lumio',
  authorHandle: 'lumio',
  plays: 59,
  url: 'https://lumiogames.cn/g/slug?entry=blog&utm_source=blog&utm_medium=left_rail&utm_campaign=platform_games',
  ...over,
});

describe('classifyMedia', () => {
  it('recognises bilibili, youtube, video and audio files', () => {
    expect(classifyMedia('https://www.bilibili.com/video/BV1VDJm6VE7w/?spm=1')).toEqual({
      kind: 'video-embed',
      src: 'https://player.bilibili.com/player.html?bvid=BV1VDJm6VE7w&page=1&high_quality=1&danmaku=0&autoplay=0',
    });
    expect(classifyMedia('https://youtu.be/dQw4w9WgXcQ')).toEqual({ kind: 'video-embed', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' });
    expect(classifyMedia('/media/demo.mp4')?.kind).toBe('video-file');
    expect(classifyMedia('/media/song.m4a?v=2')?.kind).toBe('audio');
  });

  it('recognises youtube watch links and allows http only for player embeds', () => {
    expect(classifyMedia('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3')?.kind).toBe('video-embed');
    expect(classifyMedia('http://www.bilibili.com/video/BV1VDJm6VE7w')?.kind).toBe('video-embed');
    // CSP 的 media-src 只放行 'self' 和 https:,http 文件直链放不出来,退回 cover
    expect(classifyMedia('http://cdn.example.com/a.mp3')).toBeNull();
    expect(classifyMedia('http://cdn.example.com/a.mp4')).toBeNull();
  });

  it('rejects unknown types and unsafe urls', () => {
    expect(classifyMedia('/media/doc.pdf')).toBeNull();
    expect(classifyMedia('javascript:alert(1)//a.mp3')).toBeNull();
    expect(classifyMedia('//evil.example/a.mp3')).toBeNull();
    expect(classifyMedia(null)).toBeNull();
  });
});

describe('renderPostMedia', () => {
  const base = { title: 'T', cover: null, media: null, media_title: null };

  it('renders listen-while-reading for audio, with the corner badge', () => {
    const html = renderPostMedia({ ...base, media: '/media/song.mp3', media_title: '过来人 <OGs>' });
    expect(html).toContain('data-listen');
    expect(html).toContain('src="/media/song.mp3"');
    expect(html).toContain('data-mini');
    expect(html).toContain('过来人 &lt;OGs&gt;');
    expect(html).not.toContain('autoplay');
  });

  it('renders an embed or a video element for video media, with the optional label', () => {
    const embed = renderPostMedia({ ...base, media: 'https://youtu.be/dQw4w9WgXcQ', media_title: '先看 <这个>' });
    expect(embed).toContain('<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(embed).toContain('先看 &lt;这个&gt;');
    const file = renderPostMedia({ ...base, media: '/media/demo.mp4' });
    expect(file).toContain('<video src="/media/demo.mp4" controls');
    expect(file).not.toContain('media-cover__label');
  });

  it('falls back to the file name for the audio title without throwing on bad escapes', () => {
    expect(renderPostMedia({ ...base, media: '/media/%E8%BF%87%E6%9D%A5%E4%BA%BA.mp3' })).toContain('过来人');
    expect(() => renderPostMedia({ ...base, media: '/media/100%.mp3' })).not.toThrow();
    expect(renderPostMedia({ ...base, media: '/media/100%.mp3' })).toContain('100%');
  });

  it('falls back to the cover image, then to nothing', () => {
    expect(renderPostMedia({ ...base, cover: '/media/c.png' })).toContain('post-hero--cover');
    expect(renderPostMedia({ ...base, cover: '/media/c.png', media: '/x.pdf' })).toContain('post-hero--cover');
    expect(renderPostMedia(base)).toBe('');
  });
});

describe('hub rail and float', () => {
  it('always renders the studio card, and games only when there are some', () => {
    const empty = renderHubRail([]);
    expect(empty).toContain('一起做出好玩的游戏');
    expect(empty).toContain('https://lumiogames.cn/studio/?utm_source=blog&amp;utm_medium=left_rail&amp;utm_campaign=studio_hub#community');
    expect(empty).not.toContain('hub-play');
    expect(renderHubRail([game()])).toContain('开发者新作，点开就玩');
  });

  it('escapes upstream text and rewrites utm_medium per placement', () => {
    const html = renderHubPlay([game({ title: '<img src=x onerror=alert(1)>', authorName: 'a"b' })], 'mobile_float');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('@a&quot;b');
    expect(html).toContain('utm_medium=mobile_float');
    expect(html).not.toContain('utm_medium=left_rail');
  });

  it('omits the play count when unknown and the play button when there are no games', () => {
    expect(renderHubPlay([game({ plays: null })], 'left_rail')).not.toContain('次游玩');
    expect(renderHubFloat([])).not.toContain('data-float-play');
    expect(renderHubFloat([game()])).toContain('data-float-play');
  });
});
