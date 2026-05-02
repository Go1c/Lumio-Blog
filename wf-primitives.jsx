/* global React */
// Shared sketchy wireframe primitives — exposed on window for sibling Babel scripts.

const { useState } = React;

// === Browser-chrome frame for prototype boards ============================
function BrowserChrome({ url = 'lumiogames.dev', children, mode = 'light', height }) {
  const dark = mode === 'dark';
  return (
    <div className="sk sk-shadow" style={{
      background: dark ? '#1f1d1a' : 'var(--paper)',
      color: dark ? '#f0ece1' : 'var(--ink)',
      borderColor: 'var(--ink)',
      overflow: 'hidden',
      height,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '8px 12px',
        borderBottom: '1.5px solid ' + (dark ? '#3a362f' : 'var(--ink)'),
        background: dark ? '#15130f' : 'var(--paper-warm)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid ' + (dark ? '#5a544a' : 'var(--ink)') }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid ' + (dark ? '#5a544a' : 'var(--ink)') }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid ' + (dark ? '#5a544a' : 'var(--ink)') }} />
        </div>
        <div className="sk" style={{
          flex: 1,
          padding: '2px 10px',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          background: dark ? '#0d0c0a' : 'var(--paper)',
          borderColor: dark ? '#3a362f' : 'var(--line-soft)',
          color: dark ? '#a8a29a' : 'var(--ink-soft)',
        }}>
          🔒 https://{url}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

// === Sticky note label that sits beside an artboard =======================
function StickyNote({ children, color = 'yellow', rotate = -2, style }) {
  const colors = {
    yellow: 'var(--warn-soft)',
    pink: '#ffd1d6',
    blue: 'var(--hi2-soft)',
    orange: 'var(--hi-soft)',
  };
  return (
    <div style={{
      background: colors[color] || colors.yellow,
      border: '1.5px solid var(--ink)',
      padding: '8px 12px',
      fontFamily: 'var(--hand)',
      fontSize: 13,
      lineHeight: 1.35,
      transform: `rotate(${rotate}deg)`,
      boxShadow: '2px 2px 0 var(--ink)',
      maxWidth: 240,
      ...style,
    }}>
      {children}
    </div>
  );
}

// === Annotation: dashed callout from a label to a target ==================
function Callout({ children, color = 'var(--hi)' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'var(--hand)',
      fontSize: 12,
      color,
      fontStyle: 'italic',
    }}>
      <span>↳</span> {children}
    </span>
  );
}

// === Squiggle line ========================================================
function Squiggle({ width = 60, color = 'var(--ink)', strokeWidth = 1.5 }) {
  return (
    <svg width={width} height="6" viewBox={`0 0 ${width} 6`} style={{ display: 'block' }}>
      <path d={`M0 3 Q ${width*0.15} 0, ${width*0.3} 3 T ${width*0.6} 3 T ${width*0.9} 3 T ${width} 3`}
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

// === Hand-drawn arrow =====================================================
function HandArrow({ width = 40, height = 30, color = 'var(--hi)', dir = 'down-right' }) {
  // simple svg arrow with a slight curve
  const paths = {
    'down-right': 'M 4 4 Q 18 6, 24 18 T 36 26 M 30 22 L 36 26 L 32 32',
    'down-left':  'M 36 4 Q 22 6, 16 18 T 4 26 M 10 22 L 4 26 L 8 32',
    'right':      'M 4 14 Q 16 8, 28 14 M 24 10 L 30 14 L 24 18',
    'left':       'M 36 14 Q 24 8, 12 14 M 16 10 L 10 14 L 16 18',
    'down':       'M 14 4 Q 18 14, 14 26 M 10 22 L 14 28 L 18 22',
  };
  return (
    <svg width={width} height={height} viewBox="0 0 40 36" style={{ display: 'block', overflow: 'visible' }}>
      <path d={paths[dir]} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 2" />
    </svg>
  );
}

// === Tag pill with optional dot for visibility status =====================
function Vis({ state }) {
  // state: 'public' | 'link' | 'private'
  const map = {
    public:  { label: '公开',   cls: 'tag--ok',     dot: '●' },
    link:    { label: '仅链接', cls: 'tag--warn',   dot: '◐' },
    private: { label: '私有',   cls: 'tag--danger', dot: '○' },
  };
  const m = map[state] || map.private;
  return <span className={`tag ${m.cls}`} style={{ fontSize: 12 }}>{m.dot} {m.label}</span>;
}

function Searchable({ on }) {
  return (
    <span className={`tag ${on ? 'tag--blue' : 'tag--ghost'}`} style={{ fontSize: 12 }}>
      {on ? '🔎 可搜' : '🚫 不可搜'}
    </span>
  );
}

// === Annotated container — renders sticky callouts at fixed positions ====
function Annotated({ children, notes = [], style }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {children}
      {notes.map((n, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: n.top, left: n.left, right: n.right, bottom: n.bottom,
          zIndex: 5,
          pointerEvents: 'none',
          maxWidth: n.maxWidth || 200,
        }}>
          <StickyNote color={n.color} rotate={n.rotate ?? -3}>{n.text}</StickyNote>
        </div>
      ))}
    </div>
  );
}

