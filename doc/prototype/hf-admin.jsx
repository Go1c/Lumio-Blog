/* global React, HFBrowser, HfIcon */

const { useState: useStateAd } = React;

// ============================================================
// ADMIN SHELL (sidebar + header) — shared by Dashboard & Note detail
// ============================================================
function AdminShell({ active, breadcrumb, children, theme }) {
  const items = [
    { id: '概览', icon: 'home' },
    { id: '笔记库', icon: 'layers' },
    { id: '分享链接', icon: 'link' },
    { id: '访问统计', icon: 'chart' },
    { id: '标签 / 分类', icon: 'tag' },
  ];
  const items2 = [
    { id: '同步状态', icon: 'sync' },
    { id: 'Vaults', icon: 'folder' },
    { id: 'MCP 配置', icon: 'cmd' },
  ];
  const items3 = [
    { id: '设置', icon: 'settings' },
    { id: 'API tokens', icon: null },
  ];
  return (
    <div className="hf" style={{ height: '100%', display: 'grid', gridTemplateColumns: '220px 1fr' }}>
      {/* SIDEBAR */}
      <aside style={{ borderRight: '1px solid var(--line)', background: 'var(--bg-soft)', padding: '14px 12px', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 14px' }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'var(--ink)', color: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
          }}>L</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            LumioGames<span className="hf-mono hf-tiny hf-faint" style={{ marginLeft: 4 }}>admin</span>
          </div>
        </div>

        <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', padding: '8px 10px 4px', letterSpacing: '.05em' }}>MAIN</div>
        {items.map(it => (
          <div key={it.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 6, fontSize: 13,
            background: active === it.id ? 'var(--accent-soft)' : 'transparent',
            color: active === it.id ? 'var(--accent)' : 'var(--ink-2)',
            fontWeight: active === it.id ? 600 : 400,
          }}>
            <HfIcon name={it.icon} size={14} />
            <span>{it.id}</span>
          </div>
        ))}

        <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', padding: '14px 10px 4px', letterSpacing: '.05em' }}>SYNC</div>
        {items2.map(it => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 13, color: 'var(--ink-2)' }}>
            <HfIcon name={it.icon} size={14} /><span>{it.id}</span>
          </div>
        ))}

        <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', padding: '14px 10px 4px', letterSpacing: '.05em' }}>SYS</div>
        {items3.map(it => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', fontSize: 13, color: 'var(--ink-2)' }}>
            {it.icon && <HfIcon name={it.icon} size={14} />}
            <span>{it.id}</span>
          </div>
        ))}

        {/* sync status footer */}
        <div style={{ marginTop: 24, padding: 10, background: 'var(--bg-sunk)', borderRadius: 8, fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span className="hf-dot hf-dot--ok" />
            <b>已同步</b>
            <span className="hf-mono hf-faint" style={{ marginLeft: 'auto' }}>2m</span>
          </div>
          <div className="hf-mono hf-tiny hf-faint">vault: lumio-main</div>
          <div className="hf-mono hf-tiny hf-faint">FNS v1.4.2</div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 24px', borderBottom: '1px solid var(--line)',
          background: 'var(--bg)',
        }}>
          <div className="hf-mono hf-tiny hf-muted">{breadcrumb}</div>
          <div className="hf-grow" />
          <span className="hf-btn hf-btn--sm"><HfIcon name="sync" size={12} /> 同步</span>
          <span className="hf-btn hf-btn--sm hf-btn--primary"><HfIcon name="plus" size={12} /> 新建</span>
          <span className="hf-btn hf-btn--icon"><HfIcon name="bell" size={14} /></span>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12,
          }}>L</div>
        </header>
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
function HFDashboard({ theme = 'light' }) {
  const top5 = [
    ['Vulkan GPU-Driven Pipeline (3)', 341, 'var(--accent)'],
    ['ML-Agents reward shaping', 273, '#a855f7'],
    ['MCTS+LLM-RTS', 218, 'var(--ok)'],
    ['Filament 变体编译', 156, 'var(--warn)'],
    ['行为树嫌弃', 92, 'var(--ink-3)'],
  ];
  return (
    <HFBrowser url="admin.lumiogames.dev" height={820} theme={theme}>
      <AdminShell active="概览" breadcrumb="Home / 概览" theme={theme}>
        <div style={{ padding: '24px 28px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>嘿，欢迎回来 👋</h1>
          <div className="hf-sm hf-muted" style={{ marginTop: 4, marginBottom: 24 }}>
            过去 7 天，<b style={{ color: 'var(--ink)' }}>4,127</b> 次访问，<b style={{ color: 'var(--ink)' }}>+8</b> 篇新笔记。
          </div>

          {/* KPI grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              ['总笔记', '142', '+8 / 7d', 'var(--accent)', 'layers'],
              ['公开 / 链接', '38 / 12', '可被发现', 'var(--ok)', 'eye'],
              ['总 PV (7d)', '4.1k', '↑ 22% vs prev', 'var(--accent)', 'chart'],
              ['同步队列', '0', '一切正常', 'var(--ok)', 'sync'],
            ].map(([k, v, sub, c, ic], i) => (
              <div key={i} className="hf-card" style={{ padding: 16, position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <HfIcon name={ic} size={14} color={c} />
                  <span className="hf-tiny hf-muted">{k}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: '-0.02em', lineHeight: 1 }}>{v}</div>
                <div className="hf-tiny" style={{ color: c, marginTop: 6 }}>{sub}</div>
                {/* mini sparkline */}
                <svg width="100%" height="20" viewBox="0 0 100 20" style={{ position: 'absolute', bottom: 8, left: 0, right: 0, opacity: .35 }}>
                  <path d={[
                    'M0 14 L 20 12 L 40 8 L 60 10 L 80 4 L 100 6',
                    'M0 10 L 20 8 L 40 14 L 60 6 L 80 8 L 100 4',
                    'M0 16 L 20 14 L 40 10 L 60 6 L 80 4 L 100 2',
                    'M0 10 L 20 10 L 40 10 L 60 10 L 80 10 L 100 10',
                  ][i]} stroke={c} strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            ))}
          </div>

          {/* main grid: chart + queue */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="hf-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>访问趋势 (30d)</div>
                  <div className="hf-tiny hf-muted" style={{ marginTop: 2 }}>PV · 全部公开内容</div>
                </div>
                <div className="hf-grow" />
                <span className="hf-tag hf-tag--accent" style={{ fontSize: 11 }}>30d</span>
                <span className="hf-tag" style={{ fontSize: 11, marginLeft: 4 }}>7d</span>
                <span className="hf-tag" style={{ fontSize: 11, marginLeft: 4 }}>1d</span>
              </div>
              {/* chart */}
              <svg viewBox="0 0 600 160" style={{ width: '100%', height: 160 }}>
                <defs>
                  <linearGradient id="chartfill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity=".25" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* gridlines */}
                {[40, 80, 120].map(y => (
                  <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
                ))}
                {/* area */}
                <path
                  d="M0 110 L 30 95 L 60 105 L 90 80 L 120 88 L 150 70 L 180 78 L 210 55 L 240 65 L 270 50 L 300 60 L 330 40 L 360 55 L 390 45 L 420 30 L 450 50 L 480 35 L 510 25 L 540 40 L 570 30 L 600 22 L 600 160 L 0 160 Z"
                  fill="url(#chartfill)"
                />
                <path
                  d="M0 110 L 30 95 L 60 105 L 90 80 L 120 88 L 150 70 L 180 78 L 210 55 L 240 65 L 270 50 L 300 60 L 330 40 L 360 55 L 390 45 L 420 30 L 450 50 L 480 35 L 510 25 L 540 40 L 570 30 L 600 22"
                  fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round"
                />
                {/* end dot */}
                <circle cx="600" cy="22" r="4" fill="var(--accent)" />
              </svg>
              {/* x-axis labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }} className="hf-mono hf-tiny hf-faint">
                <span>04-01</span><span>04-08</span><span>04-15</span><span>04-22</span><span>04-29</span>
              </div>
            </div>

            <div className="hf-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>⚡ 待处理 / 推荐</div>
              {[
                ['warn', '3 篇笔记还没设可见性', '默认走 vault 设置 (private)', '处理'],
                ['accent', '推荐置顶 "Vulkan GPU-Driven"', '7d PV 排第 1', '置顶'],
                ['ok', '同步完成 · 48 文件', '2m ago · 0 冲突', null],
                ['ink', '2 个分享链接 30d 无访问', '考虑撤销', '查看'],
              ].map(([cls, t, sub, btn], i) => {
                const dotMap = { warn: 'hf-dot--warn', accent: 'hf-dot--accent', ok: 'hf-dot--ok', ink: '' };
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                    <span className={`hf-dot ${dotMap[cls]}`} style={{ marginTop: 6, background: cls === 'ink' ? 'var(--ink-3)' : undefined }} />
                    <div className="hf-grow">
                      <div className="hf-sm" style={{ fontWeight: 500 }}>{t}</div>
                      <div className="hf-tiny hf-muted" style={{ marginTop: 2 }}>{sub}</div>
                    </div>
                    {btn && <span className="hf-btn hf-btn--sm">{btn}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* top 5 + recent activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="hf-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>📈 访问 Top 5 (7d)</div>
                <div className="hf-grow" />
                <span className="hf-mono hf-tiny hf-faint">查看全部 →</span>
              </div>
              {top5.map(([t, n, c], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <span className="hf-mono hf-tiny hf-faint" style={{ width: 16 }}>{i+1}</span>
                  <span className="hf-sm hf-grow" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight: 500 }}>{t}</span>
                  <div style={{ width: 80, height: 4, background: 'var(--bg-sunk)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${n/4}%`, height: '100%', background: c }} />
                  </div>
                  <span className="hf-mono hf-tiny" style={{ width: 36, textAlign: 'right', fontWeight: 600 }}>{n}</span>
                </div>
              ))}
            </div>

            <div className="hf-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <HfIcon name="activity" size={14} color="var(--accent)" /> 实时活动
              </div>
              <div className="hf-col" style={{ gap: 10 }}>
                {[
                  ['sync', '同步完成 · MCTS-LLM-RTS.md', '2m'],
                  ['eye', '<code>/s/AbC123x</code> 被访问 · from google.com', '8m'],
                  ['edit', 'Obsidian 推送 4 个修改', '15m'],
                  ['link', '生成短链 · /s/zX42Lpq', '2h'],
                  ['eye', '<code>Vulkan GPU-Driven</code> · 41 次新访问', '5h'],
                ].map(([ic, t, ago], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ marginTop: 2, color: 'var(--ink-3)' }}><HfIcon name={ic} size={13} /></span>
                    <div className="hf-grow hf-sm" dangerouslySetInnerHTML={{ __html:
                      t.replace(/<code>(.+?)<\/code>/g, '<code style="font-family:var(--mono);font-size:12px;background:var(--bg-sunk);padding:1px 5px;border-radius:3px;color:var(--accent)">$1</code>')
                    }} />
                    <span className="hf-mono hf-tiny hf-faint">{ago}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AdminShell>
    </HFBrowser>
  );
}

// ============================================================
// ADMIN NOTE DETAIL
// ============================================================
function HFNoteDetail({ theme = 'light' }) {
  return (
    <HFBrowser url="admin.lumiogames.dev/notes/mcts-llm-rts" height={820} theme={theme}>
      <AdminShell active="笔记库" breadcrumb="笔记库 / 游戏 AI / MCTS-LLM-RTS.md" theme={theme}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: '100%' }}>
          {/* note tree */}
          <div style={{ borderRight: '1px solid var(--line)', background: 'var(--bg-soft)', overflow: 'auto', padding: '12px 8px' }}>
            <div className="hf-input" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12 }}>
              <HfIcon name="search" size={12} color="var(--ink-3)" />
              <span className="hf-faint">搜索笔记…</span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
              <span className="hf-tag hf-tag--accent" style={{ fontSize: 10 }}>全部</span>
              <span className="hf-tag" style={{ fontSize: 10 }}>● 公开</span>
              <span className="hf-tag" style={{ fontSize: 10 }}>◐ 链接</span>
              <span className="hf-tag" style={{ fontSize: 10 }}>○ 私有</span>
            </div>

            <div style={{ fontSize: 12 }}>
              {[
                ['📁 游戏 AI', null, 0, false],
                ['MCTS-LLM-RTS', 'public', 1, true],
                ['行为树嫌弃', 'public', 1, false],
                ['GOAP 复盘', 'link', 1, false],
                ['LLM Agents 草稿', 'private', 1, false],
                ['📁 渲染', null, 0, false],
                ['Vulkan GPU-Driven (3)', 'public', 1, false],
                ['Filament 变体编译', 'public', 1, false],
                ['NPR 头发', 'link', 1, false],
                ['📁 daily', null, 0, false],
                ['2026-04-28', 'private', 1, false],
                ['2026-04-25', 'private', 1, false],
              ].map(([n, v, depth, active], i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 8px', paddingLeft: 8 + depth * 14,
                  borderRadius: 4,
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : depth === 0 ? 'var(--ink)' : 'var(--ink-2)',
                  fontWeight: depth === 0 || active ? 600 : 400,
                }}>
                  <span className="hf-grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
                  {v === 'public' && <span className="hf-dot hf-dot--ok" style={{ margin: 0 }} />}
                  {v === 'link' && <span className="hf-dot hf-dot--warn" style={{ margin: 0 }} />}
                  {v === 'private' && <span className="hf-dot" style={{ background: 'var(--ink-4)', margin: 0 }} />}
                </div>
              ))}
            </div>
          </div>

          {/* detail */}
          <div style={{ overflow: 'auto', padding: 24 }}>
            {/* title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1.3, flex: 1 }}>
                用 MCTS + LLM 给 RTS 做战术决策
              </h1>
              <span className="hf-btn hf-btn--sm"><HfIcon name="edit" size={11} /> 在 Obsidian 打开</span>
              <span className="hf-btn hf-btn--sm hf-btn--icon"><HfIcon name="dots" size={13} /></span>
            </div>
            <div className="hf-mono hf-tiny hf-muted" style={{ marginBottom: 8 }}>
              游戏 AI/MCTS-LLM-RTS.md · 修改 2m 前 · 12 min read
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              <span className="hf-tag hf-tag--accent">#游戏 AI</span>
              <span className="hf-tag">#MCTS</span>
              <span className="hf-tag">#LLM</span>
              <span className="hf-tag" style={{ borderStyle: 'dashed', color: 'var(--ink-3)' }}>+ 标签</span>
            </div>

            {/* 3 control cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {/* visibility */}
              <div className="hf-card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <HfIcon name="eye" size={14} color="var(--ok)" />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>可见性</span>
                </div>
                {[
                  ['public', '公开', '任何人可访问 URL', true],
                  ['link', '仅链接', '需要短链才能看到', false],
                  ['private', '私有', '只在后台可见', false],
                  ['draft', '草稿', 'Obsidian 推送但不发布', false],
                ].map(([v, l, sub, on], i) => (
                  <label key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: 8, borderRadius: 6, cursor: 'pointer',
                    background: on ? 'var(--accent-soft)' : 'transparent',
                    marginBottom: 2,
                  }}>
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--line-strong)'}`,
                      background: 'var(--bg)',
                      position: 'relative', flexShrink: 0, marginTop: 2,
                    }}>
                      {on && <span style={{ position:'absolute', top: 2, left: 2, right: 2, bottom: 2, borderRadius:'50%', background: 'var(--accent)' }} />}
                    </span>
                    <div>
                      <div className="hf-sm" style={{ fontWeight: 500, color: on ? 'var(--accent)' : 'var(--ink)' }}>{l}</div>
                      <div className="hf-tiny hf-muted" style={{ marginTop: 1 }}>{sub}</div>
                    </div>
                  </label>
                ))}

                {/* schedule publish */}
                <div style={{
                  marginTop: 8, padding: 10, borderRadius: 6,
                  background: 'var(--bg-sunk)', border: '1px dashed var(--line-strong)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 12 }}>📅</span>
                    <span className="hf-sm" style={{ fontWeight: 500 }}>定时发布</span>
                    <div className="hf-grow" />
                    <span className="hf-toggle" />
                  </div>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 11,
                    padding: '5px 8px', background: 'var(--bg)',
                    border: '1px solid var(--line)', borderRadius: 4,
                    color: 'var(--ink-3)',
                  }}>2026-05-03  09:00</div>
                </div>
              </div>

              {/* searchable */}
              <div className="hf-card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <HfIcon name="search" size={14} color="var(--accent)" />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>可搜索</span>
                </div>
                {[
                  ['站内搜索可见', true],
                  ['搜索引擎索引 (robots)', true],
                  ['RSS / sitemap 收录', true],
                  ['首页推荐', false],
                ].map(([l, on], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                    <span className="hf-sm hf-grow">{l}</span>
                    <span className={`hf-toggle ${on ? 'on' : ''}`} />
                  </div>
                ))}
              </div>

              {/* share link */}
              <div className="hf-card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <HfIcon name="link" size={14} color="var(--warn)" />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>分享链接</span>
                </div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 12,
                  padding: '6px 10px', background: 'var(--bg-sunk)',
                  border: '1px solid var(--line)', borderRadius: 6,
                  color: 'var(--accent)', wordBreak: 'break-all',
                }}>lumiogames.dev/s/fK3p9q2</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <span className="hf-btn hf-btn--sm"><HfIcon name="copy" size={11} /> 复制</span>
                  <span className="hf-btn hf-btn--sm">设密码</span>
                  <span className="hf-btn hf-btn--sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }}>撤销</span>
                </div>
                <div className="hf-tiny hf-muted" style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>访问 218 次</span><span>上次 2h 前</span>
                </div>
              </div>
            </div>

            {/* export to platforms */}
            <div className="hf-card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <HfIcon name="layers" size={14} color="var(--accent)" />
                <span style={{ fontWeight: 600, fontSize: 13, marginLeft: 6 }}>导出到外站</span>
                <span className="hf-tiny hf-muted" style={{ marginLeft: 8 }}>选平台 · 一键复制 · 适配各家编辑器怪癖</span>
                <div className="hf-grow" />
                <span className="hf-mono hf-tiny hf-faint">v1.4.2 · 4 platforms</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                {[
                  { id: 'wx', name: '微信公众号', sub: 'HTML · 内联样式',
                    color: '#07C160', bg: '#dcfce7',
                    glyph: 'WX', tag: '当前选中',
                    notes: '内联 CSS · 图片转封面图 · 代码块用 SVG 截图 · 公式转 PNG' },
                  { id: 'zh', name: '知乎', sub: 'Markdown + KaTeX',
                    color: '#0084FF', bg: '#dbeafe',
                    glyph: '知',
                    notes: '保留 LaTeX · 代码用 ``` · 自动加首发声明 · 链接转脚注' },
                  { id: 'csdn', name: 'CSDN', sub: 'Markdown · 兼容版',
                    color: '#FC5531', bg: '#fee2e2',
                    glyph: 'CSDN',
                    notes: '不支持 KaTeX → 转图片 · 自动插 TOC · SEO 关键词补全' },
                  { id: 'tw', name: 'Twitter', sub: '推特长文 / Thread',
                    color: '#1DA1F2', bg: '#dbeafe',
                    glyph: '𝕏',
                    notes: '切 N 条 ≤280 字 · 自动 1/N 编号 · 代码截屏 · 配图保留' },
                ].map((p, i) => {
                  const active = i === 0;
                  return (
                    <div key={p.id} style={{
                      padding: 12,
                      border: `1px solid ${active ? p.color : 'var(--line)'}`,
                      borderRadius: 8,
                      background: active ? p.bg : 'var(--bg)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all .15s',
                    }}>
                      {active && (
                        <span style={{
                          position: 'absolute', top: -8, right: 10,
                          fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 600,
                          padding: '2px 6px', background: p.color, color: '#fff',
                          borderRadius: 4, letterSpacing: '.04em',
                        }}>SELECTED</span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: p.color, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: p.glyph.length > 2 ? 9 : 13, fontWeight: 700,
                          fontFamily: p.id === 'tw' ? 'serif' : 'var(--mono)',
                          flexShrink: 0,
                        }}>{p.glyph}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{p.name}</div>
                          <div className="hf-tiny hf-muted" style={{ marginTop: 1 }}>{p.sub}</div>
                        </div>
                      </div>
                      <div className="hf-tiny" style={{
                        color: 'var(--ink-3)', lineHeight: 1.55,
                        height: 44, overflow: 'hidden',
                      }}>{p.notes}</div>
                    </div>
                  );
                })}
              </div>

              {/* selected platform preview */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'flex-start' }}>
                <div>
                  <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '.05em' }}>
                    ▸ 微信公众号 · 处理预览 (4 项调整)
                  </div>
                  <div className="hf-col" style={{ gap: 4 }}>
                    {[
                      ['ok', 'KaTeX 公式', '已转 SVG (3 处)'],
                      ['ok', 'Mermaid 图', '已转 PNG (1 处)'],
                      ['warn', '代码块 (2 处)', '将转为 SVG 截图 — 公众号不支持高亮'],
                      ['ok', '外链 (5 个)', '保留，自动加阅读原文跳转'],
                    ].map(([s, k, v], i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, padding: '3px 0' }}>
                        <span className={`hf-dot hf-dot--${s}`} style={{ marginTop: 6 }} />
                        <span style={{ width: 100, fontWeight: 500, flexShrink: 0 }}>{k}</span>
                        <span className="hf-muted">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hf-col" style={{ gap: 6, minWidth: 200 }}>
                  <span className="hf-btn hf-btn--primary" style={{ justifyContent: 'center' }}>
                    <HfIcon name="copy" size={12} color="#fff" /> 复制为公众号 HTML
                  </span>
                  <span className="hf-btn hf-btn--sm" style={{ justifyContent: 'center' }}>
                    <HfIcon name="eye" size={11} /> 预览（公众号样式）
                  </span>
                  <span className="hf-btn hf-btn--sm" style={{ justifyContent: 'center' }}>
                    导出 .html
                  </span>
                  <div className="hf-tiny hf-muted" style={{ marginTop: 4, textAlign: 'center', lineHeight: 1.5 }}>
                    复制后粘进公众号编辑器即可，<br />样式不会丢。
                  </div>
                </div>
              </div>
            </div>

            {/* preview + stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
              <div className="hf-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>📝 内容预览</span>
                  <span className="hf-tiny hf-muted" style={{ marginLeft: 8 }}>read-only · 编辑去 Obsidian</span>
                  <div className="hf-grow" />
                  <span className="hf-mono hf-tiny hf-faint">2,431 字</span>
                </div>
                <div className="hf-prose" style={{ fontSize: 13, lineHeight: 1.7 }}>
                  <p>把 MCTS 的展开阶段（rollout）交给 LLM 评估，听起来像偷懒……</p>
                  <p>……但 token 成本和延迟在 100ms 决策窗口下完全不可接受。</p>
                  <div className="hf-callout">
                    <span>💡</span>
                    <div><b>TL;DR</b> — 能跑，慢得离谱。</div>
                  </div>
                  <p style={{ color: 'var(--ink-4)' }}>... (更多内容)</p>
                </div>
              </div>

              <div className="hf-col" style={{ gap: 12 }}>
                <div className="hf-card" style={{ padding: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>📊 访问 (30d)</div>
                  <svg viewBox="0 0 200 50" style={{ width: '100%', height: 50 }}>
                    <path d="M0 40 L 20 35 L 40 38 L 60 28 L 80 32 L 100 22 L 120 26 L 140 16 L 160 20 L 180 10 L 200 6"
                      fill="none" stroke="var(--accent)" strokeWidth="1.5" />
                  </svg>
                  <div className="hf-col" style={{ gap: 4, marginTop: 8 }}>
                    {[['PV', '1,243'], ['UV', '418'], ['引用', '3'], ['平均阅读', '4:32']].map(([k, v], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }} className="hf-sm">
                        <span className="hf-muted">{k}</span><b className="hf-mono">{v}</b>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hf-card" style={{ padding: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <HfIcon name="sync" size={13} color="var(--ok)" /> 同步状态
                  </div>
                  <div className="hf-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="hf-muted">最后同步</span><span className="hf-mono">2m 前</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="hf-muted">客户端</span><span className="hf-mono">obsidian</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="hf-muted">版本历史</span><span className="hf-mono">14 versions</span>
                    </div>
                  </div>
                  <span className="hf-btn hf-btn--sm" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>查看历史</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminShell>
    </HFBrowser>
  );
}

Object.assign(window, { HFDashboard, HFNoteDetail, AdminShell });
