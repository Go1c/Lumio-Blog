/* global React, IOSDevice, HfIcon */

const { useState: useStateM, useRef: useRefM, useEffect: useEffectM } = React;

// =========================================================
// Mobile shell — top bar + content scroller
// =========================================================
function MobileShell({ title, children, sub, theme = 'light', tabs = true, fab = false }) {
  return (
    <div data-theme={theme} className="hf" style={{
      width: '100%', height: '100%',
      background: 'var(--bg)',
      color: 'var(--ink)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--sans)',
    }}>
      {/* status bar spacer */}
      <div style={{ height: 44, flexShrink: 0 }} />
      {/* nav */}
      <div style={{
        padding: '6px 16px 10px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'var(--ink)', color: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
        }}>L</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{title}</div>
          {sub && <div className="hf-mono hf-tiny hf-faint" style={{ marginTop: 1 }}>{sub}</div>}
        </div>
        <span className="hf-btn hf-btn--icon" style={{ width: 28, height: 28 }}><HfIcon name="search" size={13} /></span>
        <span className="hf-btn hf-btn--icon" style={{ width: 28, height: 28 }}><HfIcon name="dots" size={13} /></span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {children}
      </div>

      {tabs && (
        <div style={{
          flexShrink: 0,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid var(--line)',
          background: 'var(--bg)',
          padding: '6px 4px 22px',
        }}>
          {[['home','首页',true],['doc','文章',false],['note','笔记',false],['tag','标签',false]].map(([ic, l, a], i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '6px 0', color: a ? 'var(--accent)' : 'var(--ink-3)',
            }}>
              <HfIcon name={ic} size={18} />
              <span className="hf-tiny" style={{ fontWeight: a ? 600 : 400 }}>{l}</span>
            </div>
          ))}
        </div>
      )}

      {fab && (
        <div style={{
          position: 'absolute', right: 16, bottom: 88,
          width: 52, height: 52, borderRadius: 26,
          background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 22px rgba(0,102,255,.35)',
        }}>
          <HfIcon name="plus" size={20} color="#fff" strokeWidth={2.2} />
        </div>
      )}
    </div>
  );
}

