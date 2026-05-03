/* global React, BrowserChrome, StickyNote, Vis, Searchable, Icon, HandArrow */

const { useState: useStateAdmin } = React;

// ============================================================
// ADMIN HEADER
// ============================================================
function AdminHeader({ variant = 'A' }) {
  return (
    <div style={{
      padding: '10px 16px',
      borderBottom: '1.5px solid var(--ink)',
      background: '#1f1d1a',
      color: '#f0ece1',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div className="h-scribble" style={{ fontSize: 18, color: '#f0ece1' }}>
        Lumio<span style={{ color: 'var(--hi)' }}>·admin</span>
      </div>
      <span className="tag" style={{ fontSize: 11, background: 'transparent', color: '#a8a29a', borderColor: '#3a362f' }}>
        fast-note-sync · vault: <b style={{ color: '#f0ece1' }}>lumio-main</b>
      </span>
      <div className="grow" />
      <span className="tag tag--ok" style={{ fontSize: 11 }}>● synced 2m ago</span>
      <span className="btn btn--sm" style={{ background: 'transparent', color: '#f0ece1', borderColor: '#3a362f' }}>
        <Icon name="sync" size={11}/> 同步
      </span>
      <span className="btn btn--sm" style={{ background: 'var(--hi)', color: 'var(--paper)', borderColor: 'var(--hi)' }}>
        <Icon name="plus" size={11}/> 新建
      </span>
      <div className="ph ph--photo" style={{ width: 26, height: 26, borderRadius: '50%' }}>me</div>
    </div>
  );
}

// === shared note tree ====
function NoteTree({ activePath = '游戏 AI/MCTS-LLM-RTS', dense = false }) {
  const lines = [
    ['📁 游戏 AI', null, true],
    ['  📄 MCTS-LLM-RTS', 'public,searchable', true, true],
    ['  📄 行为树嫌弃', 'public,searchable'],
    ['  📄 GOAP 复盘', 'link,searchable'],
    ['  📄 LLM Agents 草稿', 'private'],
    ['📁 渲染', null, true],
    ['  📄 Vulkan GPU-Driven (3)', 'public,searchable'],
    ['  📄 Filament 变体编译', 'public,searchable'],
    ['  📄 NPR 头发着色器', 'link'],
    ['📁 笔记/daily', null, true],
    ['  📄 2026-04-28', 'private'],
    ['  📄 2026-04-25', 'private'],
    ['📁 paper-notes', null, false],
  ];
  return (
    <div style={{ fontFamily: 'var(--hand)', fontSize: dense ? 12 : 13 }}>
      {lines.map((l, i) => {
        const [name, perm, expanded, active] = l;
        return (
          <div key={i} className="row items-center" style={{
            padding: '3px 8px',
            background: active ? 'var(--hi-soft)' : 'transparent',
            borderLeft: active ? '2px solid var(--hi)' : '2px solid transparent',
            color: active ? 'var(--ink)' : 'var(--ink-soft)',
            fontWeight: active ? 700 : 400,
          }}>
            <span className="grow" style={{ whiteSpace: 'pre' }}>{name}</span>
            {perm && (
              <span style={{ display: 'flex', gap: 3 }}>
                {perm.includes('public') && <span aria-label="公开" style={{ color: 'var(--ok-text, var(--ok))' }}><span aria-hidden="true">●</span></span>}
                {perm.includes('link') && <span aria-label="仅链接" style={{ color: 'var(--warn-text, var(--warn))' }}><span aria-hidden="true">◐</span></span>}
                {perm.includes('private') && <span aria-label="私有" style={{ color: 'var(--danger-text, var(--danger))' }}><span aria-hidden="true">○</span></span>}
                {perm.includes('searchable') && <span title="searchable" style={{ color: 'var(--hi2)', fontSize: 11 }}>🔎</span>}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// ADMIN VARIANT A — 经典双栏：左树 / 右详情面板
// ============================================================
function AdminA() {
  return (
    <BrowserChrome url="admin.lumiogames.dev" height={780}>
      <AdminHeader />
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: 'calc(100% - 49px)' }}>
        {/* LEFT: tree */}
        <div style={{ borderRight: '1.5px solid var(--ink)', background: 'var(--paper-warm)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 10, borderBottom: '1px dashed var(--line-soft)' }}>
            <div className="sk" style={{ padding: '4px 8px', fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--paper)' }}>
              <Icon name="search" size={11}/> 搜索笔记…
            </div>
            <div className="row gap-4 wrap" style={{ marginTop: 6 }}>
              <span className="tag" style={{ fontSize: 10 }}>全部</span>
              <span className="tag tag--ok" style={{ fontSize: 10 }}>● 公开</span>
              <span className="tag tag--warn" style={{ fontSize: 10 }}>◐ 链接</span>
              <span className="tag tag--danger" style={{ fontSize: 10 }}>○ 私有</span>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', padding: '8px 0' }}>
            <NoteTree />
          </div>
          <div style={{ padding: 8, borderTop: '1px dashed var(--line-soft)', fontSize: 11 }} className="muted">
            142 notes · 38 public · 12 link · 92 private
          </div>
        </div>

        {/* RIGHT: detail panel */}
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* breadcrumb + title */}
          <div style={{ padding: '14px 20px', borderBottom: '1px dashed var(--line-soft)' }}>
            <div className="muted sm mono">游戏 AI / MCTS-LLM-RTS.md</div>
            <div className="h-scribble" style={{ fontSize: 24, marginTop: 4 }}>
              用 MCTS + LLM 给 RTS 做战术决策
            </div>
            <div className="row gap-6" style={{ marginTop: 6 }}>
              <span className="tag tag--hi">#游戏 AI</span>
              <span className="tag">#MCTS</span>
              <span className="tag">#LLM</span>
              <span className="tag tag--ghost"><Icon name="plus" size={10}/> 加标签</span>
            </div>
          </div>

          {/* visibility/search controls — the meat */}
          <div className="row" style={{ padding: 16, gap: 16, borderBottom: '1px dashed var(--line-soft)', background: 'var(--paper)' }}>
            <div className="sk" style={{ padding: 12, flex: 1, background: 'var(--ok-soft)' }}>
              <div className="h-arch b sm">👁  可见性</div>
              <div className="col gap-4 sm" style={{ marginTop: 6 }}>
                <label className="row items-center gap-6"><span className="chk chk--on" /> 公开 — 任何人可访问 URL</label>
                <label className="row items-center gap-6"><span className="chk" /> 仅链接 — 需要短链才能看到</label>
                <label className="row items-center gap-6 muted"><span className="chk" /> 私有 — 仅我自己</label>
              </div>
            </div>
            <div className="sk" style={{ padding: 12, flex: 1, background: 'var(--hi2-soft)' }}>
              <div className="h-arch b sm">🔎  可搜索</div>
              <div className="col gap-6 sm" style={{ marginTop: 6 }}>
                <label className="row items-center justify-between">
                  <span>站内搜索可见</span><span className="toggle toggle--on" />
                </label>
                <label className="row items-center justify-between">
                  <span>搜索引擎索引 (robots)</span><span className="toggle toggle--on" />
                </label>
                <label className="row items-center justify-between">
                  <span>RSS / sitemap 收录</span><span className="toggle toggle--on" />
                </label>
                <label className="row items-center justify-between muted">
                  <span>首页推荐</span><span className="toggle" />
                </label>
              </div>
            </div>
            <div className="sk" style={{ padding: 12, flex: 1, background: 'var(--warn-soft)' }}>
              <div className="h-arch b sm">🔗  分享链接</div>
              <div className="sm mono" style={{
                marginTop: 6, padding: '4px 6px', background: 'var(--paper)',
                border: '1px dashed var(--line-soft)', wordBreak: 'break-all'
              }}>lumiogames.dev/s/fK3p9q2</div>
              <div className="row gap-4 wrap" style={{ marginTop: 8 }}>
                <span className="btn btn--sm">复制</span>
                <span className="btn btn--sm">设密码</span>
                <span className="btn btn--sm" style={{ background: 'var(--danger-soft)', borderColor: 'var(--danger)' }}>撤销</span>
              </div>
              <div className="muted tiny" style={{ marginTop: 6 }}>访问 218 · 上次 2h 前</div>
            </div>
          </div>

          {/* stats + content preview */}
          <div className="row gap-12" style={{ padding: 16, flex: 1, overflow: 'hidden' }}>
            <div className="sk" style={{ flex: 2, padding: 12, overflow: 'hidden' }}>
              <div className="h-arch b sm">📝 内容预览（read-only · 编辑去 Obsidian）</div>
              <div className="sep--soft sep" />
              <div className="ph" style={{ height: 60 }}>渲染好的 Markdown 节选</div>
              <div className="sm muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
                把 MCTS 的展开阶段（rollout）交给 LLM 评估，听起来像是个聪明的偷懒……
              </div>
            </div>
            <div className="sk sk--warm" style={{ flex: 1, padding: 12 }}>
              <div className="h-arch b sm">📊 访问统计 (30d)</div>
              <div className="ph" style={{ height: 60, marginTop: 6 }}>趋势图占位</div>
              <div className="row justify-between sm" style={{ marginTop: 8 }}><span>PV</span><b>1,243</b></div>
              <div className="row justify-between sm"><span>UV</span><b>418</b></div>
              <div className="row justify-between sm"><span>引用</span><b>3</b></div>
              <div className="sep--soft sep" />
              <div className="h-arch b sm">🔄 同步状态</div>
              <div className="sm muted">最后同步 2m 前 · obsidian-fast-note-sync</div>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

// ============================================================
// ADMIN VARIANT B — 表格密集 + 浮窗详情
// ============================================================
function AdminB() {
  const rows = [
    ['MCTS-LLM-RTS', '游戏 AI', 'public', true, true, '218', '04-28'],
    ['行为树嫌弃', '游戏 AI', 'public', true, false, '92', '04-26'],
    ['GOAP 复盘', '游戏 AI', 'link', true, false, '14', '04-22'],
    ['LLM Agents 草稿', '游戏 AI', 'private', false, false, '—', '04-20'],
    ['Vulkan GPU-Driven (3)', '渲染', 'public', true, true, '341', '04-17'],
    ['Filament 变体编译', '渲染', 'public', true, false, '156', '04-11'],
    ['NPR 头发', '渲染', 'link', false, false, '8', '04-08'],
    ['ML-Agents reward shaping', 'RL', 'public', true, true, '273', '04-22'],
    ['paper / SmartPlay', 'paper-notes', 'private', false, false, '—', '04-19'],
    ['daily 2026-04-28', 'daily', 'private', false, false, '—', '04-28'],
  ];
  return (
    <BrowserChrome url="admin.lumiogames.dev" height={780}>
      <AdminHeader />
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: 'calc(100% - 49px)' }}>
        {/* LEFT slim tree */}
        <div style={{ borderRight: '1.5px solid var(--ink)', background: 'var(--paper-warm)', padding: '10px 0' }}>
          <div style={{ padding: '0 10px 10px' }}>
            <div className="sk" style={{ padding: '4px 8px', fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--paper)' }}>
              <Icon name="search" size={11}/> filter…
            </div>
          </div>
          <NoteTree dense />
        </div>

        {/* RIGHT: bulk table */}
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* toolbar with bulk actions */}
          <div className="row gap-8 items-center" style={{ padding: '10px 16px', borderBottom: '1px dashed var(--line-soft)' }}>
            <span className="sm b">已选 3 项</span>
            <span className="sep" style={{ flex: 'none', width: 1, height: 16, background: 'var(--ink)' }} />
            <span className="btn btn--sm">批量公开</span>
            <span className="btn btn--sm">批量私有</span>
            <span className="btn btn--sm">改标签</span>
            <span className="btn btn--sm">生成短链</span>
            <div className="grow" />
            <span className="muted tiny">142 笔记 · 排序: 最近修改 ↓</span>
          </div>

          {/* table */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--hand)' }}>
              <thead>
                <tr style={{ background: 'var(--paper-warm)', borderBottom: '1.5px solid var(--ink)' }}>
                  {['', '标题', '分类', '可见', '可搜', '链接', 'PV', '修改'].map((h,i)=>(
                    <th key={i} style={{ padding: '8px 10px', textAlign: i===6?'right':'left', fontFamily: 'var(--hand-arch)' }}>{h}</th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px dashed var(--line-soft)', background: i===0?'var(--hi-soft)':'transparent' }}>
                    <td style={{ padding: '8px 10px' }}><span className={`chk ${i<3?'chk--on':''}`} /></td>
                    <td style={{ padding: '8px 10px' }} className="b">
                      <Icon name="doc" size={12}/> {r[0]}
                      {i===0 && <span className="tag tag--hi" style={{ fontSize: 10, marginLeft: 6 }}><Icon name="pin" size={9}/> 置顶</span>}
                    </td>
                    <td style={{ padding: '8px 10px' }}><span className="tag" style={{ fontSize: 11 }}>#{r[1]}</span></td>
                    <td style={{ padding: '8px 10px' }}><Vis state={r[2]} /></td>
                    <td style={{ padding: '8px 10px' }}><span className={`toggle ${r[3]?'toggle--on':''}`} /></td>
                    <td style={{ padding: '8px 10px' }}>
                      {r[4] ? <span className="mono tiny">/s/fK3p…</span> : <span className="muted tiny it">—</span>}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }} className="mono tiny">{r[5]}</td>
                    <td style={{ padding: '8px 10px' }} className="muted mono tiny">{r[6]}</td>
                    <td style={{ padding: '8px 10px' }}><Icon name="chev" size={12} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* footer status */}
          <div className="row gap-12" style={{ padding: '8px 16px', borderTop: '1.5px solid var(--ink)', background: 'var(--paper-warm)', fontSize: 12 }}>
            <span className="tag tag--ok" style={{ fontSize: 11 }}>● synced</span>
            <span className="muted">142 notes · 38 public · 12 link-only · 92 private</span>
            <div className="grow" />
            <span className="muted">FNS v1.4.2 · vault lumio-main</span>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

// ============================================================
// ADMIN VARIANT C — 仪表盘 (overview) + 行操作
// ============================================================
function AdminC() {
  return (
    <BrowserChrome url="admin.lumiogames.dev" height={780}>
      <AdminHeader />
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', height: 'calc(100% - 49px)' }}>
        {/* nav rail */}
        <div style={{ borderRight: '1.5px solid var(--ink)', background: '#1f1d1a', color: '#f0ece1', padding: '14px 12px', fontSize: 13 }}>
          <div className="h-arch b" style={{ fontSize: 11, color: '#7a766c', marginBottom: 6 }}>▸ MAIN</div>
          <div className="col gap-4">
            <div style={{ color: 'var(--hi)', fontWeight: 700 }}>● 概览</div>
            <div style={{ color: '#c8c2b4' }}>笔记库</div>
            <div style={{ color: '#c8c2b4' }}>分享链接</div>
            <div style={{ color: '#c8c2b4' }}>访问统计</div>
            <div style={{ color: '#c8c2b4' }}>标签 / 分类</div>
          </div>
          <div className="h-arch b" style={{ fontSize: 11, color: '#7a766c', marginTop: 16, marginBottom: 6 }}>▸ SYNC</div>
          <div className="col gap-4">
            <div style={{ color: '#c8c2b4' }}>同步状态</div>
            <div style={{ color: '#c8c2b4' }}>vaults</div>
            <div style={{ color: '#c8c2b4' }}>MCP 配置</div>
          </div>
          <div className="h-arch b" style={{ fontSize: 11, color: '#7a766c', marginTop: 16, marginBottom: 6 }}>▸ SYS</div>
          <div className="col gap-4">
            <div style={{ color: '#c8c2b4' }}>设置</div>
            <div style={{ color: '#c8c2b4' }}>API tokens</div>
          </div>
        </div>

        {/* main area */}
        <div style={{ overflow: 'hidden', padding: 18 }}>
          <div className="h-scribble" style={{ fontSize: 26 }}>嘿，欢迎回来 👋</div>
          <div className="muted sm" style={{ marginBottom: 14 }}>这里是你笔记库的快速一览，过去 7 天。</div>

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
            {[
              ['总笔记', '142', '+8 / 7d', 'var(--hi-soft)'],
              ['公开 / 链接', '38 / 12', '可被发现', 'var(--ok-soft)'],
              ['总 PV (7d)', '4.1k', '↑ 22%', 'var(--hi2-soft)'],
              ['同步队列', '0', '一切正常', 'var(--warn-soft)'],
            ].map(([k,v,sub,bg], i) => (
              <div key={i} className="sk" style={{ padding: 12, background: bg }}>
                <div className="muted tiny">{k}</div>
                <div className="h-scribble" style={{ fontSize: 26, marginTop: 2 }}>{v}</div>
                <div className="muted tiny">{sub}</div>
              </div>
            ))}
          </div>

          {/* two columns: 最近活动 / 待处理 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 12, height: 360 }}>
            <div className="sk" style={{ padding: 14, overflow: 'hidden' }}>
              <div className="row justify-between items-center">
                <div className="h-arch b">📈 访问 Top 5 (7d)</div>
                <span className="muted tiny">all →</span>
              </div>
              <div className="ph" style={{ height: 80, marginTop: 8 }}>趋势图占位</div>
              <div className="col gap-4 sm" style={{ marginTop: 8 }}>
                {[
                  ['Vulkan GPU-Driven (3)', 341, 'var(--hi)'],
                  ['ML-Agents reward shaping', 273, 'var(--hi2)'],
                  ['MCTS+LLM-RTS', 218, 'var(--ok)'],
                  ['Filament 变体编译', 156, 'var(--warn)'],
                  ['行为树嫌弃', 92, 'var(--ink-faint)'],
                ].map(([t,n,c], i) => (
                  <div key={i} className="row items-center gap-8">
                    <span className="grow" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t}</span>
                    <div style={{ width: 80, height: 6, background: 'var(--paper-warm)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${n/4}%`, height: '100%', background: c }} />
                    </div>
                    <span className="mono tiny" style={{ width: 30, textAlign: 'right' }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="sk sk--warm" style={{ padding: 14 }}>
              <div className="h-arch b">⚡ 待处理 / 推荐</div>
              <div className="col gap-8 sm" style={{ marginTop: 8 }}>
                <div className="row items-start gap-6">
                  <span className="tag tag--warn" style={{ fontSize: 10 }}>新</span>
                  <div className="grow">
                    <div className="b">3 篇笔记还没设可见性</div>
                    <div className="muted tiny">默认走 vault 设置 (private)</div>
                  </div>
                  <span className="btn btn--sm">处理</span>
                </div>
                <div className="row items-start gap-6">
                  <span className="tag tag--hi" style={{ fontSize: 10 }}>热</span>
                  <div className="grow">
                    <div className="b">推荐置顶 "Vulkan GPU-Driven"</div>
                    <div className="muted tiny">最近 7d PV 排第 1</div>
                  </div>
                  <span className="btn btn--sm">置顶</span>
                </div>
                <div className="row items-start gap-6">
                  <span className="tag tag--ok" style={{ fontSize: 10 }}>OK</span>
                  <div className="grow">
                    <div className="b">同步完成 · 48 文件</div>
                    <div className="muted tiny">2m ago · 0 冲突</div>
                  </div>
                </div>
                <div className="row items-start gap-6">
                  <span className="tag tag--ghost" style={{ fontSize: 10 }}>?</span>
                  <div className="grow">
                    <div className="b">2 个分享链接 30d 无访问</div>
                    <div className="muted tiny">考虑撤销</div>
                  </div>
                  <span className="btn btn--sm">查看</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

Object.assign(window, { AdminA, AdminB, AdminC });
