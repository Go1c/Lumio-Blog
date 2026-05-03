/* global React, HFBrowser, HfIcon, AdminShell, IOSDevice */

const { useState: useStateOG } = React;

// ============================================================
// 17. OG IMAGE GENERATOR — 后台预览 + 模板编辑
// ============================================================
function HFOgGenerator({ theme = 'light' }) {
  const [tmpl, setTmpl] = useStateOG('classic');

  const article = {
    title: '用 MCTS + LLM 给 RTS 做战术决策',
    desc: '把 MCTS rollout 阶段交给 LLM，跳过手写 heuristic 直接拿到长期策略。',
    tag: '游戏 AI',
    date: '2026-04-28',
    read: '12 分钟',
    site: 'lumiogames.dev',
  };

  // ---- 4 OG templates ----
  const TmplClassic = () => (
    <div style={{
      width: '100%', height: '100%', padding: 56,
      background: '#fff', color: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      borderLeft: '8px solid #0066ff',
      fontFamily: 'var(--sans)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 17 }}>L</div>
        <span style={{ fontWeight: 700, fontSize: 18 }}>LumioGames</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#666' }}>· {article.site}</span>
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#0066ff', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14 }}>#{article.tag}</span>
      <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, margin: 0, marginBottom: 16, letterSpacing: '-0.02em' }}>{article.title}</h1>
      <p style={{ fontSize: 17, lineHeight: 1.5, color: '#444', margin: 0, marginBottom: 'auto', maxWidth: '90%' }}>{article.desc}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--mono)', fontSize: 13, color: '#666' }}>
        <span>📅 {article.date}</span><span>·</span><span>⏱ {article.read}</span>
      </div>
    </div>
  );

  const TmplGradient = () => (
    <div style={{
      width: '100%', height: '100%', padding: 56,
      background: 'linear-gradient(135deg, #0066ff 0%, #a855f7 60%, #ec4899 100%)',
      color: '#fff', display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--sans)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.15)', filter: 'blur(40px)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 17, backdropFilter: 'blur(10px)' }}>L</div>
        <span style={{ fontWeight: 700, fontSize: 18 }}>LumioGames</span>
      </div>
      <h1 style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.1, margin: 0, marginBottom: 18, letterSpacing: '-0.02em' }}>{article.title}</h1>
      <p style={{ fontSize: 17, lineHeight: 1.5, opacity: .85, margin: 0, marginBottom: 'auto', maxWidth: '90%' }}>{article.desc}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,.2)', borderRadius: 999, fontSize: 13, fontFamily: 'var(--mono)', backdropFilter: 'blur(10px)' }}>#{article.tag}</span>
        <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,.2)', borderRadius: 999, fontSize: 13, fontFamily: 'var(--mono)', backdropFilter: 'blur(10px)' }}>{article.read}</span>
      </div>
    </div>
  );

  const TmplCode = () => (
    <div style={{
      width: '100%', height: '100%',
      background: '#0a0a0a', color: '#e5e5e5',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--mono)',
    }}>
      {/* fake terminal chrome */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #262626', display: 'flex', alignItems: 'center', gap: 8, background: '#171717' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#fbbf24' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#4ade80' }} />
        <span style={{ marginLeft: 14, fontSize: 13, color: '#737373' }}>~/blog/posts/{article.title.slice(0,18)}.md</span>
      </div>
      <div style={{ flex: 1, padding: 36, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 14, color: '#737373', marginBottom: 8 }}># {article.tag}</div>
        <div style={{ fontSize: 38, color: '#fff', fontWeight: 700, lineHeight: 1.15, marginBottom: 18, fontFamily: 'var(--sans)', letterSpacing: '-0.01em' }}>
          <span style={{ color: '#4ade80' }}>$ </span>{article.title}
        </div>
        <div style={{ fontSize: 16, color: '#a3a3a3', lineHeight: 1.6, fontFamily: 'var(--sans)', maxWidth: '92%', marginBottom: 'auto' }}>{article.desc}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: '#737373' }}>
          <span style={{ color: '#22d3ee' }}>@lumio</span>
          <span>·</span>
          <span>{article.date}</span>
          <span>·</span>
          <span>{article.read}</span>
          <span style={{ marginLeft: 'auto', color: '#4ade80' }}>{article.site}</span>
        </div>
      </div>
    </div>
  );

  const TmplMinimal = () => (
    <div style={{
      width: '100%', height: '100%', padding: 64,
      background: '#fafaf9', color: '#0a0a0a',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      fontFamily: 'var(--sans)',
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#737373', marginBottom: 28, display: 'flex', gap: 14 }}>
        <span>{article.site}</span>
        <span>·</span>
        <span>#{article.tag}</span>
      </div>
      <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, margin: 0, marginBottom: 28, letterSpacing: '-0.025em', maxWidth: '95%' }}>{article.title}</h1>
      <div style={{ width: 60, height: 4, background: '#0066ff', marginBottom: 28 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 15, color: '#525252', fontFamily: 'var(--mono)' }}>
        <span style={{ fontWeight: 600, color: '#0a0a0a' }}>Lumio</span>
        <span>·</span>
        <span>{article.date}</span>
        <span>·</span>
        <span>{article.read}</span>
      </div>
    </div>
  );

  const templates = [
    { id: 'classic', name: '经典 · 蓝边', cmp: TmplClassic },
    { id: 'gradient', name: '渐变 · 醒目', cmp: TmplGradient },
    { id: 'code', name: '终端 · 极客', cmp: TmplCode },
    { id: 'minimal', name: '极简 · 杂志', cmp: TmplMinimal },
  ];

  const Active = templates.find(t => t.id === tmpl).cmp;

  return (
    <HFBrowser url="admin.lumiogames.dev/og-generator" height={820} theme={theme}>
      <AdminShell active="设置" breadcrumb="OG 图生成器 · 自动给每篇文章生成分享卡片" theme={theme}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: '100%' }}>
          {/* main preview area */}
          <div style={{ overflow: 'auto', padding: '20px 24px', background: 'var(--bg-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>🖼 OG 图生成器</h1>
              <span className="hf-tag" style={{ fontSize: 10 }}>1200 × 630</span>
              <span className="hf-tag hf-tag--accent" style={{ fontSize: 10 }}>auto · 每篇文章自动生成</span>
              <div className="hf-grow" />
              <button type="button" className="hf-btn hf-btn--sm">↻ 重新渲染</button>
              <button type="button" className="hf-btn hf-btn--sm">⬇ 下载 PNG</button>
            </div>

            {/* preview frame — show OG at fitted scale */}
            <div style={{
              width: '100%', maxWidth: 720, aspectRatio: '1200 / 630',
              background: 'var(--bg)', borderRadius: 10,
              border: '1px solid var(--line)',
              overflow: 'hidden', boxShadow: 'var(--shadow-2)',
              margin: '0 auto 18px',
            }}>
              <Active />
            </div>

            {/* social previews — twitter / discord / linkedin cards */}
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em', maxWidth: 720, margin: '0 auto 8px' }}>▸ 社交平台预览</div>
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>

              {/* Twitter card */}
              <div className="hf-card" style={{ padding: 12 }}>
                <div className="hf-mono hf-tiny hf-muted" style={{ marginBottom: 6 }}>𝕏 / Twitter</div>
                <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ aspectRatio: '1200/630', overflow: 'hidden' }}><Active /></div>
                  <div style={{ padding: '8px 12px', background: 'var(--bg)' }}>
                    <div className="hf-mono hf-tiny hf-faint">{article.site}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2, lineHeight: 1.3 }}>{article.title}</div>
                  </div>
                </div>
              </div>

              {/* Discord embed */}
              <div className="hf-card" style={{ padding: 12 }}>
                <div className="hf-mono hf-tiny hf-muted" style={{ marginBottom: 6 }}>Discord</div>
                <div style={{ borderLeft: '4px solid #0066ff', background: '#2b2d31', padding: '10px 12px', borderRadius: 4, color: '#dbdee1' }}>
                  <div style={{ fontSize: 12, color: '#dbdee1', marginBottom: 2 }}>lumiogames.dev</div>
                  <div style={{ fontSize: 14, color: '#00a8fc', fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>{article.title}</div>
                  <div style={{ fontSize: 12, color: '#b5bac1', lineHeight: 1.4, marginBottom: 8 }}>{article.desc}</div>
                  <div style={{ aspectRatio: '1200/630', borderRadius: 4, overflow: 'hidden' }}><Active /></div>
                </div>
              </div>
            </div>
          </div>

          {/* right sidebar — template + variables */}
          <aside style={{ borderLeft: '1px solid var(--line)', padding: '20px 18px', overflow: 'auto', background: 'var(--bg)' }}>
            {/* template picker */}
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '.05em' }}>▸ 模板</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 18 }}>
              {templates.map(t => {
                const T = t.cmp;
                const sel = t.id === tmpl;
                return (
                  <div key={t.id} onClick={() => setTmpl(t.id)} style={{
                    cursor: 'pointer', borderRadius: 6, overflow: 'hidden',
                    outline: sel ? '2px solid var(--accent)' : '1px solid var(--line)',
                    outlineOffset: sel ? 1 : 0, background: 'var(--bg-sunk)',
                  }}>
                    <div style={{ aspectRatio: '1200/630', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: 700, height: 367, transform: 'scale(0.18)', transformOrigin: 'top left' }}><T /></div>
                    </div>
                    <div style={{ padding: '4px 8px', fontSize: 11, fontWeight: sel ? 600 : 400, color: sel ? 'var(--accent)' : 'var(--ink-2)' }}>{t.name}</div>
                  </div>
                );
              })}
            </div>

            {/* variables */}
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '.05em' }}>▸ 变量 (来自 frontmatter)</div>
            <div className="hf-col" style={{ gap: 8, marginBottom: 18 }}>
              {[
                ['title', article.title, true],
                ['description', article.desc, true],
                ['tag (主)', article.tag, true],
                ['date', article.date, true],
                ['readingTime', article.read, false, '自动计算'],
                ['author', 'Lumio', false, '来自设置'],
              ].map(([k, v, edit, note], i) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <code style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)' }}>{`{{${k}}}`}</code>
                    {note && <span className="hf-mono hf-tiny hf-faint">{note}</span>}
                  </div>
                  <div style={{
                    padding: '5px 8px', background: edit ? 'var(--bg)' : 'var(--bg-sunk)',
                    border: '1px solid var(--line)', borderRadius: 4,
                    fontSize: 11, color: edit ? 'var(--ink)' : 'var(--ink-3)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{v}</div>
                </div>
              ))}
            </div>

            {/* output options */}
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '.05em' }}>▸ 输出</div>
            <div className="hf-col" style={{ gap: 6, marginBottom: 18, fontSize: 12 }}>
              {[
                ['格式', 'PNG · webp · jpeg', 'PNG'],
                ['尺寸', '1200×630 · 1200×675', '1200×630'],
                ['上传到', 'R2 (自动) · 本地', 'R2'],
                ['命名', '/og/{slug}.png', null],
              ].map(([k, opts, def], i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'var(--ink-3)' }}>{k}</span>
                  <div style={{ padding: '4px 8px', background: 'var(--bg-sunk)', border: '1px solid var(--line)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10 }}>
                    {def || opts}
                  </div>
                </div>
              ))}
            </div>

            {/* test url */}
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 测试链接</div>
            <div style={{ padding: 8, background: 'var(--bg-sunk)', border: '1px solid var(--line)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.5, marginBottom: 10, wordBreak: 'break-all', color: 'var(--ink-2)' }}>
              https://lumiogames.dev/og?slug=<span style={{ color: 'var(--accent)' }}>mcts-llm-rts</span>&t=<span style={{ color: 'var(--accent)' }}>{tmpl}</span>
            </div>
            <button type="button" className="hf-btn hf-btn--sm" style={{ width: '100%', justifyContent: 'center' }}>📋 复制链接</button>

            {/* validators */}
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '18px 0 8px', letterSpacing: '.05em' }}>▸ 校验器</div>
            <div className="hf-col" style={{ gap: 4, fontSize: 11 }}>
              <a style={{ color: 'var(--accent)' }}>↗ Twitter Card Validator</a>
              <a style={{ color: 'var(--accent)' }}>↗ OpenGraph debug</a>
              <a style={{ color: 'var(--accent)' }}>↗ LinkedIn inspector</a>
            </div>
          </aside>
        </div>
      </AdminShell>
    </HFBrowser>
  );
}