// =========================================================
// Mobile HOME
// =========================================================
function HFHomeMobile({ theme = 'light' }) {
  return (
    <IOSDevice dark={theme === 'dark'} width={402} height={874}>
      <MobileShell title="LumioGames" sub="blog · v1.2" theme={theme}>
        {/* hero */}
        <div style={{ padding: '20px 16px', position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--line)' }}>
          <div className="hf-blob" style={{ width: 220, height: 220, background: 'var(--accent)', top: -60, right: -40 }} />
          <div style={{ position: 'relative' }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.15, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              在<span style={{ color: 'var(--accent)' }}>游戏 AI</span>、<br />
              渲染管线和<br />
              引擎源码之间
            </h1>
            <div className="hf-sm hf-muted" style={{ lineHeight: 1.55 }}>
              Obsidian 写、<span className="hf-mono" style={{ fontSize: 12, color: 'var(--accent)' }}>fast-note-sync</span> 同步。
            </div>
          </div>
        </div>

        {/* category chips */}
        <div style={{
          display: 'flex', gap: 6, padding: '12px 16px',
          overflowX: 'auto', borderBottom: '1px solid var(--line)',
        }}>
          {['全部 38','游戏 AI 24','渲染 21','引擎 13','笔记 142'].map((t, i) => (
            <span key={i} className={`hf-tag ${i === 0 ? 'hf-tag--solid' : ''}`} style={{ flexShrink: 0, fontSize: 12 }}>{t}</span>
          ))}
        </div>

        {/* feed */}
        <div style={{ padding: '8px 16px' }}>
          {[
            ['用 MCTS + LLM 给 RTS 做战术决策', ['游戏 AI','MCTS'], '04-28', '12 min', true],
            ['行为树为何在多人 RPG 里被嫌弃', ['行为树'], '04-26', '8 min', false],
            ['ML-Agents 训 NPC: reward shaping', ['ML-Agents'], '04-22', '14 min', false],
            ['Vulkan GPU-Driven Pipeline (3)', ['Vulkan','渲染'], '04-17', '18 min', false],
          ].map(([title, ts, date, mins, pin], i) => (
            <article key={i} style={{
              padding: '14px 0',
              borderBottom: '1px solid var(--line)',
            }}>
              {pin && (
                <div style={{ marginBottom: 6 }}>
                  <span className="hf-tag hf-tag--accent" style={{ fontSize: 10 }}>
                    <HfIcon name="pin" size={9} /> 置顶
                  </span>
                </div>
              )}
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{title}</h3>
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {ts.map(t => <span key={t} className="hf-tag" style={{ fontSize: 10 }}>#{t}</span>)}
              </div>
              <div className="hf-mono hf-tiny hf-faint" style={{ marginTop: 6 }}>
                {date} · {mins}
              </div>
            </article>
          ))}
        </div>

        {/* recent notes */}
        <div style={{ padding: '8px 16px 24px' }}>
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '12px 0 8px', letterSpacing: '.05em' }}>
            ▸ 最近笔记
          </div>
          {[
            ['TIL — ScriptableRenderContext 延迟提交', 'public', '2h'],
            ['ECS lockstep 同步那个坑', 'link', '5h'],
            ['Vulkan timeline semaphore 笔记', 'public', '1d'],
          ].map(([n, v, t], i) => (
            <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span className={`hf-vis hf-vis--${v}`} style={{ fontSize: 9 }}>
                  {v === 'public' ? '公开' : v === 'link' ? '仅链接' : '私有'}
                </span>
                <span className="hf-mono hf-tiny hf-faint">· {t}</span>
              </div>
              <div className="hf-sm" style={{ fontWeight: 500 }}>{n}</div>
            </div>
          ))}
        </div>
      </MobileShell>
    </IOSDevice>
  );
}

// =========================================================
// Mobile ARTICLE
// =========================================================
function HFArticleMobile({ theme = 'light' }) {
  const ref = useRefM(null);
  const [progress, setProgress] = useStateM(28);
  useEffectM(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const h = el.scrollHeight - el.clientHeight;
      if (h > 0) setProgress(Math.min(100, (el.scrollTop / h) * 100));
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <IOSDevice dark={theme === 'dark'} width={402} height={874}>
      <MobileShell title="MCTS + LLM" sub="game-ai · 12 min" theme={theme} tabs={false}>
        {/* progress */}
        <div style={{ position: 'sticky', top: 0, height: 2, background: 'transparent', zIndex: 5 }}>
          <div style={{ height: 2, width: `${progress}%`, background: 'var(--accent)', transition: 'width .15s' }} />
        </div>

        <div ref={ref} style={{ height: '100%', overflow: 'auto', padding: '16px 18px 80px' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            <span className="hf-tag hf-tag--accent" style={{ fontSize: 10 }}>#游戏 AI</span>
            <span className="hf-tag" style={{ fontSize: 10 }}>#MCTS</span>
            <span className="hf-tag" style={{ fontSize: 10 }}>#LLM</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, margin: 0, letterSpacing: '-0.01em' }}>
            用 MCTS + LLM 给 RTS 做战术决策
          </h1>
          <div style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 6 }}>
            一次失败的尝试，以及它教会我的事
          </div>
          <div className="hf-mono hf-tiny hf-faint" style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <span>2026-04-28</span><span>·</span><span>1.2k views</span>
          </div>

          <hr className="hf-divider" style={{ margin: '16px 0' }} />

          <div className="hf-prose" style={{ fontSize: 14, lineHeight: 1.7 }}>
            <div className="hf-callout" style={{ fontSize: 13 }}>
              <span>💡</span>
              <div><b>TL;DR</b> — 把 rollout 交给 LLM，能跑，但延迟 250ms+ 不可接受。</div>
            </div>

            <h2 style={{ fontSize: 18 }}>1. 想法的起点</h2>
            <p>RTS 的 unit-level 决策不擅长 long-horizon 推理。如果让 LLM "看一眼"局势，会不会比 NN 更准？</p>

            <h2 style={{ fontSize: 18 }}>2. 实现</h2>
            <div className="hf-codewrap">
              <div className="hf-codewrap-bar" style={{ fontSize: 10 }}>
                <HfIcon name="doc" size={10} />
                <span>rollout.py</span>
                <button className="hf-copybtn" style={{ fontSize: 10 }}>copy</button>
              </div>
              <pre className="hf-code" style={{ fontSize: 11, padding: '10px 12px' }}><code>
                <span className="c-com"># MCTS rollout 接 LLM</span>{'\n'}
                <span className="c-key">def</span> <span className="c-fn">rollout</span>(state):{'\n'}
                {'  '}p = <span className="c-fn">build_prompt</span>(state){'\n'}
                {'  '}r = llm.<span className="c-fn">eval</span>(p)  <span className="c-com"># 250ms</span>{'\n'}
                {'  '}<span className="c-key">return</span> <span className="c-fn">parse</span>(r)
              </code></pre>
            </div>

            <p>每次 expand 都得调一次 LLM——MCTS 一秒展开几千次，走不通。</p>

            <h2 style={{ fontSize: 18 }}>3. 性能</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '10px 0' }}>
              {[
                ['250ms', 'avg latency', 'var(--danger)'],
                ['~12', 'rollouts/s', 'var(--warn)'],
                ['$0.04', 'per decision', 'var(--ink-3)'],
                ['100ms', '决策窗口', 'var(--accent)'],
              ].map(([v, k, c], i) => (
                <div key={i} style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 6, background: 'var(--bg-soft)' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
                  <div className="hf-tiny hf-muted" style={{ marginTop: 1 }}>{k}</div>
                </div>
              ))}
            </div>

            <blockquote style={{ fontSize: 13 }}>
              延迟和吞吐量是 RTS AI 的两个硬约束。
            </blockquote>
          </div>
        </div>

        {/* floating action bar */}
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 4, padding: 6,
          background: 'var(--bg)', border: '1px solid var(--line)',
          borderRadius: 999, boxShadow: 'var(--shadow-3)',
        }}>
          <span className="hf-btn hf-btn--icon" style={{ width: 36, height: 36, border: 'none' }}><HfIcon name="star" size={15} /></span>
          <span className="hf-btn hf-btn--icon" style={{ width: 36, height: 36, border: 'none' }}><HfIcon name="link" size={15} /></span>
          <span className="hf-btn hf-btn--icon" style={{ width: 36, height: 36, border: 'none' }}><HfIcon name="copy" size={15} /></span>
          <span className="hf-btn hf-btn--icon" style={{ width: 36, height: 36, border: 'none', color: 'var(--accent)' }}><HfIcon name="arrowR" size={15} color="var(--accent)" /></span>
        </div>
      </MobileShell>
    </IOSDevice>
  );
}

