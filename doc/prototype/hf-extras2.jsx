/* global React, HFBrowser, HfIcon, HfNav, AdminShell */

// ============================================================
// 7. RSS / FEED 订阅页
// ============================================================
function HFRssPage({ theme = 'light', onTheme }) {
  return (
    <HFBrowser url="lumiogames.dev/feed" height={820} theme={theme}>
      <HfNav active="" theme={theme} onTheme={onTheme} />
      <div style={{ overflow: 'auto', height: 'calc(100% - 56px)' }} className="hf">
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(249, 115, 22, .35)',
            }}>
              <HfIcon name="rss" size={20} color="#fff" />
            </div>
            <div>
              <div className="hf-mono hf-tiny hf-muted" style={{ marginBottom: 2 }}>RSS · Atom · JSON Feed</div>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>用 RSS 订阅</h1>
            </div>
          </div>
          <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.7, marginBottom: 32 }}>
            我相信开放 web。这里所有内容都有 RSS——选你喜欢的工具，把链接粘进去就行。
          </p>

          {/* feed urls */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ Feed URL</div>
          {[
            ['全部文章', '/feed.xml', 'RSS 2.0', '默认推荐'],
            ['全部文章', '/atom.xml', 'Atom 1.0'],
            ['全部文章', '/feed.json', 'JSON Feed'],
            ['仅 #游戏 AI', '/tags/game-ai/feed.xml', 'RSS 2.0'],
            ['仅 #渲染', '/tags/rendering/feed.xml', 'RSS 2.0'],
            ['仅笔记 (不含文章)', '/notes/feed.xml', 'RSS 2.0'],
          ].map(([n, url, fmt, rec], i) => (
            <div key={i} className="hf-card" style={{
              padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12,
              borderColor: rec ? 'var(--accent)' : 'var(--line)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{n}</span>
                  <span className="hf-tag" style={{ fontSize: 10 }}>{fmt}</span>
                  {rec && <span className="hf-tag hf-tag--accent" style={{ fontSize: 10 }}>{rec}</span>}
                </div>
                <div className="hf-mono hf-tiny hf-muted" style={{ marginTop: 4 }}>
                  https://lumiogames.dev{url}
                </div>
              </div>
              <span className="hf-btn hf-btn--sm"><HfIcon name="copy" size={11} /> 复制</span>
              <span className="hf-btn hf-btn--sm hf-btn--primary">订阅 →</span>
            </div>
          ))}

          {/* one-click readers */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '32px 0 8px', letterSpacing: '.05em' }}>▸ 一键添加到</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              ['Feedly', '#2bb24c'],
              ['Inoreader', '#1976d2'],
              ['NetNewsWire', '#3878d6'],
              ['Reeder 5', '#0a7cff'],
              ['Miniflux', '#3a3a3a'],
              ['FreshRSS', '#0489c1'],
              ['Readwise', '#000'],
              ['其他…', 'var(--ink-3)'],
            ].map(([n, c], i) => (
              <div key={i} className="hf-hover" style={{
                padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 6,
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                <span>{n}</span>
                <div className="hf-grow" />
                <HfIcon name="arrowR" size={11} color="var(--ink-3)" />
              </div>
            ))}
          </div>

          {/* stats */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '32px 0 8px', letterSpacing: '.05em' }}>▸ Feed 统计</div>
          <div className="hf-card" style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              ['487', '当前订阅者'],
              ['+12', '本周新增'],
              ['38 KB', 'feed.xml 大小'],
              ['每 6h', '缓存刷新'],
            ].map(([v, k], i) => (
              <div key={i}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{v}</div>
                <div className="hf-tiny hf-muted" style={{ marginTop: 2 }}>{k}</div>
              </div>
            ))}
          </div>

          {/* xml preview */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '32px 0 8px', letterSpacing: '.05em' }}>▸ feed.xml 预览</div>
          <pre className="hf-mono" style={{
            margin: 0, padding: 14, background: 'var(--bg-sunk)',
            border: '1px solid var(--line)', borderRadius: 8,
            fontSize: 11, lineHeight: 1.65, overflow: 'auto', color: 'var(--ink-2)',
          }}>{`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>LumioGames</title>
    <link>https://lumiogames.dev</link>
    <description>游戏开发 / 渲染 / 游戏 AI 的笔记</description>
    <language>zh-CN</language>
    <item>
      <title>用 MCTS + LLM 给 RTS 做战术决策</title>
      <link>https://lumiogames.dev/posts/mcts-llm-rts</link>
      <pubDate>Mon, 28 Apr 2026 09:30:00 +0800</pubDate>
      ...`}</pre>
        </div>
      </div>
    </HFBrowser>
  );
}

