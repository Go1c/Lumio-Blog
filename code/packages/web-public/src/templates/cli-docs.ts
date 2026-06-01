import type { SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';

/**
 * CLI Docs 页 — public `/cli/`
 * 对应设计稿: doc/prototype/hf-cli.jsx HFBlogCli
 *
 * 4 个 section:
 *   1. Quick start (install + first command)
 *   2. 命令表 (blog new / visibility / publish / query / stats / short-link)
 *   3. MCP server 接入(暴露的 tools 列表)
 *   4. 实战示例(几个 agent prompt)
 *
 * 内容来源:doc/FEATURES.md "Agent / 自动化" 节 + doc/CONFIGURATION.md
 */

interface CommandRow {
  cmd: string;
  desc: string;
  kind: 'read' | 'write' | 'agent';
}

const COMMANDS: CommandRow[] = [
  { cmd: 'blog new "标题"',                         desc: '创建一篇新笔记(交互式选标签 + 模板)', kind: 'write' },
  { cmd: 'blog visibility note.md unlisted',        desc: '改可见性:public / unlisted / link-only / private', kind: 'write' },
  { cmd: 'blog publish --schedule "2d"',            desc: '立即或定时发布草稿',                  kind: 'write' },
  { cmd: 'blog query "tag:游戏 AI && month:2025-04"', desc: '按 tag / 月份 / 状态过滤笔记',        kind: 'read'  },
  { cmd: 'blog stats note.md',                      desc: '查单篇 views / read-thru / 反向链接', kind: 'read'  },
  { cmd: 'blog short-link list',                    desc: '管理短链 lmg.sh/xxxxx',                kind: 'read'  },
];

interface McpTool {
  name: string;
  desc: string;
}

const MCP_TOOLS: McpTool[] = [
  { name: 'blog_search',     desc: '搜索文章 / 笔记' },
  { name: 'blog_read',       desc: '读取单篇全文' },
  { name: 'blog_write',      desc: '创建或更新(写权限谨慎开)' },
  { name: 'blog_patch_meta', desc: '改 visibility / tag / 短链' },
];

interface AgentRecipe {
  prompt: string;
  steps: string[];
}

const AGENT_RECIPES: AgentRecipe[] = [
  {
    prompt: '把所有 30 天没动的草稿列出来,标题相似的合并候选,给我一份 markdown 报告。',
    steps: [
      'blog_search(visibility=draft, untouched=30d)',
      'blog_read × N(批量取草稿)',
      '计算标题 embedding 相似度 → 给出合并候选',
      '写入 ~/draft-cleanup.md',
    ],
  },
  {
    prompt: '把上周阅读量 top 3 的文章贴到 #blog-stats 频道,并附 7 天趋势。',
    steps: [
      'blog_search(visibility=public, sort=views_7d, limit=3)',
      'blog_search 拿每篇的 7 天 views 序列',
      '调 Slack webhook 发卡片',
    ],
  },
  {
    prompt: '把这篇笔记的可见性改成 public,定时下周一 09:00 发,并通知 RSS。',
    steps: [
      'blog_patch_meta(slug, visibility=public, scheduled_at=...)',
      '后端 cron 到点 unfurl draft → RSS / sitemap 自动更新',
    ],
  },
];

export function renderCliDocs(config: SiteConfig): string {
  const cmdRows = COMMANDS
    .map((row) => {
      const tone =
        row.kind === 'read' ? 'var(--ok-text)'
        : row.kind === 'write' ? 'var(--accent)'
        : 'var(--warn-text)';
      const tag = row.kind === 'read' ? '只读' : row.kind === 'write' ? '写入' : 'agent';
      return `
        <div class="wsh-cli__cmd-row">
          <code class="wsh-cli__cmd">${esc(row.cmd)}</code>
          <span class="wsh-cli__cmd-desc">${esc(row.desc)}</span>
          <span class="hf-tag wsh-cli__cmd-tag" style="color:${tone};border-color:${tone}">${tag}</span>
        </div>`;
    })
    .join('');

  const mcpToolsHtml = MCP_TOOLS
    .map(
      (t) => `
        <li class="wsh-cli__tool-row">
          <code class="wsh-cli__tool-name">${esc(t.name)}</code>
          <span class="hf-tiny hf-muted">${esc(t.desc)}</span>
        </li>`,
    )
    .join('');

  const recipesHtml = AGENT_RECIPES
    .map((r) => {
      const stepsHtml = r.steps.map((s) => `<li><code>${esc(s)}</code></li>`).join('');
      return `
        <div class="wsh-cli__recipe">
          <div class="wsh-cli__recipe-head">
            <span class="wsh-cli__recipe-bullet" aria-hidden="true">💬</span>
            <span class="wsh-cli__recipe-prompt">${esc(r.prompt)}</span>
          </div>
          <div class="wsh-cli__recipe-steps-h hf-mono hf-tiny">▸ Agent 自动执行</div>
          <ol class="wsh-cli__recipe-steps">${stepsHtml}</ol>
        </div>`;
    })
    .join('');

  const body = `
    <div class="wsh-cli">
      <style>
        .wsh-cli {
          max-width: 1080px; margin: 0 auto;
          padding: 32px 24px;
          color: var(--ink);
        }
        .wsh-cli__hero {
          display: flex; align-items: center; gap: 14px;
          margin-bottom: 14px; flex-wrap: wrap;
        }
        .wsh-cli__logo {
          width: 48px; height: 48px; border-radius: 10px;
          background: #0a0a0a; color: #4ade80;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--mono); font-size: 22px; font-weight: 700;
          box-shadow: 0 8px 24px rgba(0,0,0,.2);
          flex-shrink: 0;
        }
        .wsh-cli__title {
          font-size: 28px; font-weight: 800; margin: 0;
          letter-spacing: -0.01em;
        }
        .wsh-cli__title code {
          font-family: var(--mono); color: var(--accent);
          background: none; padding: 0;
        }
        .wsh-cli__intro {
          font-size: 14px; color: var(--ink-3);
          line-height: 1.7; margin: 0 0 24px;
          max-width: 720px;
        }
        .wsh-cli__sec-h {
          font-family: var(--mono); font-size: 11px;
          color: var(--ink-4); text-transform: uppercase;
          letter-spacing: .05em; margin: 24px 0 8px;
        }
        .wsh-cli__install-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 10px; margin-bottom: 24px;
        }
        .wsh-cli__install-card {
          padding: 10px;
          background: #0a0a0a; color: #e5e5e5;
          border-radius: 6px;
          font-family: var(--mono); font-size: 12px;
        }
        .wsh-cli__install-name {
          color: #737373; font-size: 10px; margin-bottom: 4px;
        }
        .wsh-cli__install-cmd { color: #4ade80; }
        .wsh-cli__install-cmd-text { color: #e5e5e5; }
        .wsh-cli__term {
          background: #0a0a0a; color: #e5e5e5;
          border-radius: 10px; border: 1px solid #262626;
          overflow: hidden; margin-bottom: 24px;
          box-shadow: 0 12px 40px rgba(0,0,0,.25);
        }
        .wsh-cli__term-chrome {
          padding: 8px 12px; border-bottom: 1px solid #262626;
          display: flex; align-items: center; gap: 8px;
          background: #171717;
        }
        .wsh-cli__term-dot {
          width: 11px; height: 11px; border-radius: 50%;
        }
        .wsh-cli__term-dot--r { background: #ef4444; }
        .wsh-cli__term-dot--y { background: #fbbf24; }
        .wsh-cli__term-dot--g { background: #4ade80; }
        .wsh-cli__term-title {
          flex: 1; text-align: center;
          font-family: var(--mono); font-size: 11px; color: #737373;
        }
        .wsh-cli__term-body {
          margin: 0; padding: 14px 16px;
          font-family: var(--mono); font-size: 12px; line-height: 1.7;
          background: #0a0a0a; color: #e5e5e5;
          overflow-x: auto;
        }
        .wsh-cli__term-body .t-prompt-user { color: #4ade80; }
        .wsh-cli__term-body .t-prompt-host { color: #60a5fa; }
        .wsh-cli__term-body .t-dim { color: #737373; }
        .wsh-cli__term-body .t-cmd { color: #22d3ee; }
        .wsh-cli__term-body .t-flag { color: #fbbf24; }
        .wsh-cli__term-body .t-ok { color: #4ade80; }
        .wsh-cli__term-body .t-str { color: #4ade80; }
        .wsh-cli__term-body .t-num { color: #fbbf24; }
        .wsh-cli__term-body .t-key { color: #c084fc; }
        .wsh-cli__cmd-table {
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg, 8px);
          overflow: hidden;
          margin-bottom: 24px;
        }
        .wsh-cli__cmd-row {
          display: grid;
          grid-template-columns: 280px 1fr 60px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--line);
          align-items: center; gap: 12px;
        }
        .wsh-cli__cmd-row:last-child { border-bottom: 0; }
        .wsh-cli__cmd {
          font-family: var(--mono); font-size: 12px;
          color: var(--accent); font-weight: 500;
          background: none; padding: 0;
        }
        .wsh-cli__cmd-desc { color: var(--ink-2); font-size: 13px; }
        .wsh-cli__cmd-tag {
          font-size: 10px; justify-self: end;
        }
        .wsh-cli__mcp-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 12px; margin-bottom: 24px;
        }
        .wsh-cli__mcp-card {
          padding: 14px;
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg, 8px);
        }
        .wsh-cli__mcp-card-h {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 8px;
          font-weight: 600; font-size: 13px;
        }
        .wsh-cli__mcp-code {
          padding: 10px;
          background: #0a0a0a; color: #e5e5e5;
          border-radius: 5px;
          font-family: var(--mono); font-size: 11px; line-height: 1.6;
          overflow-x: auto;
          margin: 0;
        }
        .wsh-cli__mcp-code .t-key { color: #c084fc; }
        .wsh-cli__mcp-code .t-str { color: #4ade80; }
        .wsh-cli__mcp-code .t-dim { color: #737373; }
        .wsh-cli__tool-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 4px;
        }
        .wsh-cli__tool-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; padding: 3px 0;
        }
        .wsh-cli__tool-name {
          font-family: var(--mono); color: var(--accent);
          min-width: 130px;
          background: none; padding: 0;
        }
        .wsh-cli__recipe {
          padding: 14px;
          background: var(--accent-soft);
          border-radius: 8px;
          border-left: 3px solid var(--accent);
          font-size: 13px; line-height: 1.7;
          color: var(--ink-2);
          margin-bottom: 12px;
        }
        .wsh-cli__recipe-head {
          display: flex; align-items: flex-start; gap: 8px;
          margin-bottom: 10px;
        }
        .wsh-cli__recipe-prompt {
          font-style: italic; color: var(--ink-2);
        }
        .wsh-cli__recipe-steps-h {
          margin-bottom: 6px; color: var(--ink-3);
        }
        .wsh-cli__recipe-steps {
          margin: 0; padding-left: 20px;
          font-family: var(--mono); font-size: 11px;
          color: var(--ink-3); line-height: 1.8;
        }
        .wsh-cli__recipe-steps code {
          font-family: var(--mono); font-size: 11px;
          color: var(--accent);
          background: none; padding: 0;
        }
        .wsh-cli__env-card {
          padding: 12px;
          background: var(--bg-soft);
          border: 1px solid var(--line);
          border-radius: 6px;
          font-family: var(--mono); font-size: 12px;
          line-height: 1.8; color: var(--ink-2);
        }
        .wsh-cli__env-card .e-cmt { color: var(--ink-4); }
        .wsh-cli__env-card .e-kw { color: var(--accent); }
        .wsh-cli__env-card .e-str { color: var(--ok-text); }
        @media (max-width: 760px) {
          .wsh-cli__install-grid { grid-template-columns: 1fr; }
          .wsh-cli__cmd-row { grid-template-columns: 1fr; gap: 4px; }
          .wsh-cli__cmd-tag { justify-self: start; }
          .wsh-cli__mcp-grid { grid-template-columns: 1fr; }
        }
      </style>

      <header class="wsh-cli__hero">
        <div class="wsh-cli__logo" aria-hidden="true">$_</div>
        <div>
          <div class="hf-mono hf-tiny hf-muted">Blog CLI</div>
          <h1 class="wsh-cli__title">
            <code>blog</code> · 让 Agent 直接操作笔记
          </h1>
        </div>
        <div class="hf-grow"></div>
        <span class="hf-tag" style="font-size:11px;color:var(--accent);border-color:var(--accent)">Agent-friendly</span>
        <span class="hf-tag" style="font-size:11px">MCP server</span>
      </header>

      <p class="wsh-cli__intro">
        一个无状态、流水线友好的 CLI——读 / 写 / 改 / 发 笔记,全部从命令行。
        支持 <code>--json</code> 输出,可作为 MCP server 直接挂到 Claude Code / Cursor / Aider 给 agent 用。
      </p>

      <!-- Quick start: install -->
      <h2 class="wsh-cli__sec-h">▸ Quick start · 安装</h2>
      <div class="wsh-cli__install-grid">
        <div class="wsh-cli__install-card">
          <div class="wsh-cli__install-name">npm</div>
          <div class="wsh-cli__install-cmd">$ <span class="wsh-cli__install-cmd-text">npm i -g @opennote/cli</span></div>
        </div>
        <div class="wsh-cli__install-card">
          <div class="wsh-cli__install-name">brew</div>
          <div class="wsh-cli__install-cmd">$ <span class="wsh-cli__install-cmd-text">brew install opennote/tap/cli</span></div>
        </div>
        <div class="wsh-cli__install-card">
          <div class="wsh-cli__install-name">curl</div>
          <div class="wsh-cli__install-cmd">$ <span class="wsh-cli__install-cmd-text">curl -fsSL get.opennote.dev | sh</span></div>
        </div>
      </div>

      <!-- Quick start: first command -->
      <h2 class="wsh-cli__sec-h">▸ Quick start · 第一条命令</h2>
      <div class="wsh-cli__term">
        <div class="wsh-cli__term-chrome">
          <span class="wsh-cli__term-dot wsh-cli__term-dot--r" aria-hidden="true"></span>
          <span class="wsh-cli__term-dot wsh-cli__term-dot--y" aria-hidden="true"></span>
          <span class="wsh-cli__term-dot wsh-cli__term-dot--g" aria-hidden="true"></span>
          <span class="wsh-cli__term-title">agent@${esc(hostname(config))} : ~/blog · zsh</span>
        </div>
        <pre class="wsh-cli__term-body"><span class="t-prompt-user">agent@${esc(hostname(config))}</span><span class="t-dim">:</span><span class="t-prompt-host">~/blog</span><span class="t-dim">$ </span>blog <span class="t-cmd">auth login</span> <span class="t-flag">--token</span> <span class="t-dim">$BLOG_TOKEN</span>
<span class="t-ok">✓</span> <span class="t-dim">authenticated · scope: notes:write</span>

<span class="t-prompt-user">agent@${esc(hostname(config))}</span><span class="t-dim">:</span><span class="t-prompt-host">~/blog</span><span class="t-dim">$ </span>blog <span class="t-cmd">new</span> <span class="t-str">"用 MCTS + LLM 给 RTS 做战术决策"</span>
<span class="t-ok">✓</span> created <span class="t-cmd">posts/mcts-llm-rts.md</span> <span class="t-dim">·</span> visibility=draft

<span class="t-prompt-user">agent@${esc(hostname(config))}</span><span class="t-dim">:</span><span class="t-prompt-host">~/blog</span><span class="t-dim">$ </span>blog <span class="t-cmd">query</span> <span class="t-str">"tag:游戏 AI &amp;&amp; month:2025-04"</span> <span class="t-flag">--json</span>
<span class="t-dim">[</span>
  <span class="t-dim">{</span> <span class="t-key">"slug"</span>: <span class="t-str">"mcts-llm-rts"</span>, <span class="t-key">"vis"</span>: <span class="t-str">"public"</span>, <span class="t-key">"views"</span>: <span class="t-num">1247</span> <span class="t-dim">},</span>
  <span class="t-dim">{</span> <span class="t-key">"slug"</span>: <span class="t-str">"goap-vs-mcts"</span>, <span class="t-key">"vis"</span>: <span class="t-str">"public"</span>, <span class="t-key">"views"</span>: <span class="t-num">523</span> <span class="t-dim">}</span>
<span class="t-dim">]</span></pre>
      </div>

      <!-- Command reference -->
      <h2 class="wsh-cli__sec-h">▸ 命令参考</h2>
      <div class="wsh-cli__cmd-table" role="table" aria-label="CLI 命令参考">
        ${cmdRows}
      </div>

      <!-- MCP integration -->
      <h2 class="wsh-cli__sec-h">▸ 接入 Agent (MCP)</h2>
      <div class="wsh-cli__mcp-grid">
        <div class="wsh-cli__mcp-card">
          <div class="wsh-cli__mcp-card-h">
            <span aria-hidden="true">🤖</span>
            <span>Claude Code · Cursor</span>
          </div>
          <pre class="wsh-cli__mcp-code"><span class="t-dim">// ~/.config/claude/mcp.json</span>
<span class="t-dim">{</span>
  <span class="t-key">"servers"</span>: <span class="t-dim">{</span>
    <span class="t-key">"opennote-blog"</span>: <span class="t-dim">{</span>
      <span class="t-key">"command"</span>: <span class="t-str">"blog"</span>,
      <span class="t-key">"args"</span>: [<span class="t-str">"mcp"</span>, <span class="t-str">"serve"</span>]
    <span class="t-dim">}</span>
  <span class="t-dim">}</span>
<span class="t-dim">}</span></pre>
        </div>
        <div class="wsh-cli__mcp-card">
          <div class="wsh-cli__mcp-card-h">
            <span aria-hidden="true">🔧</span>
            <span>暴露的 tools</span>
          </div>
          <ul class="wsh-cli__tool-list" aria-label="MCP tools">
            ${mcpToolsHtml}
          </ul>
        </div>
      </div>

      <!-- Agent recipes -->
      <h2 class="wsh-cli__sec-h">▸ 实战示例 · agent prompt</h2>
      ${recipesHtml}

      <!-- Environment vars -->
      <h2 class="wsh-cli__sec-h">▸ 环境变量</h2>
      <div class="wsh-cli__env-card">
        <span class="e-cmt"># ~/.zshrc</span><br>
        <span class="e-kw">export</span> BLOG_TOKEN=<span class="e-str">"opennote_pat_..."</span>  <span class="e-cmt"># notes:write</span><br>
        <span class="e-kw">export</span> BLOG_API=<span class="e-str">"${esc(config.site.url)}/api"</span><br>
        <span class="e-kw">export</span> BLOG_FORMAT=<span class="e-str">"json"</span>  <span class="e-cmt"># 默认 agent 友好</span>
      </div>
    </div>`;

  return layout({
    title: `Blog CLI · ${config.site.title}`,
    description: 'CLI / MCP server — 让 agent 直接操作 blog,读写笔记 / 改可见性 / 拉数据。',
    config,
    body,
    path: '/cli/index.html',
  });
}

function hostname(config: SiteConfig): string {
  try {
    return new URL(config.site.url).hostname.split('.')[0] ?? 'blog';
  } catch {
    return 'blog';
  }
}
