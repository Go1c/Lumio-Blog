/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OgData } from '../render.js';

/**
 * Newspaper — 经典 · 蓝边(对照 hf-og.jsx TmplClassic)
 * 白底 + 左侧 8px 蓝带 + 大标题 + 副标。
 */

const h = (type: string, props: Record<string, unknown>, ...children: unknown[]) => ({
  type,
  props: { ...props, children: children.length === 1 ? children[0] : children },
  key: null,
});

export default function newspaper(data: OgData): unknown {
  const tag = data.tag ?? '';
  const site = data.site ?? '';
  const date = data.date ?? '';
  const reading = data.reading ?? '';
  const desc = data.description ?? '';

  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        padding: 56,
        background: '#fff',
        color: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '12px solid #0066ff',
        fontFamily: 'Inter',
      },
    },
    // header
    h(
      'div',
      {
        style: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 },
      },
      h(
        'div',
        {
          style: {
            width: 56,
            height: 56,
            borderRadius: 12,
            background: '#0a0a0a',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 28,
          },
        },
        'L',
      ),
      h('span', { style: { fontWeight: 800, fontSize: 26 } }, 'Lumio'),
      site
        ? h('span', { style: { fontSize: 20, color: '#666' } }, `· ${site}`)
        : '',
    ),
    // tag
    tag
      ? h(
          'span',
          {
            style: {
              fontSize: 18,
              color: '#0066ff',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 18,
              fontWeight: 700,
            },
          },
          `#${tag}`,
        )
      : '',
    h(
      'h1',
      {
        style: {
          fontSize: 64,
          fontWeight: 800,
          lineHeight: 1.12,
          margin: 0,
          marginBottom: 22,
          letterSpacing: '-0.02em',
        },
      },
      data.title,
    ),
    desc
      ? h(
          'p',
          {
            style: {
              fontSize: 26,
              lineHeight: 1.45,
              color: '#444',
              margin: 0,
              marginBottom: 'auto',
              maxWidth: '90%',
            },
          },
          desc,
        )
      : h('div', { style: { marginBottom: 'auto' } }),
    // footer
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          fontSize: 22,
          color: '#666',
        },
      },
      date ? h('span', {}, date) : '',
      date && reading ? h('span', {}, '·') : '',
      reading ? h('span', {}, reading) : '',
    ),
  );
}
