/* global React */
const { useState, useEffect, useRef } = React;

// === Browser frame ====================================================
function HFBrowser({ url, children, height, theme = 'light', tabs }) {
  return (
    <div data-theme={theme} style={{
      background: 'var(--bg)',
      border: '1px solid var(--line-strong)',
      borderRadius: 12,
      overflow: 'hidden',
      height,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: 'var(--shadow-2)',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg-soft)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f56' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#27c93f' }} />
        </div>
        <div style={{
          flex: 1,
          padding: '4px 12px',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          borderRadius: 6,
          color: 'var(--ink-3)',
          maxWidth: 460,
          margin: '0 auto',
          textAlign: 'center',
        }} aria-label={`mock browser address: secure ${url}`}>
          <span aria-hidden="true">🔒 </span>{url}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: 'var(--bg)' }} className="hf">
        {children}
      </div>
    </div>
  );
}

// === Icon ============================================================
function HfIcon({ name, size = 16, color = 'currentColor', strokeWidth = 1.6 }) {
  const s = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const map = {
    search:  <svg width={size} height={size} viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5" {...s} /><path d="M10.5 10.5 L14 14" {...s} /></svg>,
    plus:    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M8 3 V13 M3 8 H13" {...s} /></svg>,
    chev:    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M5 4 L10 8 L5 12" {...s} /></svg>,
    chevd:   <svg width={size} height={size} viewBox="0 0 16 16"><path d="M4 6 L8 10 L12 6" {...s} /></svg>,
    folder:  <svg width={size} height={size} viewBox="0 0 16 16"><path d="M2 5 L2 12 H14 V6 H8 L7 5 Z" {...s} /></svg>,
    doc:     <svg width={size} height={size} viewBox="0 0 16 16"><path d="M3 2 H10 L13 5 V14 H3 Z M10 2 V5 H13" {...s} /></svg>,
    eye:     <svg width={size} height={size} viewBox="0 0 16 16"><path d="M1 8 Q 8 2.5, 15 8 Q 8 13.5, 1 8 Z" {...s} /><circle cx="8" cy="8" r="2" {...s} /></svg>,
    eyeoff:  <svg width={size} height={size} viewBox="0 0 16 16"><path d="M2 8 Q 8 3, 14 8 M3 13 L13 3" {...s} /></svg>,
    link:    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M7 9 L9 7 M6 11 Q 3 11, 3 8 Q 3 5, 6 5 H8 M10 11 H8 M10 5 Q 13 5, 13 8 Q 13 11, 10 11" {...s} /></svg>,
    sync:    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M3 8 Q 3 3, 8 3 H11 M9 1 L11 3 L9 5 M13 8 Q 13 13, 8 13 H5 M7 15 L5 13 L7 11" {...s} /></svg>,
    star:    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M8 2 L9.5 6 L14 6.5 L10.5 9.5 L11.5 14 L8 11.5 L4.5 14 L5.5 9.5 L2 6.5 L6.5 6 Z" {...s} /></svg>,
    edit:    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M3 13 L3 11 L11 3 L13 5 L5 13 Z M10 4 L12 6" {...s} /></svg>,
    trash:   <svg width={size} height={size} viewBox="0 0 16 16"><path d="M3 4 H13 M5 4 V13 H11 V4 M6 2 H10" {...s} /></svg>,
    tag:     <svg width={size} height={size} viewBox="0 0 16 16"><path d="M2 8 L2 3 L7 3 L14 10 L10 14 L3 7" {...s} /><circle cx="5" cy="6" r=".8" fill="currentColor" stroke="none" /></svg>,
    chart:   <svg width={size} height={size} viewBox="0 0 16 16"><path d="M2 14 H14 M4 14 V9 M7 14 V5 M10 14 V11 M13 14 V7" {...s} /></svg>,
    cmd:     <svg width={size} height={size} viewBox="0 0 16 16"><path d="M5 5 H11 V11 H5 Z M3 3 Q5 3, 5 5 V11 Q3 11, 3 13 Q5 13, 5 11 Q3 11, 3 9 V5 Q5 5, 5 3 Q3 3, 3 5" {...s} /></svg>,
    pin:     <svg width={size} height={size} viewBox="0 0 16 16"><path d="M9.5 1 L15 6.5 L13 7 L11 9 L7 5 L9 3 Z M7 5 L2 10 M2 10 L1 14 L5 13 M2 10 L5 13" {...s} /></svg>,
    rss:     <svg width={size} height={size} viewBox="0 0 16 16"><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" /><path d="M2 8 Q8 8, 8 14 M2 4 Q12 4, 12 14" {...s} /></svg>,
    sun:     <svg width={size} height={size} viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" {...s} /><path d="M8 1 V3 M8 13 V15 M1 8 H3 M13 8 H15 M3 3 L4.5 4.5 M11.5 11.5 L13 13 M3 13 L4.5 11.5 M11.5 4.5 L13 3" {...s} /></svg>,
    moon:    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M13 9.5 A6 6 0 1 1 6.5 3 A4.5 4.5 0 0 0 13 9.5 Z" {...s} /></svg>,
    arrowR:  <svg width={size} height={size} viewBox="0 0 16 16"><path d="M3 8 H13 M9 4 L13 8 L9 12" {...s} /></svg>,
    layers:  <svg width={size} height={size} viewBox="0 0 16 16"><path d="M8 2 L14 5 L8 8 L2 5 Z M2 8 L8 11 L14 8 M2 11 L8 14 L14 11" {...s} /></svg>,
    bell:    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M4 11 V7 Q4 4, 8 4 Q12 4, 12 7 V11 L13 12 H3 Z M7 13 Q8 14, 9 13" {...s} /></svg>,
    dots:    <svg width={size} height={size} viewBox="0 0 16 16"><circle cx="3" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="13" cy="8" r="1.2" fill="currentColor" stroke="none"/></svg>,
    copy:    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M5 5 H12 V13 H5 Z M3 3 H10 V5 M3 3 V11 H5" {...s} /></svg>,
    book:    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M3 3 H7 Q8 3, 8 4 V13 Q8 12, 7 12 H3 Z M13 3 H9 Q8 3, 8 4 V13 Q8 12, 9 12 H13 Z" {...s} /></svg>,
    note:    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M3 2 H10 L13 5 V14 H3 Z M5 7 H11 M5 10 H9" {...s} /></svg>,
    home:    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M2 8 L8 2 L14 8 M4 7 V14 H12 V7" {...s} /></svg>,
    settings:<svg width={size} height={size} viewBox="0 0 16 16"><circle cx="8" cy="8" r="2" {...s} /><path d="M8 1 V3 M8 13 V15 M1 8 H3 M13 8 H15 M3 3 L4.5 4.5 M11.5 11.5 L13 13 M3 13 L4.5 11.5 M11.5 4.5 L13 3" {...s} /></svg>,
    flame:   <svg width={size} height={size} viewBox="0 0 16 16"><path d="M8 1 Q11 5, 9 7 Q12 7, 12 11 Q12 14, 8 14 Q4 14, 4 11 Q4 8, 6 7 Q5 4, 8 1 Z" {...s} /></svg>,
    activity:<svg width={size} height={size} viewBox="0 0 16 16"><path d="M1 8 H4 L6 3 L9 13 L11 8 H15" {...s} /></svg>,
  };
  return map[name] || null;
}

