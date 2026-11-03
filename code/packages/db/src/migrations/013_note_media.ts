/**
 * Migration 013 — notes.media / notes.media_title
 *
 * 文章首屏媒体(三选一):frontmatter `media` 填视频或音频地址,有它时首屏放视频 / 边听边读,
 * 否则退回 `cover` 图片封面,都没有就不显示。
 *  - media:视频(B 站 / YouTube 链接,或 .mp4 / .webm)或音频(.mp3 / .m4a / .ogg)地址
 *  - media_title:边听边读的曲名;视频上方的一句引导语
 * 老数据为 NULL,作者改文章后由 sync 写入。
 */

export const migration013NoteMedia = {
  version: 13,
  name: 'note_media',
  up: `
    ALTER TABLE notes ADD COLUMN media TEXT;
    ALTER TABLE notes ADD COLUMN media_title TEXT;
  `,
} as const;
