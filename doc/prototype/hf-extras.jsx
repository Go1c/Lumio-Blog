/* global React, HFBrowser, HfIcon, HfNav, AdminShell */

const { useState: useStateE } = React;

// ============================================================
// 1. ARTICLE COMMENTS (giscus-style)
// ============================================================
function HFArticleComments({ theme = 'light', onTheme }) {
  return (
    <HFBrowser url="lumiogames.dev/posts/mcts-llm-rts#comments" height={820} theme={theme}>
      <HfNav active="文章" theme={theme} onTheme={onTheme} />
      <div style={{ overflow: 'auto', height: 'calc(100% - 56px)' }} className="hf">
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
          {/* article tail snippet */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <span className="hf-tag hf-tag--accent">#游戏 AI</span>
            <span className="hf-tag">#MCTS</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.25, margin: 0, letterSpacing: '-0.01em' }}>
            用 MCTS + LLM 给 RTS 做战术决策
          </h1>
          <div className="hf-mono hf-tiny hf-muted" style={{ marginTop: 8 }}>
            ↑ 文章正文 (省略) · 12 min · 1.2k views
          </div>
          <hr className="hf-divider" style={{ margin: '20px 0' }} />

          {/* comments header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>💬 评论 · 12</h2>
            <div className="hf-grow" />
            <span className="hf-tag" style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>Giscus · GitHub Discussions</span>
            <span className="hf-tag hf-tag--accent" style={{ fontSize: 11 }}>最新</span>
            <span className="hf-tag" style={{ fontSize: 11 }}>最旧</span>
            <span className="hf-tag" style={{ fontSize: 11 }}>最热</span>
          </div>

          {/* comment composer */}
          <div className="hf-card" style={{ padding: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--bg-sunk)', border: '1px dashed var(--line-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--ink-4)', fontSize: 11,
              }}>?</div>
              <div className="hf-sm hf-muted">用 GitHub 登录后评论 →</div>
              <div className="hf-grow" />
              <button type="button" className="hf-btn hf-btn--sm hf-btn--primary">登录 GitHub</button>
            </div>
            <div style={{
              padding: 12, background: 'var(--bg-soft)',
              border: '1px solid var(--line)', borderRadius: 6,
              fontSize: 13, color: 'var(--ink-4)', minHeight: 56,
            }}>
              留下你的想法… 支持 Markdown · 图片粘贴
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {['B', 'I', '<>','#', '@', '🙂'].map((g, i) => (
                <button type="button" key={i} className="hf-btn hf-btn--icon" style={{ width: 26, height: 26, fontSize: 11, fontFamily: 'var(--mono)' }}>{g}</button>
              ))}
              <div className="hf-grow" />
              <button type="button" className="hf-btn hf-btn--sm hf-btn--ghost">预览</button>
              <button type="button" className="hf-btn hf-btn--sm hf-btn--primary" style={{ opacity: .5 }}>发布</button>
            </div>
          </div>

          {/* comments list */}
          {[
            { name: '@chen-rendering', avatar: 'C', color: '#0066ff',
              time: '2h', body: '尝试过把 LLM 限制到 root prior + UCT，有效，但需要 fine-tune 一个 7B 才稳。',
              likes: 8, replies: 3, mine: false, reactions: [['👍', 8], ['🤔', 2]] },
            { name: '@arcadia-dev', avatar: 'A', color: '#a855f7',
              time: '4h', body: '<b>"100ms 决策窗口"</b> 这个前提太苛刻了——<code>turn-based</code> RTS 完全没问题。',
              likes: 5, replies: 1, reactions: [['💯', 3]] },
            { name: '@LumioGames (作者)', avatar: 'L', color: 'var(--accent)',
              time: '3h', body: '同意。这篇主要针对 real-time 场景，下一篇会讨论 turn-based 的情况。',
              likes: 4, replies: 0, mine: true, reactions: [['❤️', 4]] },
            { name: '@yume_99', avatar: 'Y', color: '#16a34a',
              time: '1d', body: '请问代码会开源吗？想自己跑一下看看 token 成本曲线。',
              likes: 2, replies: 2, reactions: [] },
          ].map((c, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '14px 0',
              borderBottom: '1px solid var(--line)',
              marginLeft: c.mine ? 32 : 0,
              background: c.mine ? 'var(--accent-soft)' : 'transparent',
              borderRadius: c.mine ? 8 : 0,
              padding: c.mine ? 14 : '14px 0',
              marginBottom: c.mine ? 4 : 0,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: c.color, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15,
                flexShrink: 0,
              }}>{c.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                  {c.mine && <span className="hf-tag hf-tag--accent" style={{ fontSize: 10 }}>作者</span>}
                  <span className="hf-mono hf-tiny hf-faint">{c.time} ago</span>
                </div>
                <div className="hf-sm" style={{ lineHeight: 1.65, color: 'var(--ink-2)' }}
                  dangerouslySetInnerHTML={{ __html: c.body
                    .replace(/<code>(.+?)<\/code>/g, '<code style="font-family:var(--mono);font-size:12px;background:var(--bg-sunk);padding:1px 5px;border-radius:3px;color:var(--accent)">$1</code>') }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  {c.reactions.length > 0 && c.reactions.map(([emo, n], j) => (
                    <span key={j} className="hf-tag" style={{ fontSize: 11, padding: '1px 6px' }}>
                      {emo} {n}
                    </span>
                  ))}
                  <span className="hf-mono hf-tiny hf-faint" style={{ cursor: 'pointer' }}>👍 {c.likes}</span>
                  <span className="hf-mono hf-tiny hf-faint" style={{ cursor: 'pointer' }}>↩ 回复 {c.replies > 0 && `(${c.replies})`}</span>
                  <div className="hf-grow" />
                  <span className="hf-mono hf-tiny hf-faint">···</span>
                </div>
              </div>
            </div>
          ))}

          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-3)', fontSize: 13 }}>
            <button type="button" className="hf-btn hf-btn--sm">加载更多评论 (8)</button>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ============================================================
// 2. NEWSLETTER SUBSCRIBE
// ============================================================
function HFNewsletter({ theme = 'light', onTheme }) {
  return (
    <HFBrowser url="lumiogames.dev/subscribe" height={820} theme={theme}>
      <HfNav active="" theme={theme} onTheme={onTheme} />
      <div style={{ overflow: 'auto', height: 'calc(100% - 56px)' }} className="hf">
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span className="hf-tag hf-tag--accent" style={{ fontSize: 12 }}>📮 Newsletter</span>
            <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, margin: '12px 0 14px', letterSpacing: '-0.02em' }}>
              每周一封 <br />
              的<span style={{ color: 'var(--accent)' }}>游戏 AI</span>笔记
            </h1>
            <p style={{ fontSize: 16, color: 'var(--ink-3)', maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
              我每月把当月最值得读的几篇文章 + 一些没整理成文章的零碎想法整理成邮件发出来。
              <b style={{ color: 'var(--ink)' }}>不卖课，不推销</b>，可随时退订。
            </p>
          </div>

          {/* form */}
          <div className="hf-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}>
                  <HfIcon name="layers" size={14} />
                </span>
                <input className="hf-input" placeholder="your@email.com" style={{ paddingLeft: 36, height: 42, fontSize: 14 }} defaultValue="" />
              </div>
              <button type="button" className="hf-btn hf-btn--primary" style={{ height: 42, padding: '0 22px', fontSize: 14 }}>
                订阅 <HfIcon name="arrowR" size={13} color="#fff" />
              </button>
            </div>
            <label className="hf-tiny hf-muted hf-check-label" style={{ marginTop: 10, display: 'inline-flex' }}>
              <button type="button" role="checkbox" aria-checked="true" className="hf-check on" style={{ marginRight: 6 }} />
              <span>我也想收到偶尔的<b style={{ color: 'var(--ink)' }}>实验性内容</b>(草稿、还没成形的想法)</span>
            </label>
          </div>

          {/* social proof */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
            padding: 20, borderRadius: 10, background: 'var(--bg-soft)', marginBottom: 24,
          }}>
            {[
              ['1,247', '订阅者'],
              ['12', '已发出'],
              ['58%', '打开率'],
            ].map(([v, k], i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{v}</div>
                <div className="hf-tiny hf-muted" style={{ marginTop: 2 }}>{k}</div>
              </div>
            ))}
          </div>

          {/* past issues */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '.05em' }}>
            ▸ 往期回顾
          </div>
          {[
            ['#012 — 关于"AI agent"的祛魅', '2026-04', '本月推荐 3 篇 + 1 个失败实验复盘'],
            ['#011 — 渲染管线的几个旧问题', '2026-03', 'Vulkan GPU-Driven 系列收尾'],
            ['#010 — 我为什么停了 5 个项目', '2026-02', '年初反思'],
          ].map(([t, d, sub], i) => (
            <div key={i} className="hf-hover" style={{
              padding: '12px 14px', borderRadius: 8,
              borderBottom: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div className="hf-mono hf-tiny hf-faint" style={{ width: 60 }}>{d}</div>
              <div className="hf-grow">
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{t}</div>
                <div className="hf-tiny hf-muted">{sub}</div>
              </div>
              <HfIcon name="arrowR" size={13} color="var(--ink-3)" />
            </div>
          ))}
        </div>
      </div>
    </HFBrowser>
  );
}

// ============================================================
// 3. SEARCH RESULTS
// ============================================================
function HFSearchResults({ theme = 'light', onTheme }) {
  return (
    <HFBrowser url="lumiogames.dev/search?q=mcts" height={820} theme={theme}>
      <HfNav active="" theme={theme} onTheme={onTheme} />
      <div style={{ overflow: 'auto', height: 'calc(100% - 56px)' }} className="hf">
        {/* search bar prominent */}
        <div style={{
          padding: '24px 28px', borderBottom: '1px solid var(--line)',
          background: 'var(--bg-soft)',
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: 'var(--bg)',
              border: '1px solid var(--accent)', borderRadius: 8,
              boxShadow: '0 0 0 3px var(--accent-soft)',
            }}>
              <HfIcon name="search" size={16} color="var(--accent)" />
              <span style={{ fontFamily: 'var(--sans)', fontSize: 16, color: 'var(--ink)', fontWeight: 500 }}>mcts</span>
              <span style={{ width: 1, height: 16, background: 'var(--accent)', animation: 'pulse-dot 1.2s infinite' }} />
              <div className="hf-grow" />
              <span className="hf-mono hf-tiny hf-faint">↵ enter</span>
              <span className="hf-kbd">esc</span>
            </div>
            <div className="hf-mono hf-tiny hf-muted" style={{ marginTop: 8 }}>
              17 个结果 · 12 篇文章 · 5 条笔记 · 0.04s
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, padding: '24px 28px' }}>
          {/* filters */}
          <aside>
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 类型</div>
            <div className="hf-col" style={{ gap: 4, marginBottom: 20 }}>
              {[['全部', 17, true], ['文章', 12, false], ['笔记', 5, false], ['文档', 0, false]].map(([n, c, a], i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '5px 10px', fontSize: 13, borderRadius: 4,
                  background: a ? 'var(--accent-soft)' : 'transparent',
                  color: a ? 'var(--accent)' : 'var(--ink-2)', fontWeight: a ? 600 : 400,
                }}>
                  <span>{n}</span>
                  <span className="hf-mono hf-tiny hf-faint">{c}</span>
                </div>
              ))}
            </div>
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 标签</div>
            <div className="hf-col" style={{ gap: 4, marginBottom: 20 }}>
              {[['#游戏 AI', 8], ['#MCTS', 7], ['#强化学习', 3], ['#LLM', 2]].map(([n, c], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px', fontSize: 13, color: 'var(--ink-2)' }}>
                  <span>{n}</span>
                  <span className="hf-mono hf-tiny hf-faint">{c}</span>
                </div>
              ))}
            </div>
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 时间</div>
            <div className="hf-col" style={{ gap: 4 }}>
              {['全部时间', '近 7 天', '近 30 天', '近 1 年'].map((n, i) => (
                <div key={i} style={{ padding: '4px 10px', fontSize: 13, color: i === 0 ? 'var(--ink)' : 'var(--ink-3)', fontWeight: i === 0 ? 500 : 400 }}>
                  {n}
                </div>
              ))}
            </div>
          </aside>

          {/* results */}
          <main>
            <div className="hf-mono hf-tiny hf-muted" style={{ marginBottom: 12 }}>排序: 相关度 ↓ · 也按时间</div>

            {[
              { type: '文章', title: '用 <em>MCTS</em> + LLM 给 RTS 做战术决策', date: '2026-04-28', mins: '12 min',
                excerpt: '...经典做法是 random rollout 直到终局，或者用一个浅层的 policy network 来预测胜负。<em>MCTS</em> 的展开阶段...',
                ts: ['#游戏 AI', '#MCTS'] },
              { type: '文章', title: 'GOAP vs <em>MCTS</em>：不同抽象层的代价', date: '2026-03-12', mins: '9 min',
                excerpt: '我个人不喜欢 GOAP 的 plan-then-execute 模式，相比之下 <em>MCTS</em> 的 anytime 特性...',
                ts: ['#游戏 AI', '#MCTS'] },
              { type: '笔记', title: 'TIL — <em>MCTS</em> 的 PUCT 变种', date: '2026-04-12', vis: 'public',
                excerpt: 'AlphaZero 用的 PUCT，不是经典 UCB1...',
                ts: ['#TIL'] },
              { type: '文章', title: 'AlphaZero 的 <em>MCTS</em> 和经典版的区别', date: '2026-02-08', mins: '15 min',
                excerpt: '把 prior 引入 selection 阶段，是 AZ 那个让人惊艳的小改动。它把 <em>MCTS</em>...',
                ts: ['#游戏 AI', '#强化学习'] },
            ].map((r, i) => (
              <article key={i} style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={r.type === '文章' ? 'hf-tag hf-tag--accent' : 'hf-tag'} style={{ fontSize: 10 }}>{r.type}</span>
                  <span className="hf-mono hf-tiny hf-faint">{r.date}</span>
                  {r.mins && <span className="hf-mono hf-tiny hf-faint">· {r.mins}</span>}
                  {r.vis && <span className="hf-vis hf-vis--public" style={{ fontSize: 9 }}>公开</span>}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, lineHeight: 1.4 }}
                    dangerouslySetInnerHTML={{ __html: r.title.replace(/<em>/g, '<em style="background:var(--accent-soft);color:var(--accent);font-style:normal;padding:0 2px;border-radius:2px;">') }} />
                <p className="hf-sm hf-muted" style={{ marginTop: 6, marginBottom: 8, lineHeight: 1.6 }}
                   dangerouslySetInnerHTML={{ __html: r.excerpt.replace(/<em>/g, '<em style="background:var(--accent-soft);color:var(--accent);font-style:normal;padding:0 2px;border-radius:2px;">') }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  {r.ts.map(t => <span key={t} className="hf-tag" style={{ fontSize: 10 }}>{t}</span>)}
                </div>
              </article>
            ))}
          </main>
        </div>
      </div>
    </HFBrowser>
  );
}

