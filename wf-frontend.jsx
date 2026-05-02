/* global React, BrowserChrome, StickyNote, Callout, Vis, Searchable, Icon, HandArrow, Squiggle */

// ============================================================
// FRONTEND WIREFRAMES — 3 homepage variants + 2 article variants
// ============================================================

// --- Shared header bar used across frontend boards ----------
function FEHeader({ active = 'home', mode = 'light' }) {
  const dark = mode === 'dark';
  const navItems = ['首页', '文章', '笔记', '文档', '标签', '关于'];
  return (
    <div style={{
      padding: '12px 20px',
      borderBottom: '1.5px solid ' + (dark ? '#3a362f' : 'var(--ink)'),
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      background: dark ? '#1f1d1a' : 'var(--paper)',
    }}>
      <div className="h-scribble" style={{ fontSize: 22, color: dark ? '#f0ece1' : 'var(--ink)' }}>
        Lumio<span style={{ color: 'var(--hi)' }}>Games</span>
      </div>
      <div className="row gap-12" style={{ marginLeft: 12, fontFamily: 'var(--hand)', fontSize: 14 }}>
        {navItems.map((n,i) => (
          <span key={i} className={active === n ? 'u-wave b' : ''}
            style={{ color: dark ? '#c8c2b4' : 'var(--ink-soft)' }}>{n}</span>
        ))}
      </div>
      <div className="grow" />
      <div className="sk" style={{
        padding: '4px 10px',
        background: dark ? '#0d0c0a' : 'var(--paper-warm)',
        borderColor: dark ? '#3a362f' : 'var(--line-soft)',
        fontFamily: 'var(--mono)',
        fontSize: 11,
        color: dark ? '#a8a29a' : 'var(--ink-faint)',
        display: 'flex',
        gap: 6,
      }}>
        <Icon name="search" size={12} /> 搜索…  <span style={{ opacity: .6 }}>⌘K</span>
      </div>
      <span className="tag tag--ghost" style={{ fontSize: 11 }}><Icon name="rss" size={11}/> RSS</span>
    </div>
  );
}