// =========================================================
// Mobile ADMIN — note detail (focus on 3 controls)
// =========================================================
function HFAdminMobile({ theme = 'light' }) {
  const [vis, setVis] = useStateM('public');
  return (
    <IOSDevice dark={theme === 'dark'} width={402} height={874}>
      <MobileShell title="MCTS-LLM-RTS.md" sub="admin · 编辑可见性" theme={theme} tabs={false} fab={false}>
        <div style={{ padding: '16px 16px 32px' }}>
          <div className="hf-mono hf-tiny hf-muted" style={{ marginBottom: 6 }}>
            游戏 AI / MCTS-LLM-RTS.md
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.35 }}>
            用 MCTS + LLM 给 RTS 做战术决策
          </h1>
          <div className="hf-mono hf-tiny hf-faint" style={{ marginTop: 6 }}>
            修改 2m 前 · 2,431 字 · 1.2k views
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
            <span className="hf-tag hf-tag--accent" style={{ fontSize: 10 }}>#游戏 AI</span>
            <span className="hf-tag" style={{ fontSize: 10 }}>#MCTS</span>
            <span className="hf-tag" style={{ fontSize: 10 }}>#LLM</span>
          </div>

          {/* visibility */}
          <div className="hf-card" style={{ padding: 14, marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <HfIcon name="eye" size={14} color="var(--ok)" />
              <span style={{ fontWeight: 600, fontSize: 13 }}>可见性</span>
            </div>
            {[
              ['public', '公开', '任何人可访问 URL'],
              ['link', '仅链接', '需要短链'],
              ['private', '私有', '只在后台可见'],
            ].map(([v, l, sub]) => {
              const on = vis === v;
              return (
                <label key={v} onClick={() => setVis(v)} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: 10, borderRadius: 8, marginBottom: 4,
                  background: on ? 'var(--accent-soft)' : 'transparent',
                }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: `1.5px solid ${on ? 'var(--accent)' : 'var(--line-strong)'}`,
                    background: 'var(--bg)', position: 'relative', flexShrink: 0, marginTop: 1,
                  }}>
                    {on && <span style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: 'var(--accent)' }} />}
                  </span>
                  <div>
                    <div className="hf-sm" style={{ fontWeight: 500, color: on ? 'var(--accent)' : 'var(--ink)' }}>{l}</div>
                    <div className="hf-tiny hf-muted" style={{ marginTop: 1 }}>{sub}</div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* searchable */}
          <div className="hf-card" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <HfIcon name="search" size={14} color="var(--accent)" />
              <span style={{ fontWeight: 600, fontSize: 13 }}>可搜索</span>
            </div>
            {[['站内搜索', true], ['搜索引擎索引', true], ['RSS 收录', true], ['首页推荐', false]].map(([l, on], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                <span className="hf-sm hf-grow">{l}</span>
                <span className={`hf-toggle ${on ? 'on' : ''}`} />
              </div>
            ))}
          </div>

          {/* short link */}
          <div className="hf-card" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <HfIcon name="link" size={14} color="var(--warn)" />
              <span style={{ fontWeight: 600, fontSize: 13 }}>分享链接</span>
              <div className="hf-grow" />
              <span className="hf-mono hf-tiny hf-faint">218 访问</span>
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 12,
              padding: '8px 10px', background: 'var(--bg-sunk)',
              border: '1px solid var(--line)', borderRadius: 6,
              color: 'var(--accent)', wordBreak: 'break-all',
            }}>lumiogames.dev/s/fK3p9q2</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <span className="hf-btn hf-btn--sm" style={{ flex: 1, justifyContent: 'center' }}>
                <HfIcon name="copy" size={11} /> 复制
              </span>
              <span className="hf-btn hf-btn--sm hf-btn--primary" style={{ flex: 1, justifyContent: 'center' }}>
                分享
              </span>
            </div>
          </div>

          {/* sticky save bar */}
          <div style={{
            display: 'flex', gap: 8, marginTop: 18,
            padding: 12, borderRadius: 10,
            background: 'var(--bg-soft)', border: '1px solid var(--line)',
          }}>
            <span className="hf-btn hf-btn--sm" style={{ flex: 1, justifyContent: 'center' }}>取消</span>
            <span className="hf-btn hf-btn--sm hf-btn--primary" style={{ flex: 2, justifyContent: 'center' }}>
              保存可见性
            </span>
          </div>
        </div>
      </MobileShell>
    </IOSDevice>
  );
}

Object.assign(window, { HFHomeMobile, HFArticleMobile, HFAdminMobile });