// === Faux SVG icon set (sketchy single-stroke) ===========================
function Icon({ name, size = 16, color = 'currentColor' }) {
  const s = size;
  const stroke = { fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const map = {
    search: <svg width={s} height={s} viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5" {...stroke} /><path d="M10.5 10.5 L14 14" {...stroke} /></svg>,
    plus:   <svg width={s} height={s} viewBox="0 0 16 16"><path d="M8 3 V13 M3 8 H13" {...stroke} /></svg>,
    chev:   <svg width={s} height={s} viewBox="0 0 16 16"><path d="M5 4 L10 8 L5 12" {...stroke} /></svg>,
    folder: <svg width={s} height={s} viewBox="0 0 16 16"><path d="M2 4 H6 L7.5 5.5 H14 V12 H2 Z" {...stroke} /></svg>,
    doc:    <svg width={s} height={s} viewBox="0 0 16 16"><path d="M3 2 H10 L13 5 V14 H3 Z M10 2 V5 H13" {...stroke} /></svg>,
    eye:    <svg width={s} height={s} viewBox="0 0 16 16"><path d="M1 8 Q 8 2, 15 8 Q 8 14, 1 8 Z" {...stroke} /><circle cx="8" cy="8" r="2" {...stroke} /></svg>,
    eyeoff: <svg width={s} height={s} viewBox="0 0 16 16"><path d="M2 8 Q 8 3, 14 8 M2 14 L14 2" {...stroke} /></svg>,
    link:   <svg width={s} height={s} viewBox="0 0 16 16"><path d="M6 10 Q 3 7, 6 4 H9 M10 6 Q 13 9, 10 12 H7 M5 8 H11" {...stroke} /></svg>,
    sync:   <svg width={s} height={s} viewBox="0 0 16 16"><path d="M3 8 Q 3 3, 8 3 L11 3 M11 1 L13 3 L11 5 M13 8 Q 13 13, 8 13 L5 13 M5 15 L3 13 L5 11" {...stroke} /></svg>,
    star:   <svg width={s} height={s} viewBox="0 0 16 16"><path d="M8 2 L9.5 6 L14 6.5 L10.5 9.5 L11.5 14 L8 11.5 L4.5 14 L5.5 9.5 L2 6.5 L6.5 6 Z" {...stroke} /></svg>,
    edit:   <svg width={s} height={s} viewBox="0 0 16 16"><path d="M3 13 L3 11 L11 3 L13 5 L5 13 Z M10 4 L12 6" {...stroke} /></svg>,
    trash:  <svg width={s} height={s} viewBox="0 0 16 16"><path d="M3 4 H13 M5 4 V13 H11 V4 M6 2 H10" {...stroke} /></svg>,
    tag:    <svg width={s} height={s} viewBox="0 0 16 16"><path d="M2 8 L8 2 L14 2 L14 8 L8 14 Z" {...stroke} /><circle cx="11" cy="5" r="1" {...stroke} /></svg>,
    chart:  <svg width={s} height={s} viewBox="0 0 16 16"><path d="M2 14 H14 M4 14 V9 M7 14 V5 M10 14 V11 M13 14 V7" {...stroke} /></svg>,
    cmd:    <svg width={s} height={s} viewBox="0 0 16 16"><path d="M5 5 H11 V11 H5 Z M5 5 Q3 5, 3 3 Q3 1, 5 3 Z M11 5 Q13 5, 13 3 Q13 1, 11 3 Z M5 11 Q3 11, 3 13 Q3 15, 5 13 Z M11 11 Q13 11, 13 13 Q13 15, 11 13 Z" {...stroke} /></svg>,
    pin:    <svg width={s} height={s} viewBox="0 0 16 16"><path d="M8 1 L11 4 L10 5 L11 8 L5 8 L6 5 L5 4 Z M8 8 V14" {...stroke} /></svg>,
    rss:    <svg width={s} height={s} viewBox="0 0 16 16"><path d="M3 13 Q3 11, 5 11 Q5 13, 3 13 Z M3 8 Q8 8, 8 13 M3 4 Q12 4, 12 13" {...stroke} /></svg>,
  };
  return map[name] || null;
}

Object.assign(window, { BrowserChrome, StickyNote, Callout, Squiggle, HandArrow, Vis, Searchable, Annotated, Icon });
