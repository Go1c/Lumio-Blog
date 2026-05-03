/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OgData } from '../render.js';

/**
 * Minimal — 极简 · 杂志风(对照 hf-og.jsx TmplMinimal)
 *
 * satori 接受 React-element-shaped 对象。我们不用 JSX runtime,
 * 直接构造 { type, props, key } 三元组,避免 react import 噪音。
 */

const h = (type: string, props: Record<string, unknown>, ...children: unknown[]) => ({
  type,
  props: { ...props, children: children.length === 1 ? children[0] : children },
  key: null,
});

export default function minimal(data: OgData): unknown {
  const tag = data.tag ?? 'note';
  const site = data.site ?? '';
  const date = data.date ?? '';
  const reading = data.reading ?? '';

  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        padding: 64,
        background: '#fafaf9',
        color: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        fontFamily: 'Inter',
      },
    },
    h(
      'div',
      {
        style: {
          fontSize: 22,
          color: '#737373',
          marginBottom: 28,
          display: 'flex',
          gap: 14,
        },
      },
      h('span', {}, site),
      site && tag ? h('span', {}, '·') : '',
      tag ? h('span', {}, `#${tag}`) : '',
    ),
    h(
      'h1',
      {
        style: {
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1.1,
          margin: 0,
          marginBottom: 28,
          letterSpacing: '-0.025em',
          maxWidth: '95%',
        },
      },
      data.title,
    ),
    h('div', {
      style: { width: 80, height: 6, background: '#0066ff', marginBottom: 28 },
    }),
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          fontSize: 24,
          color: '#525252',
        },
      },
      h(
        'span',
        { style: { fontWeight: 600, color: '#0a0a0a' } },
        data.author ?? 'Lumio',
      ),
      h('span', {}, '·'),
      h('span', {}, date),
      reading ? h('span', {}, '·') : '',
      reading ? h('span', {}, reading) : '',
    ),
  );
}
