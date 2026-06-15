/* global React, HFBrowser, HfNav */

// ============================================================
// 16. OPENNOTE CLI - 初始化、同步和本地预览
// ============================================================
function HFBlogCli({ theme = 'light', onTheme }) {
  const term = {
    bg: theme === 'dark' ? '#000' : '#0a0a0a',
    fg: '#e5e5e5',
    dim: '#737373',
    cyan: '#22d3ee',
    green: '#4ade80',
    yellow: '#fbbf24',
    blue: '#60a5fa',
  };

  const Token = ({ c, children }) => (
    <span style={{ color: term[c] }}>{children}</span>
  );

  const Prompt = () => (
    <span>
      <Token c="green">shell@lumio</Token>
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
              <div className="hf-mono hf-tiny hf-muted">OpenNote CLI</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: 0 }}>
                <code style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>opennote</code> · 初始化、同步和本地预览
              </h1>
            </div>
            <div className="hf-grow" />
            <span className="hf-tag hf-tag--accent" style={{ fontSize: 11 }}>Local-first</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.7, marginBottom: 24, maxWidth: 720 }}>
            一个面向本地博客工作流的 CLI，覆盖初始化、一次性同步和本地 server 预览。
            内容源头仍是 Obsidian vault；除 <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)' }}>opennote init</code> 创建示例目录外，
            CLI 不移动、不覆盖已有 vault 笔记。
          </p>

          {/* install */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ Quick start · 安装</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              ['npm', 'npm i -g @opennote/cli'],
              ['repo', 'pnpm --filter @opennote/cli start --'],
              ['version', 'opennote version'],
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
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ Quick start · 第一条命令</div>
          <div style={{
            background: term.bg, color: term.fg, borderRadius: 10,
            border: '1px solid #262626', overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,.25)',
            marginBottom: 24,
          }}>
            <div style={{
              padding: '8px 12px', borderBottom: '1px solid #262626',
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#171717',
            }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#fbbf24' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#4ade80' }} />
              <span style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: term.dim }}>
                shell@lumio: ~/blog · zsh
              </span>
            </div>

            <pre style={{
              margin: 0, padding: '14px 16px',
              fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.7,
              background: term.bg, color: term.fg,
            }}>
              <Prompt /><Token c="cyan">opennote init</Token> <Token c="green">./lumio-vault</Token>{'\n'}
              <Token c="green">✓</Token> <Token c="dim">初始化完成 - ./lumio-vault</Token>{'\n'}
              {'\n'}
              <Prompt /><Token c="yellow">OPENNOTE_CONFIG</Token>=<Token c="green">./lumio-vault/config.yaml</Token> <Token c="cyan">opennote sync</Token>{'\n'}
              <Token c="green">✓</Token> <Token c="dim">同步完成 - +2 ~0 -0</Token>{'\n'}
              {'\n'}
              <Prompt /><Token c="yellow">OPENNOTE_PASSWORD</Token>=<Token c="green">secret</Token> <Token c="yellow">OPENNOTE_CONFIG</Token>=<Token c="green">./lumio-vault/config.yaml</Token> <Token c="cyan">opennote serve</Token>{'\n'}
              <Token c="green">✓</Token> <Token c="dim">server listening</Token>{'\n'}
              <Prompt /><span style={{ background: term.fg, color: term.bg }}>▌</span>
            </pre>
          </div>

          {/* command reference */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 命令参考</div>
          <div className="hf-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
            {[
              ['opennote init [dir]', '新建本地示例 vault、config.yaml 和起步文章', '设置'],
              ['opennote sync', '按 OPENNOTE_CONFIG 读取 vault，生成索引和静态站点', '同步'],
              ['opennote serve', '启动本地 server 和 watcher，用于预览博客与后台', '预览'],
              ['opennote version', '输出当前 CLI 版本', '设置'],
            ].map(([cmd, desc, kind], i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '260px 1fr 70px',
                padding: '10px 14px', borderBottom: i < 3 ? '1px solid var(--line)' : 'none',
                alignItems: 'center', gap: 12,
              }}>
                <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>{cmd}</code>
                <span className="hf-sm" style={{ color: 'var(--ink-2)' }}>{desc}</span>
                <span className="hf-tag" style={{
                  fontSize: 9, justifySelf: 'end',
                  color: kind === '同步' ? 'var(--ok)' : kind === '预览' ? 'var(--warn)' : 'var(--accent)',
                  borderColor: kind === '同步' ? 'var(--ok)' : kind === '预览' ? 'var(--warn)' : 'var(--accent)',
                }}>{kind}</span>
              </div>
            ))}
          </div>

          {/* workflows */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 本地工作流</div>
          <div style={{
            padding: 14, background: 'var(--accent-soft)',
            borderRadius: 8, borderLeft: '3px solid var(--accent)',
            fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)',
            marginBottom: 24,
          }}>
            <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 6, fontSize: 12 }}>初始化并预览</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.8 }}>
              opennote init ./lumio-vault<br />
              cd ./lumio-vault<br />
              OPENNOTE_PASSWORD=secret OPENNOTE_CONFIG=./config.yaml opennote serve
            </div>
          </div>

          {/* env reminder */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '24px 0 8px', letterSpacing: '.05em' }}>▸ 环境变量</div>
          <div style={{
            padding: 12, background: 'var(--bg-soft)',
            border: '1px solid var(--line)', borderRadius: 6,
            fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.8, color: 'var(--ink-2)',
          }}>
            <span style={{ color: 'var(--ink-4)' }}># ~/.zshrc</span><br />
            <span style={{ color: 'var(--accent)' }}>export</span> OPENNOTE_CONFIG=<span style={{ color: 'var(--ok-text)' }}>"./config.yaml"</span>{'  '}<span style={{ color: 'var(--ink-4)' }}># 配置文件路径</span><br />
            <span style={{ color: 'var(--accent)' }}>export</span> OPENNOTE_PASSWORD=<span style={{ color: 'var(--ok-text)' }}>"secret"</span>{'  '}<span style={{ color: 'var(--ink-4)' }}># serve 登录密码</span><br />
            <span style={{ color: 'var(--accent)' }}>export</span> PORT=<span style={{ color: 'var(--ok-text)' }}>"3000"</span>{'  '}<span style={{ color: 'var(--ink-4)' }}># server 端口</span>
          </div>

        </div>
      </div>
    </HFBrowser>
  );
}

Object.assign(window, { HFBlogCli });
