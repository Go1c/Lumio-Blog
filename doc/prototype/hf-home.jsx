/* global React, HFBrowser, HfIcon, HfNav */

const { useState: useStateF, useEffect: useEffectF } = React;

// ============================================================
// FRONTEND HOMEPAGE — hi-fi
// ============================================================
function HFHome({ theme = 'light', onTheme }) {
  const tags = [
    { t: '游戏 AI', c: 24, hot: true },
    { t: 'MCTS', c: 11 },
    { t: 'LLM Agents', c: 9, hot: true },
    { t: '强化学习', c: 14 },
    { t: '行为树', c: 6 },
    { t: 'Unity', c: 18 },
    { t: 'ML-Agents', c: 7 },
    { t: 'Shader', c: 12 },
    { t: 'Vulkan', c: 4 },
    { t: '渲染', c: 9 },
    { t: '随笔', c: 21 },
  ];
  const recent = [
    ['用 MCTS + LLM 给 RTS 做战术决策：一次失败的尝试', ['游戏 AI', 'MCTS', 'LLM'], '2026-04-28', '12 min', '1.2k'],
    ['行为树为何在多人 RPG 里被嫌弃', ['行为树', '游戏 AI'], '2026-04-26', '8 min', '892'],
    ['Unity ML-Agents 训 NPC：从 reward shaping 谈起', ['ML-Agents', '强化学习'], '2026-04-22', '14 min', '743'],
    ['Vulkan GPU-Driven Pipeline (3) — Indirect Draw', ['Vulkan', '渲染'], '2026-04-17', '18 min', '341'],
    ['读 Filament 源码：变体编译怎么做', ['Shader', '渲染'], '2026-04-11', '11 min', '156'],
  ];
  const notes = [
    ['TIL — ScriptableRenderContext 其实是延迟提交', 'public', '2h'],
    ['ECS lockstep 同步那个坑', 'link', '5h'],
    ['paper / SmartPlay (draft)', 'private', '1d'],
    ['Vulkan timeline semaphore 笔记', 'public', '1d'],
  ];

  return (
    <HFBrowser url="lumiogames.dev" height={820} theme={theme}>
      <HfNav active="首页" theme={theme} onTheme={onTheme} />

      <div style={{ overflow: 'auto', height: 'calc(100% - 56px)' }}>
        {/* HERO with animated blobs */}
        <div style={{
          position: 'relative',
          padding: '64px 28px 48px',
          overflow: 'hidden',
          borderBottom: '1px solid var(--line)',
        }}>
          <div className="hf-blob" style={{ width: 360, height: 360, background: 'var(--accent)', top: -80, right: -40 }} />
          <div className="hf-blob b2" style={{ width: 260, height: 260, background: '#a855f7', bottom: -60, left: 200 }} />

          <div style={{ position: 'relative', maxWidth: 920, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span className="hf-tag" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                v1.2 · synced 2m ago
              </span>
            </div>
            <h1 style={{
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1.1,
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              在<span style={{ color: 'var(--accent)' }}>游戏 AI</span>、渲染管线<br />
              和引擎源码之间<span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{'<thinking/>'}</span>
            </h1>
            <p style={{ fontSize: 17, color: 'var(--ink-3)', maxWidth: 620, marginTop: 16, lineHeight: 1.65, position: 'relative' }} className="hf-md-edit">
              我是 <b style={{ color: 'var(--ink)' }}>LumioGames</b>。
              这里是我用 Obsidian 写、通过 <code style={{ fontFamily: 'var(--mono)', background: 'var(--bg-sunk)', padding: '1px 6px', borderRadius: 4, fontSize: 14, color: 'var(--accent)' }}>fast-note-sync</code> 同步上来的
              文章和笔记 — 大部分公开，少量仅链接可见。
              <span className="hf-md-pill" style={{
                marginLeft: 8, fontFamily: 'var(--mono)', fontSize: 10,
                padding: '2px 7px', borderRadius: 999,
                background: 'var(--accent-soft)', color: 'var(--accent)',
                cursor: 'help', verticalAlign: 'middle',
                opacity: 0, transition: 'opacity .2s',
              }}>✎ md · 后台 → 设置</span>
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <span className="hf-btn hf-btn--primary">
                看最新文章 <HfIcon name="arrowR" size={13} />
              </span>
              <span className="hf-btn">
                <HfIcon name="layers" size={13} /> 逛笔记库 (142)
              </span>
            </div>
          </div>
        </div>

        {/* THREE-COLUMN BODY */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 260px', maxWidth: 1280, margin: '0 auto', padding: '32px 28px' }}>
          {/* LEFT: catalog tree */}
          <aside style={{ paddingRight: 24, borderRight: '1px solid var(--line)' }}>
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '.05em' }}>
              ▸ 目录
            </div>
            {[
              ['📄 文章', [
                ['游戏 AI 笔谈', 24, true],
                ['渲染拾遗', 21],
                ['引擎源码读', 13],
              ]],
              ['📓 笔记', [
                ['daily', 38],
                ['论文速读', 9],
                ['TIL', 14],
              ]],
              ['📚 文档系列', [
                ['Vulkan GPU-Driven', 6],
                ['hermes-agent', 4],
              ]],
            ].map(([title, items], gi) => (
              <div key={gi} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{title}</div>
                <div className="hf-col" style={{ gap: 2 }}>
                  {items.map(([n, c, active], i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontSize: 13,
                      color: active ? 'var(--accent)' : 'var(--ink-2)',
                      background: active ? 'var(--accent-soft)' : 'transparent',
                      fontWeight: active ? 600 : 400,
                    }}>
                      <span>{n}</span>
                      <span className="hf-mono hf-tiny hf-faint">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {/* MIDDLE: feed */}
          <main style={{ padding: '0 24px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>最近发布</h2>
              <span className="hf-mono hf-tiny hf-faint">38 articles · 142 notes</span>
              <div className="hf-grow" />
              <span className="hf-tag" style={{ background: 'var(--bg-soft)' }}>全部</span>
              <span className="hf-tag hf-tag--accent">游戏 AI</span>
              <span className="hf-tag" style={{ background: 'var(--bg-soft)' }}>渲染</span>
            </div>
            <div className="hf-mono hf-tiny hf-faint" style={{ marginBottom: 20 }}>
              排序: 最新 ↓
            </div>

            {/* PINNED card */}
            <article style={{
              padding: 20,
              border: '1px solid var(--line)',
              borderRadius: 10,
              marginBottom: 16,
              background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-soft) 100%)',
              position: 'relative',
            }}>
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
                <span className="hf-tag hf-tag--accent" style={{ fontSize: 11 }}>
                  <HfIcon name="pin" size={10} /> 置顶
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {recent[0][1].map(t => (
                  <span key={t} className="hf-tag" style={{ fontSize: 11 }}>#{t}</span>
                ))}
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
                {recent[0][0]}
              </h3>
              <p style={{ color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6, marginTop: 8, marginBottom: 12 }}>
                把 MCTS 的展开阶段（rollout）交给 LLM 评估，听起来像偷懒——但 token 成本和延迟在 100ms 决策窗口下完全不可接受。下文记录踩坑过程。
              </p>
              <div className="hf-mono hf-tiny hf-faint" style={{ display: 'flex', gap: 12 }}>
                <span>{recent[0][2]}</span><span>·</span>
                <span>{recent[0][3]}</span><span>·</span>
                <span>{recent[0][4]} views</span>
              </div>
            </article>

            {/* normal entries */}
            {recent.slice(1).map(([title, ts, date, mins, views], i) => (
              <article key={i} className="hf-hover" style={{
                padding: '16px 4px',
                borderBottom: '1px solid var(--line)',
                cursor: 'default',
                display: 'grid',
                gridTemplateColumns: '90px 1fr auto',
                gap: 16,
                alignItems: 'start',
              }}>
                <div className="hf-mono hf-tiny hf-faint" style={{ paddingTop: 4 }}>{date.slice(5)}</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{title}</h3>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {ts.map(t => <span key={t} className="hf-tag" style={{ fontSize: 11 }}>#{t}</span>)}
                  </div>
                </div>
                <div className="hf-mono hf-tiny hf-faint" style={{ paddingTop: 4, textAlign: 'right' }}>
                  {mins}<br />{views}
                </div>
              </article>
            ))}
          </main>

          {/* RIGHT: who am I + recent notes */}
          <aside style={{ paddingLeft: 24, borderLeft: '1px solid var(--line)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), #a855f7)',
                margin: '0 auto 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700,
              }}>L</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>LumioGames</div>
              <div className="hf-tiny hf-muted" style={{ marginTop: 2 }}>独立游戏 / 引擎渲染 / AI</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                <span className="hf-btn hf-btn--sm hf-btn--ghost">github</span>
                <span className="hf-btn hf-btn--sm hf-btn--ghost">x</span>
                <span className="hf-btn hf-btn--sm hf-btn--ghost">mail</span>
              </div>
            </div>

            {/* SELF-PROMO AD */}
            <div style={{ marginTop: 22 }}>
              <HfAd variant="hero" />
            </div>

            <div style={{ marginTop: 24 }}>
              <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <HfIcon name="activity" size={11} /> 最近笔记
              </div>
              <div className="hf-col" style={{ gap: 10 }}>
                {notes.map(([n, v, t], i) => (
                  <div key={i} className="hf-hover" style={{ padding: '8px 10px', borderRadius: 6, cursor: 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span className={`hf-vis hf-vis--${v}`} style={{ fontSize: 10 }}>
                        {v === 'public' && '公开'}
                        {v === 'link' && '仅链接'}
                        {v === 'private' && '私有'}
                      </span>
                      <span className="hf-mono hf-tiny hf-faint">· {t}</span>
                    </div>
                    <div className="hf-sm" style={{ fontWeight: 500, lineHeight: 1.4 }}>{n}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '.05em' }}>▸ 标签云</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {tags.map((tg, i) => (
                  <span key={i} className={`hf-tag ${tg.hot ? 'hf-tag--accent' : ''}`} style={{ fontSize: 11 }}>
                    #{tg.t}<span className="hf-mono hf-faint" style={{ marginLeft: 3, fontSize: 10 }}>{tg.c}</span>
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </HFBrowser>
  );
}

Object.assign(window, { HFHome });
