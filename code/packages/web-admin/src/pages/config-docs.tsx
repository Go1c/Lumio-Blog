import { useState } from 'preact/hooks';

/**
 * Config Docs page (WS-H) — admin `#/config-docs`
 * 视觉对齐 doc/prototype/hf-config.jsx HFConfigDocs
 *
 * 4 sub-tab:
 *   - .env             环境变量
 *   - config.yaml      站点配置
 *   - features.yaml    功能开关
 *   - frontmatter      笔记前置元数据
 *
 * 内容直接引用自 doc/CONFIGURATION.md(权威字段说明)。
 */

export const CONFIG_TABS = ['env', 'config', 'features', 'frontmatter'] as const;
export type ConfigTabId = (typeof CONFIG_TABS)[number];

interface TabMeta {
  id: ConfigTabId;
  filename: string;
  hint: string;
}

const TABS: TabMeta[] = [
  { id: 'env',         filename: '.env',          hint: '密钥 / 集成 (gitignore)' },
  { id: 'config',      filename: 'config.yaml',   hint: '站点 / 主题 / SEO' },
  { id: 'features',    filename: 'features.yaml', hint: '功能开关 (UI 可改)' },
  { id: 'frontmatter', filename: 'frontmatter',   hint: '每篇文章可覆盖' },
];

interface FieldDoc {
  name: string;
  type: string;
  default: string;
  desc: string;
}

// ====== 内容 — 1:1 对齐 doc/CONFIGURATION.md ===============================

const ENV_EXAMPLE = `# 站点
SITE_URL=https://lumio.games
DATABASE_URL=sqlite:./data/index.db

# 同步
VAULT_PATH=/vault
SYNC_MODE=watch          # watch | git | manual
GIT_WEBHOOK_SECRET=…

# Auth(后台)
AUTH_SECRET=…            # 32+ random bytes
AUTH_PROVIDERS=github    # github | google | local

# 第三方
GISCUS_REPO=lumio/blog
BUTTONDOWN_API_KEY=…
PLAUSIBLE_DOMAIN=lumio.games

# Agent
MCP_TOKEN=…              # 给 agent 用的 bearer
`;

const ENV_FIELDS: FieldDoc[] = [
  { name: 'SITE_URL',           type: 'url',    default: '—',       desc: 'canonical URL,影响 RSS / OG / sitemap' },
  { name: 'DATABASE_URL',       type: 'string', default: 'sqlite',  desc: '存储后端连接串' },
  { name: 'VAULT_PATH',         type: 'path',   default: '—',       desc: 'Obsidian vault 挂载路径' },
  { name: 'SYNC_MODE',          type: 'enum',   default: 'watch',   desc: 'watch / git / manual' },
  { name: 'GIT_WEBHOOK_SECRET', type: 'string', default: '—',       desc: 'git push → rebuild 校验密钥' },
  { name: 'AUTH_SECRET',        type: 'string', default: '—',       desc: '后台 cookie 签名,32+ random bytes' },
  { name: 'AUTH_PROVIDERS',     type: 'enum',   default: 'github',  desc: 'github / google / local' },
  { name: 'MCP_TOKEN',          type: 'string', default: '—',       desc: 'agent bearer,与后台 cookie 隔离' },
];

