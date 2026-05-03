/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OgData } from '../render.js';

/**
 * Terminal — 终端 · 极客(对照 hf-og.jsx TmplCode)
 * 黑底 + macOS 红黄绿圆点 + $ prompt
 */

const h = (type: string, props: Record<string, unknown>, ...children: unknown[]) => ({
  type,
  props: { ...props, children: children.length === 1 ? children[0] : children },
  key: null,
});

const dot = (bg: string) =>
  h('span', {
    style: { width: 18, height: 18, borderRadius: 9999, background: bg },
  });

export default function terminal(data: OgData): unknown {
  const tag = data.tag ?? '';
  const site = data.site ?? '';
  const date = data.date ?? '';
  const reading = data.reading ?? '';
  const desc = data.description ?? '';
  const author = data.author ?? '@lumio';

  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        background: '#0a0a0a',
        color: '#e5e5e5',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter',
      },
    },
    // chrome
    h(
      'div',
      {
        style: {
          padding: '20px 28px',
          borderBottom: '1px solid #262626',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: '#171717',
        },
      },
      dot('#ef4444'),
      dot('#fbbf24'),
      dot('#4ade80'),
      h(
        'span',
        {
          style: {
            marginLeft: 18,
            fontSize: 20,
            color: '#737373',
          },
        },
        `~/blog/posts/${(data.title || '').slice(0, 28)}.md`,
      ),
    ),
    // body
    h(
      'div',
      {
        style: {
          flex: 1,
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
        },
      },
      tag
        ? h(
            'div',
            {
              style: { fontSize: 20, color: '#737373', marginBottom: 12 },
            },
            `# ${tag}`,
          )
        : '',
      h(
        'div',
        {
          style: {
            fontSize: 56,
            color: '#fff',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 24,
            letterSpacing: '-0.01em',
            display: 'flex',
            flexWrap: 'wrap',
          },
        },
        h('span', { style: { color: '#4ade80', marginRight: 14 } }, '$'),
        data.title,
      ),
      desc
        ? h(
            'div',
            {
              style: {
                fontSize: 24,
                color: '#a3a3a3',
                lineHeight: 1.55,
                maxWidth: '92%',
                marginBottom: 'auto',
              },
            },
            desc,
          )
        : h('div', { style: { marginBottom: 'auto' } }),
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontSize: 20,
            color: '#737373',
          },
        },
        h('span', { style: { color: '#22d3ee' } }, author),
        h('span', {}, '·'),
        date ? h('span', {}, date) : '',
        date && reading ? h('span', {}, '·') : '',
        reading ? h('span', {}, reading) : '',
        site
          ? h(
              'span',
              { style: { marginLeft: 'auto', color: '#4ade80' } },
              site,
            )
          : '',
      ),
    ),
  );
}