// ============================================================
// 18. SETTINGS · MOBILE — admin in mobile frame
// ============================================================
function HFSettingsMobile({ theme = 'light' }) {
  return (
    <IOSDevice theme={theme}>
      <div data-theme={theme} className="hf" style={{
        width: '100%', height: '100%',
        background: 'var(--bg)', color: 'var(--ink)',
        display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)',
      }}>
        <div style={{ height: 44, flexShrink: 0 }} />
        {/* nav */}
        <div style={{ padding: '8px 14px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 500 }}>‹ 后台</span>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>设置</div>
          <span className="hf-mono hf-tiny" style={{ color: 'var(--accent)' }}>保存</span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '12px 0' }}>
          {/* avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0 18px' }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #a855f7)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 30,
              boxShadow: '0 6px 20px rgba(0, 102, 255, .25)',
            }}>L</div>
            <div style={{ marginTop: 10, fontWeight: 600, fontSize: 15 }}>Lumio</div>
            <div className="hf-mono hf-tiny hf-muted">@lumio-games</div>
          </div>

          {[
            { title: '站点', items: [
              ['🌐', '站点信息', 'lumiogames.dev'],
              ['🎨', '外观主题', '浅色 + 蓝'],
              ['🔍', 'SEO / sitemap', '已启用'],
            ]},
            { title: '内容', items: [
              ['💬', '评论 / Webmention', 'Giscus'],
              ['📨', 'Newsletter', '142 订阅'],
              ['🖼', 'OG 图模板', '经典 · 蓝边'],
              ['💾', '备份 / 导出', '上次 2h 前'],
            ]},
            { title: '安全', items: [
              ['🔑', 'API tokens', '3 个有效'],
              ['🔒', '账户 + 2FA', '已启用'],
              ['📋', '审计日志', null],
            ]},
            { title: '危险', items: [
              ['🚪', '登出', null, 'danger'],
              ['🗑', '删除账户', null, 'danger'],
            ]},
          ].map((sec, si) => (
            <div key={si} style={{ marginBottom: 18 }}>
              <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', padding: '4px 16px 6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>▸ {sec.title}</div>
              <div style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
                {sec.items.map(([ic, n, sub, kind], i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 16px',
                    borderBottom: i < sec.items.length - 1 ? '1px solid var(--line)' : 'none',
                  }}>
                    <span style={{ fontSize: 17 }}>{ic}</span>
                    <span style={{ flex: 1, fontSize: 14, color: kind === 'danger' ? 'var(--danger)' : 'var(--ink)', fontWeight: kind === 'danger' ? 500 : 400 }}>{n}</span>
                    {sub && <span className="hf-mono hf-tiny hf-faint">{sub}</span>}
                    {kind !== 'danger' && <span style={{ color: 'var(--ink-4)' }}>›</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ textAlign: 'center', padding: '8px 0 18px', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
            LumioGames Blog · v0.4.2
          </div>
        </div>
      </div>
    </IOSDevice>
  );
}

Object.assign(window, { HFOgGenerator, HFSettingsMobile });
