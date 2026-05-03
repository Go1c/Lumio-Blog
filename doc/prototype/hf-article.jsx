/* global React, HFBrowser, HfIcon, HfNav, HfAd */

const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

// ============================================================
// FRONTEND ARTICLE — hi-fi (with Feishu-style highlights + comments)
// ============================================================

const ARTICLE_COMMENTS = [
  {
    mid: 'm1',
    quote: '把 LLM rollout 阶段交给 LLM',
    author: '@chen-rendering', avatar: 'C', color: '#0066ff',
    time: '2h',
    body: '我之前也试过，<b>不如把 LLM 限制在 root 层做 prior</b>，性价比高得多。',
    replies: 2,
  },
  {
    mid: 'm2',
    quote: 'MCTS 一秒展开几千次',
    author: '@arcadia-dev', avatar: 'A', color: '#a855f7',
    time: '4h',
    body: '不一定吧，turn-based 场景一秒几十次就够了。',
    replies: 1,
  },
  {
    mid: 'm3',
    quote: '$0.04 per decision',
    author: '@yume_99', avatar: 'Y', color: '#16a34a',
    time: '1d',
    body: '这成本怎么算的？是 GPT-4 的价吗？换 Haiku 应该会便宜 10×。',
    replies: 3,
    pinned: true,
  },
  {
    mid: 'm4',
    quote: '延迟和吞吐量是 RTS AI 的两个硬约束',
    author: '@LumioGames', avatar: 'L', color: 'var(--accent)',
    time: '3h',
    body: '@chen-rendering 同意——下一篇就写 root prior 那个变体。',
    replies: 0,
    isAuthor: true,
  },
];