// ============================================================
// 9. ARTICLE ANALYTICS (admin)
// ============================================================
function HFArticleAnalytics({ theme = 'light' }) {
  return (
    <HFBrowser url="admin.lumiogames.dev/analytics/mcts-llm-rts" height={820} theme={theme}>
      <AdminShell active="数据分析" breadcrumb="数据 / 单篇 · MCTS + LLM RTS" theme={theme}>
        <div style={{ padding: '20px 24px' }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
            <div>
              <div className="hf-mono hf-tiny hf-muted" style={{ marginBottom: 4 }}>2026-04-28 · 12 min · 公开</div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>用 MCTS + LLM 给 RTS 做战术决策</h1>
            </div>
            <div className="hf-grow" />
            <span className="hf-btn hf-btn--sm">↗ 查看页面</span>
            <span className="hf-btn hf-btn--sm">导出 CSV</span>
            <span className="hf-btn hf-btn--sm">时段 · 30d ▾</span>
          </div>

          {/* big numbers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              ['1,247', '总浏览', '+18%', 'ok'],
              ['894', '独立访客', '+22%', 'ok'],
              ['8.4 min', '平均阅读', '+12%', 'ok'],
              ['62%', '读完率', '-3%', 'warn'],
              ['28', '收藏 / 引用', '+9', 'ok'],
            ].map(([v, k, d, t], i) => (
              <div key={i} className="hf-card" style={{ padding: 14 }}>
                <div className="hf-mono hf-tiny hf-muted">{k}</div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mono)', marginTop: 4, lineHeight: 1 }}>{v}</div>
                <div className="hf-mono hf-tiny" style={{ marginTop: 4, color: t === 'ok' ? 'var(--ok)' : 'var(--warn)' }}>{d}</div>
              </div>
            ))}
          </div>

          {/* 2-col layout: chart + scroll-depth */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* views over time */}
            <div className="hf-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>📈 浏览趋势</span>
                <div className="hf-grow" />
                <span className="hf-tag" style={{ fontSize: 10 }}>● 浏览</span>
                <span className="hf-tag" style={{ fontSize: 10, marginLeft: 4 }}>○ 独立访客</span>
              </div>
              <svg viewBox="0 0 480 180" style={{ width: '100%', height: 180 }}>
                {[0,1,2,3].map(i => (
                  <line key={i} x1="0" x2="480" y1={i*45+15} y2={i*45+15} stroke="var(--line)" strokeDasharray="2 4" />
                ))}
                {/* views area */}
                <path d="M 0 130 L 30 80 L 60 25 L 90 35 L 120 50 L 150 70 L 180 60 L 210 75 L 240 90 L 270 95 L 300 110 L 330 105 L 360 115 L 390 120 L 420 118 L 450 122 L 480 125 L 480 180 L 0 180 Z" fill="var(--accent)" opacity=".15" />
                <polyline fill="none" stroke="var(--accent)" strokeWidth="2"
                  points="0,130 30,80 60,25 90,35 120,50 150,70 180,60 210,75 240,90 270,95 300,110 330,105 360,115 390,120 420,118 450,122 480,125" />
                <polyline fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="3 3"
                  points="0,140 30,100 60,55 90,60 120,72 150,90 180,82 210,95 240,108 270,112 300,124 330,120 360,128 390,132 420,130 450,134 480,136" />
                {/* peak marker */}
                <circle cx="60" cy="25" r="4" fill="var(--accent)" />
                <text x="66" y="20" fontSize="10" fill="var(--ink-2)" fontFamily="var(--mono)">peak · 287 / 04-30</text>
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)' }}>
                <span>04-01</span><span>04-08</span><span>04-15</span><span>04-22</span><span>04-30</span>
              </div>
            </div>

            {/* scroll depth */}
            <div className="hf-card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📜 阅读深度</div>
              {[
                ['0%  · 进入', 100, 'var(--accent)'],
                ['25% · 引言', 91, 'var(--accent)'],
                ['50% · 算法', 78, 'var(--accent)'],
                ['75% · 实验', 71, 'var(--accent)'],
                ['100% · 结尾', 62, 'var(--ok)'],
              ].map(([l, w, c], i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 3, color: 'var(--ink-3)' }}>
                    <span>{l}</span>
                    <span style={{ color: 'var(--ink)' }}>{w}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-sunk)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${w}%`, background: c, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
              <div className="hf-tiny hf-muted" style={{ marginTop: 14, lineHeight: 1.5 }}>
                💡 <b style={{ color: 'var(--ink)' }}>50% → 75% 流失最多</b>。可能是「实验」段落太长——考虑加锚点目录。
              </div>
            </div>
          </div>

          {/* 3-col: referrers / countries / devices */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { title: '🔗 来源', rows: [
                ['HackerNews', 412, 33], ['Twitter / X', 287, 23], ['Google', 198, 16],
                ['直接访问', 142, 11], ['v2ex', 89, 7], ['其他', 119, 10],
              ]},
              { title: '🌍 地区', rows: [
                ['🇨🇳 中国', 521, 42], ['🇺🇸 美国', 287, 23], ['🇯🇵 日本', 142, 11],
                ['🇰🇷 韩国', 89, 7], ['🇩🇪 德国', 78, 6], ['其他', 130, 10],
              ]},
              { title: '💻 设备', rows: [
                ['Mac', 624, 50], ['Windows', 312, 25], ['iOS', 187, 15],
                ['Linux', 87, 7], ['Android', 37, 3],
              ]},
            ].map((card, ci) => (
              <div key={ci} className="hf-card" style={{ padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{card.title}</div>
                {card.rows.map(([n, v, p], i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                      <span>{n}</span>
                      <span className="hf-mono hf-tiny hf-muted">{v} · {p}%</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--bg-sunk)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p * 2.2}%`, background: 'var(--accent)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </AdminShell>
    </HFBrowser>
  );
}