// ============================================================
// VARIANT A — 标签云优先：左侧分类树 + 主区文章列表
// ============================================================
function FEHomeA() {
  const tags = [
    { t: '游戏 AI',     c: 24, hot: true },
    { t: 'MCTS',        c: 11 },
    { t: 'LLM Agents',  c: 9, hot: true },
    { t: '强化学习',    c: 14 },
    { t: '行为树',      c: 6 },
    { t: 'Unity',       c: 18 },
    { t: 'ML-Agents',   c: 7 },
    { t: 'Shader',      c: 12 },
    { t: 'Vulkan',      c: 4 },
    { t: '渲染',        c: 9 },
    { t: '游戏服务器',  c: 5 },
    { t: '随笔',        c: 21 },
  ];
  return (
    <BrowserChrome url="lumiogames.dev" height={760}>
      <FEHeader active="首页" />
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 220px', gap: 0, height: 'calc(100% - 53px)' }}>
        {/* LEFT: 分类树 */}
        <div style={{ padding: 16, borderRight: '1.5px dashed var(--line-soft)', background: 'var(--paper-warm)' }}>
          <div className="h-arch b" style={{ fontSize: 13, marginBottom: 8, color: 'var(--ink-soft)' }}>
            ▸ 我自己的目录
          </div>
          <div className="col gap-4 sm">
            <div className="b">📁 文章</div>
            <div style={{ paddingLeft: 12 }} className="col gap-4 muted">
              <div>· 游戏 AI 笔谈 <span className="tag tag--hi" style={{fontSize:11}}>24</span></div>
              <div>· 渲染拾遗 <span className="tag" style={{fontSize:11}}>21</span></div>
              <div>· 引擎源码读 <span className="tag" style={{fontSize:11}}>13</span></div>
            </div>
            <div className="b" style={{ marginTop: 8 }}>📓 笔记</div>
            <div style={{ paddingLeft: 12 }} className="col gap-4 muted">
              <div>· daily / 2026-05</div>
              <div>· 论文速读</div>
              <div>· TIL</div>
            </div>
            <div className="b" style={{ marginTop: 8 }}>📚 文档</div>
            <div style={{ paddingLeft: 12 }} className="col gap-4 muted">
              <div>· Vulkan GPU-Driven</div>
              <div>· hermes-agent</div>
            </div>
          </div>
        </div>

        {/* CENTER: 文章列表 */}
        <div style={{ padding: '20px 24px', overflow: 'hidden' }}>
          <div className="h-scribble" style={{ fontSize: 28, marginBottom: 4 }}>
            最近在写的 <span className="u-wave">游戏 AI</span> & 渲染
          </div>
          <div className="muted sm" style={{ marginBottom: 14 }}>
            12 篇文章 · 38 条笔记 · 上次同步 2 分钟前
          </div>

          {/* 置顶卡片 */}
          <div className="sk sk-shadow" style={{ padding: 16, marginBottom: 14, background: 'var(--paper)' }}>
            <div className="row gap-6" style={{ marginBottom: 6 }}>
              <span className="tag tag--hi"><Icon name="pin" size={11}/> 置顶</span>
              <span className="tag">游戏 AI</span>
              <span className="tag">LLM Agents</span>
            </div>
            <div className="h-scribble" style={{ fontSize: 22 }}>
              用 MCTS + LLM 给 RTS 做战术决策：一次失败的尝试
            </div>
            <div className="ph" style={{ height: 90, margin: '8px 0' }}>cover image</div>
            <div className="sm muted">把 MCTS 的展开阶段交给 LLM 来评估……走得通，但慢得让人发指。</div>
          </div>

          {/* 普通条目 */}
          {[
            ['行为树为何在多人 RPG 里被嫌弃', ['行为树','游戏 AI'], '4 月 28 日'],
            ['Unity ML-Agents 训 NPC：从 reward shaping 谈起', ['ML-Agents','强化学习'], '4 月 22 日'],
            ['Vulkan GPU-Driven Pipeline 笔记 (3) — Indirect Draw', ['Vulkan','渲染'], '4 月 17 日'],
            ['读 Filament 源码：变体编译怎么做', ['Shader','渲染'], '4 月 11 日'],
          ].map(([title, tags, date], i) => (
            <div key={i} className="row gap-12" style={{ padding: '10px 0', borderBottom: '1px dashed var(--line-soft)' }}>
              <div style={{ width: 70, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{date}</div>
              <div className="grow">
                <div className="b sm">{title}</div>
                <div className="row gap-4" style={{ marginTop: 3 }}>
                  {tags.map(t => <span key={t} className="tag" style={{ fontSize: 11 }}>#{t}</span>)}
                </div>
              </div>
              <div className="muted tiny">3 min</div>
            </div>
          ))}
        </div>

        {/* RIGHT: 我是谁 */}
        <div style={{ padding: 16, borderLeft: '1.5px dashed var(--line-soft)', background: 'var(--paper)' }}>
          <div className="ph ph--photo" style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 8px' }}>me</div>
          <div className="tc h-scribble" style={{ fontSize: 22 }}>LumioGames</div>
          <div className="tc sm muted it">独立游戏 / 引擎渲染 / AI</div>
          <div className="sep" />
          <div className="sm" style={{ lineHeight: 1.5 }}>
            写一些游戏 AI、渲染管线、引擎源码阅读的笔记。Obsidian 同步，部分公开。
          </div>
          <div className="row gap-6 wrap" style={{ marginTop: 10 }}>
            <span className="tag tag--ghost">github</span>
            <span className="tag tag--ghost">x</span>
            <span className="tag tag--ghost">mail</span>
          </div>
          <div className="sep--soft sep" style={{ marginTop: 14 }} />
          <div className="h-arch b" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>正在做</div>
          <div className="sm muted">· hermes-agent v0.3</div>
          <div className="sm muted">· Vulkan 学习日记</div>
        </div>
      </div>
    </BrowserChrome>
  );
}

// ============================================================
// VARIANT B — 巨大标签云：信息图 / Notion 风
// ============================================================
function FEHomeB() {
  const tags = [
    { t: '游戏 AI', c: 24, w: 32 },
    { t: 'MCTS', c: 11, w: 22 },
    { t: 'LLM Agents', c: 9, w: 20 },
    { t: '强化学习', c: 14, w: 26 },
    { t: '行为树', c: 6, w: 16 },
    { t: 'Unity', c: 18, w: 28 },
    { t: 'ML-Agents', c: 7, w: 18 },
    { t: 'Shader', c: 12, w: 22 },
    { t: 'Vulkan', c: 4, w: 14 },
    { t: '渲染', c: 9, w: 20 },
    { t: '随笔', c: 21, w: 30 },
    { t: 'GameServer', c: 5, w: 16 },
  ];
  return (
    <BrowserChrome url="lumiogames.dev" height={760}>
      <FEHeader active="首页" />
      <div style={{ padding: '32px 40px', height: 'calc(100% - 53px)', overflow: 'hidden' }}>
        {/* HERO */}
        <div className="row gap-20" style={{ marginBottom: 24, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div className="h-scribble" style={{ fontSize: 56, lineHeight: 1 }}>
              Hi, 我是 <span className="u-wave">LumioGames</span>。
            </div>
            <div className="lg muted" style={{ marginTop: 10, maxWidth: 560 }}>
              在做一些游戏 AI / 渲染管线 / 引擎源码阅读的事。
              这里是我的笔记和文章——大部分用 <span className="b">Obsidian</span> 写，
              通过 <span className="mono">fast-note-sync</span> 实时同步上来。
            </div>
            <div className="row gap-8" style={{ marginTop: 14 }}>
              <span className="btn btn--primary">看最新文章 →</span>
              <span className="btn btn--ghost">逛笔记库</span>
            </div>
          </div>
          <div className="ph ph--photo" style={{ width: 140, height: 140 }}>头像</div>
        </div>

        {/* TAG CLOUD */}
        <div className="sk sk--warm" style={{ padding: '20px 24px', marginBottom: 18 }}>
          <div className="row items-center justify-between" style={{ marginBottom: 10 }}>
            <div className="h-arch b" style={{ fontSize: 14 }}>▸ 按标签浏览</div>
            <span className="muted tiny it">字号 = 文章数量</span>
          </div>
          <div className="row wrap gap-12" style={{ alignItems: 'baseline' }}>
            {tags.map((tg, i) => (
              <span key={i} style={{
                fontFamily: 'var(--hand-title)',
                fontSize: tg.w,
                fontWeight: 700,
                lineHeight: 1.1,
                color: i % 3 === 0 ? 'var(--hi)' : 'var(--ink)',
                textDecoration: i % 4 === 0 ? 'underline wavy var(--hi-soft)' : 'none',
              }}>
                #{tg.t}<sub style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginLeft: 2 }}>{tg.c}</sub>
              </span>
            ))}
          </div>
        </div>

        {/* TWO COLUMNS: 最近文章 / 最近笔记 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="sk" style={{ padding: 14 }}>
            <div className="row items-center justify-between" style={{ marginBottom: 8 }}>
              <div className="h-arch b">📄 最新文章</div>
              <span className="muted tiny">view all →</span>
            </div>
            {[
              ['MCTS + LLM 用于 RTS 战术', '游戏 AI'],
              ['行为树为何在 RPG 里被嫌弃', '行为树'],
              ['ML-Agents reward shaping', '强化学习'],
              ['读 Filament 变体编译', 'Shader'],
            ].map(([t, tg], i) => (
              <div key={i} className="row gap-8" style={{ padding: '6px 0', borderBottom: '1px dashed var(--line-soft)' }}>
                <span className="mono tiny muted">04-2{8-i}</span>
                <span className="sm grow">{t}</span>
                <span className="tag" style={{ fontSize: 11 }}>#{tg}</span>
              </div>
            ))}
          </div>
          <div className="sk sk--warm" style={{ padding: 14 }}>
            <div className="row items-center justify-between" style={{ marginBottom: 8 }}>
              <div className="h-arch b">📓 最近笔记 <span className="muted tiny">(实时同步)</span></div>
              <Vis state="public" />
            </div>
            {[
              ['TIL — Unity 的 ScriptableRenderContext 其实', 'public'],
              ['ECS lockstep 同步那个坑', 'link'],
              ['paper / SmartPlay 草稿', 'private'],
              ['Vulkan timeline semaphore 笔记', 'public'],
            ].map(([t, v], i) => (
              <div key={i} className="row gap-8 items-center" style={{ padding: '6px 0', borderBottom: '1px dashed var(--line-soft)' }}>
                <Vis state={v} />
                <span className="sm grow it">{t}</span>
                <span className="muted tiny">2h</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

// ============================================================
// VARIANT C — 终端/复古风：暗色 + 等宽字体
// ============================================================
function FEHomeC() {
  return (
    <BrowserChrome url="lumiogames.dev" height={760} mode="dark">
      <FEHeader active="首页" mode="dark" />
      <div style={{
        padding: '24px 32px',
        height: 'calc(100% - 53px)',
        background: '#1f1d1a',
        color: '#f0ece1',
        fontFamily: 'var(--mono)',
        overflow: 'hidden',
      }}>
        {/* prompt header */}
        <div style={{ fontSize: 13, marginBottom: 14, color: '#a8a29a' }}>
          <span style={{ color: 'var(--hi)' }}>lumio@games</span>:<span style={{ color: '#7fb3ff' }}>~</span>$ ls --by-topic
        </div>

        {/* topic grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
          {[
            { name: 'game-ai/',     n: 24, hot: true },
            { name: 'rendering/',   n: 21 },
            { name: 'engines/',     n: 13 },
            { name: 'rl/',          n: 14, hot: true },
            { name: 'shaders/',     n: 12 },
            { name: 'misc/',        n: 21 },
          ].map((d, i) => (
            <div key={i} style={{
              border: '1.5px solid #3a362f',
              padding: 12,
              background: '#15130f',
              fontFamily: 'var(--mono)',
              fontSize: 12,
            }}>
              <div className="row justify-between items-center">
                <span style={{ color: '#7fb3ff' }}>{d.name}</span>
                {d.hot && <span style={{ color: 'var(--hi)', fontSize: 11 }}>● HOT</span>}
              </div>
              <div style={{ color: '#7a766c', marginTop: 4 }}>{d.n} entries</div>
              <div style={{ marginTop: 8, color: '#a8a29a', fontSize: 11, lineHeight: 1.5 }}>
                {i === 0 && '└ MCTS, LLM agents, BT, planners…'}
                {i === 1 && '└ Vulkan, URP, Filament 阅读…'}
                {i === 2 && '└ skynet, ETPro, lockstep…'}
                {i === 3 && '└ ML-Agents, PPO, reward…'}
                {i === 4 && '└ NPR, toon, hair, water…'}
                {i === 5 && '└ TIL, daily, paper-notes…'}
              </div>
            </div>
          ))}
        </div>

        {/* feed: monospace list */}
        <div style={{ fontSize: 13, marginBottom: 8, color: '#a8a29a' }}>
          <span style={{ color: 'var(--hi)' }}>$</span> tail -f ./feed
        </div>
        <div style={{
          background: '#0d0c0a',
          border: '1.5px solid #3a362f',
          padding: '12px 16px',
          fontSize: 12,
          lineHeight: 1.8,
        }}>
          {[
            ['2026-04-28', 'POST', 'game-ai', '用 MCTS + LLM 给 RTS 做战术决策：一次失败的尝试'],
            ['2026-04-25', 'NOTE', 'misc',    'TIL — ScriptableRenderContext 其实是延迟提交'],
            ['2026-04-22', 'POST', 'rl',      'Unity ML-Agents 训 NPC：从 reward shaping 谈起'],
            ['2026-04-19', 'NOTE', 'rl',      'paper: SmartPlay (draft)'],
            ['2026-04-17', 'POST', 'rendering','Vulkan GPU-Driven Pipeline (3) — Indirect Draw'],
            ['2026-04-11', 'POST', 'shaders', '读 Filament 源码：变体编译怎么做'],
          ].map((row, i) => (
            <div key={i} className="row gap-12">
              <span style={{ color: '#7a766c' }}>{row[0]}</span>
              <span style={{ color: row[1] === 'POST' ? 'var(--hi)' : '#7fb3ff', width: 40 }}>[{row[1]}]</span>
              <span style={{ color: '#a8a29a', width: 90 }}>#{row[2]}</span>
              <span style={{ color: '#f0ece1' }}>{row[3]}</span>
            </div>
          ))}
        </div>
      </div>
    </BrowserChrome>
  );
}

// ============================================================
// ARTICLE detail — A: 经典文档站（左目录 + 中文 + 右大纲）
// ============================================================
function FEArticleA() {
  return (
    <BrowserChrome url="lumiogames.dev/posts/mcts-llm-rts" height={760}>
      <FEHeader active="文章" />
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 200px', height: 'calc(100% - 53px)' }}>
        {/* TOC tree */}
        <div style={{ padding: 14, borderRight: '1.5px dashed var(--line-soft)', background: 'var(--paper-warm)', fontSize: 13 }}>
          <div className="h-arch b muted" style={{ fontSize: 11, marginBottom: 6 }}>▸ 游戏 AI 系列</div>
          <div className="col gap-4">
            <div>· 行为树之外的选项</div>
            <div>· GOAP 复盘</div>
            <div className="b">· MCTS + LLM 实验 ●</div>
            <div className="muted">· LLM Agents @RTS (草)</div>
          </div>
        </div>

        {/* article body */}
        <div style={{ padding: '24px 32px', overflow: 'hidden' }}>
          <div className="row gap-6" style={{ marginBottom: 8 }}>
            <span className="tag tag--hi">#游戏 AI</span>
            <span className="tag">#MCTS</span>
            <span className="tag">#LLM</span>
          </div>
          <div className="h-scribble" style={{ fontSize: 32, lineHeight: 1.15 }}>
            用 MCTS + LLM 给 RTS 做战术决策：<br/>一次<span className="u-wave">失败</span>的尝试
          </div>
          <div className="row gap-12 muted sm" style={{ marginTop: 8, marginBottom: 16 }}>
            <span>2026-04-28</span><span>·</span><span>12 min read</span><span>·</span><span>1.2k views</span>
          </div>

          <div className="ph" style={{ height: 140, marginBottom: 16 }}>cover figure</div>

          <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink)' }}>
            <p>把 MCTS 的展开阶段（rollout）交给 LLM 评估，听起来像是个聪明的偷懒……</p>
            <p>……但 token 成本和延迟在 100 ms 决策窗口下完全不可接受。下文记录踩坑过程。</p>
            <div className="sk sk--warm" style={{ padding: 10, margin: '10px 0', fontSize: 13 }}>
              💡 <b>TL;DR</b>：能跑，慢得离谱。最后回退到了 NN-evaluator + 经典 MCTS。
            </div>
            <h3 className="h-arch" style={{ marginTop: 18 }}>1. 为什么想这么干</h3>
            <p>RTS 的 unit-level 决策本来就不擅长 long-horizon 推理……</p>
            <h3 className="h-arch" style={{ marginTop: 14 }}>2. 实现：rollout 阶段调 LLM</h3>
            <div className="sk" style={{ padding: 10, fontFamily: 'var(--mono)', fontSize: 11, background: '#1f1d1a', color: '#f0ece1', margin: '8px 0' }}>
              {`def rollout(state):
    prompt = build_prompt(state)
    return llm.eval(prompt)  # ← 这里 250ms`}
            </div>
            <p>……</p>
          </div>
        </div>

        {/* outline */}
        <div style={{ padding: 14, borderLeft: '1.5px dashed var(--line-soft)', fontSize: 12 }}>
          <div className="h-arch b muted" style={{ fontSize: 11, marginBottom: 6 }}>▸ 本页大纲</div>
          <div className="col gap-4 muted">
            <div className="b" style={{ color: 'var(--hi)' }}>1. 为什么想这么干</div>
            <div>2. 实现：rollout 阶段</div>
            <div>3. 性能 measurements</div>
            <div>4. 失败原因 & 复盘</div>
            <div>5. 还有救吗</div>
          </div>
          <div className="sep" />
          <div className="h-arch b muted" style={{ fontSize: 11, marginBottom: 6 }}>▸ 反向链接</div>
          <div className="col gap-4 muted sm">
            <div>· LLM Agents @RTS 草稿</div>
            <div>· paper / SmartPlay</div>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

// ============================================================
// ARTICLE detail — B: 沉浸阅读（中央窄列 + 浮动操作）
// ============================================================
function FEArticleB() {
  return (
    <BrowserChrome url="lumiogames.dev/posts/mcts-llm-rts" height={760}>
      <FEHeader active="文章" />
      <div style={{ height: 'calc(100% - 53px)', overflow: 'hidden', position: 'relative' }}>
        {/* floating side rail */}
        <div className="sk" style={{
          position: 'absolute', left: 24, top: 24, width: 50,
          padding: '8px 0', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 10, background: 'var(--paper)',
        }}>
          <div className="tc" title="like"><Icon name="star"/><div className="tiny muted">42</div></div>
          <div className="sep--soft sep" style={{ width: 30, margin: '4px 0' }} />
          <div className="tc"><Icon name="link"/><div className="tiny muted">share</div></div>
          <div className="tc"><Icon name="edit"/><div className="tiny muted">edit</div></div>
        </div>

        <div style={{ maxWidth: 660, margin: '0 auto', padding: '40px 24px 60px' }}>
          <div className="muted sm">2026-04-28 · 游戏 AI</div>
          <div className="h-scribble" style={{ fontSize: 40, lineHeight: 1.1, marginTop: 6 }}>
            用 MCTS + LLM 给 RTS 做战术决策
          </div>
          <div className="lg muted it" style={{ marginTop: 6 }}>一次失败的尝试，以及它教会我的事</div>

          <div className="row gap-6" style={{ marginTop: 14 }}>
            <span className="tag tag--hi">#游戏 AI</span>
            <span className="tag">#MCTS</span>
            <span className="tag">#LLM</span>
          </div>

          <div className="ph ph--photo" style={{ height: 200, margin: '20px 0' }}>hero figure</div>

          <div style={{ fontSize: 16, lineHeight: 1.75, fontFamily: 'var(--hand)' }}>
            <p style={{ fontSize: 18 }}>
              <span style={{ float: 'left', fontFamily: 'var(--hand-title)', fontSize: 50, lineHeight: .9, marginRight: 8, color: 'var(--hi)' }}>把</span>
              MCTS 的 rollout 阶段交给 LLM 来评估——听起来像偷懒，但它<u>本可以是</u>聪明的偷懒。
            </p>
            <p>……（正文部分省略）……</p>
            <div className="sk sk--warm" style={{ padding: 14, margin: '14px 0' }}>
              <div className="b">📌 TL;DR</div>
              <div className="sm">能跑通，但延迟无法接受；最后退回 NN evaluator + 经典 MCTS。</div>
            </div>
          </div>

          {/* end card */}
          <div className="sep" style={{ marginTop: 24 }} />
          <div className="row gap-12 items-center" style={{ marginTop: 10 }}>
            <div className="ph ph--photo" style={{ width: 50, height: 50, borderRadius: '50%', flexShrink: 0 }}>me</div>
            <div className="grow">
              <div className="b">LumioGames</div>
              <div className="sm muted">订阅以收到下一篇游戏 AI 笔记。</div>
            </div>
            <span className="btn btn--primary">订阅</span>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

Object.assign(window, { FEHomeA, FEHomeB, FEHomeC, FEArticleA, FEArticleB });