// === site nav (frontend top bar) =======================================
function HfNav({ active, onTheme, theme }) {
  const items = [
    { id: '首页', icon: 'home', href: '/' },
    { id: '文章', icon: 'doc', href: '/posts' },
    { id: '笔记', icon: 'note', href: '/notes' },
    { id: '文档', icon: 'book', href: '/docs' },
    { id: '标签', icon: 'tag', href: '/tags' },
    { id: '关于', icon: null, href: '/about' },
  ];
  return (
    <nav aria-label="主导航" style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--line)',
      padding: '0 28px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 24,
    }}>
      <a href="/" aria-label="LumioGames 首页" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        textDecoration: 'none', color: 'inherit',
      }} className="hf-md-edit">
        <div aria-hidden="true" style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'var(--ink)', color: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
        }}>L</div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          LumioGames<span style={{ color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11, marginLeft: 4 }}>/blog</span>
        </div>
        <span className="hf-md-pill" aria-hidden="true" style={{
          fontFamily: 'var(--mono)', fontSize: 9,
          padding: '2px 6px', borderRadius: 999,
          background: 'var(--accent-soft)', color: 'var(--accent-2)',
          cursor: 'help', opacity: 0, transition: 'opacity .2s',
          whiteSpace: 'nowrap',
        }}>✎ 后台 → 设置 → 站点</span>
      </a>
      <ul style={{
        display: 'flex', gap: 4, marginLeft: 8,
        listStyle: 'none', padding: 0, margin: 0,
      }}>
        {items.map(it => (
          <li key={it.id}>
            <a
              href={it.href}
              aria-current={active === it.id ? 'page' : undefined}
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 500,
                color: active === it.id ? 'var(--ink)' : 'var(--ink-3)',
                position: 'relative',
                textDecoration: 'none',
                borderRadius: 4,
              }}
            >
              {it.id}
              {active === it.id && <span aria-hidden="true" style={{
                position: 'absolute', bottom: -19, left: 12, right: 12, height: 2,
                background: 'var(--accent)',
              }} />}
            </a>
          </li>
        ))}
      </ul>
      <div className="hf-grow" />
      <button type="button" aria-label="打开搜索 (⌘K)" aria-keyshortcuts="Meta+K" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        minHeight: 32,
        background: 'var(--bg-soft)',
        border: '1px solid var(--line)',
        borderRadius: 8,
        minWidth: 220,
        fontSize: 12,
        color: 'var(--ink-3)',
        cursor: 'pointer',
        font: 'inherit',
        textAlign: 'left',
      }}>
        <HfIcon name="search" size={13} />
        <span className="hf-grow">搜索文章、笔记、标签…</span>
        <span className="hf-kbd" aria-hidden="true">⌘K</span>
      </button>
      <button
        type="button"
        className="hf-btn hf-btn--icon"
        onClick={onTheme}
        aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
      >
        <HfIcon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
      </button>
      <a href="/rss.xml" className="hf-btn hf-btn--icon" aria-label="RSS 订阅"><HfIcon name="rss" size={14} /></a>
    </nav>
  );
}