// ============================================================
// 4. TAG DETAIL PAGE
// ============================================================
function HFTagDetail({ theme = 'light', onTheme }) {
  return (
    <HFBrowser url="lumiogames.dev/tags/game-ai" height={820} theme={theme}>
      <HfNav active="标签" theme={theme} onTheme={onTheme} />
      <div style={{ overflow: 'auto', height: 'calc(100% - 56px)' }} className="hf">
        {/* header */}
        <div style={{ padding: '40px 28px 20px', position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--line)' }}>
          <div className="hf-blob" style={{ width: 280, height: 280, background: 'var(--accent)', top: -80, right: 80 }} />
          <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
            <div className="hf-mono hf-tiny hf-muted" style={{ marginBottom: 6 }}>
              <a style={{ color: 'var(--ink-3)' }}>所有标签</a> / 
            </div>
            <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1, margin: 0, letterSpacing: '-0.02em' }}>
              <span style={{ color: 'var(--accent)' }}>#</span>游戏 AI
            </h1>
            <p style={{ fontSize: 15, color: 'var(--ink-3)', maxWidth: 600, marginTop: 10, lineHeight: 1.65 }}>
              我对游戏中的 AI 决策、行为生成、学习方法感兴趣。
              这里收集了所有相关文章和笔记，包括失败实验。
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 16, fontSize: 13, color: 'var(--ink-3)' }}>
              <span><b style={{ color: 'var(--ink)', fontFamily: 'var(--mono)' }}>24</b> 文章</span>
              <span>·</span>
              <span><b style={{ color: 'var(--ink)', fontFamily: 'var(--mono)' }}>11</b> 笔记</span>
              <span>·</span>
              <span><b style={{ color: 'var(--ink)', fontFamily: 'var(--mono)' }}>3.4k</b> 月浏览</span>
              <div className="hf-grow" />
              <button type="button" className="hf-btn hf-btn--sm"><HfIcon name="rss" size={11} /> RSS</button>
              <button type="button" className="hf-btn hf-btn--sm"><HfIcon name="bell" size={11} /> 关注</button>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
          <main>
            {/* sub-tags */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
              <span className="hf-tag hf-tag--solid">全部 35</span>
              <span className="hf-tag">MCTS · 7</span>
              <span className="hf-tag">行为树 · 6</span>
              <span className="hf-tag">强化学习 · 14</span>
              <span className="hf-tag">LLM Agents · 9</span>
              <span className="hf-tag">GOAP · 4</span>
            </div>

            {/* timeline by year */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>2026</h2>
              <div className="hf-mono hf-tiny hf-faint" style={{ marginLeft: 8 }}>11 篇</div>
            </div>
            {[
              ['用 MCTS + LLM 给 RTS 做战术决策', '04-28', '12 min', true],
              ['行为树为何在多人 RPG 里被嫌弃', '04-26', '8 min'],
              ['ML-Agents 训 NPC: reward shaping', '04-22', '14 min'],
              ['GOAP vs MCTS：不同抽象层的代价', '03-12', '9 min'],
              ['AlphaZero 的 MCTS 和经典版的区别', '02-08', '15 min'],
            ].map(([t, d, m, hot], i) => (
              <article key={i} className="hf-hover" style={{
                display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 14,
                padding: '14px 6px', borderBottom: '1px solid var(--line)',
                alignItems: 'start',
              }}>
                <div className="hf-mono hf-tiny hf-faint" style={{ paddingTop: 3 }}>{d}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 500, margin: 0, lineHeight: 1.4 }}>{t}</h3>
                    {hot && <span className="hf-tag hf-tag--accent" style={{ fontSize: 9 }}>🔥 hot</span>}
                  </div>
                </div>
                <div className="hf-mono hf-tiny hf-faint" style={{ paddingTop: 3, textAlign: 'right' }}>{m}</div>
              </article>
            ))}
            <div style={{ marginTop: 24, marginBottom: 12, display: 'flex', alignItems: 'baseline' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>2025</h2>
              <div className="hf-mono hf-tiny hf-faint" style={{ marginLeft: 8 }}>13 篇 · 折叠</div>
            </div>
          </main>

          {/* sidebar: related tags + featured */}
          <aside>
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 相关标签</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 24 }}>
              {[['ML-Agents', 7], ['Unity', 18], ['行为树', 6], ['MuZero', 3], ['搜索算法', 4]].map(([t, c], i) => (
                <span key={i} className="hf-tag" style={{ fontSize: 11 }}>
                  #{t}<span className="hf-mono hf-faint" style={{ marginLeft: 3, fontSize: 10 }}>{c}</span>
                </span>
              ))}
            </div>

            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 标签下最热</div>
            {[
              ['MCTS+LLM 实验', '1.2k'],
              ['AlphaZero 的 MCTS', '894'],
              ['行为树嫌弃', '743'],
            ].map(([t, v], i) => (
              <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                <div className="hf-sm" style={{ fontWeight: 500, lineHeight: 1.4 }}>{t}</div>
                <div className="hf-mono hf-tiny hf-faint" style={{ marginTop: 2 }}>{v} views</div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </HFBrowser>
  );
}

// ============================================================
// 5. NOT FOUND / PRIVATE BLOCKED
// ============================================================
function HFNotFound({ theme = 'light', onTheme }) {
  return (
    <HFBrowser url="lumiogames.dev/posts/private-draft" height={820} theme={theme}>
      <HfNav active="" theme={theme} onTheme={onTheme} />
      <div style={{ overflow: 'auto', height: 'calc(100% - 56px)' }} className="hf">
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
          {/* glitch 404 visual */}
          <div style={{
            position: 'relative', display: 'inline-block', marginBottom: 24,
          }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 140, fontWeight: 900,
              color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.05em',
              position: 'relative',
            }}>4<span style={{ color: 'var(--accent)' }}>0</span>4</div>
            <div style={{
              position: 'absolute', inset: 0,
              fontFamily: 'var(--mono)', fontSize: 140, fontWeight: 900,
              color: 'var(--accent)', opacity: .35, mixBlendMode: 'difference',
              transform: 'translate(3px, 2px)', letterSpacing: '-0.05em',
            }}>4<span>0</span>4</div>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
            这页不存在 — 或者你不该看到它
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-3)', maxWidth: 480, margin: '14px auto 0', lineHeight: 1.7 }}>
            可能的原因：链接失效 / 笔记被设为<b style={{ color: 'var(--ink)' }}>私有</b> / 短链已撤销 / URL 拼错了。
          </p>

          {/* the diag card */}
          <div style={{
            margin: '32px auto 0', maxWidth: 480, padding: 16,
            background: 'var(--bg-soft)', border: '1px solid var(--line)',
            borderRadius: 8, textAlign: 'left',
          }}>
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>
              ▸ 诊断
            </div>
            <div className="hf-col" style={{ gap: 6, fontSize: 12, fontFamily: 'var(--mono)' }}>
              <div style={{ display: 'flex' }}>
                <span style={{ color: 'var(--ok-text)', width: 80 }}>✓ resolved</span>
                <span className="hf-muted">slug = "private-draft"</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ color: 'var(--ok-text)', width: 80 }}>✓ found</span>
                <span className="hf-muted">note id = nt_a3fK29p</span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ color: 'var(--danger-text)', width: 80 }}>✗ blocked</span>
                <span className="hf-muted">visibility = <b style={{ color: 'var(--danger-text)' }}>private</b></span>
              </div>
              <div style={{ display: 'flex' }}>
                <span style={{ color: 'var(--ink-4)', width: 80 }}>· hint</span>
                <span className="hf-muted">需要 owner 设为 public 或 link</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28 }}>
            <button type="button" className="hf-btn hf-btn--primary"><HfIcon name="home" size={13} color="#fff" /> 回首页</button>
            <button type="button" className="hf-btn"><HfIcon name="search" size={13} /> 搜索</button>
            <button type="button" className="hf-btn">联系作者</button>
          </div>

          {/* maybe you wanted */}
          <div style={{ marginTop: 40, textAlign: 'left' }}>
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>
              ▸ 可能你在找
            </div>
            {[
              ['用 MCTS + LLM 给 RTS 做战术决策', '游戏 AI · 12 min'],
              ['行为树为何在多人 RPG 里被嫌弃', '游戏 AI · 8 min'],
            ].map(([t, sub], i) => (
              <div key={i} style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{t}</div>
                <div className="hf-tiny hf-muted" style={{ marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

// ============================================================
// 8. MEDIA LIBRARY — Cloudflare R2 config + 后台预览
// ============================================================
function HFMediaLibrary({ theme = 'light' }) {
  return (
    <HFBrowser url="admin.lumiogames.dev/media" height={820} theme={theme}>
      <AdminShell active="笔记库" breadcrumb="媒体库 · Cloudflare R2" theme={theme}>
        <div style={{ padding: '20px 24px', overflow: 'auto' }}>

          {/* HEADER — connection status */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, #f6821f, #faae40)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 18,
              boxShadow: '0 4px 14px rgba(246, 130, 31, .3)',
              flexShrink: 0,
            }}>R2</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>媒体库</h1>
                <span className="hf-tag" style={{ fontSize: 10, color: '#f6821f', borderColor: '#f6821f' }}>Cloudflare R2</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 4 }}>
                  <span className="hf-dot hf-dot--ok" style={{ animation: 'pulse-dot 2s infinite' }} />
                  <span className="hf-mono hf-tiny" style={{ color: 'var(--ok-text)' }}>已连接</span>
                </span>
              </div>
              <div className="hf-mono hf-tiny hf-muted" style={{ marginTop: 4 }}>
                lumio-blog-media · auto · 上次握手 12s 前
              </div>
            </div>
            <button type="button" className="hf-btn hf-btn--sm">↻ 重新连接</button>
            <button type="button" className="hf-btn hf-btn--sm">📋 cloudflare 控制台 ↗</button>
          </div>

          {/* TOP — config + stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 18 }}>
            {/* R2 credentials */}
            <div className="hf-card" style={{ padding: 16 }}>
              <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '.05em' }}>▸ R2 配置</div>

              {[
                ['Account ID', 'a4f29b8c3d5e7f1a0d6b8e2c4a5f9d3b', false, true],
                ['Bucket Name', 'lumio-blog-media', false],
                ['Access Key ID', 'b8e2c4a5f9d3b1e7c8a4f0d2', false, true],
                ['Secret Access Key', '••••••••••••••••••••••••••••', true],
                ['S3 Endpoint', 'https://<account>.r2.cloudflarestorage.com', false, true],
                ['Public URL (CDN)', 'https://media.lumiogames.dev', false, true, 'ok'],
                ['默认 Region', 'auto', false],
              ].map(([label, val, secret, copy, status], i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                  <label className="hf-tiny" style={{ color: 'var(--ink-3)' }}>{label}</label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', background: 'var(--bg-sunk)',
                    border: '1px solid var(--line)', borderRadius: 5,
                    fontFamily: 'var(--mono)', fontSize: 11,
                  }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: secret ? 'var(--ink-4)' : 'var(--ink-2)' }}>{val}</span>
                    {status === 'ok' && <span className="hf-dot hf-dot--ok" style={{ width: 6, height: 6 }} />}
                    {secret && <button type="button" aria-label="显示/隐藏" style={{ cursor: 'pointer', color: 'var(--ink-3)', fontSize: 11, background: 'transparent', border: 0, padding: '4px 6px', minHeight: 24 }}><span aria-hidden="true">👁</span></button>}
                    {copy && <button type="button" aria-label="复制" style={{ cursor: 'pointer', color: 'var(--ink-3)', background: 'transparent', border: 0, padding: '4px 6px', minHeight: 24 }}><HfIcon name="copy" size={10} /></button>}
                  </div>
                </div>
              ))}

              {/* CORS / public access toggles */}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
                {[
                  ['公开读取', '允许通过 CDN 域名直接访问对象', true],
                  ['CORS · 允许 lumiogames.dev', '前端可直接读取', true],
                  ['图片自动转 webp', '上传时压缩 + 生成 OG 缩略图', true],
                  ['对象生命周期 · 7 天清理 tmp/', '后台自动 GC', false],
                ].map(([n, sub, on], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                    <div style={{ flex: 1 }}>
                      <div className="hf-sm" style={{ fontWeight: 500 }}>{n}</div>
                      <div className="hf-tiny hf-muted" style={{ marginTop: 1 }}>{sub}</div>
                    </div>
                    <button type="button" role="switch" aria-checked={on ? "true" : "false"} aria-label="切换" className={`hf-toggle ${on ? 'on' : ''}`} />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button type="button" className="hf-btn hf-btn--sm hf-btn--primary">保存 + 重新部署</button>
                <button type="button" className="hf-btn hf-btn--sm">连通性测试</button>
                <div className="hf-grow" />
                <span className="hf-mono hf-tiny" style={{ color: 'var(--ok-text)' }}>✓ 上次测试 200 OK · 38ms</span>
              </div>
            </div>

            {/* usage stats */}
            <div className="hf-col" style={{ gap: 14 }}>
              <div className="hf-card" style={{ padding: 14 }}>
                <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '.05em' }}>▸ 用量 (本月)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
                  {[
                    ['1.24 GB', '存储', 'var(--ok)'],
                    ['18.7 GB', '出口流量', 'var(--accent)'],
                    ['142 K', 'A 类操作', 'var(--ink-2)'],
                    ['2.8 M', 'B 类操作', 'var(--ink-2)'],
                  ].map(([v, k, c], i) => (
                    <div key={i}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: c }}>{v}</div>
                      <div className="hf-tiny hf-muted">{k}</div>
                    </div>
                  ))}
                </div>
                {/* progress bar */}
                <div className="hf-tiny hf-muted" style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span>10 GB 免费额度</span>
                  <span style={{ color: 'var(--ok-text)' }}>12.4% 已用</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg-sunk)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '12.4%', background: 'var(--ok)' }} />
                </div>
                <div className="hf-mono hf-tiny" style={{ color: 'var(--ok-text)', marginTop: 6, lineHeight: 1.5 }}>
                  💰 当前账单: <b>$0.00</b> · 免费额度内
                </div>
              </div>

              <div className="hf-card" style={{ padding: 14 }}>
                <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ CDN 命中率 (24h)</div>
                <svg viewBox="0 0 280 70" style={{ width: '100%', height: 60 }}>
                  <path d="M 0 40 L 20 30 L 40 35 L 60 22 L 80 28 L 100 18 L 120 25 L 140 15 L 160 20 L 180 12 L 200 18 L 220 14 L 240 16 L 260 12 L 280 14 L 280 70 L 0 70 Z"
                    fill="var(--accent)" opacity=".15" />
                  <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5"
                    points="0,40 20,30 40,35 60,22 80,28 100,18 120,25 140,15 160,20 180,12 200,18 220,14 240,16 260,12 280,14" />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                  <span>命中率 94.2%</span>
                  <span style={{ color: 'var(--ok-text)' }}>↑ 1.2%</span>
                </div>
              </div>
            </div>
          </div>

          {/* OBJECT BROWSER */}
          <div className="hf-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '10px 14px', background: 'var(--bg-soft)',
              borderBottom: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="hf-mono hf-sm" style={{ fontWeight: 600 }}>📂 对象浏览器</span>
              {/* breadcrumb path */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', background: 'var(--bg)',
                border: '1px solid var(--line)', borderRadius: 4,
                fontFamily: 'var(--mono)', fontSize: 11,
              }}>
                <span style={{ color: 'var(--ink-4)' }}>r2://</span>
                <span style={{ color: 'var(--accent)' }}>lumio-blog-media</span>
                <span style={{ color: 'var(--ink-4)' }}>/</span>
                <span style={{ color: 'var(--ink-2)' }}>posts</span>
                <span style={{ color: 'var(--ink-4)' }}>/</span>
                <span style={{ color: 'var(--ink-2)' }}>2026</span>
                <span style={{ color: 'var(--ink-4)' }}>/</span>
                <span style={{ color: 'var(--ink-4)' }}>04</span>
              </div>
              <span className="hf-mono hf-tiny hf-faint">· 18 / 248 对象</span>
              <div className="hf-grow" />
              <div className="hf-input" style={{ display: 'flex', alignItems: 'center', gap: 6, width: 200, padding: '4px 8px' }}>
                <HfIcon name="search" size={11} color="var(--ink-3)" />
                <span className="hf-faint hf-tiny">前缀搜索…</span>
              </div>
              <button type="button" className="hf-btn hf-btn--sm">视图: 网格 ▾</button>
              <button type="button" className="hf-btn hf-btn--sm hf-btn--primary"><HfIcon name="plus" size={10} color="#fff" /> 上传到 R2</button>
            </div>

            {/* drag drop hint */}
            <div style={{
              margin: 12, padding: '8px 12px', borderRadius: 5,
              background: 'var(--accent-soft)', color: 'var(--accent)',
              fontSize: 11, display: 'flex', alignItems: 'center', gap: 8,
              border: '1px dashed var(--accent)',
            }}>
              <HfIcon name="plus" size={11} color="var(--accent)" />
              拖入或粘贴 → 上传到 <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>r2://lumio-blog-media/posts/2026/04/</code> · 自动转 webp
            </div>

            {/* preview grid */}
            <div style={{ padding: '0 12px', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
              {Array.from({ length: 16 }).map((_, i) => {
                const items = [
                  ['#0066ff', '#a855f7', 'mcts-tree.png', '12'],
                  ['#16a34a', '#0066ff', 'rollout-arch.svg'],
                  ['#ca8a04', '#dc2626', 'unity-loss.png', '!'],
                  ['#a855f7', '#0066ff', 'vulkan-pipe.gif', '1'],
                  ['#0066ff', '#16a34a', 'shader-graph.jpg', '3'],
                  ['#dc2626', '#ca8a04', 'goap-fail.png'],
                  ['#0ea5e9', '#6366f1', 'npr-hair.webp', '2'],
                  ['#10b981', '#84cc16', 'gpu-pipe.png', '5'],
                ];
                const p = items[i % 8];
                const sel = i === 4;
                return (
                  <div key={i} className="hf-hover" style={{
                    aspectRatio: '1', borderRadius: 5, position: 'relative',
                    background: `linear-gradient(135deg, ${p[0]}, ${p[1]})`,
                    overflow: 'hidden', cursor: 'pointer',
                    outline: sel ? '2px solid var(--accent)' : 'none',
                    outlineOffset: 2,
                  }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', opacity: .4,
                      fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700,
                    }}>R2</div>
                    {p[3] && (
                      <span style={{
                        position: 'absolute', top: 4, left: 4,
                        background: p[3] === '!' ? 'rgba(220,38,38,.9)' : 'rgba(0,0,0,.6)',
                        color: '#fff', fontFamily: 'var(--mono)', fontSize: 9,
                        padding: '1px 5px', borderRadius: 3, lineHeight: 1.4,
                      }}>{p[3] === '!' ? '未引用' : `↗ ${p[3]}`}</span>
                    )}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '4px 6px',
                      background: 'linear-gradient(to top, rgba(0,0,0,.8), transparent)',
                      color: '#fff', fontFamily: 'var(--mono)', fontSize: 8,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p[2]}</div>
                    {sel && (
                      <span style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 16, height: 16, borderRadius: '50%',
                        background: 'var(--accent)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700,
                      }}>✓</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* selected detail — preview pane */}
            <div style={{ padding: 12, marginTop: 12, borderTop: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '160px 1fr', gap: 14 }}>
              {/* preview */}
              <div style={{
                aspectRatio: '16/9', borderRadius: 6,
                background: 'linear-gradient(135deg, #0066ff, #16a34a)',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', opacity: .3,
                  fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700,
                }}>preview</div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>shader-graph.jpg</span>
                  <span className="hf-mono hf-tiny hf-muted">1920×1080 · 284 KB · webp</span>
                  <span className="hf-tag" style={{ fontSize: 9, color: 'var(--ok-text)', borderColor: 'var(--ok)' }}>已引用 · 3</span>
                </div>

                {/* URL list */}
                <div className="hf-col" style={{ gap: 4 }}>
                  {[
                    ['CDN URL', 'https://media.lumiogames.dev/posts/2026/04/shader-graph.webp', 'public'],
                    ['R2 Object', 'r2://lumio-blog-media/posts/2026/04/shader-graph.webp', 'r2'],
                    ['S3 URL', 'https://a4f2..r2.cloudflarestorage.com/.../shader-graph.webp', 's3'],
                    ['Markdown', '![shader graph](/posts/2026/04/shader-graph.webp)', 'md'],
                    ['Signed URL · 1h', 'https://media.lumiogames.dev/...?sig=abc&exp=...', 'signed'],
                  ].map(([label, url, kind], i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 28px 28px', gap: 6, alignItems: 'center' }}>
                      <span className="hf-tiny" style={{ color: 'var(--ink-3)' }}>{label}</span>
                      <div style={{
                        padding: '3px 8px', background: 'var(--bg-sunk)',
                        border: '1px solid var(--line)', borderRadius: 4,
                        fontFamily: 'var(--mono)', fontSize: 10,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: kind === 'public' ? 'var(--accent)' : 'var(--ink-2)',
                      }}>{url}</div>
                      <button type="button" aria-label="复制 URL" style={{ cursor: 'pointer', color: 'var(--ink-3)', textAlign: 'center', background: 'transparent', border: 0, padding: '4px 6px', minHeight: 24 }}><HfIcon name="copy" size={10} /></button>
                      <button type="button" aria-label="在新标签页打开" style={{ cursor: 'pointer', color: 'var(--ink-3)', textAlign: 'center', fontSize: 11, background: 'transparent', border: 0, padding: '4px 6px', minHeight: 24 }}><span aria-hidden="true">↗</span></button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button type="button" className="hf-btn hf-btn--sm hf-btn--primary"><HfIcon name="copy" size={10} color="#fff" /> 复制 markdown</button>
                  <button type="button" className="hf-btn hf-btn--sm">替换</button>
                  <button type="button" className="hf-btn hf-btn--sm">生成 OG 图</button>
                  <button type="button" className="hf-btn hf-btn--sm">CDN purge</button>
                  <div className="hf-grow" />
                  <button type="button" className="hf-btn hf-btn--sm" style={{ color: 'var(--danger-text)' }}>从 R2 删除</button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </AdminShell>
    </HFBrowser>
  );
}

// ============================================================
// 10. API TOKENS (admin)
// ============================================================
function HFApiTokens({ theme = 'light' }) {
  return (
    <HFBrowser url="admin.lumiogames.dev/tokens" height={820} theme={theme}>
      <AdminShell active="" breadcrumb="设置 / API tokens" theme={theme}>
        <div style={{ padding: '20px 24px', maxWidth: 980 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🔑 API tokens</h1>
          <p className="hf-sm hf-muted" style={{ marginTop: 4, marginBottom: 24 }}>
            <code style={{ fontFamily: 'var(--mono)', background: 'var(--bg-sunk)', padding: '1px 6px', borderRadius: 3, color: 'var(--accent)', fontSize: 12 }}>fast-note-sync</code> 通过 token 推送笔记到博客。
            令牌只显示一次，建议存到密码管理器。
          </p>

          {/* just-created banner */}
          <div style={{
            padding: 16, marginBottom: 20,
            background: 'var(--ok-soft)', border: '1px solid var(--ok)',
            borderRadius: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="hf-dot hf-dot--ok" />
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ok-text)' }}>新令牌已创建 — 立即复制保存</span>
              <div className="hf-grow" />
              <span className="hf-mono hf-tiny" style={{ color: 'var(--ok-text)' }}>本次后不再显示</span>
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 13,
              padding: '10px 14px', background: 'var(--bg)',
              border: '1px solid var(--line)', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ flex: 1, wordBreak: 'break-all', color: 'var(--ink)' }}>
                lmg_pat_<span style={{ color: 'var(--accent)' }}>9d4f2a8b3c5e7f1a0d6b8e2c4a5f9d3b1e7c8a4f</span>
              </span>
              <button type="button" className="hf-btn hf-btn--sm hf-btn--primary"><HfIcon name="copy" size={11} color="#fff" /> 复制</button>
            </div>
          </div>

          {/* tokens table */}
          <div className="hf-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', background: 'var(--bg-soft)' }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>已激活 · 4 个</span>
              <div className="hf-grow" />
              <button type="button" className="hf-btn hf-btn--sm hf-btn--primary"><HfIcon name="plus" size={11} color="#fff" /> 新建 token</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 110px 120px 100px 70px', alignItems: 'center', padding: '8px 16px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--line)', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              <span></span>
              <span>名称 · 前缀</span>
              <span>权限</span>
              <span>最后使用</span>
              <span>过期</span>
              <span>调用次数</span>
              <span></span>
            </div>
            {[
              { name: 'obsidian-mac', prefix: 'lmg_pat_a4f2…', scope: 'notes:write', last: '2m 前', exp: '永不', calls: '4,128', client: '🍎' },
              { name: 'obsidian-ios', prefix: 'lmg_pat_8b3c…', scope: 'notes:write', last: '2h 前', exp: '90d 后', calls: '892', client: '📱' },
              { name: 'ci-deploy', prefix: 'lmg_pat_5e7f…', scope: 'admin:full', last: '3d 前', exp: '60d 后', calls: '142', client: '⚙️', warn: true },
              { name: 'analytics-readonly', prefix: 'lmg_pat_1a0d…', scope: 'stats:read', last: '14d 前', exp: '已过期', calls: '23', client: '📊', danger: true },
            ].map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 110px 120px 100px 70px', alignItems: 'center', padding: '12px 16px', borderBottom: i < 3 ? '1px solid var(--line)' : 'none', fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>{t.client}</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{t.name}</div>
                  <div className="hf-mono hf-tiny hf-faint">{t.prefix}</div>
                </div>
                <span className="hf-mono hf-tiny" style={{ color: t.scope.includes('admin') ? 'var(--warn)' : 'var(--ink-3)' }}>
                  {t.scope}
                </span>
                <span className="hf-mono hf-tiny hf-muted">{t.last}</span>
                <span className="hf-mono hf-tiny" style={{ color: t.danger ? 'var(--danger)' : t.warn ? 'var(--warn)' : 'var(--ink-3)' }}>{t.exp}</span>
                <span className="hf-mono hf-tiny">{t.calls}</span>
                <span className="hf-mono hf-tiny" style={{ color: 'var(--ink-3)', cursor: 'pointer' }}>撤销 ›</span>
              </div>
            ))}
          </div>

          {/* webhooks bonus */}
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, marginBottom: 10 }}>📡 Webhook</h2>
            <div className="hf-card" style={{ padding: 14 }}>
              <div className="hf-mono hf-tiny hf-muted" style={{ marginBottom: 6 }}>笔记发布时通知 ↓</div>
              <div className="hf-mono" style={{ fontSize: 12, padding: '8px 10px', background: 'var(--bg-sunk)', borderRadius: 4, color: 'var(--ink-2)' }}>
                POST  https://api.lumio.games/webhooks/note-published
              </div>
            </div>
          </div>
        </div>
      </AdminShell>
    </HFBrowser>
  );
}

