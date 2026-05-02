/* global React, HFBrowser, HfIcon, HfNav */

const { useState: useStateCfg } = React;

// ============================================================
// 19. CONFIG DOCS — 开源用户的配置参考
// ============================================================
function HFConfigDocs({ theme = 'light', onTheme }) {
  const [tab, setTab] = useStateCfg('config');

  // syntax-color tokens for yaml/env
  const T = {
    key: '#0066ff',
    str: '#16a34a',
    num: '#ca8a04',
    bool: '#a855f7',
    comment: '#9ca3af',
    section: '#dc2626',
    fg: theme === 'dark' ? '#e5e5e5' : '#0a0a0a',
    bg: theme === 'dark' ? '#0f0f0f' : '#fafafa',
    line: theme === 'dark' ? '#262626' : '#e5e5e5',
  };

  // helpers
  const C = ({ children }) => <span style={{ color: T.comment, fontStyle: 'italic' }}>{children}</span>;
  const K = ({ children }) => <span style={{ color: T.key, fontWeight: 500 }}>{children}</span>;
  const S = ({ children }) => <span style={{ color: T.str }}>{children}</span>;
  const N = ({ children }) => <span style={{ color: T.num }}>{children}</span>;
  const B = ({ children }) => <span style={{ color: T.bool }}>{children}</span>;
  const Sec = ({ children }) => <span style={{ color: T.section, fontWeight: 700 }}>{children}</span>;

  const tabs = [
    { id: 'config', name: 'config.yaml', sub: '站点 / 主题 / 内容默认' },
    { id: 'features', name: 'features.yaml', sub: '功能开关 (UI 可改)' },
    { id: 'env', name: '.env', sub: '密钥 / 集成 (不入 git)' },
    { id: 'frontmatter', name: 'frontmatter', sub: '每篇文章可覆盖' },
  ];

  return (
    <HFBrowser url="docs.lumiogames.dev/configuration" height={820} theme={theme}>
      <HfNav active="文档" theme={theme} onTheme={onTheme} />
      <div style={{ overflow: 'auto', height: 'calc(100% - 56px)' }} className="hf">
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px' }}>

          {/* hero */}
          <div className="hf-mono hf-tiny hf-muted" style={{ marginBottom: 4 }}>📦 开源 · 自部署指南</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            配置文件参考
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.7, marginBottom: 28, maxWidth: 720 }}>
            克隆仓库后，复制 <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)' }}>config.example.yaml</code> 为
            <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)' }}> config.yaml</code>，按需修改即可启动。
            大部分选项也能在后台 UI 改 → <code style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>/admin/settings</code>。
          </p>

          {/* tabs */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 16, overflowX: 'auto' }}>
            {tabs.map(t => (
              <div key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '10px 16px', cursor: 'pointer',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1, color: tab === t.id ? 'var(--accent)' : 'var(--ink-2)',
                fontWeight: tab === t.id ? 600 : 400, fontSize: 13,
                whiteSpace: 'nowrap',
              }}>
                <code style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{t.name}</code>
                <span className="hf-mono hf-tiny" style={{ marginLeft: 8, color: 'var(--ink-4)', fontWeight: 400 }}>· {t.sub}</span>
              </div>
            ))}
          </div>

          {/* file path bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0,
            padding: '8px 14px', background: T.bg, color: T.fg,
            border: `1px solid ${T.line}`, borderTopLeftRadius: 8, borderTopRightRadius: 8,
            borderBottom: 0, fontFamily: 'var(--mono)', fontSize: 11,
          }}>
            <HfIcon name="doc" size={11} color={T.fg} />
            <span>~/blog/{tabs.find(x => x.id === tab).name}</span>
            <div className="hf-grow" />
            <span style={{ color: T.comment }}>{
              tab === 'config' ? 'YAML · 静态启动配置' :
              tab === 'features' ? 'YAML · 后台可改' :
              tab === 'env' ? '.env · gitignore' :
              'YAML frontmatter · 写在 .md 顶部'
            }</span>
            <span style={{ cursor: 'pointer', color: T.comment }}>📋 复制</span>
          </div>

          {/* code area */}
          <pre style={{
            margin: 0, padding: '16px 20px',
            background: T.bg, color: T.fg,
            border: `1px solid ${T.line}`, borderTop: 0,
            borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
            fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.75,
            overflow: 'auto',
          }}>

            {/* ============ config.yaml ============ */}
            {tab === 'config' && (<>
              <C># ============================================================{'\n'}</C>
              <C># 站点 — 部署后必须改的{'\n'}</C>
              <C># ============================================================{'\n'}</C>
              <Sec>site:</Sec>{'\n'}
              {'  '}<K>name</K>: <S>"LumioGames"</S>{'              '}<C># 顶栏 + meta + RSS</C>{'\n'}
              {'  '}<K>tagline</K>: <S>"游戏开发 / 渲染 / AI 的练习场"</S>{'\n'}
              {'  '}<K>description</K>: <S>"&lt;meta description&gt; 默认值"</S>{'\n'}
              {'  '}<K>url</K>: <S>"https://lumiogames.dev"</S>{'  '}<C># canonical, 影响 RSS / OG / sitemap</C>{'\n'}
              {'  '}<K>locale</K>: <S>"zh-CN"</S>{'\n'}
              {'  '}<K>timezone</K>: <S>"Asia/Shanghai"</S>{'\n'}
              {'  '}<K>logo</K>: <S>"/static/logo.svg"</S>{'    '}<C># 留空则显示首字母方块</C>{'\n'}
              {'  '}<K>favicon</K>: <S>"/static/favicon.png"</S>{'\n'}
              {'  '}<K>footer_html</K>: <S>"© 2026 Lumio · 备案号 京ICP备XXX"</S>{'\n'}
              {'\n'}
              <C># 主导航 (顶部菜单)，留空数组则隐藏导航{'\n'}</C>
              {'  '}<K>nav</K>:{'\n'}
              {'    - { '}<K>label</K>: <S>"首页"</S>, <K>href</K>: <S>"/"</S>, <K>icon</K>: <S>"home"</S> }{'\n'}
              {'    - { '}<K>label</K>: <S>"文章"</S>, <K>href</K>: <S>"/posts"</S>, <K>icon</K>: <S>"doc"</S> }{'\n'}
              {'    - { '}<K>label</K>: <S>"笔记"</S>, <K>href</K>: <S>"/notes"</S>, <K>icon</K>: <S>"note"</S> }{'\n'}
              {'    - { '}<K>label</K>: <S>"标签"</S>, <K>href</K>: <S>"/tags"</S>, <K>icon</K>: <S>"tag"</S> }{'\n'}
              {'    - { '}<K>label</K>: <S>"关于"</S>, <K>href</K>: <S>"/about"</S> }{'\n'}
              {'\n'}

              <C># ============================================================{'\n'}</C>
              <C># 作者{'\n'}</C>
              <C># ============================================================{'\n'}</C>
              <Sec>author:</Sec>{'\n'}
              {'  '}<K>name</K>: <S>"Lumio"</S>{'\n'}
              {'  '}<K>email</K>: <S>"hi@lumio.games"</S>{'\n'}
              {'  '}<K>avatar</K>: <S>"/static/avatar.png"</S>{'\n'}
              {'  '}<K>bio_md</K>: <S>|</S>{'\n'}
              {'    在做一款独立游戏。喜欢渲染、游戏 AI 和不写完的代码。'}{'\n'}
              {'  '}<K>social</K>:{'\n'}
              {'    - { '}<K>kind</K>: <S>"github"</S>, <K>handle</K>: <S>"@lumio-games"</S> }{'\n'}
              {'    - { '}<K>kind</K>: <S>"twitter"</S>, <K>handle</K>: <S>"@lumio_games"</S> }{'\n'}
              {'    - { '}<K>kind</K>: <S>"mastodon"</S>, <K>handle</K>: <S>"@lumio@hachyderm.io"</S> }{'\n'}
              {'    - { '}<K>kind</K>: <S>"email"</S>, <K>handle</K>: <S>"hi@lumio.games"</S> }{'\n'}
              {'\n'}

              <C># ============================================================{'\n'}</C>
              <C># 主题{'\n'}</C>
              <C># ============================================================{'\n'}</C>
              <Sec>theme:</Sec>{'\n'}
              {'  '}<K>accent</K>: <S>"#0066ff"</S>{'              '}<C># 主色，影响按钮/链接/标签</C>{'\n'}
              {'  '}<K>accent_2</K>: <S>"#a855f7"</S>{'            '}<C># 次主色，渐变里用</C>{'\n'}
              {'  '}<K>default_mode</K>: <S>"auto"</S>{'           '}<C># light / dark / auto</C>{'\n'}
              {'  '}<K>font_sans</K>: <S>"system-ui, -apple-system, 'PingFang SC', sans-serif"</S>{'\n'}
              {'  '}<K>font_mono</K>: <S>"'JetBrains Mono', monospace"</S>{'\n'}
              {'  '}<K>article_max_width</K>: <N>720</N>{'           '}<C># px</C>{'\n'}
              {'  '}<K>code_theme_light</K>: <S>"github-light"</S>{'\n'}
              {'  '}<K>code_theme_dark</K>: <S>"one-dark"</S>{'\n'}
              {'  '}<K>mermaid_theme</K>: <S>"neutral"</S>{'\n'}
              {'  '}<K>hero_animation</K>: <B>true</B>{'              '}<C># 首页背景模糊球</C>{'\n'}
              {'  '}<K>show_reading_progress</K>: <B>true</B>{'\n'}
              {'\n'}

              <C># ============================================================{'\n'}</C>
              <C># 内容默认值 — 每篇文章 frontmatter 可覆盖{'\n'}</C>
              <C># ============================================================{'\n'}</C>
              <Sec>content:</Sec>{'\n'}
              {'  '}<K>default_visibility</K>: <S>"public"</S>{'    '}<C># public / link / private</C>{'\n'}
              {'  '}<K>default_indexable</K>: <B>true</B>{'           '}<C># 是否被搜索引擎索引</C>{'\n'}
              {'  '}<K>default_comments</K>: <B>true</B>{'\n'}
              {'  '}<K>default_og</K>: <B>true</B>{'                 '}<C># 自动生成 OG 图</C>{'\n'}
              {'  '}<K>og_template</K>: <S>"classic"</S>{'           '}<C># classic / gradient / code / minimal</C>{'\n'}
              {'  '}<K>license</K>: <S>"CC-BY-NC-SA-4.0"</S>{'      '}<C># 文章底部显示</C>{'\n'}
              {'  '}<K>reading_speed_cpm</K>: <N>500</N>{'             '}<C># 中文字符 / 分钟，估算阅读时长</C>{'\n'}
              {'  '}<K>show_backlinks</K>: <B>true</B>{'              '}<C># 文章底部反向链接图</C>{'\n'}
              {'  '}<K>short_link_domain</K>: <S>"lmg.sh"</S>{'        '}<C># 留空则用主域名 /s/xxxx</C>{'\n'}
              {'  '}<K>short_link_length</K>: <N>4</N>{'\n'}
              {'\n'}

              <C># ============================================================{'\n'}</C>
              <C># 首页 hero (Markdown 模板，{'{{author}}'} 等会被替换){'\n'}</C>
              <C># ============================================================{'\n'}</C>
              <Sec>home:</Sec>{'\n'}
              {'  '}<K>hero_title_md</K>: <S>|</S>{'\n'}
              {'    在 [游戏 AI](/tags/game-ai)、渲染管线'}{'\n'}
              {'    和引擎源码之间 `&lt;thinking/&gt;`'}{'\n'}
              {'  '}<K>hero_intro_md</K>: <S>|</S>{'\n'}
              {'    我是 **'}{'{{author.name}}'}{'**。'}{'\n'}
              {'    这里是我用 Obsidian 写、通过 `fast-note-sync` 同步上来的文章和笔记。'}{'\n'}
              {'  '}<K>hero_cta_primary</K>: <S>"看最新文章"</S>{'\n'}
              {'  '}<K>hero_cta_secondary</K>: <S>"逛笔记库"</S>{'\n'}
              {'  '}<K>show_recent_posts</K>: <N>6</N>{'\n'}
              {'  '}<K>show_categories</K>: <B>true</B>{'\n'}
            </>)}

            {/* ============ features.yaml ============ */}
            {tab === 'features' && (<>
              <C># ============================================================{'\n'}</C>
              <C># 功能开关 — 在后台 /admin/settings 改也行，会写回这里{'\n'}</C>
              <C># ============================================================{'\n'}</C>
              <Sec>comments:</Sec>{'\n'}
              {'  '}<K>provider</K>: <S>"giscus"</S>{'      '}<C># off / giscus / utterances / webmention / native</C>{'\n'}
              {'  '}<K>repo</K>: <S>"lumio-games/blog-comments"</S>{'\n'}
              {'  '}<K>category_id</K>: <S>"DIC_xxx"</S>{'\n'}
              {'\n'}
              <Sec>newsletter:</Sec>{'\n'}
              {'  '}<K>provider</K>: <S>"buttondown"</S>{'   '}<C># off / buttondown / resend / smtp</C>{'\n'}
              {'  '}<K>cadence</K>: <S>"weekly"</S>{'\n'}
              {'  '}<K>welcome_template</K>: <S>"templates/welcome.md"</S>{'\n'}
              {'  '}<K>send_on_publish</K>: <B>false</B>{'      '}<C># 发布新文章自动推送</C>{'\n'}
              {'\n'}
              <Sec>analytics:</Sec>{'\n'}
              {'  '}<K>provider</K>: <S>"plausible"</S>{'    '}<C># off / ga / plausible / umami / native</C>{'\n'}
              {'  '}<K>domain</K>: <S>"lumiogames.dev"</S>{'\n'}
              {'  '}<K>respect_dnt</K>: <B>true</B>{'           '}<C># Do Not Track</C>{'\n'}
              {'\n'}
              <Sec>search:</Sec>{'\n'}
              {'  '}<K>provider</K>: <S>"native"</S>{'       '}<C># off / lunr / native / algolia / meilisearch</C>{'\n'}
              {'  '}<K>index_drafts</K>: <B>false</B>{'\n'}
              {'  '}<K>index_link_only</K>: <B>false</B>{'      '}<C># 仅链接的笔记是否进搜索</C>{'\n'}
              {'\n'}
              <Sec>rss:</Sec>{'\n'}
              {'  '}<K>enabled</K>: <B>true</B>{'\n'}
              {'  '}<K>full_content</K>: <B>true</B>{'         '}<C># false = 只放摘要</C>{'\n'}
              {'  '}<K>include_notes</K>: <B>false</B>{'        '}<C># notes 是否进 RSS</C>{'\n'}
              {'  '}<K>limit</K>: <N>30</N>{'\n'}
              {'\n'}
              <Sec>sitemap:</Sec>{'\n'}
              {'  '}<K>enabled</K>: <B>true</B>{'\n'}
              {'  '}<K>include_link_only</K>: <B>false</B>{'    '}<C># 仅链接笔记 → 默认不在 sitemap</C>{'\n'}
              {'\n'}
              <Sec>graph:</Sec>{'\n'}
              {'  '}<K>enabled</K>: <B>true</B>{'             '}<C># 知识关系图</C>{'\n'}
              {'  '}<K>include_orphans</K>: <B>true</B>{'\n'}
              {'\n'}
              <Sec>cli:</Sec>{'\n'}
              {'  '}<K>mcp_enabled</K>: <B>true</B>{'         '}<C># 暴露 MCP server，给 agent 调用</C>{'\n'}
              {'  '}<K>mcp_tools</K>:{'\n'}
              {'    - '}<S>blog_search</S>{'\n'}
              {'    - '}<S>blog_read</S>{'\n'}
              {'    - '}<S>blog_write</S>{'             '}<C># 写权限谨慎开</C>{'\n'}
              {'    - '}<S>blog_patch_meta</S>{'\n'}
              {'\n'}
              <Sec>webhooks:</Sec>{'\n'}
              {'    - { '}<K>event</K>: <S>"post.published"</S>, <K>url</K>: <S>"https://hooks..."</S> }{'\n'}
              {'    - { '}<K>event</K>: <S>"post.updated"</S>,   <K>url</K>: <S>"https://discord..."</S> }{'\n'}
            </>)}

            {/* ============ .env ============ */}
            {tab === 'env' && (<>
              <C># ============================================================{'\n'}</C>
              <C># .env — 密钥 / token，加入 .gitignore，不要 commit{'\n'}</C>
              <C># ============================================================{'\n'}</C>
              {'\n'}
              <C># --- 必填 ---{'\n'}</C>
              <K>SECRET_KEY</K>=<S>"用 `openssl rand -hex 32` 生成"</S>{'\n'}
              <K>ADMIN_PASSWORD_HASH</K>=<S>"argon2id$..."</S>{'\n'}
              {'\n'}
              <C># --- 数据源 (二选一) ---{'\n'}</C>
              <K>CONTENT_SOURCE</K>=<S>"git"</S>{'                '}<C># git / fast-note-sync / local / notion</C>{'\n'}
              <K>CONTENT_REPO</K>=<S>"git@github.com:you/notes.git"</S>{'\n'}
              <K>CONTENT_BRANCH</K>=<S>"main"</S>{'\n'}
              <C>#  --- 或 ---{'\n'}</C>
              <C># </C><K>FAST_NOTE_SYNC_TOKEN</K>=<S>"fns_..."</S>{'\n'}
              {'\n'}
              <C># --- 媒体存储 (Cloudflare R2) ---{'\n'}</C>
              <K>R2_ACCOUNT_ID</K>=<S>""</S>{'\n'}
              <K>R2_BUCKET</K>=<S>"my-blog-media"</S>{'\n'}
              <K>R2_ACCESS_KEY_ID</K>=<S>""</S>{'\n'}
              <K>R2_SECRET_ACCESS_KEY</K>=<S>""</S>{'\n'}
              <K>R2_PUBLIC_URL</K>=<S>"https://media.example.dev"</S>{'  '}<C># CDN 域名</C>{'\n'}
              {'\n'}
              <C># --- 评论 (按 features.yaml 选择填) ---{'\n'}</C>
              <K>GISCUS_REPO_ID</K>=<S>""</S>{'\n'}
              <K>GISCUS_CATEGORY_ID</K>=<S>""</S>{'\n'}
              {'\n'}
              <C># --- Newsletter ---{'\n'}</C>
              <K>BUTTONDOWN_API_KEY</K>=<S>""</S>{'\n'}
              <C># </C><K>RESEND_API_KEY</K>=<S>""</S>{'\n'}
              <C># </C><K>SMTP_HOST</K>=<S>""</S>{'  '}<K>SMTP_USER</K>=<S>""</S>{'  '}<K>SMTP_PASS</K>=<S>""</S>{'\n'}
              {'\n'}
              <C># --- Analytics ---{'\n'}</C>
              <C># </C><K>PLAUSIBLE_DOMAIN</K>=<S>""</S>{'\n'}
              <C># </C><K>UMAMI_ID</K>=<S>""</S>{'\n'}
              {'\n'}
              <C># --- 搜索 (可选) ---{'\n'}</C>
              <C># </C><K>ALGOLIA_APP_ID</K>=<S>""</S>{'  '}<K>ALGOLIA_ADMIN_KEY</K>=<S>""</S>{'\n'}
              <C># </C><K>MEILI_HOST</K>=<S>""</S>{'  '}<K>MEILI_KEY</K>=<S>""</S>{'\n'}
              {'\n'}
              <C># --- 短链 (可选) ---{'\n'}</C>
              <K>SHORT_LINK_DOMAIN</K>=<S>"lmg.sh"</S>{'        '}<C># 留空则用主域 /s/xxxx</C>{'\n'}
              {'\n'}
              <C># --- 部署 ---{'\n'}</C>
              <K>PORT</K>=<N>3000</N>{'\n'}
              <K>NODE_ENV</K>=<S>"production"</S>{'\n'}
              <K>DATABASE_URL</K>=<S>"sqlite://./data/blog.db"</S>{'\n'}
            </>)}

            {/* ============ frontmatter ============ */}
            {tab === 'frontmatter' && (<>
              <C># ============================================================{'\n'}</C>
              <C># Markdown 文件顶部的 frontmatter — 每篇可覆盖站点默认值{'\n'}</C>
              <C># 文件路径: posts/2026-04-28-mcts-llm-rts.md{'\n'}</C>
              <C># ============================================================{'\n'}</C>
              <S>---</S>{'\n'}
              <C># --- 必填 ---{'\n'}</C>
              <K>title</K>: <S>"用 MCTS + LLM 给 RTS 做战术决策"</S>{'\n'}
              <K>date</K>: <S>2026-04-28</S>{'                          '}<C># 发布日期</C>{'\n'}
              {'\n'}
              <C># --- 内容元 ---{'\n'}</C>
              <K>description</K>: <S>"把 MCTS rollout 阶段交给 LLM..."</S>{'\n'}
              <K>tags</K>: [<S>"游戏 AI"</S>, <S>"MCTS"</S>, <S>"LLM"</S>]{'\n'}
              <K>category</K>: <S>"游戏 AI 笔谈"</S>{'\n'}
              <K>cover</K>: <S>"/posts/2026/04/cover.png"</S>{'\n'}
              {'\n'}
              <C># --- 可见性 (覆盖 content.default_visibility) ---{'\n'}</C>
              <K>visibility</K>: <S>public</S>{'                       '}<C># public / link / private / draft</C>{'\n'}
              <K>indexable</K>: <B>true</B>{'                          '}<C># 搜索引擎是否索引</C>{'\n'}
              <K>publish_at</K>: <S>"2026-05-04 09:00"</S>{'         '}<C># 定时发布，留空 = 立刻</C>{'\n'}
              <K>unpublish_at</K>: <S>null</S>{'                      '}<C># 自动下线，留空 = 永远在</C>{'\n'}
              <K>short_link</K>: <S>"x9k2"</S>{'                      '}<C># 留空 = 自动生成</C>{'\n'}
              {'\n'}
              <C># --- 行为开关 (覆盖 content / features 默认) ---{'\n'}</C>
              <K>comments</K>: <B>true</B>{'\n'}
              <K>og</K>: <B>true</B>{'                                '}<C># 是否生成 OG 图</C>{'\n'}
              <K>og_template</K>: <S>"gradient"</S>{'                '}<C># 覆盖站点默认模板</C>{'\n'}
              <K>license</K>: <S>"CC-BY-NC-SA-4.0"</S>{'\n'}
              <K>toc</K>: <B>true</B>{'                               '}<C># 目录</C>{'\n'}
              <K>show_backlinks</K>: <B>true</B>{'\n'}
              <K>show_reading_time</K>: <B>true</B>{'\n'}
              {'\n'}
              <C># --- 关系 (Obsidian / wiki link 兼容) ---{'\n'}</C>
              <K>aliases</K>: [<S>"mcts-rts"</S>, <S>"llm-tactical"</S>]{'\n'}
              <K>related</K>: [<S>"goap-vs-mcts"</S>, <S>"llm-game-ai"</S>]{'\n'}
              {'\n'}
              <C># --- 自定义字段 (你想加什么都行) ---{'\n'}</C>
              <K>custom</K>:{'\n'}
              {'  '}<K>repo</K>: <S>"https://github.com/lumio-games/mcts-demo"</S>{'\n'}
              {'  '}<K>video</K>: <S>"https://youtu.be/xxx"</S>{'\n'}
              <S>---</S>{'\n'}
              {'\n'}
              <C># 然后正文 markdown ↓{'\n'}</C>
              {'\n'}
              # TL;DR{'\n'}
              {'\n'}
              把 MCTS rollout 阶段交给 LLM ...{'\n'}
            </>)}
          </pre>

          {/* sidebar callouts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20 }}>
            <div className="hf-card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>🎨</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>主题色快速换</span>
              </div>
              <p className="hf-tiny hf-muted" style={{ margin: 0, lineHeight: 1.6 }}>
                改 <code style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>theme.accent</code> 一个值，全站按钮 / 链接 / 标签 / OG 图渐变全部跟着变。
              </p>
            </div>

            <div className="hf-card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>🔌</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>三档式 provider</span>
              </div>
              <p className="hf-tiny hf-muted" style={{ margin: 0, lineHeight: 1.6 }}>
                comments / newsletter / analytics / search 都是「off / 第三方 / 自建」三档，开箱即用，按需付费。
              </p>
            </div>

            <div className="hf-card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>⚙️</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>UI ↔ 文件双向同步</span>
              </div>
              <p className="hf-tiny hf-muted" style={{ margin: 0, lineHeight: 1.6 }}>
                <code style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>features.yaml</code> 在后台 UI 改会写回文件，方便 git 追踪历史。
              </p>
            </div>
          </div>

          {/* footer */}
          <div style={{ marginTop: 28, padding: '16px 0', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="hf-mono hf-tiny hf-muted">📜 完整 schema:</span>
            <a style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)' }}>↗ docs/configuration.md</a>
            <span className="hf-faint">·</span>
            <a style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)' }}>↗ JSON Schema (auto-complete)</a>
            <div className="hf-grow" />
            <span className="hf-tag" style={{ fontSize: 10 }}>v0.4.2 · MIT</span>
          </div>

        </div>
      </div>
    </HFBrowser>
  );
}

Object.assign(window, { HFConfigDocs });