// === Self-promo ad card =====================================
// Two variants:
//   variant="hero"   — 用在首页侧栏，竖向，强视觉
//   variant="native" — 用在文章中段，横向卡片，原生感
function HfAd({ variant = 'native' }) {
  const url = 'https://api.lumio.games/';
  const host = 'api.lumio.games';

  if (variant === 'hero') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`赞助:Lumio Games API — 访问 ${host}(在新标签页打开)`} style={{
        display: 'block',
        position: 'relative',
        padding: 16,
        borderRadius: 10,
        background: 'linear-gradient(135deg, var(--ink) 0%, #1a1a1a 100%)',
        color: '#fff',
        overflow: 'hidden',
        textDecoration: 'none',
      }}>
        {/* corner sponsor tag */}
        <span style={{
          position: 'absolute', top: 8, right: 8,
          fontFamily: 'var(--mono)', fontSize: 9,
          padding: '2px 6px', borderRadius: 999,
          background: 'rgba(255,255,255,.08)',
          color: 'rgba(255,255,255,.55)',
          letterSpacing: '.04em',
        }}>SPONSOR · 自家</span>
        {/* glow */}
        <div style={{
          position: 'absolute', top: -30, left: -30,
          width: 120, height: 120, borderRadius: '50%',
          background: 'var(--accent)', filter: 'blur(40px)', opacity: .35,
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent-2)', fontWeight: 600,
            marginBottom: 6, marginTop: 4,
          }}>{'{ }'} api.lumio.games</div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginBottom: 6 }}>
            Lumio Games API
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.55, color: 'rgba(255,255,255,.65)', marginBottom: 12 }}>
            我自己在做的游戏开发 API — 排行榜、存档同步、玩家分析。开发者免费试用。
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600,
            color: 'var(--accent)',
          }}>
            访问 {host} <HfIcon name="arrowR" size={11} color="var(--accent)" />
          </div>
        </div>
      </a>
    );
  }

  // native (inline article)
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`赞助:Lumio Games API(在新标签页打开)`} style={{
      display: 'block',
      margin: '24px 0',
      padding: 18,
      border: '1px solid var(--line)',
      borderLeft: '3px solid var(--accent)',
      borderRadius: 8,
      background: 'var(--bg-soft)',
      textDecoration: 'none',
      color: 'var(--ink)',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 10, right: 14,
        fontFamily: 'var(--mono)', fontSize: 9,
        color: 'var(--ink-4)', letterSpacing: '.05em',
      }}>SPONSOR · 来自作者</div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'var(--ink)', color: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16,
          flexShrink: 0,
        }}>{'{·}'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)',
            fontWeight: 600, marginBottom: 3,
          }}>api.lumio.games</div>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>
            正在做：Lumio Games API
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: 8 }}>
            如果你也在做独立游戏，我顺手做的这个 API 可能能省你点事——排行榜、存档同步、玩家分析，开发期免费。
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 600,
            color: 'var(--accent)',
          }}>
            去看看 <HfIcon name="arrowR" size={11} color="var(--accent)" />
          </div>
        </div>
      </div>
    </a>
  );
}

Object.assign(window, { HFBrowser, HfIcon, HfNav, HfAd });
