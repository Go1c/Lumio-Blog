/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OgData } from '../render.js';

/**
 * Magazine — 渐变 · 醒目(对照 hf-og.jsx TmplGradient)
 * 蓝紫渐变 + 半透明圆斑 + 大标题 + tag 圆角丸子。
 */

const h = (type: string, props: Record<string, unknown>, ...children: unknown[]) => ({
  type,
  props: { ...props, children: children.length === 1 ? children[0] : children },
  key: null,
});

export default function magazine(data: OgData): unknown {
  const tag = data.tag ?? '';
  const reading = data.reading ?? '';
  const desc = data.description ?? '';

  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        padding: 64,
        background: 'linear-gradient(135deg, #0066ff 0%, #a855f7 60%, #ec4899 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter',
        position: 'relative',
        overflow: 'hidden',
      },
    },
    // 大圆斑装饰(纯色,satori 不支持 blur)
    h('div', {
      style: {
        position: 'absolute',
        top: -80,
        right: -80,
        width: 360,
        height: 360,
        borderRadius: 9999,
        background: 'rgba(255,255,255,0.18)',
      },
    }),
    h('div', {
      style: {
        position: 'absolute',
        bottom: -60,
        left: -60,
        width: 240,
        height: 240,
        borderRadius: 9999,
        background: 'rgba(255,255,255,0.10)',
      },
    }),
    // logo row
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 40,
        },
      },
      h(
        'div',
        {
          style: {
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.25)',
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
      h('span', { style: { fontWeight: 800, fontSize: 28 } }, 'LumioGames'),
    ),
    // title
    h(
      'h1',
      {
        style: {
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1.08,
          margin: 0,
          marginBottom: 26,
          letterSpacing: '-0.02em',
        },
      },
      data.title,
    ),
    // desc
    desc
      ? h(
          'p',
          {
            style: {
              fontSize: 26,
              lineHeight: 1.5,
              opacity: 0.9,
              margin: 0,
              marginBottom: 'auto',
              maxWidth: '92%',
            },
          },
          desc,
        )
      : h('div', { style: { marginBottom: 'auto' } }),
    // pills
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 12 } },
      tag
        ? h(
            'span',
            {
              style: {
                padding: '8px 18px',
                background: 'rgba(255,255,255,0.22)',
                borderRadius: 9999,
                fontSize: 22,
              },
            },
            `#${tag}`,
          )
        : '',
      reading
        ? h(
            'span',
            {
              style: {
                padding: '8px 18px',
                background: 'rgba(255,255,255,0.22)',
                borderRadius: 9999,
                fontSize: 22,
              },
            },
            reading,
          )
        : '',
    ),
  );
}
