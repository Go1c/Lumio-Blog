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
      <a href="#main-content" className="skip-link">跳到正文</a>
      <HfNav active="首页" theme={theme} onTheme={onTheme} />

      <div style={{ overflow: 'auto', height: 'calc(100% - 56px)' }}>
        {/* HERO with animated blobs */}
        <div style={{
          position: 'relative',
          padding: '64px 28px 48px',
          overflow: 'hidden',
          borderBottom: '1px solid var(--line)',
        }}>
          <div className="hf-blob" aria-hidden="true" style={{ width: 360, height: 360, background: 'var(--accent)', top: -80, right: -40 }} />
          <div className="hf-blob b2" aria-hidden="true" style={{ width: 260, height: 260, background: '#a855f7', bottom: -60, left: 200 }} />

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
              <a href="/posts" className="hf-btn hf-btn--primary">
                看最新文章 <HfIcon name="arrowR" size={13} />
              </a>
              <a href="/notes" className="hf-btn">
                <HfIcon name="layers" size={13} /> 逛笔记库 <span aria-label="共 142 条">(142)</span>
              </a>
            </div>
          </div>
        </div>

        {/* THREE-COLUMN BODY */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 260px', maxWidth: 1280, margin: '0 auto', padding: '32px 28px' }}>
          {/* LEFT: catalog tree */}
          <aside aria-label="目录" style={{ paddingRight: 24, borderRight: '1px solid var(--line)' }}>
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '.05em' }}>
              ▸ 目录
            </div>
            {[
              ['文章', '📄', [
                ['游戏 AI 笔谈', 24, true],
                ['渲染拾遗', 21],
                ['引擎源码读', 13],
              ]],
              ['笔记', '📓', [
                ['daily', 38],
                ['论文速读', 9],
                ['TIL', 14],
              ]],
              ['文档系列', '📚', [
                ['Vulkan GPU-Driven', 6],
                ['hermes-agent', 4],
              ]],
            ].map(([title, emoji, items], gi) => (
              <div key={gi} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }} id={`cat-${gi}`}>
                  <span aria-hidden="true">{emoji} </span>{title}
                </div>
                <ul aria-labelledby={`cat-${gi}`} className="hf-col" style={{ gap: 2, listStyle: 'none', padding: 0, margin: 0 }}>
                  {items.map(([n, c, active], i) => (
                    <li key={i}>
                      <a
                        href={`/category/${encodeURIComponent(n)}`}
                        aria-current={active ? 'page' : undefined}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: 4,
                          fontSize: 13,
                          color: active ? 'var(--accent-2)' : 'var(--ink-2)',
                          background: active ? 'var(--accent-soft)' : 'transparent',
                          fontWeight: active ? 600 : 400,
                          textDecoration: 'none',
                        }}>
                        <span>{n}</span>
                        <span className="hf-mono hf-tiny hf-faint" aria-label={`${c} 篇`}>{c}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>

          {/* MIDDLE: feed */}
          <main id="main-content" style={{ padding: '0 24px', minWidth: 0 }} aria-labelledby="recent-heading">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
              <h2 id="recent-heading" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>最近发布</h2>
              <span className="hf-mono hf-tiny hf-faint">38 articles · 142 notes</span>
              <div className="hf-grow" />
              <div role="group" aria-label="按标签筛选" style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="hf-tag" aria-pressed="true" style={{ background: 'var(--bg-soft)' }}>全部</button>
                <button type="button" className="hf-tag hf-tag--accent" aria-pressed="false">游戏 AI</button>
                <button type="button" className="hf-tag" aria-pressed="false" style={{ background: 'var(--bg-soft)' }}>渲染</button>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <button type="button" className="hf-mono hf-tiny" aria-haspopup="listbox" aria-label="排序方式:最新" style={{
                color: 'var(--ink-3)', background: 'transparent', border: 0,
                padding: '4px 0', cursor: 'pointer', font: 'inherit',
              }}>
                排序: 最新 <span aria-hidden="true">↓</span>
              </button>
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
                  <HfIcon name="pin" size={10} /> <span aria-label="已置顶">置顶</span>
                </span>
              </div>
              <ul style={{ display: 'flex', gap: 6, marginBottom: 8, listStyle: 'none', padding: 0 }} aria-label="标签">
                {recent[0][1].map(t => (
                  <li key={t}><a href={`/tag/${encodeURIComponent(t)}`} className="hf-tag" style={{ fontSize: 11, textDecoration: 'none' }}>#{t}</a></li>
                ))}
              </ul>
              <h3 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
                <a href={`/posts/${encodeURIComponent(recent[0][0])}`} style={{ color: 'inherit', textDecoration: 'none' }}>{recent[0][0]}</a>
              </h3>
              <p style={{ color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6, marginTop: 8, marginBottom: 12 }}>
                把 MCTS 的展开阶段（rollout）交给 LLM 评估，听起来像偷懒——但 token 成本和延迟在 100ms 决策窗口下完全不可接受。下文记录踩坑过程。
              </p>
              <div className="hf-mono hf-tiny" style={{ display: 'flex', gap: 12, color: 'var(--ink-4)' }}>
                <time dateTime={recent[0][2]}>{recent[0][2]}</time>
                <span aria-hidden="true">·</span>
                <span aria-label={`阅读时长 ${recent[0][3]}`}>{recent[0][3]}</span>
                <span aria-hidden="true">·</span>
                <span aria-label={`${recent[0][4]} 次阅读`}>{recent[0][4]} views</span>
              </div>
            </article>

            {/* normal entries */}
            {recent.slice(1).map(([title, ts, date, mins, views], i) => (
              <article key={i} className="hf-hover" style={{
                padding: '16px 4px',
                borderBottom: '1px solid var(--line)',
                display: 'grid',
                gridTemplateColumns: '90px 1fr auto',
                gap: 16,
                alignItems: 'start',
              }}>
                <time dateTime={date} className="hf-mono hf-tiny" style={{ paddingTop: 4, color: 'var(--ink-4)' }}>{date.slice(5)}</time>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
                    <a href={`/posts/${encodeURIComponent(title)}`} style={{ color: 'inherit', textDecoration: 'none' }}>{title}</a>
                  </h3>
                  <ul style={{ display: 'flex', gap: 6, marginTop: 6, listStyle: 'none', padding: 0 }} aria-label="标签">
                    {ts.map(t => <li key={t}><a href={`/tag/${encodeURIComponent(t)}`} className="hf-tag" style={{ fontSize: 11, textDecoration: 'none' }}>#{t}</a></li>)}
                  </ul>
                </div>
                <div className="hf-mono hf-tiny" style={{ paddingTop: 4, textAlign: 'right', color: 'var(--ink-4)' }}>
                  <span aria-label={`阅读时长 ${mins}`}>{mins}</span><br />
                  <span aria-label={`${views} 次阅读`}>{views}</span>
                </div>
              </article>
            ))}
          </main>

          {/* RIGHT: who am I + recent notes */}
          <aside aria-label="作者资料与最近笔记" style={{ paddingLeft: 24, borderLeft: '1px solid var(--line)' }}>
            <div style={{ textAlign: 'center' }}>
              <div aria-hidden="true" style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), #a855f7)',
                margin: '0 auto 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700,
              }}>L</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>LumioGames</div>
              <div className="hf-tiny hf-muted" style={{ marginTop: 2 }}>独立游戏 / 引擎渲染 / AI</div>
              <ul style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10, listStyle: 'none', padding: 0 }} aria-label="社交链接">
                <li><a href="https://github.com/lumiogames" rel="noopener noreferrer" className="hf-btn hf-btn--sm hf-btn--ghost">GitHub</a></li>
                <li><a href="https://x.com/lumiogames" rel="noopener noreferrer" className="hf-btn hf-btn--sm hf-btn--ghost">X</a></li>
                <li><a href="mailto:hi@lumiogames.dev" className="hf-btn hf-btn--sm hf-btn--ghost">Mail</a></li>
              </ul>
            </div>

            {/* SELF-PROMO AD */}
            <div style={{ marginTop: 22 }}>
              <HfAd variant="hero" />
            </div>

            <section aria-labelledby="recent-notes-h" style={{ marginTop: 24 }}>
              <h3 id="recent-notes-h" className="hf-mono hf-tiny" style={{ color: 'var(--ink-3)', textTransform: 'uppercase', margin: '0 0 10px', letterSpacing: '.05em', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700 }}>
                <HfIcon name="activity" size={11} /> 最近笔记
              </h3>
              <ul className="hf-col" style={{ gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
                {notes.map(([n, v, t], i) => (
                  <li key={i}>
                    <a href={`/notes/${encodeURIComponent(n)}`} className="hf-hover" style={{ display: 'block', padding: '8px 10px', borderRadius: 6, textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span className={`hf-vis hf-vis--${v}`} style={{ fontSize: 11 }}>
                          {v === 'public' && '公开'}
                          {v === 'link' && '仅链接'}
                          {v === 'private' && '私有'}
                        </span>
                        <time dateTime={t} className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)' }}>· {t}</time>
                      </div>
                      <div className="hf-sm" style={{ fontWeight: 500, lineHeight: 1.4 }}>{n}</div>
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="tag-cloud-h" style={{ marginTop: 24 }}>
              <h3 id="tag-cloud-h" className="hf-mono hf-tiny" style={{ color: 'var(--ink-3)', textTransform: 'uppercase', margin: '0 0 10px', letterSpacing: '.05em', fontSize: 11, fontWeight: 700 }}>▸ 标签云</h3>
              <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 5, listStyle: 'none', padding: 0, margin: 0 }}>
                {tags.map((tg, i) => (
                  <li key={i}>
                    <a href={`/tag/${encodeURIComponent(tg.t)}`} className={`hf-tag ${tg.hot ? 'hf-tag--accent' : ''}`} style={{ fontSize: 11, textDecoration: 'none' }} aria-label={`标签 ${tg.t} (${tg.c} 篇)${tg.hot ? ',热门' : ''}`}>
                      #{tg.t}<span className="hf-mono hf-faint" aria-hidden="true" style={{ marginLeft: 3, fontSize: 10 }}>{tg.c}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </HFBrowser>
  );
}

Object.assign(window, { HFHome });