const CONFIG_EXAMPLE = `site:
  title: "LumioGames blog"
  description: "在游戏 AI、渲染管线和引擎源码之间 <thinking/>"
  url: "https://lumio.games"
  locale: "zh-CN"
  timezone: "Asia/Shanghai"

author:
  name: "Lumio"
  email: "hi@lumio.games"
  avatar: "/static/avatar.png"
  bio_md: |
    在做一款独立游戏。喜欢渲染、游戏 AI 和不写完的代码。
  social:
    - { kind: "github",   handle: "@lumio-games" }
    - { kind: "twitter",  handle: "@lumio_games" }

theme:
  default: "auto"              # light | dark | auto
  accent: "#0066ff"
  font_serif: "Source Serif 4"
  font_mono: "JetBrains Mono"

seo:
  default_og_template: "minimal"
  twitter_card: "summary_large_image"
  robots: "index,follow"
  sitemap: true

home:
  hero_title_md: |
    在 [游戏 AI](/tags/game-ai)、渲染管线
    和引擎源码之间 \`<thinking/>\`
  hero_intro_md: |
    我是 **{{author.name}}**。
    这里是我用 Obsidian 写、通过 \`fast-note-sync\` 同步上来的文章和笔记。
  hero_cta_primary: "看最新文章"
  hero_cta_secondary: "逛笔记库"
  show_recent_posts: 6
  show_categories: true
`;

const CONFIG_FIELDS: FieldDoc[] = [
  { name: 'site.title',          type: 'string',  default: '—',         desc: '站点名,影响 meta / RSS / OG' },
  { name: 'site.url',            type: 'url',     default: '—',         desc: 'canonical,影响 sitemap / OG' },
  { name: 'site.description',    type: 'string',  default: '—',         desc: '<meta description> 默认值' },
  { name: 'site.locale',         type: 'string',  default: 'zh-CN',     desc: '<html lang>' },
  { name: 'site.timezone',       type: 'string',  default: 'UTC',       desc: '日期渲染用' },
  { name: 'author.name',         type: 'string',  default: '—',         desc: 'About / 文章署名' },
  { name: 'author.email',        type: 'email',   default: '—',         desc: '联系方式' },
  { name: 'author.bio_md',       type: 'md',      default: '—',         desc: 'About 页 bio' },
  { name: 'author.social[]',     type: 'list',    default: '[]',        desc: '{ kind, handle } 社交链接' },
  { name: 'theme.default',       type: 'enum',    default: 'auto',      desc: 'light / dark / auto' },
  { name: 'theme.accent',        type: 'hex',     default: '#0066ff',   desc: '改一个值,全站按钮 / 链接 / OG 跟着变' },
  { name: 'theme.font_serif',    type: 'string',  default: 'system',    desc: 'article 衬线字体' },
  { name: 'theme.font_mono',     type: 'string',  default: 'system',    desc: 'code 等宽字体' },
  { name: 'seo.default_og_template', type: 'enum', default: 'minimal',  desc: 'minimal / newspaper / terminal / magazine' },
  { name: 'seo.sitemap',         type: 'bool',    default: 'true',      desc: '生成 sitemap.xml' },
  { name: 'home.hero_title_md',  type: 'md',      default: '—',         desc: '首页 hero 标题(支持 [link](/x))' },
  { name: 'home.show_recent_posts', type: 'int',  default: '6',         desc: '首页文章流条数' },
];

const FEATURES_EXAMPLE = `# 全是布尔,默认 true。关掉 → 对应 UI 隐藏 / API 404
content:
  comments: true             # Giscus
  newsletter: true           # 第三方订阅
  rss: true
  graph: true                # 关系图
  search: true               # 站内搜索
  short_links: true

admin:
  analytics: true            # 单篇 Analytics
  media_library: true
  api_tokens: true
  webhooks: true
  og_generator: true

agent:
  cli_enabled: true          # Blog CLI
  mcp_enabled: true          # MCP server
  mcp_tools:
    - blog_search
    - blog_read
    - blog_write             # 写权限谨慎开
    - blog_patch_meta

webhooks:
  - { event: "post.published", url: "https://hooks..." }
  - { event: "post.updated",   url: "https://discord..." }
`;

