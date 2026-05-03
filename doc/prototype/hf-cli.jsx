/* global React, HFBrowser, HfIcon, HfNav */

// ============================================================
// 16. BLOG CLI — Agent 读写 Blog 的命令行
// ============================================================
function HFBlogCli({ theme = 'light', onTheme }) {
  const term = {
    bg: theme === 'dark' ? '#000' : '#0a0a0a',
    fg: '#e5e5e5',
    dim: '#737373',
    cyan: '#22d3ee',
    green: '#4ade80',
    yellow: '#fbbf24',
    purple: '#c084fc',
    red: '#f87171',
    blue: '#60a5fa',
  };

  const Token = ({ c, children }) => (
    <span style={{ color: term[c] }}>{children}</span>
  );

  const Prompt = () => (
    <span>
      <Token c="green">agent@lumio</Token>
      <Token c="dim">:</Token>
      <Token c="blue">~/blog</Token>
      <Token c="dim">$ </Token>
    </span>
  );

  return (
    <HFBrowser url="docs.lumiogames.dev/cli" height={820} theme={theme}>
      <HfNav active="" theme={theme} onTheme={onTheme} />
      <div style={{ overflow: 'auto', height: 'calc(100% - 56px)' }} className="hf">
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px' }}>

          {/* hero */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10,
              background: '#0a0a0a', color: '#4ade80',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700,
              boxShadow: '0 8px 24px rgba(0,0,0,.2)',
            }}>$_</div>
            <div>
              <div className="hf-mono hf-tiny hf-muted">Blog CLI · v0.4.2</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                <code style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>lumio</code> · 让 Agent 直接操作 Blog
              </h1>
            </div>
            <div className="hf-grow" />
            <span className="hf-tag hf-tag--accent" style={{ fontSize: 11 }}>🤖 Agent-friendly</span>
            <span className="hf-tag" style={{ fontSize: 11 }}>MCP server</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.7, marginBottom: 24, maxWidth: 720 }}>
            一个无状态、流水线友好的 CLI——读 / 写 / 改 / 发 笔记，全部从命令行。
            支持 <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)' }}>--json</code> 输出，
            可作为 MCP server 直接挂到 Claude Code / Cursor / Aider 给 agent 用。
          </p>

          {/* install */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 安装</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              ['npm', 'npm i -g @lumio/cli'],
              ['brew', 'brew install lumio/tap/cli'],
              ['curl', 'curl -fsSL lmg.sh | sh'],
            ].map(([k, cmd], i) => (
              <div key={i} style={{
                padding: 10, background: term.bg, borderRadius: 6,
                fontFamily: 'var(--mono)', fontSize: 12,
              }}>
                <div style={{ color: term.dim, fontSize: 10, marginBottom: 4 }}>{k}</div>
                <div style={{ color: term.green }}>$ <span style={{ color: term.fg }}>{cmd}</span></div>
              </div>
            ))}
          </div>

          {/* terminal demo */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ Demo · agent 工作流</div>
          <div style={{
            background: term.bg, color: term.fg, borderRadius: 10,
            border: '1px solid #262626', overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,.25)',
            marginBottom: 24,
          }}>
            {/* terminal chrome */}
            <div style={{
              padding: '8px 12px', borderBottom: '1px solid #262626',
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#171717',
            }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#fbbf24' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#4ade80' }} />
              <span style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: term.dim }}>
                agent@lumio: ~/blog · zsh
              </span>
              <span className="hf-mono hf-tiny" style={{ color: term.dim }}>120×40</span>
            </div>

            {/* terminal body */}
            <pre style={{
              margin: 0, padding: '14px 16px',
              fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.7,
              background: term.bg, color: term.fg,
            }}>
              {/* 1. login */}
              <Prompt />lumio <Token c="cyan">auth login</Token> <Token c="yellow">--token</Token> <Token c="dim">$LUMIO_TOKEN</Token>{'\n'}
              <Token c="green">✓</Token> <Token c="dim">authenticated as</Token> <Token c="cyan">@lumio-games</Token> <Token c="dim">· scope: notes:write</Token>{'\n'}
              {'\n'}
              {/* 2. list */}
              <Prompt />lumio <Token c="cyan">notes ls</Token> <Token c="yellow">--tag</Token> game-ai <Token c="yellow">--limit</Token> 5 <Token c="yellow">--json</Token>{'\n'}
              <Token c="dim">[</Token>{'\n'}
              {'  '}<Token c="dim">{'{'}</Token> <Token c="purple">"id"</Token>: <Token c="green">"nt_a3fK29p"</Token>, <Token c="purple">"slug"</Token>: <Token c="green">"mcts-llm-rts"</Token>,{'\n'}
              {'    '}<Token c="purple">"title"</Token>: <Token c="green">"用 MCTS + LLM 给 RTS 做战术决策"</Token>,{'\n'}
              {'    '}<Token c="purple">"vis"</Token>: <Token c="green">"public"</Token>, <Token c="purple">"views"</Token>: <Token c="yellow">1247</Token> <Token c="dim">{'},'}</Token>{'\n'}
              {'  '}<Token c="dim">{'{'}</Token> <Token c="purple">"id"</Token>: <Token c="green">"nt_8b3c5e7"</Token>, <Token c="purple">"slug"</Token>: <Token c="green">"goap-vs-mcts"</Token>,{'\n'}
              {'    '}<Token c="purple">"vis"</Token>: <Token c="green">"public"</Token>, <Token c="purple">"views"</Token>: <Token c="yellow">523</Token> <Token c="dim">{'}, ...'}</Token>{'\n'}
              <Token c="dim">]</Token>{'\n'}
              {'\n'}
              {/* 3. read */}
              <Prompt />lumio <Token c="cyan">notes get</Token> mcts-llm-rts <Token c="yellow">--format</Token> md <Token c="dim">| head -10</Token>{'\n'}
              <Token c="dim">---</Token>{'\n'}
              <Token c="purple">title</Token>: <Token c="green">用 MCTS + LLM 给 RTS 做战术决策</Token>{'\n'}
              <Token c="purple">tags</Token>: [<Token c="green">游戏 AI</Token>, <Token c="green">MCTS</Token>]{'\n'}
              <Token c="purple">date</Token>: <Token c="green">2026-04-28</Token>{'\n'}
              <Token c="dim">---</Token>{'\n'}
              {'\n'}
              # TL;DR{'\n'}
              {'\n'}
              把 MCTS rollout 阶段交给 LLM ...{'\n'}
              {'\n'}
              {/* 4. create */}
              <Prompt />lumio <Token c="cyan">notes new</Token> <Token c="dim">draft.md</Token> <Token c="yellow">--tag</Token> til <Token c="yellow">--vis</Token> link{'\n'}
              <Token c="green">✓</Token> created <Token c="cyan">nt_2f4a8d1</Token> <Token c="dim">·</Token> <Token c="blue">https://lmg.sh/x9k2</Token>{'\n'}
              {'\n'}
              {/* 5. patch */}
              <Prompt />lumio <Token c="cyan">notes patch</Token> mcts-llm-rts <Token c="yellow">--set</Token> <Token c="green">"vis=public"</Token> <Token c="yellow">--publish-at</Token> <Token c="green">"2026-05-04 09:00"</Token>{'\n'}
              <Token c="green">✓</Token> updated <Token c="dim">·</Token> 定时发布于 <Token c="yellow">2026-05-04 09:00 +08:00</Token>{'\n'}
              {'\n'}
              {/* 6. media */}
              <Prompt />lumio <Token c="cyan">media upload</Token> ./diagram.png <Token c="yellow">--bucket</Token> r2 <Token c="dim">| pbcopy</Token>{'\n'}
              <Token c="green">✓</Token> uploaded <Token c="dim">→</Token> <Token c="blue">https://media.lumiogames.dev/2026/05/diagram.webp</Token>{'\n'}
              <Token c="dim">  (markdown copied to clipboard)</Token>{'\n'}
              {'\n'}
              {/* 7. stats */}
              <Prompt />lumio <Token c="cyan">stats</Token> mcts-llm-rts <Token c="yellow">--last</Token> 7d{'\n'}
              <Token c="dim">┌─────────────┬─────────┬───────┐</Token>{'\n'}
              <Token c="dim">│</Token> metric      <Token c="dim">│</Token> value   <Token c="dim">│</Token> Δ7d   <Token c="dim">│</Token>{'\n'}
              <Token c="dim">├─────────────┼─────────┼───────┤</Token>{'\n'}
              <Token c="dim">│</Token> views       <Token c="dim">│</Token> <Token c="yellow">1,247</Token>   <Token c="dim">│</Token> <Token c="green">+18%</Token>  <Token c="dim">│</Token>{'\n'}
              <Token c="dim">│</Token> read-thru   <Token c="dim">│</Token> <Token c="yellow">62%</Token>     <Token c="dim">│</Token> <Token c="red">-3%</Token>   <Token c="dim">│</Token>{'\n'}
              <Token c="dim">│</Token> backlinks   <Token c="dim">│</Token> <Token c="yellow">5</Token>       <Token c="dim">│</Token> <Token c="green">+2</Token>    <Token c="dim">│</Token>{'\n'}
              <Token c="dim">└─────────────┴─────────┴───────┘</Token>{'\n'}
              {'\n'}
              <Prompt /><span style={{ background: term.fg, color: term.bg }}>▌</span>
            </pre>
          </div>

          {/* command reference */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 命令参考</div>
          <div className="hf-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
            {[
              ['notes ls', '列出笔记 (支持 --tag --vis --since --json)', 'read'],
              ['notes get <slug>', '读取单篇笔记，--format md|html|json', 'read'],
              ['notes new <file>', '从 markdown 创建新笔记', 'write'],
              ['notes patch <slug>', '修改 frontmatter / vis / 短链 / 定时', 'write'],
              ['notes rm <slug>', '删除（默认软删除，--hard 永久）', 'write'],
              ['search <query>', '搜索全文 + 笔记 + 标签', 'read'],
              ['media ls / upload / rm', 'R2 对象操作', 'write'],
              ['stats <slug>', '单篇数据 (views / read-thru / referrers)', 'read'],
              ['link create / ls / revoke', '管理短链 lmg.sh/xxxx', 'write'],
              ['mcp serve', '以 MCP server 模式启动 (stdio/http)', 'agent'],
            ].map(([cmd, desc, kind], i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '220px 1fr 70px',
                padding: '10px 14px', borderBottom: i < 9 ? '1px solid var(--line)' : 'none',
                alignItems: 'center', gap: 12,
              }}>
                <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>lumio {cmd}</code>
                <span className="hf-sm" style={{ color: 'var(--ink-2)' }}>{desc}</span>
                <span className="hf-tag" style={{
                  fontSize: 9, justifySelf: 'end',
                  color: kind === 'read' ? 'var(--ok)' : kind === 'write' ? 'var(--accent)' : 'var(--warn)',
                  borderColor: kind === 'read' ? 'var(--ok)' : kind === 'write' ? 'var(--accent)' : 'var(--warn)',
                }}>{kind === 'read' ? '只读' : kind === 'write' ? '写入' : 'agent'}</span>
              </div>
            ))}
          </div>

          {/* MCP integration */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 接入 Agent (MCP)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div className="hf-card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>🤖</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Claude Code · Cursor</span>
              </div>
              <div style={{
                padding: 10, background: term.bg, borderRadius: 5,
                fontFamily: 'var(--mono)', fontSize: 11, color: term.fg, lineHeight: 1.6,
              }}>
                <Token c="dim">{'// ~/.config/claude/mcp.json'}</Token>{'\n'}
                <Token c="dim">{'{'}</Token>{'\n'}
                {'  '}<Token c="purple">"servers"</Token>: <Token c="dim">{'{'}</Token>{'\n'}
                {'    '}<Token c="purple">"lumio-blog"</Token>: <Token c="dim">{'{'}</Token>{'\n'}
                {'      '}<Token c="purple">"command"</Token>: <Token c="green">"lumio"</Token>,{'\n'}
                {'      '}<Token c="purple">"args"</Token>: [<Token c="green">"mcp"</Token>, <Token c="green">"serve"</Token>]{'\n'}
                {'    '}<Token c="dim">{'}'}</Token>{'\n'}
                {'  '}<Token c="dim">{'}'}</Token>{'\n'}
                <Token c="dim">{'}'}</Token>
              </div>
            </div>

            <div className="hf-card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>🔧</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>暴露的 tools</span>
              </div>
              <div className="hf-col" style={{ gap: 4 }}>
                {[
                  ['blog_search', '搜索文章 / 笔记'],
                  ['blog_read', '读取单篇全文'],
                  ['blog_write', '创建或更新'],
                  ['blog_patch_meta', '改 vis / tag / 短链'],
                  ['blog_stats', '查数据'],
                  ['blog_media_upload', '传图到 R2'],
                ].map(([n, sub], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '3px 0' }}>
                    <code style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', minWidth: 130 }}>{n}</code>
                    <span className="hf-tiny hf-muted">{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* agent recipe */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 实例: 让 agent 帮你整理草稿箱</div>
          <div style={{
            padding: 14, background: 'var(--accent-soft)',
            borderRadius: 8, borderLeft: '3px solid var(--accent)',
            fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 6, fontSize: 12 }}>💬 你 → Claude:</div>
            <div style={{ marginBottom: 10, fontStyle: 'italic' }}>
              "把所有 30 天没动的草稿列出来，标题相似的合并候选，给我一份 markdown 报告。"
            </div>
            <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 6, fontSize: 12 }}>🤖 Agent 自动执行:</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.8 }}>
              → blog_search(<span style={{ color: 'var(--accent)' }}>vis=draft, untouched=30d</span>) <span style={{ color: 'var(--ok)' }}>· 14 hits</span><br />
              → blog_read × 14 <span style={{ color: 'var(--ok)' }}>· batched in 1 call</span><br />
              → 计算标题 embedding 相似度 → 4 组候选<br />
              → 写入 <code style={{ color: 'var(--accent)' }}>~/draft-cleanup.md</code>
            </div>
          </div>

          {/* env / token reminder */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '24px 0 8px', letterSpacing: '.05em' }}>▸ 环境变量</div>
          <div style={{
            padding: 12, background: 'var(--bg-soft)',
            border: '1px solid var(--line)', borderRadius: 6,
            fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.8, color: 'var(--ink-2)',
          }}>
            <span style={{ color: 'var(--ink-4)' }}># ~/.zshrc</span><br />
            <span style={{ color: 'var(--accent)' }}>export</span> LUMIO_TOKEN=<span style={{ color: 'var(--ok)' }}>"lmg_pat_..."</span>{'  '}<span style={{ color: 'var(--ink-4)' }}># notes:write</span><br />
            <span style={{ color: 'var(--accent)' }}>export</span> LUMIO_API=<span style={{ color: 'var(--ok)' }}>"https://api.lumio.games"</span><br />
            <span style={{ color: 'var(--accent)' }}>export</span> LUMIO_FORMAT=<span style={{ color: 'var(--ok)' }}>"json"</span>{'  '}<span style={{ color: 'var(--ink-4)' }}># 默认 agent 友好</span>
          </div>

        </div>
      </div>
    </HFBrowser>
  );
}

Object.assign(window, { HFBlogCli });