// ============================================================
// 11. BACKUP / EXPORT
// ============================================================
function HFBackupExport({ theme = 'light' }) {
  return (
    <HFBrowser url="admin.lumiogames.dev/backup" height={820} theme={theme}>
      <AdminShell active="" breadcrumb="设置 / 备份与导出" theme={theme}>
        <div style={{ padding: '20px 24px', maxWidth: 980 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>💾 备份与导出</h1>
          <p className="hf-sm hf-muted" style={{ marginTop: 0, marginBottom: 24 }}>
            数据是你的，不是我的。任何时候都能整包带走。
          </p>

          {/* one-click export */}
          <div className="hf-card" style={{ padding: 18, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>📦</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>整站打包导出</div>
                <div className="hf-sm hf-muted" style={{ marginBottom: 10 }}>
                  Markdown 源文件 + 媒体 + 元数据 (JSON)。导入到 Obsidian / Logseq / 任何地方。
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {['Markdown 包 (.zip)', 'Hugo 兼容包', 'Obsidian Vault', 'JSON 全量'].map((f, i) => (
                    <span key={i} className={`hf-btn hf-btn--sm ${i === 0 ? 'hf-btn--primary' : ''}`}>
                      {f}
                    </span>
                  ))}
                </div>
                <div className="hf-mono hf-tiny hf-muted">
                  约 <b style={{ color: 'var(--ink)' }}>248 笔记 · 198 媒体文件 · 1.4 GB</b> · 上次导出 7 天前
                </div>
              </div>
            </div>
          </div>

          {/* auto backup */}
          <div className="hf-card" style={{ padding: 18, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>🔄 自动备份</div>
                <div className="hf-sm hf-muted" style={{ marginTop: 2 }}>每天凌晨 3 点 push 到指定 Git 仓库</div>
              </div>
              <span className="hf-toggle on" />
            </div>
            <div style={{
              padding: 12, background: 'var(--bg-sunk)', borderRadius: 6,
              fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6,
            }}>
              <div style={{ color: 'var(--ink-3)' }}>git remote:</div>
              <div style={{ color: 'var(--ink)' }}>git@github.com:lumio/blog-backup.git</div>
              <div style={{ color: 'var(--ink-3)', marginTop: 6 }}>分支: <span style={{ color: 'var(--accent)' }}>main</span> · 加密: <span style={{ color: 'var(--ok)' }}>age</span></div>
            </div>
            {/* recent backups */}
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '14px 0 8px', letterSpacing: '.05em' }}>▸ 最近 5 次</div>
            {[
              ['2026-05-02 03:00', '✓', '+3 ~7 -1', 'a4f2a8b'],
              ['2026-05-01 03:00', '✓', '+1 ~2', '8b3c5e7'],
              ['2026-04-30 03:00', '✓', '+5 ~12', '5e7f1a0'],
              ['2026-04-29 03:00', '⚠', 'auth retry', '—'],
              ['2026-04-28 03:00', '✓', '+8 ~3', '1a0d6b8'],
            ].map(([t, st, ch, sha], i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '160px 30px 1fr 80px',
                padding: '6px 0', borderTop: i ? '1px solid var(--line)' : 'none',
                fontFamily: 'var(--mono)', fontSize: 11, alignItems: 'center',
              }}>
                <span className="hf-muted">{t}</span>
                <span style={{ color: st === '✓' ? 'var(--ok)' : 'var(--warn)' }}>{st}</span>
                <span className="hf-muted">{ch}</span>
                <span style={{ color: 'var(--accent)' }}>{sha}</span>
              </div>
            ))}
          </div>

          {/* import */}
          <div className="hf-card" style={{ padding: 18, marginBottom: 18 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>📥 导入</div>
            <div className="hf-sm hf-muted" style={{ marginBottom: 12 }}>从其他平台迁移过来 · slug / 标签 / 草稿状态都会保留</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                ['Hugo', '_posts/'],
                ['Jekyll', 'YAML front-matter'],
                ['Notion', 'Markdown export'],
                ['Obsidian', '整个 vault'],
              ].map(([n, sub], i) => (
                <div key={i} className="hf-hover" style={{
                  padding: 10, border: '1px dashed var(--line-strong)', borderRadius: 6,
                  textAlign: 'center', cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{n}</div>
                  <div className="hf-tiny hf-muted" style={{ marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* danger zone */}
          <div style={{
            padding: 16, border: '1px solid var(--danger)', borderRadius: 8,
            background: 'rgba(220, 38, 38, .04)',
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--danger)', marginBottom: 4 }}>⚠️ 危险区</div>
            <div className="hf-sm hf-muted" style={{ marginBottom: 12 }}>这些操作不可逆。建议先做一次完整备份。</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="hf-btn hf-btn--sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>清空所有草稿</span>
              <span className="hf-btn hf-btn--sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>重置统计数据</span>
              <span className="hf-btn hf-btn--sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>删除整站</span>
            </div>
          </div>
        </div>
      </AdminShell>
    </HFBrowser>
  );
}

// ============================================================
// 13. SETTINGS — site / profile
// ============================================================
function HFSettings({ theme = 'light' }) {
  return (
    <HFBrowser url="admin.lumiogames.dev/settings" height={820} theme={theme}>
      <AdminShell active="设置" breadcrumb="设置 / 站点信息" theme={theme}>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', height: '100%' }}>
          {/* sub-nav */}
          <aside style={{ borderRight: '1px solid var(--line)', padding: '16px 12px', background: 'var(--bg-soft)' }}>
            <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>▸ 设置</div>
            {[
              ['站点信息', true, '🌐'],
              ['作者资料', false, '👤'],
              ['外观主题', false, '🎨'],
              ['评论 / 互动', false, '💬'],
              ['SEO / 站点地图', false, '🔍'],
              ['Webmention', false, '📨'],
              ['Analytics', false, '📊'],
              ['API tokens', false, '🔑'],
              ['备份导出', false, '💾'],
              ['账户安全', false, '🔒'],
            ].map(([n, a, ic], i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 5, fontSize: 13,
                background: a ? 'var(--bg)' : 'transparent',
                color: a ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: a ? 600 : 400,
                border: a ? '1px solid var(--line)' : '1px solid transparent',
                marginBottom: 1,
              }}>
                <span>{ic}</span>
                <span>{n}</span>
              </div>
            ))}
          </aside>

          {/* main */}
          <div style={{ overflow: 'auto', padding: '20px 28px' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 4 }}>🌐 站点信息</h1>
            <p className="hf-sm hf-muted" style={{ marginTop: 0, marginBottom: 24 }}>
              这些信息会出现在 meta 标签、RSS、OG 图、页脚里。
            </p>

            {/* form sections */}
            {[
              { title: '基础', fields: [
                ['站点名称', 'LumioGames', 'text'],
                ['副标题', '游戏开发 / 渲染 / AI 的练习场', 'text'],
                ['域名', 'lumiogames.dev', 'text', 'readonly'],
                ['默认语言', 'zh-CN', 'select'],
                ['时区', 'Asia/Shanghai (UTC+8)', 'select'],
              ]},
              { title: '作者', fields: [
                ['昵称', 'Lumio', 'text'],
                ['邮箱', 'hi@lumio.games', 'text'],
                ['一句话介绍', '在做一款独立游戏。喜欢渲染、游戏 AI 和不写完的代码。', 'textarea'],
                ['头像', 'avatar-2026.png', 'avatar'],
              ]},
            ].map((sec, si) => (
              <div key={si} className="hf-card" style={{ padding: 18, marginBottom: 16 }}>
                <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 14, letterSpacing: '.05em' }}>▸ {sec.title}</div>
                {sec.fields.map(([label, val, kind, ro], fi) => (
                  <div key={fi} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 14, marginBottom: 12, alignItems: kind === 'textarea' ? 'flex-start' : 'center' }}>
                    <label className="hf-sm" style={{ color: 'var(--ink-3)', paddingTop: kind === 'textarea' ? 8 : 0 }}>{label}</label>
                    {kind === 'avatar' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent), #a855f7)',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18,
                        }}>L</div>
                        <span className="hf-btn hf-btn--sm">更换</span>
                        <span className="hf-mono hf-tiny hf-faint">{val}</span>
                      </div>
                    ) : kind === 'textarea' ? (
                      <textarea className="hf-input" style={{ minHeight: 64, padding: '8px 10px', resize: 'vertical', fontFamily: 'inherit' }} defaultValue={val} />
                    ) : kind === 'select' ? (
                      <select className="hf-input" defaultValue={val} style={{ height: 30 }}>
                        <option>{val}</option>
                      </select>
                    ) : (
                      <input className="hf-input" defaultValue={val} readOnly={ro === 'readonly'}
                        style={{ background: ro === 'readonly' ? 'var(--bg-sunk)' : 'var(--bg)', color: ro ? 'var(--ink-3)' : 'var(--ink)' }} />
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* HOME INTRO · Markdown editor */}
            <div className="hf-card" style={{ padding: 18, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>▸ 首页 Hero (Markdown)</div>
                <span className="hf-tag hf-tag--accent" style={{ fontSize: 9 }}>支持 markdown · 内联代码 · 链接</span>
                <div className="hf-grow" />
                <span className="hf-mono hf-tiny hf-faint">/_data/home.md</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14, marginBottom: 12, alignItems: 'center' }}>
                <label className="hf-sm" style={{ color: 'var(--ink-3)' }}>主标题</label>
                <input className="hf-input" defaultValue="在 [游戏 AI](#)、渲染管线 / 和引擎源码之间 `<thinking/>`" />
              </div>

              {/* split editor + preview */}
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 14, alignItems: 'flex-start' }}>
                <label className="hf-sm" style={{ color: 'var(--ink-3)', paddingTop: 8 }}>正文 (md)</label>

                {/* editor pane */}
                <div style={{
                  background: 'var(--bg-sunk)', border: '1px solid var(--line)', borderRadius: 5,
                  fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.7,
                  padding: '10px 12px', minHeight: 130,
                  color: 'var(--ink-2)', whiteSpace: 'pre-wrap',
                }}>
                  我是 <span style={{ color: 'var(--accent)' }}>**LumioGames**</span>。{'\n'}
                  这里是我用 Obsidian 写、通过 <span style={{ color: 'var(--accent)' }}>`fast-note-sync`</span> 同步上来的{'\n'}
                  文章和笔记 — 大部分公开，少量仅链接可见。
                </div>

                {/* preview pane */}
                <div style={{
                  background: 'var(--bg)', border: '1px dashed var(--line)', borderRadius: 5,
                  padding: '10px 12px', minHeight: 130,
                  fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)', position: 'relative',
                }}>
                  <span className="hf-mono hf-tiny hf-faint" style={{ position: 'absolute', top: 4, right: 8 }}>preview</span>
                  我是 <b style={{ color: 'var(--ink)' }}>LumioGames</b>。
                  这里是我用 Obsidian 写、通过 <code style={{ fontFamily: 'var(--mono)', background: 'var(--bg-sunk)', padding: '1px 5px', borderRadius: 3, fontSize: 12, color: 'var(--accent)' }}>fast-note-sync</code> 同步上来的
                  文章和笔记 — 大部分公开，少量仅链接可见。
                </div>
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)', display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--ink-3)' }}>
                <span>📌 CTA 按钮:</span>
                <span style={{ padding: '2px 8px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10 }}>"看最新文章"</span>
                <span>+</span>
                <span style={{ padding: '2px 8px', background: 'var(--bg-sunk)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10 }}>"逛笔记库 (auto)"</span>
                <div className="hf-grow" />
                <span className="hf-mono hf-tiny" style={{ color: 'var(--ok)' }}>● 自动刷新</span>
              </div>
            </div>

            {/* social links */}
            <div className="hf-card" style={{ padding: 18, marginBottom: 16 }}>
              <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 14, letterSpacing: '.05em' }}>▸ 社交链接 (页脚)</div>
              {[
                ['GitHub', '@lumio-games', '#'],
                ['Twitter / X', '@lumio_games', '#'],
                ['Mastodon', '@lumio@hachyderm.io', '#'],
                ['Email', 'hi@lumio.games', 'mailto:'],
              ].map(([p, u], i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 30px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <span className="hf-sm" style={{ color: 'var(--ink-3)' }}>{p}</span>
                  <input className="hf-input" defaultValue={u} />
                  <span className="hf-mono hf-tiny hf-faint" style={{ textAlign: 'center', cursor: 'pointer' }}>×</span>
                </div>
              ))}
              <span className="hf-btn hf-btn--sm" style={{ marginTop: 4 }}>+ 添加</span>
            </div>

            {/* save bar */}
            <div style={{
              position: 'sticky', bottom: 0, marginTop: 18,
              padding: 12, background: 'var(--bg)', border: '1px solid var(--line)',
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: 'var(--shadow-2)',
            }}>
              <span className="hf-mono hf-tiny" style={{ color: 'var(--warn)' }}>● 有未保存的更改 (3)</span>
              <div className="hf-grow" />
              <span className="hf-btn hf-btn--sm">放弃</span>
              <span className="hf-btn hf-btn--sm hf-btn--primary">保存</span>
            </div>
          </div>
        </div>
      </AdminShell>
    </HFBrowser>
  );
}

// ============================================================
// 15. ABOUT / CONTACT
// ============================================================
function HFAbout({ theme = 'light', onTheme }) {
  return (
    <HFBrowser url="lumiogames.dev/about" height={820} theme={theme}>
      <HfNav active="关于" theme={theme} onTheme={onTheme} />
      <div style={{ overflow: 'auto', height: 'calc(100% - 56px)' }} className="hf">
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px' }}>
          {/* hero */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
            <div style={{
              width: 88, height: 88, borderRadius: 16,
              background: 'linear-gradient(135deg, var(--accent), #a855f7)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 38,
              boxShadow: '0 12px 32px rgba(0, 102, 255, .25)',
              flexShrink: 0,
            }}>L</div>
            <div>
              <div className="hf-mono hf-tiny hf-muted" style={{ marginBottom: 4 }}>About</div>
              <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>嘿，我是 Lumio</h1>
              <div className="hf-sm hf-muted" style={{ marginTop: 6 }}>独立游戏开发 · 上海 · 在做一款没法用一句话说清楚的游戏</div>
            </div>
          </div>

          <div style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--ink-2)' }}>
            <p>
              这个博客是我自己拿来思考的地方。它不追求"有用"，也不追求 SEO——
              所以你会看到正经文章、半成品笔记、失败实验、甚至偶尔的牢骚。
            </p>
            <p>
              我用 <code style={{ fontFamily: 'var(--mono)', fontSize: 13, padding: '1px 6px', background: 'var(--bg-sunk)', borderRadius: 3, color: 'var(--accent)' }}>fast-note-sync</code>
              {' '}从 Obsidian 直接推到这里。这套流程让我能把"想到 → 公开"的成本降到几秒。
            </p>
          </div>

          {/* timeline */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '40px 0 14px', letterSpacing: '.05em' }}>▸ 简历 (技术性) </div>
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, background: 'var(--line-strong)' }} />
            {[
              ['2024 — 现在', '独立开发', '在做一款 stealth + 解谜游戏 · Unity · 自研渲染 + AI'],
              ['2022 — 2024', 'Some Game Studio', '渲染工程师 · NPR / 角色管线 / 多平台优化'],
              ['2019 — 2022', '某互联网大厂', '客户端 · 偶尔写引擎 · 学到了"如何不被会议杀死"'],
              ['2015 — 2019', '某大学', '本科 · 计算机 · 写了第一个能动的 ECS'],
            ].map(([when, what, sub], i) => (
              <div key={i} style={{ position: 'relative', marginBottom: 16 }}>
                <span style={{
                  position: 'absolute', left: -24, top: 6,
                  width: 12, height: 12, borderRadius: '50%',
                  background: i === 0 ? 'var(--accent)' : 'var(--bg)',
                  border: '2px solid ' + (i === 0 ? 'var(--accent)' : 'var(--line-strong)'),
                }} />
                <div className="hf-mono hf-tiny hf-muted">{when}</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{what}</div>
                <div className="hf-sm hf-muted" style={{ marginTop: 2, lineHeight: 1.5 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* what I'm into */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '40px 0 14px', letterSpacing: '.05em' }}>▸ 现在感兴趣的</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              ['🎮', '游戏 AI', 'MCTS / 行为树 / LLM agents'],
              ['🎨', '渲染', 'NPR / GPU-Driven / 体积云'],
              ['🧠', '认知科学', '怎么让 NPC「看起来」会思考'],
            ].map(([ic, n, sub], i) => (
              <div key={i} className="hf-card" style={{ padding: 14 }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{ic}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{n}</div>
                <div className="hf-tiny hf-muted" style={{ marginTop: 3, lineHeight: 1.5 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* contact */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '40px 0 14px', letterSpacing: '.05em' }}>▸ 联系我</div>
          <div className="hf-card" style={{ padding: 18 }}>
            <div className="hf-sm" style={{ marginBottom: 12, lineHeight: 1.7 }}>
              <b style={{ color: 'var(--ink)' }}>请直接发邮件。</b>{' '}我读所有邮件，但回复速度很玄学——简短具体最容易得到回复。
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['📧 Email', 'hi@lumio.games', 'var(--accent)'],
                ['💬 Twitter / X', '@lumio_games', 'var(--ink-2)'],
                ['🐘 Mastodon', '@lumio@hachyderm.io', 'var(--ink-2)'],
                ['🐙 GitHub', '@lumio-games', 'var(--ink-2)'],
              ].map(([p, h, c], i) => (
                <div key={i} className="hf-hover" style={{
                  padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 6,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-3)', minWidth: 100 }}>{p}</span>
                  <span className="hf-mono hf-sm" style={{ color: c, fontWeight: 500 }}>{h}</span>
                  <div className="hf-grow" />
                  <HfIcon name="copy" size={11} color="var(--ink-3)" />
                </div>
              ))}
            </div>
          </div>

          {/* now playing */}
          <div className="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '40px 0 14px', letterSpacing: '.05em' }}>▸ /now</div>
          <div style={{
            padding: 16, borderLeft: '3px solid var(--accent)',
            background: 'var(--accent-soft)', borderRadius: '0 8px 8px 0',
            fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)',
          }}>
            正在重写我那游戏的 AI 模块。读 Browne 的 MCTS 综述。
            最近沉迷《Outer Wilds》，第三遍了。
            <div className="hf-mono hf-tiny hf-muted" style={{ marginTop: 8 }}>更新于 2026-04-30</div>
          </div>
        </div>
      </div>
    </HFBrowser>
  );
}

Object.assign(window, { HFRssPage, HFArticleAnalytics, HFBackupExport, HFSettings, HFAbout });