const FEATURES_FIELDS: FieldDoc[] = [
  { name: 'content.comments',     type: 'bool',  default: 'true', desc: 'Giscus 评论' },
  { name: 'content.newsletter',   type: 'bool',  default: 'true', desc: '订阅邮件通讯' },
  { name: 'content.rss',          type: 'bool',  default: 'true', desc: 'RSS / Atom / JSON Feed' },
  { name: 'content.graph',        type: 'bool',  default: 'true', desc: '知识关系图' },
  { name: 'content.search',       type: 'bool',  default: 'true', desc: '站内搜索' },
  { name: 'content.short_links',  type: 'bool',  default: 'true', desc: '短链 lmg.sh/xxx' },
  { name: 'admin.analytics',      type: 'bool',  default: 'true', desc: '单篇 Analytics 页' },
  { name: 'admin.media_library',  type: 'bool',  default: 'true', desc: '媒体库' },
  { name: 'admin.api_tokens',     type: 'bool',  default: 'true', desc: 'API tokens 管理' },
  { name: 'admin.webhooks',       type: 'bool',  default: 'true', desc: 'Webhook 管理' },
  { name: 'admin.og_generator',   type: 'bool',  default: 'true', desc: 'OG 图生成器' },
  { name: 'agent.cli_enabled',    type: 'bool',  default: 'true', desc: 'Blog CLI 入口' },
  { name: 'agent.mcp_enabled',    type: 'bool',  default: 'true', desc: 'MCP server 暴露' },
  { name: 'agent.mcp_tools',      type: 'list',  default: 'all',  desc: '允许 agent 调用的工具集' },
];

const FRONTMATTER_EXAMPLE = `---
title: "用 MCTS + LLM 给 RTS 做战术决策"
slug: "mcts-llm-rts"            # 默认从文件路径生成
summary: "把 LLM 当 policy network 试一下..."
cover: "/static/covers/mcts.png"
tags: [游戏 AI, MCTS, 引擎]

# 可见性 — 4 档
visibility: public              # public | unlisted | link-only | private
searchable: true                # 默认跟随 visibility,可单独覆盖

# 短链 — public/unlisted 自动分配,可手动覆盖
short_id: g7k2x

# 状态
draft: false
scheduled_at: null              # ISO 8601;设了即定时发布

# 时间(同步时自动写入,可手动覆盖)
created_at: 2025-04-28T10:23:00+08:00
updated_at: 2025-04-30T14:11:00+08:00

# 可选 — 文章设定
toc: true                       # false 关闭目录
comments: true                  # 单篇关闭评论
og_template: "newspaper"        # 覆盖默认 OG 模板
---
`;

const FRONTMATTER_FIELDS: FieldDoc[] = [
  { name: 'title',          type: 'string',         default: '必填',        desc: '文章标题' },
  { name: 'slug',           type: 'string',         default: '文件路径',    desc: 'URL 段' },
  { name: 'summary',        type: 'string | null',  default: 'null',        desc: '列表页摘要;不填则取正文前 N 字' },
  { name: 'cover',          type: 'string | null',  default: 'null',        desc: '封面图 URL' },
  { name: 'tags',           type: 'string[]',       default: '[]',          desc: '标签数组' },
  { name: 'visibility',     type: 'enum',           default: 'public',      desc: 'public / unlisted / link-only / private' },
  { name: 'searchable',     type: 'bool',           default: '跟随 visibility', desc: '是否进搜索索引' },
  { name: 'short_id',       type: 'string | null',  default: '自动',        desc: '5 位 base32 短链 ID' },
  { name: 'draft',          type: 'bool',           default: 'false',       desc: 'true 时仅后台可见' },
  { name: 'scheduled_at',   type: 'ISODate | null', default: 'null',        desc: '到点自动 unfurl draft' },
  { name: 'toc',            type: 'bool',           default: '跟随全局',    desc: '是否显示目录' },
  { name: 'comments',       type: 'bool',           default: '跟随全局',    desc: '单篇覆盖评论开关' },
  { name: 'og_template',    type: 'enum',           default: '跟随全局',    desc: '单篇 OG 模板覆盖' },
];

// ====== Render =============================================================