function HFArticle({ theme = 'light', onTheme }) {
  const [progress, setProgress] = useStateA(35);
  const [active, setActive] = useStateA('m3'); // active highlight + corresponding comment card
  const bodyRef = useRefA(null);

  useEffectA(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onScroll = () => {
      const h = el.scrollHeight - el.clientHeight;
      if (h > 0) setProgress(Math.min(100, Math.max(0, (el.scrollTop / h) * 100)));
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const Mark = ({ mid, children }) => {
    const c = ARTICLE_COMMENTS.find(x => x.mid === mid);
    return (
      <span
        className={`hf-mark ${active === mid ? 'active' : ''}`}
        data-count={c ? (1 + (c.replies || 0)) : ''}
        onMouseEnter={() => setActive(mid)}
      >{children}</span>
    );
  };

  return (
    <HFBrowser url="lumiogames.dev/posts/mcts-llm-rts" height={820} theme={theme}>
      <a href="#main-content" className="skip-link">跳到正文</a>
      <HfNav active="文章" theme={theme} onTheme={onTheme} />
      {/* progress bar */}
      <div role="progressbar" aria-label="阅读进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} style={{ position: 'sticky', top: 56, zIndex: 9, height: 2, background: 'transparent' }}>
        <div style={{ height: 2, width: `${progress}%`, background: 'var(--accent)', transition: 'width .15s' }} aria-hidden="true" />
      </div>

      <div ref={bodyRef} style={{ overflow: 'auto', height: 'calc(100% - 56px)' }} className="hf">
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 280px', maxWidth: 1240, margin: '0 auto', padding: '32px 24px', gap: 20 }}>
          {/* LEFT — series + outline */}
          <aside>
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 游戏 AI 系列</div>
            <div className="hf-col" style={{ gap: 2, fontSize: 13, marginBottom: 24 }}>
              {[
                ['行为树之外的选项', false],
                ['GOAP 复盘', false],
                ['MCTS + LLM 实验', true],
                ['LLM Agents @RTS (草)', false],
              ].map(([n, a], i) => (
                <div key={i} style={{
                  padding: '5px 10px', borderRadius: 4,
                  borderLeft: a ? '2px solid var(--accent)' : '2px solid transparent',
                  background: a ? 'var(--accent-soft)' : 'transparent',
                  color: a ? 'var(--accent)' : 'var(--ink-2)',
                  fontWeight: a ? 600 : 400,
                }}>{n}</div>
              ))}
            </div>

            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 大纲</div>
            <div className="hf-col" style={{ gap: 2, fontSize: 12, marginBottom: 24 }}>
              {[
                ['1. 想法的起点', false],
                ['2. 实现：rollout', true],
                ['3. 性能 measurements', false],
                ['4. 公式上的复盘', false],
                ['5. 还有救吗', false],
              ].map(([n, a], i) => (
                <div key={i} style={{
                  padding: '4px 10px',
                  borderLeft: a ? '2px solid var(--accent)' : '2px solid var(--line)',
                  color: a ? 'var(--accent)' : 'var(--ink-3)',
                  fontWeight: a ? 600 : 400,
                }}>{n}</div>
              ))}
            </div>

            {/* floating action rail */}
            <div role="toolbar" aria-label="文章操作" style={{ display: 'flex', gap: 6, padding: 8, background: 'var(--bg-soft)', borderRadius: 8, border: '1px solid var(--line)' }}>
              <button type="button" className="hf-btn hf-btn--icon" aria-label="收藏"><HfIcon name="star" size={13} /></button>
              <button type="button" className="hf-btn hf-btn--icon" aria-label="复制链接"><HfIcon name="link" size={13} /></button>
              <button type="button" className="hf-btn hf-btn--icon" aria-label="复制内容"><HfIcon name="copy" size={13} /></button>
              <button type="button" className="hf-btn hf-btn--icon" aria-label="更多操作" aria-haspopup="menu"><HfIcon name="dots" size={13} /></button>
            </div>
          </aside>

          {/* MIDDLE article */}
          <main id="main-content" style={{ padding: '0 8px', minWidth: 0, position: 'relative' }}>
            <article>
            <ul style={{ display: 'flex', gap: 6, marginBottom: 12, listStyle: 'none', padding: 0 }} aria-label="标签">
              <li><a href="/tag/%E6%B8%B8%E6%88%8F%20AI" className="hf-tag hf-tag--accent" style={{ textDecoration: 'none' }}>#游戏 AI</a></li>
              <li><a href="/tag/MCTS" className="hf-tag" style={{ textDecoration: 'none' }}>#MCTS</a></li>
              <li><a href="/tag/LLM" className="hf-tag" style={{ textDecoration: 'none' }}>#LLM</a></li>
            </ul>
            <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, margin: 0, letterSpacing: '-0.01em' }}>
              用 MCTS + LLM 给 RTS 做战术决策
            </h1>
            <div style={{ fontSize: 18, color: 'var(--ink-3)', marginTop: 8, fontWeight: 400 }}>
              一次失败的尝试，以及它教会我的事
            </div>
            <div className="hf-mono hf-tiny" style={{ marginTop: 14, display: 'flex', gap: 12, color: 'var(--ink-4)' }}>
              <time dateTime="2026-04-28">2026-04-28</time>
              <span aria-hidden="true">·</span>
              <span aria-label="阅读时长 12 分钟">12 min read</span>
              <span aria-hidden="true">·</span>
              <span aria-label="1,243 次阅读">1,243 views</span>
              <span aria-hidden="true">·</span>
              <a href="#comments" style={{ color: 'inherit' }} aria-label="跳转到评论区,共 4 条"><span aria-hidden="true">💬 </span>4 评论</a>
            </div>

            <hr className="hf-divider" style={{ margin: '20px 0' }} />

            <div className="hf-prose">
              <div className="hf-callout">
                <span style={{ fontSize: 18 }}>💡</span>
                <div>
                  <b>TL;DR</b> — <Mark mid="m1">把 MCTS rollout 阶段交给 LLM</Mark>，能跑通，但延迟无法接受 (250ms+)。最终回退到了 NN evaluator + 经典 MCTS。
                </div>
              </div>

              <p>
                MCTS 的 rollout 阶段本质上是一个<b>状态评估</b>问题。
                经典做法是 random rollout 直到终局，或者用一个浅层的 <code>policy network</code> 来预测胜负。
              </p>

              <h2 id="motivation">1. 想法的起点</h2>
              <p>
                RTS 的 unit-level 决策本来就不擅长 long-horizon 推理。
                如果让 LLM 来"看一眼"当前局势，给出语义层面的评估，会不会比 NN 更准？
              </p>

              <h2 id="impl">2. 实现：rollout 调 LLM</h2>
              <div className="hf-codewrap">
                <div className="hf-codewrap-bar">
                  <HfIcon name="doc" size={11} />
                  <span>mcts/rollout.py</span>
                  <button className="hf-copybtn"><HfIcon name="copy" size={10} /> copy</button>
                </div>
                <pre className="hf-code"><code>
                  <span className="c-com"># 把 LLM 接入 MCTS 的 rollout 阶段</span>{'\n'}
                  <span className="c-key">def</span> <span className="c-fn">rollout</span>(state: <span className="c-cls">GameState</span>) {'->'} <span className="c-cls">float</span>:{'\n'}
                  {'    '}prompt = <span className="c-fn">build_prompt</span>(state){'\n'}
                  {'    '}response = llm.<span className="c-fn">eval</span>(prompt)  <span className="c-com"># ← 这里 250ms</span>{'\n'}
                  {'    '}<span className="c-key">return</span> <span className="c-fn">parse_value</span>(response){'\n'}
                </code></pre>
              </div>

              {/* paragraph with floating selection bubble */}
              <p style={{ position: 'relative' }}>
                每次 expand 都得调一次 LLM——<Mark mid="m2">MCTS 一秒展开几千次</Mark>，这显然走不通。
                {/* floating selection bubble — visual demo */}
                <span className="hf-selbubble" style={{ left: 60, top: -42 }}>
                  <button><HfIcon name="copy" size={11} color="#fff" /> 复制</button>
                  <span className="sep" />
                  <button>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: '#fde68a', display: 'inline-block' }} />
                    高亮
                  </button>
                  <span className="sep" />
                  <button style={{ color: '#93c5fd' }}>💬 评论</button>
                </span>
              </p>

              <h2 id="perf">3. 性能 measurements</h2>
              <p>把决策窗口从 100ms 放宽到 1s 都救不回来：</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, margin: '14px 0' }}>
                {[
                  ['250ms', 'avg LLM latency', 'var(--danger)'],
                  ['~12', 'rollouts / sec', 'var(--warn)'],
                  ['$0.04', 'per decision', 'var(--ink-3)', 'm3'],
                ].map(([v, k, c, mid], i) => (
                  <div key={i} style={{
                    padding: 14, border: `1px solid ${mid === active ? 'var(--accent)' : 'var(--line)'}`,
                    borderRadius: 8, background: 'var(--bg-soft)', position: 'relative',
                  }}>
                    {mid ? (
                      <Mark mid={mid}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: c }}>{v}</span>
                      </Mark>
                    ) : (
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                    )}
                    <div className="hf-tiny hf-muted" style={{ marginTop: 2 }}>{k}</div>
                  </div>
                ))}
              </div>

              <h2 id="math">4. 公式上的复盘</h2>
              <p>UCB1 选择策略:</p>
              <div style={{
                background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 6,
                padding: '16px 20px', margin: '12px 0', textAlign: 'center', fontFamily: 'Cambria, Georgia, serif',
                fontSize: 18, fontStyle: 'italic',
              }}>
                UCB(s, a) = Q(s, a) + c · √( ln N(s) / N(s, a) )
                <div className="hf-tiny hf-muted" style={{ fontFamily: 'var(--sans)', marginTop: 6, fontStyle: 'normal' }}>↑ KaTeX · 渲染占位</div>
              </div>

              <blockquote>
                <Mark mid="m4">延迟和吞吐量是 RTS AI 的两个硬约束</Mark>——只要 LLM 还没快到几毫秒级，rollout 这条路基本走不通。
              </blockquote>

              <h2 id="next">5. 还有救吗</h2>
              <p>有几个方向值得试: <code>distill</code> 一个小 model 来当 evaluator、用 LLM 只在 root 给 prior、或彻底换成 MuZero 风格的 learned model。</p>
            </div>

            {/* end card */}
            <hr className="hf-divider" style={{ margin: '32px 0 16px' }} />
            <aside aria-label="订阅作者" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 16, background: 'var(--bg-soft)', borderRadius: 10 }}>
              <div aria-hidden="true" style={{
                width: 50, height: 50, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18,
              }}>L</div>
              <div className="hf-grow">
                <div style={{ fontWeight: 700 }}>LumioGames</div>
                <div className="hf-sm hf-muted">订阅以收到下一篇游戏 AI 笔记</div>
              </div>
              <button type="button" className="hf-btn hf-btn--primary">订阅</button>
            </aside>
            </article>
          </main>

          {/* RIGHT — comments rail */}
          <aside id="comments" aria-label="评论">
            <div style={{ position: 'sticky', top: 80 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}><span aria-hidden="true">💬 </span>评论</h2>
                <span className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)' }} aria-label={`共 ${ARTICLE_COMMENTS.length} 条`}>{ARTICLE_COMMENTS.length}</span>
                <div className="hf-grow" />
                <div role="group" aria-label="评论筛选" style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="hf-tag" aria-pressed="true" style={{ fontSize: 11 }}>全部</button>
                  <button type="button" className="hf-tag" aria-pressed="false" style={{ fontSize: 11 }}>未读 · 2</button>
                </div>
              </div>

              {/* legend hint */}
              <div className="hf-tiny hf-muted" style={{
                padding: '6px 10px', background: 'var(--bg-soft)', borderRadius: 6,
                marginBottom: 12, lineHeight: 1.5, border: '1px dashed var(--line-strong)',
              }}>
                💡 选中文本可<b style={{ color: 'var(--ink)' }}>划线评论</b>——点击高亮跳转到对应评论
              </div>

              {/* comment cards */}
              <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {ARTICLE_COMMENTS.map(c => (
                <li
                  key={c.mid}
                  className={`hf-comment-card ${active === c.mid ? 'active' : ''}`}
                  onMouseEnter={() => setActive(c.mid)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span className="hf-avatar" aria-hidden="true" style={{ background: c.color }}>{c.avatar}</span>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{c.author}</span>
                    {c.isAuthor && <span className="hf-tag hf-tag--accent" style={{ fontSize: 11, padding: '0 6px' }}>作者</span>}
                    {c.pinned && <span className="hf-tag hf-tag--warn" style={{ fontSize: 11, padding: '0 6px' }}><span aria-hidden="true">📌 </span>置顶</span>}
                    <div className="hf-grow" />
                    <time className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)' }} dateTime={c.time}>{c.time}</time>
                  </div>
                  <div className="hf-comment-quote">"{c.quote}"</div>
                  <div style={{ lineHeight: 1.6, color: 'var(--ink-2)' }}
                    dangerouslySetInnerHTML={{ __html: c.body }} />
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 11 }}>
                    <button type="button" className="hf-mono" aria-label={`回复 ${c.author}${c.replies > 0 ? `,已有 ${c.replies} 条回复` : ''}`} style={{ background: 'transparent', border: 0, padding: '4px 6px', color: 'var(--ink-3)', cursor: 'pointer', font: 'inherit', minHeight: 24 }}>
                      <span aria-hidden="true">↩</span> 回复 {c.replies > 0 && <span aria-hidden="true">({c.replies})</span>}
                    </button>
                    <button type="button" aria-label="点赞" style={{ background: 'transparent', border: 0, padding: '4px 6px', color: 'var(--ink-3)', cursor: 'pointer', font: 'inherit', minHeight: 24 }}>
                      <span aria-hidden="true">👍</span>
                    </button>
                    <div className="hf-grow" />
                    <button type="button" aria-label="更多操作" aria-haspopup="menu" style={{ background: 'transparent', border: 0, padding: '4px 6px', color: 'var(--ink-3)', cursor: 'pointer', font: 'inherit', minHeight: 24 }}>
                      <span aria-hidden="true">···</span>
                    </button>
                  </div>
                </li>
              ))}
              </ol>

              {/* compose stub */}
              <form aria-label="发表评论" style={{
                padding: 10, background: 'var(--bg-soft)', borderRadius: 8,
                border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, color: 'var(--ink-3)', marginTop: 4,
              }} onSubmit={(e) => e.preventDefault()}>
                <span className="hf-avatar" aria-hidden="true" style={{ background: 'var(--ink-3)', width: 20, height: 20, fontSize: 10 }}>?</span>
                <label htmlFor="compose-input" className="sr-only">写下你的评论</label>
                <input id="compose-input" type="text" placeholder="选段评论 · 或全文评论…" style={{ flex: 1, border: 0, background: 'transparent', font: 'inherit', color: 'inherit', padding: 6, minHeight: 24 }} />
              </form>
            </div>
          </aside>
        </div>
      </div>
    </HFBrowser>
  );
}

Object.assign(window, { HFArticle });