// ============================================================
// 12. KNOWLEDGE GRAPH (full screen)
// ============================================================
function HFGraph({ theme = 'light', onTheme }) {
  return (
    <HFBrowser url="lumiogames.dev/graph" height={820} theme={theme}>
      <HfNav active="" theme={theme} onTheme={onTheme} />
      <div style={{ height: 'calc(100% - 56px)', display: 'grid', gridTemplateColumns: '1fr 280px' }} className="hf">
        {/* canvas */}
        <div style={{
          position: 'relative',
          background: theme === 'dark'
            ? 'radial-gradient(circle at 50% 50%, #0f0f0f 0%, #000 100%)'
            : 'radial-gradient(circle at 50% 50%, var(--bg-soft) 0%, var(--bg-sunk) 100%)',
          overflow: 'hidden',
        }}>
          {/* grid bg */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            opacity: .25,
          }} />
          {/* graph svg */}
          <svg viewBox="0 0 800 600" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            {/* edges */}
            {[
              [400, 300, 250, 180], [400, 300, 550, 200], [400, 300, 600, 380],
              [400, 300, 280, 380], [400, 300, 430, 460], [400, 300, 200, 320],
              [250, 180, 180, 100], [250, 180, 380, 110],
              [550, 200, 680, 130], [550, 200, 700, 270],
              [600, 380, 720, 460], [600, 380, 540, 500],
              [280, 380, 200, 480], [280, 380, 350, 520],
            ].map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="var(--line-strong)" strokeWidth="1" opacity={.6} />
            ))}
            {/* highlighted edges (selected node) */}
            {[
              [400, 300, 550, 200], [400, 300, 250, 180], [400, 300, 280, 380],
            ].map(([x1, y1, x2, y2], i) => (
              <line key={'h'+i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="var(--accent)" strokeWidth="2" />
            ))}
            {/* nodes */}
            {[
              { x: 400, y: 300, r: 18, label: 'MCTS+LLM-RTS', cluster: 'a', focused: true },
              { x: 250, y: 180, r: 12, label: 'GOAP 复盘', cluster: 'a' },
              { x: 550, y: 200, r: 14, label: 'AlphaZero MCTS', cluster: 'a' },
              { x: 600, y: 380, r: 11, label: '行为树嫌弃', cluster: 'a' },
              { x: 280, y: 380, r: 10, label: 'TIL PUCT', cluster: 'a' },
              { x: 430, y: 460, r: 9, label: 'paper draft', cluster: 'a' },
              { x: 200, y: 320, r: 8, label: 'reward shaping', cluster: 'a' },
              { x: 180, y: 100, r: 9, label: 'Vulkan (1)', cluster: 'b' },
              { x: 380, y: 110, r: 11, label: 'Vulkan (2)', cluster: 'b' },
              { x: 680, y: 130, r: 13, label: 'GPU-Driven (3)', cluster: 'b' },
              { x: 700, y: 270, r: 8, label: 'shader 变体', cluster: 'b' },
              { x: 720, y: 460, r: 8, label: 'NPR 头发', cluster: 'b' },
              { x: 540, y: 500, r: 9, label: 'filament 源码', cluster: 'b' },
              { x: 200, y: 480, r: 7, label: 'daily 04-25', cluster: 'c' },
              { x: 350, y: 520, r: 6, label: 'daily 04-22', cluster: 'c' },
            ].map((n, i) => {
              const colors = { a: 'var(--accent)', b: '#a855f7', c: 'var(--ok)' };
              return (
                <g key={i}>
                  <circle cx={n.x} cy={n.y} r={n.r} fill={colors[n.cluster]}
                    opacity={n.focused ? 1 : .85}
                    stroke={n.focused ? 'var(--accent)' : 'transparent'}
                    strokeWidth={n.focused ? 4 : 0} strokeOpacity={.3} />
                  {n.focused && <circle cx={n.x} cy={n.y} r={n.r + 8} fill="none" stroke="var(--accent)" strokeWidth="1" opacity={.5} />}
                  <text x={n.x} y={n.y + n.r + 12} textAnchor="middle"
                    fontSize={n.focused ? 12 : 10}
                    fontWeight={n.focused ? 600 : 400}
                    fill={n.focused ? 'var(--ink)' : 'var(--ink-3)'}
                    fontFamily="var(--mono)">{n.label}</text>
                </g>
              );
            })}
          </svg>

          {/* zoom controls */}
          <div style={{
            position: 'absolute', bottom: 16, left: 16,
            display: 'flex', flexDirection: 'column', gap: 4,
            padding: 4, background: 'var(--bg)', border: '1px solid var(--line)',
            borderRadius: 6, boxShadow: 'var(--shadow-2)',
          }}>
            <button type="button" className="hf-btn hf-btn--icon" style={{ width: 28, height: 28, border: 'none' }}>+</button>
            <button type="button" className="hf-btn hf-btn--icon" style={{ width: 28, height: 28, border: 'none' }}>−</button>
            <button type="button" className="hf-btn hf-btn--icon" style={{ width: 28, height: 28, border: 'none', fontSize: 11 }}>⌖</button>
          </div>

          {/* legend */}
          <div style={{
            position: 'absolute', top: 16, left: 16,
            padding: '10px 14px', background: 'var(--bg)',
            border: '1px solid var(--line)', borderRadius: 8,
            boxShadow: 'var(--shadow-2)', minWidth: 200,
          }}>
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '.05em' }}>▸ 集群</div>
            <div className="hf-col" style={{ gap: 4 }}>
              {[['var(--accent)', '游戏 AI', 7], ['#a855f7', '渲染', 6], ['var(--ok)', '日常笔记', 2]].map(([c, n, ct], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                  <span style={{ flex: 1 }}>{n}</span>
                  <span className="hf-mono hf-tiny hf-faint">{ct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* sidebar — selected node info */}
        <aside style={{ borderLeft: '1px solid var(--line)', overflow: 'auto', padding: 18 }}>
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 已选中</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)' }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>MCTS + LLM RTS</h2>
          </div>
          <div className="hf-mono hf-tiny hf-muted" style={{ marginBottom: 10 }}>
            文章 · 12 min · 2026-04-28
          </div>
          <p className="hf-sm" style={{ color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 0 }}>
            把 MCTS 的展开阶段交给 LLM，听起来像偷懒——但延迟和成本都不可接受...
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <button type="button" className="hf-btn hf-btn--sm hf-btn--primary" style={{ flex: 1, justifyContent: 'center' }}>打开</button>
            <button type="button" className="hf-btn hf-btn--sm" style={{ flex: 1, justifyContent: 'center' }}>↗ focus</button>
          </div>

          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '20px 0 8px', letterSpacing: '.05em' }}>▸ 直接关联 · 5</div>
          {[
            ['→', 'GOAP 复盘', 'mentions'],
            ['→', 'AlphaZero MCTS', 'mentions'],
            ['←', '行为树嫌弃', 'backlink'],
            ['←', 'TIL PUCT', 'backlink'],
            ['←', 'paper draft', 'backlink'],
          ].map(([dir, n, kind], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: i ? '1px solid var(--line)' : 'none', fontSize: 12 }}>
              <span className="hf-mono" style={{ color: dir === '→' ? 'var(--accent)' : 'var(--ink-4)' }}>{dir}</span>
              <span style={{ flex: 1 }}>{n}</span>
              <span className="hf-mono hf-tiny hf-faint">{kind}</span>
            </div>
          ))}

          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '20px 0 8px', letterSpacing: '.05em' }}>▸ 显示设置</div>
          <div className="hf-col" style={{ gap: 8 }}>
            {[['只显示已发布', true], ['显示标签节点', false], ['显示孤立笔记', false]].map(([l, on], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', fontSize: 12 }}>
                <span style={{ flex: 1 }}>{l}</span>
                <button type="button" role="switch" aria-checked={on ? "true" : "false"} aria-label="切换" className={`hf-toggle ${on ? 'on' : ''}`} />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </HFBrowser>
  );
}

Object.assign(window, { HFArticleComments, HFNewsletter, HFSearchResults, HFTagDetail, HFNotFound, HFMediaLibrary, HFApiTokens, HFGraph });