const TAB_DATA: Record<ConfigTabId, { example: string; fields: FieldDoc[]; lang: string }> = {
  env: { example: ENV_EXAMPLE,    fields: ENV_FIELDS,    lang: 'bash' },
  config: { example: CONFIG_EXAMPLE,  fields: CONFIG_FIELDS,  lang: 'yaml' },
  features: { example: FEATURES_EXAMPLE, fields: FEATURES_FIELDS, lang: 'yaml' },
  frontmatter: { example: FRONTMATTER_EXAMPLE, fields: FRONTMATTER_FIELDS, lang: 'yaml' },
};

const SOURCE_URL =
  'https://github.com/cui/Lumio-Blog/blob/ws-0/foundation/doc/CONFIGURATION.md';

export function ConfigDocsPage() {
  const [tab, setTab] = useState<ConfigTabId>('env');
  const [copied, setCopied] = useState(false);

  const meta = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  const data = TAB_DATA[tab];

  const onCopy = () => {
    void navigator.clipboard
      .writeText(data.example)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => undefined);
  };

  return (
    <div class="wsh-config">
      <Styles />

      <header class="wsh-config__hero">
        <div class="hf-mono hf-tiny hf-muted">配置即文档 · 自部署指南</div>
        <h1 class="wsh-config__title">配置文件参考</h1>
        <p class="wsh-config__lead">
          仓库根目录会读 3 个配置文件 + 笔记自身的 frontmatter。
          下面 4 个 tab 一一对应 — 大部分选项也能在
          {' '}<a href="#/settings/site">/admin/settings</a> 里改。
        </p>
      </header>

      {/* Sub-tabs */}
      <div class="wsh-config__tabs" role="tablist" aria-label="配置类型">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === tab ? 'true' : 'false'}
            aria-controls={`wsh-config-panel-${t.id}`}
            class={`wsh-config__tab ${t.id === tab ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <code class="wsh-config__tab-name">{t.filename}</code>
            <span class="wsh-config__tab-hint hf-mono hf-tiny">· {t.hint}</span>
          </button>
        ))}
      </div>

      {/* File path bar + copy */}
      <div class="wsh-config__bar">
        <span aria-hidden="true">📄</span>
        <span class="hf-mono hf-tiny">~/blog/{meta.filename}</span>
        <span class="hf-grow" />
        <span class="hf-mono hf-tiny hf-faint">
          {tab === 'env'
            ? '.env · gitignore'
            : tab === 'frontmatter'
            ? 'YAML frontmatter · 写在 .md 顶部'
            : `YAML · ${tab === 'features' ? '后台可改' : '静态启动配置'}`}
        </span>
        <button
          type="button"
          class="wsh-config__copy"
          onClick={onCopy}
          aria-label={`复制 ${meta.filename} 示例`}
        >
          <span aria-hidden="true">📋 </span>
          {copied ? '已复制' : '复制示例'}
        </button>
      </div>

      {/* Code block */}
      <pre
        class="wsh-config__code"
        id={`wsh-config-panel-${tab}`}
        role="tabpanel"
        aria-label={`${meta.filename} 示例`}
      >
        <code class={`language-${data.lang}`}>{data.example}</code>
      </pre>

      {/* Field reference */}
      <h2 class="wsh-config__sec-h">▸ 字段说明</h2>
      <div class="wsh-config__table-wrap">
        <table class="wsh-config__table">
          <thead>
            <tr>
              <th>字段</th>
              <th>类型</th>
              <th>默认</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            {data.fields.map((f) => (
              <tr key={f.name}>
                <td><code>{f.name}</code></td>
                <td><span class="hf-mono hf-tiny">{f.type}</span></td>
                <td><span class="hf-mono hf-tiny hf-muted">{f.default}</span></td>
                <td>{f.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer — source link */}
      <div class="wsh-config__footer">
        <span class="hf-mono hf-tiny hf-muted">📜 完整 schema:</span>
        <a class="wsh-config__source" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
          ↗ View source · doc/CONFIGURATION.md
        </a>
      </div>
    </div>
  );
}

// ====== Inline styles — 与 ws-e 视觉对齐 ====================================

function Styles() {
  return <style>{STYLE}</style>;
}

const STYLE = `
.wsh-config {
  padding: 24px 28px;
  max-width: 1080px;
}
.wsh-config__hero { margin-bottom: 24px; }
.wsh-config__title {
  font-size: 30px; font-weight: 800; margin: 6px 0 8px;
  letter-spacing: -0.01em;
}
.wsh-config__lead {
  font-size: 14px; color: var(--ink-3); line-height: 1.7;
  margin: 0; max-width: 720px;
}
.wsh-config__lead a { color: var(--accent); }

/* tabs */
.wsh-config__tabs {
  display: flex; gap: 4px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 0;
  overflow-x: auto;
}
.wsh-config__tab {
  padding: 10px 16px; cursor: pointer;
  border: 0; background: transparent;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  color: var(--ink-2); font-size: 13px;
  white-space: nowrap;
  display: inline-flex; align-items: center; gap: 8px;
  font-family: inherit;
}
.wsh-config__tab:hover { color: var(--ink); }
.wsh-config__tab.is-active {
  border-bottom-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
.wsh-config__tab-name {
  font-family: var(--mono); font-size: 12px;
  background: none; padding: 0; color: inherit;
}
.wsh-config__tab-hint { color: var(--ink-4); font-weight: 400; }
.wsh-config__tab.is-active .wsh-config__tab-hint { color: var(--accent); opacity: .75; }

/* file bar */
.wsh-config__bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  background: var(--bg-soft); color: var(--ink);
  border: 1px solid var(--line);
  border-top-left-radius: 8px; border-top-right-radius: 8px;
  border-bottom: 0;
  margin-top: 16px;
}
.wsh-config__copy {
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--line);
  font: inherit;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  color: var(--ink-2);
  min-height: 26px;
}
.wsh-config__copy:hover {
  background: var(--bg);
  color: var(--ink);
  border-color: var(--accent);
}

