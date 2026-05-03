/* global React, BrowserChrome, StickyNote, Vis, Icon, HandArrow */

// ============================================================
// SHARE LINK — 两种权限：仅链接 (孤立页) / 公开 (嵌入博客壳)
// ============================================================

// --- VARIANT A — 仅链接：极简，没有博客导航 ---------------
function ShareLinkOnly() {
  return (
    <BrowserChrome url="lumiogames.dev/s/fK3p9q2" height={760}>
      {/* 顶部窄条：标识这是分享 */}
      <div style={{
        background: 'var(--warn-soft)',
        borderBottom: '1.5px solid var(--ink)',
        padding: '6px 16px',
        fontSize: 12,
        fontFamily: 'var(--hand)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Icon name="link" size={12}/>
        <span><b>仅通过链接可见</b> · 这是 LumioGames 的私享笔记，未公开列出</span>
        <div className="grow" />
        <span className="muted tiny">短链 /s/fK3p9q2 · 218 次访问</span>
      </div>

      {/* 文档体本身——干净，没有侧栏没有目录 */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '36px 24px' }}>
        <div className="muted tiny mono">2026-04-28 · note · MCTS-LLM-RTS.md</div>
        <div className="h-scribble" style={{ fontSize: 32, lineHeight: 1.15, marginTop: 6 }}>
          用 MCTS + LLM 给 RTS 做战术决策
        </div>
        <div className="lg muted it" style={{ marginTop: 4 }}>一次失败的尝试</div>

        <div className="ph" style={{ height: 130, margin: '20px 0' }}>cover</div>

        <div style={{ fontSize: 15, lineHeight: 1.7 }}>
          <p>把 MCTS 的展开阶段交给 LLM 来评估……（正文）……</p>
          <div className="sk sk--warm" style={{ padding: 12, margin: '12px 0' }}>
            💡 <b>TL;DR</b>：能跑，慢得离谱。
          </div>
          <p>……</p>
        </div>

        <div className="sep" style={{ marginTop: 28 }} />
        {/* 底部：弱化的归属 */}
        <div className="tc muted sm" style={{ marginTop: 16 }}>
          <div>由 <b>LumioGames</b> 通过 <span className="mono">fast-note-sync</span> 分享</div>
          <div className="tiny it" style={{ marginTop: 4 }}>这个链接不会出现在博客索引里</div>
        </div>
      </div>
    </BrowserChrome>
  );
}

// --- VARIANT B — 公开嵌入完整博客壳 -----------------------
function SharePublicShell() {
  return (
    <BrowserChrome url="lumiogames.dev/s/AbC123x" height={760}>
      {/* 完整 header 复用前台风格 */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1.5px solid var(--ink)',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        background: 'var(--paper)',
      }}>
        <div className="h-scribble" style={{ fontSize: 22 }}>
          Lumio<span style={{ color: 'var(--hi)' }}>Games</span>
        </div>
        <div className="row gap-12 sm muted">
          <span>首页</span><span>文章</span><span className="u-wave b" style={{ color: 'var(--ink)'}}>笔记</span>
          <span>文档</span><span>标签</span><span>关于</span>
        </div>
        <div className="grow" />
        <div className="sk" style={{ padding: '4px 10px', fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--paper-warm)' }}>
          <Icon name="search" size={11}/> 搜索…
        </div>
      </div>

      {/* 提示条：已分享自笔记库 */}
      <div style={{
        background: 'var(--ok-soft)',
        borderBottom: '1px dashed var(--line-soft)',
        padding: '6px 20px',
        fontSize: 12,
        fontFamily: 'var(--hand)',
      }}>
        <Icon name="link" size={11}/> 这是一篇<b> 公开分享 </b>的笔记，自动收录到博客 · <span className="muted">短链 /s/AbC123x</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 200px', height: 'calc(100% - 53px - 28px)' }}>
        {/* 左侧：相关笔记（来自同一 vault） */}
        <div style={{ padding: 14, borderRight: '1.5px dashed var(--line-soft)', background: 'var(--paper-warm)', fontSize: 13 }}>
          <div className="h-arch b muted" style={{ fontSize: 11, marginBottom: 6 }}>▸ 同一笔记库</div>
          <div className="col gap-4 muted">
            <div className="b" style={{ color: 'var(--ink)' }}>· 当前笔记 ●</div>
            <div>· 行为树嫌弃</div>
            <div>· GOAP 复盘</div>
            <div>· LLM agents 草稿</div>
          </div>
          <div className="sep--soft sep" />
          <div className="h-arch b muted" style={{ fontSize: 11, marginBottom: 6 }}>▸ 同标签</div>
          <div className="col gap-4 muted">
            <div>· MCTS 入门</div>
            <div>· planner 综述</div>
          </div>
        </div>

        {/* 中：完整文章 */}
        <div style={{ padding: '24px 32px', overflow: 'hidden' }}>
          <div className="row gap-6" style={{ marginBottom: 8 }}>
            <span className="tag tag--hi">#游戏 AI</span>
            <span className="tag">#MCTS</span>
            <span className="tag tag--ghost"><Icon name="link" size={10}/> shared</span>
          </div>
          <div className="h-scribble" style={{ fontSize: 30, lineHeight: 1.15 }}>
            用 MCTS + LLM 给 RTS 做战术决策
          </div>
          <div className="row gap-12 muted sm" style={{ marginTop: 6, marginBottom: 14 }}>
            <span>2026-04-28</span><span>·</span><span>12 min</span><span>·</span><span>1.2k views</span>
          </div>
          <div className="ph" style={{ height: 130, marginBottom: 14 }}>cover figure</div>
          <div style={{ fontSize: 14, lineHeight: 1.7 }}>
            <p>把 MCTS 的展开阶段交给 LLM 来评估……</p>
            <div className="sk sk--warm" style={{ padding: 10, margin: '8px 0', fontSize: 13 }}>
              💡 <b>TL;DR</b> — 能跑，慢得离谱。
            </div>
            <p>……（正文）……</p>
          </div>
        </div>

        {/* 右：作者卡 + 订阅 */}
        <div style={{ padding: 14, borderLeft: '1.5px dashed var(--line-soft)' }}>
          <div className="ph ph--photo" style={{ width: 60, height: 60, borderRadius: '50%' }}>me</div>
          <div className="b sm" style={{ marginTop: 6 }}>LumioGames</div>
          <div className="muted tiny">游戏 AI / 渲染</div>
          <div className="sep--soft sep" />
          <div className="sm">订阅获取下一篇游戏 AI 笔记。</div>
          <div className="sk" style={{ padding: '4px 8px', marginTop: 6, fontSize: 12, background: 'var(--paper-warm)' }}>
            you@example.com
          </div>
          <span className="btn btn--primary btn--sm" style={{ marginTop: 6, width: '100%', justifyContent: 'center' }}>订阅</span>
          <div className="sep--soft sep" />
          <div className="h-arch b muted" style={{ fontSize: 11, marginBottom: 4 }}>▸ 大纲</div>
          <div className="col gap-4 muted tiny">
            <div className="b" style={{ color: 'var(--hi)' }}>1. 想法起点</div>
            <div>2. 实现：rollout</div>
            <div>3. 性能数据</div>
            <div>4. 复盘</div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

// --- VARIANT C — 链接管理后台视图（用来对比设计） -------
function ShareAdminPreview() {
  return (
    <BrowserChrome url="admin.lumiogames.dev/shares" height={760}>
      <div style={{
        padding: '10px 16px',
        borderBottom: '1.5px solid var(--ink)',
        background: '#1f1d1a',
        color: '#f0ece1',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div className="h-scribble" style={{ fontSize: 18 }}>
          Lumio<span style={{ color: 'var(--hi)' }}>·admin</span>
        </div>
        <span className="muted tiny" style={{ color: '#a8a29a' }}>/ 分享链接管理</span>
        <div className="grow" />
        <span className="btn btn--sm" style={{ background: 'var(--hi)', color: 'var(--paper)', borderColor: 'var(--hi)' }}>
          <Icon name="plus" size={11}/> 生成短链
        </span>
      </div>

      <div style={{ padding: 18 }}>
        <div className="h-scribble" style={{ fontSize: 24, marginBottom: 4 }}>分享链接管理</div>
        <div className="muted sm" style={{ marginBottom: 14 }}>所有由 <span className="mono">fast-note-sync</span> 生成的短链都在这里。</div>

        {/* KPI strip */}
        <div className="row gap-8" style={{ marginBottom: 14 }}>
          <div className="sk" style={{ padding: '8px 14px', background: 'var(--ok-soft)' }}>
            <span className="tiny muted">公开</span><div className="b xl">9</div>
          </div>
          <div className="sk" style={{ padding: '8px 14px', background: 'var(--warn-soft)' }}>
            <span className="tiny muted">仅链接</span><div className="b xl">14</div>
          </div>
          <div className="sk" style={{ padding: '8px 14px', background: 'var(--paper-warm)' }}>
            <span className="tiny muted">总访问 (7d)</span><div className="b xl">2,431</div>
          </div>
          <div className="sk" style={{ padding: '8px 14px', background: 'var(--danger-soft)' }}>
            <span className="tiny muted">30d 静默</span><div className="b xl">2</div>
          </div>
        </div>

        {/* table */}
        <div className="sk" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--hand)' }}>
            <thead>
              <tr style={{ background: 'var(--paper-warm)', borderBottom: '1.5px solid var(--ink)' }}>
                {['短链', '指向笔记', '权限', '访问', '最后访问', '密码', '操作'].map((h,i)=>(
                  <th key={i} style={{ padding: '8px 10px', textAlign: 'left', fontFamily: 'var(--hand-arch)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['/s/AbC123x', 'MCTS+LLM-RTS', 'public',  '218', '2h 前', false],
                ['/s/fK3p9q2', '行为树嫌弃',     'link',    '92',  '5h 前', true],
                ['/s/zX42Lpq', 'GOAP 复盘',     'link',    '14',  '3d 前', false],
                ['/s/mNb88rT', 'NPR 头发',      'link',    '8',   '12d 前', false],
                ['/s/old99xx', 'paper / 旧',    'link',    '0',   '从未', false, true],
              ].map((r,i)=>(
                <tr key={i} style={{ borderBottom: '1px dashed var(--line-soft)', opacity: r[6]?.6:1 }}>
                  <td style={{ padding: '8px 10px' }} className="mono tiny">{r[0]}</td>
                  <td style={{ padding: '8px 10px' }}><Icon name="doc" size={11}/> {r[1]}</td>
                  <td style={{ padding: '8px 10px' }}><Vis state={r[2]} /></td>
                  <td style={{ padding: '8px 10px' }} className="b">{r[3]}</td>
                  <td style={{ padding: '8px 10px' }} className="muted tiny">{r[4]}</td>
                  <td style={{ padding: '8px 10px' }}>{r[5] ? <span className="tag tag--warn" style={{fontSize:11}}>🔒 已设</span> : <span className="muted tiny">—</span>}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span className="row gap-4">
                      <span className="btn btn--sm">复制</span>
                      <span className="btn btn--sm" style={{ background: 'var(--danger-soft)', borderColor: 'var(--danger)' }}>撤销</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </BrowserChrome>
  );
}

Object.assign(window, { ShareLinkOnly, SharePublicShell, ShareAdminPreview });