/* code block */
.wsh-config__code {
  margin: 0 0 24px;
  padding: 16px 20px;
  background: var(--bg-sunk);
  color: var(--ink);
  border: 1px solid var(--line);
  border-top: 0;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.75;
  overflow-x: auto;
  white-space: pre;
}
.wsh-config__code code {
  background: none;
  padding: 0;
  font: inherit;
  color: inherit;
}

.wsh-config__sec-h {
  font-size: 13px; font-weight: 600;
  margin: 24px 0 10px;
  color: var(--ink);
}

/* table */
.wsh-config__table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  margin-bottom: 24px;
}
.wsh-config__table {
  width: 100%; border-collapse: collapse;
}
.wsh-config__table th, .wsh-config__table td {
  text-align: left; padding: 8px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
  vertical-align: top;
}
.wsh-config__table thead th {
  font-family: var(--mono); font-size: 11px;
  text-transform: uppercase;
  color: var(--ink-4);
  letter-spacing: 0.05em;
  background: var(--bg-soft);
}
.wsh-config__table tbody tr:last-child td { border-bottom: 0; }
.wsh-config__table code {
  font-family: var(--mono); font-size: 12px;
  background: none; padding: 0;
  color: var(--accent);
}

.wsh-config__footer {
  margin-top: 24px;
  padding: 16px 0;
  border-top: 1px solid var(--line);
  display: flex; align-items: center; gap: 10px;
  flex-wrap: wrap;
}
.wsh-config__source {
  font-family: var(--mono); font-size: 12px;
  color: var(--accent);
}

@media (max-width: 760px) {
  .wsh-config { padding: 16px 14px; }
  .wsh-config__title { font-size: 24px; }
}
`;
