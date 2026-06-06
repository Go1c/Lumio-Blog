/* admin.js — Lumio Blog 管理后台（Obsidian 笔记库版）
   视图：#/dashboard · #/vault · #/vault/:folder · #/note/:id · #/columns
   - 笔记库以 Obsidian vault 的目录组织，支持「目录 / 平铺」两种视图
   - 可见性模型：公开 / 不列出 / 仅链接 / 私有
   - 笔记详情：可见性 · 定时发布 · 可发现性 · 分享短链 · 元数据 · 反向/出链 · 投递专栏 */

/* ───────── 笔记库目录（与真实 vault 一致，合计 309 篇） ───────── */
const VAULT = 'vault';
const FOLDERS = [
  { name:'AI-Creater', count:70,  updated:'2026-06-01' },
  { name:'Clippings',  count:1,   updated:'2026-06-01' },
  { name:'Doc',        count:7,   updated:'2026-06-05' },
  { name:'Docs',       count:51,  updated:'2026-06-05' },
  { name:'Lark Docs',  count:2,   updated:'2026-06-01' },
  { name:'Study',      count:3,   updated:'2026-06-01' },
  { name:'System',     count:18,  updated:'2026-06-01' },
  { name:'Work',       count:156, updated:'2026-06-05' },
  { name:'网站',        count:1,   updated:'2026-06-01' },
];

/* 可见性模型 */
const VIS = {
  public:   { label:'公开',  short:'公开', desc:'任何人可访问 URL',        cls:'v-public'  },
  unlisted: { label:'不列出', short:'不列出', desc:'不出现在列表 / Feed，可直接访问', cls:'v-unlisted'},
  linkonly: { label:'仅链接', short:'仅链接', desc:'需要短链才能看到',        cls:'v-linkonly'},
  private:  { label:'私有',  short:'私有', desc:'只在后台可见',           cls:'v-private' },
};
const VIS_ORDER = ['public', 'unlisted', 'linkonly', 'private'];

/* 专栏（合集）—— 贴合 vault 实际主题 */
let COLUMNS = [
  { id:'c1', name:'AI Agent 实战',  tone:'blue',   intro:'WorldMonitor、Hermes-Agent 等智能体项目的架构拆解与深度技术分析。', vis:'public',  cat:'AI', follows:1820, reads:48200 },
  { id:'c2', name:'Claude Code 实践', tone:'mint',  intro:'用 Claude Code 做真实项目的工作流、提示词与踩坑记录，可复现可落地。',          vis:'public',  cat:'AI', follows:1240, reads:32600 },
  { id:'c3', name:'工程文档精选',    tone:'violet', intro:'从 Docs 目录沉淀的系统设计与技术规范，团队协作的一手参考。',                vis:'public',  cat:'工程', follows:860,  reads:21400 },
  { id:'c4', name:'工作周报合辑',    tone:'rose',   intro:'Work 目录的周报与会议纪要归档，仅团队成员可见的内部专栏。',                  vis:'private', cat:'工作', follows:120,  reads:5400 },
];

/* ───────── 程序化生成笔记，使目录数量真实可信 ───────── */
const TITLE_POOL = {
  'AI-Creater': ['WorldMonitor深度技术分析','WorldMonitor架构图','LearnClaudeCode深度技术分析','LearnClaudeCode架构图','Hermes-Agent架构图','Hermes-Agent深度技术分析','RAG-Pipeline设计笔记','Prompt工程实践','多智能体编排实验','Agent记忆系统设计','工具调用与函数注册','向量检索调优记录','Claude API 成本分析','对话状态机设计','自动化测试 Agent','长上下文压缩策略'],
  'Docs':       ['系统设计总览','API 设计规范','数据库 Schema 说明','部署与运维手册','前端架构约定','组件库使用指南','埋点与数据规范','安全合规清单','缓存策略说明','鉴权与权限模型','消息队列设计','灰度发布流程','监控告警规范','错误码字典','国际化方案','移动端适配规范'],
  'Work':       ['周报 2026-W22','周报 2026-W21','周报 2026-W20','项目立项评审','需求对齐会议纪要','迭代复盘','OKR 季度规划','跨团队协作记录','线上事故复盘','排期与里程碑','招聘面试记录','1对1 沟通纪要','技术选型评审','成本核算表','合作方对接记录','发布检查清单'],
  'Study':      ['渲染管线学习笔记','分布式系统读书笔记','算法复习'],
  'System':     ['日记模板','会议模板','项目模板','每日待办','知识卡片索引','收件箱整理规则','标签体系约定','文件命名规范','Dataview 查询合集','模板插件配置','快捷键备忘','同步与备份策略'],
  'Doc':        ['产品需求文档','技术方案','竞品调研','发布说明','用户访谈纪要','数据分析报告','路线图规划'],
  'Clippings':  ['网络剪藏：图形学综述'],
  'Lark Docs':  ['飞书同步文档 A','飞书同步文档 B'],
  '网站':        ['Lumio Game Tech Blog 关于页'],
};
const EXT_BY_FOLDER = {
  'AI-Creater': ['.html', '.canvas', '.md'],
  'Docs':       ['.md', '.html'],
  'Lark Docs':  ['.md'],
  'default':    ['.md'],
};
const COL_BY_FOLDER = { 'AI-Creater':'c1', 'Docs':'c3', 'Work':'c4' };
const TAGS_BY_FOLDER = {
  'AI-Creater': ['AI', 'Agent', 'Claude', 'Prompt', 'RAG'],
  'Docs':       ['文档', '架构', '工具链', '系统'],
  'Doc':        ['文档', '产品'],
  'Work':       ['工作', '周报'],
  'Study':      ['学习', '算法', '渲染'],
  'System':     ['系统', '工具链'],
  'Lark Docs':  ['文档'],
  'Clippings':  ['渲染'],
  '网站':       ['渲染', '性能'],
};
const pad2 = n => (n < 10 ? '0' : '') + n;

let NOTES = [];
(function generateNotes() {
  let gid = 0, publicLeft = 12; // 共 12 篇公开，其余私有 —— 与真实统计一致
  const pickExt = (folder, i) => { const e = EXT_BY_FOLDER[folder] || EXT_BY_FOLDER.default; return e[i % e.length]; };
  // 让公开的 12 篇集中在内容向目录
  const PUBLIC_FOLDERS = { 'AI-Creater':4, 'Docs':4, 'Doc':2, 'Study':1, '网站':1 };
  FOLDERS.forEach(f => {
    const pool = TITLE_POOL[f.name] || [];
    let pubQuota = PUBLIC_FOLDERS[f.name] || 0;
    for (let i = 0; i < f.count; i++) {
      gid++;
      const base = i < pool.length ? pool[i] : `未命名笔记 ${pad2(i + 1)}`;
      const ext = pickExt(f.name, i);
      let vis = 'private';
      if (pubQuota > 0 && publicLeft > 0) { vis = 'public'; pubQuota--; publicLeft--; }
      const words = ((gid * 137) % 2700) + 180;
      const day = (gid % 28) + 1;
      const created = `2026-05-${pad2(((gid * 7) % 27) + 1)}`;
      const updated = i < 6 ? f.updated : `2026-0${(gid % 2) ? 5 : 6}-${pad2(day)}`;
      const colId = (vis === 'public' || f.name === 'Work') ? (COL_BY_FOLDER[f.name] || null) : null;
      const tpool = TAGS_BY_FOLDER[f.name] || [];
      const tcount = tpool.length ? (gid % 3) + 1 : 0;
      const noteTags = [];
      for (let k = 0; k < tcount; k++) { const tg = tpool[(gid + k) % tpool.length]; if (!noteTags.includes(tg)) noteTags.push(tg); }
      const disc = vis === 'public'
        ? { search:true, seo:true, rss:true, home: gid % 5 === 0 }
        : { search:false, seo:false, rss:false, home:false };
      NOTES.push({
        id:'n' + gid, title: base, folder: f.name, ext,
        path: `${f.name}/${base}${ext}`, vis, words,
        created, updated, slug: base.toLowerCase(),
        readMin: Math.max(1, Math.round(words / 300)),
        disc, short: vis === 'linkonly' ? 'a1B2c' : '',
        colId, tags: noteTags, backlinks: [], outlinks: [],
      });
    }
  });
  // 给少量笔记加上反向/出链，体现 wiki 关系
  const byId = id => NOTES.find(n => n.id === id);
  const link = (a, b) => { const A = byId(a), B = byId(b); if (A && B) { A.outlinks.push(B.id); B.backlinks.push(A.id); } };
  if (NOTES.length > 6) { link('n3', 'n1'); link('n3', 'n5'); link('n6', 'n1'); link('n2', 'n1'); }
})();

/* ───────── 标签 / 评论 / 广告 数据 ───────── */
let TAGS = [
  { id:'t1', name:'AI',        count:64, tone:'blue',   trend:'up'   },
  { id:'t2', name:'Claude',    count:38, tone:'mint',   trend:'up'   },
  { id:'t3', name:'Agent',     count:31, tone:'blue',   trend:'up'   },
  { id:'t4', name:'Prompt',    count:22, tone:'violet', trend:'flat' },
  { id:'t5', name:'RAG',       count:14, tone:'sky',    trend:'up'   },
  { id:'t6', name:'架构',       count:27, tone:'violet', trend:'flat' },
  { id:'t7', name:'性能',       count:19, tone:'mint',   trend:'down' },
  { id:'t8', name:'渲染',       count:16, tone:'blue',   trend:'flat' },
  { id:'t9', name:'文档',       count:51, tone:'amber',  trend:'up'   },
  { id:'t10', name:'周报',      count:42, tone:'rose',   trend:'flat' },
  { id:'t11', name:'工作',      count:48, tone:'rose',   trend:'flat' },
  { id:'t12', name:'学习',      count:9,  tone:'mint',   trend:'down' },
  { id:'t13', name:'算法',      count:6,  tone:'sky',    trend:'flat' },
  { id:'t14', name:'工具链',     count:13, tone:'amber',  trend:'up'   },
  { id:'t15', name:'系统',      count:18, tone:'violet', trend:'flat' },
];

let COMMENTS = [
  { id:'m1', author:'流光飞舞',  tone:'blue',   note:'WorldMonitor深度技术分析', path:'AI-Creater/WorldMonitor深度技术分析.html', time:'10 分钟前', status:'pending', text:'架构图讲得很清楚，请问监控数据是怎么做采样降频的？高并发下会不会丢数据？' },
  { id:'m2', author:'CodeCat',  tone:'mint',   note:'LearnClaudeCode深度技术分析', path:'AI-Creater/LearnClaudeCode深度技术分析.html', time:'32 分钟前', status:'pending', text:'按这篇配了一遍工作流，效率确实提升不少，已经安利给同事了 👍' },
  { id:'m3', author:'匿名读者',  tone:'amber',  note:'API 设计规范', path:'Docs/API 设计规范.md', time:'1 小时前', status:'pending', text:'第 3 节的错误码表能不能补充一下 429 限流的场景？' },
  { id:'m4', author:'夜行者',    tone:'violet', note:'Hermes-Agent架构图', path:'AI-Creater/Hermes-Agent架构图.canvas', time:'2 小时前', status:'pending', text:'求源文件，想基于这个画一版自己的多智能体编排。' },
  { id:'m5', author:'spam_bot', tone:'rose',   note:'系统设计总览', path:'Docs/系统设计总览.md', time:'3 小时前', status:'pending', text:'【广告】高仿包包一比一，加微信 xxxxx 优惠多多……' },
  { id:'m6', author:'小满',      tone:'sky',    note:'RAG-Pipeline设计笔记', path:'AI-Creater/RAG-Pipeline设计笔记.md', time:'5 小时前', status:'pending', text:'向量库选型那段很受用，请问 chunk 大小你一般取多少？' },
  { id:'m7', author:'老王',      tone:'mint',   note:'渲染优化实战', path:'网站/Lumio Game Tech Blog 关于页.md', time:'昨天', status:'approved', text:'写得很扎实，期待后续移动端的篇章。' },
  { id:'m8', author:'路人甲',    tone:'amber',  note:'周报 2026-W22', path:'Work/周报 2026-W22.md', time:'2 天前', status:'approved', text:'内部周报也能公开，团队挺开放的，赞。' },
];

const SLOTS = {
  home:    { label:'首页 · 信息流横幅', size:'728 × 90' },
  article: { label:'文章页 · 侧栏方图',  size:'300 × 250' },
  column:  { label:'专栏页 · 顶部 Banner', size:'970 × 120' },
};
let ADS = [
  { id:'ad1', name:'Unity 6 性能套件', slot:'home', tone:'blue',   title:'Unity 6 性能套件', desc:'一键剖析 Draw Call 与 Overdraw，渲染优化提速 40%', cta:'立即试用', url:'example.com/unity6',   imp:18420, click:728, on:true },
  { id:'ad2', name:'云渲染农场 RenderX', slot:'home', tone:'violet', title:'云渲染农场 RenderX', desc:'按帧计费的分布式渲染，出图速度快 10 倍', cta:'领取额度', url:'renderx.dev',          imp:12600, click:512, on:true },
  { id:'ad3', name:'GameConf 2026 大会', slot:'home', tone:'mint',   title:'GameConf 2026', desc:'年度游戏技术大会，早鸟票 6 折，限时开售', cta:'购票', url:'gameconf.io',            imp:9800,  click:430, on:true },
  { id:'ad4', name:'侧边栏方图', slot:'article', tone:'amber',  title:'Shader 训练营', desc:'4 周从入门到实战', cta:'报名', url:'partner.io/x',  imp:9260,  click:214, on:true },
  { id:'ad5', name:'文末推广位', slot:'article', tone:'rose',   title:'招聘：图形工程师', desc:'远程可选，期权丰厚', cta:'投递', url:'—',          imp:5140,  click:116, on:false },
  { id:'ad6', name:'专栏页 Banner', slot:'column', tone:'sky',  title:'AI Agent 开发平台', desc:'托管你的多智能体工作流', cta:'免费开始', url:'sponsor.dev/ad', imp:7300, click:181, on:true },
];

/* ───────── 工具 ───────── */
const $ = (s, r = document) => r.querySelector(s);
const fmt = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '' + n;
const colById = id => COLUMNS.find(c => c.id === id);
const noteById = id => NOTES.find(n => n.id === id);
const folderNotes = name => NOTES.filter(n => n.folder === name);
const colNoteCount = cid => NOTES.filter(n => n.colId === cid).length;
const visCount = v => v === 'all' ? NOTES.length : NOTES.filter(n => n.vis === v).length;

const TONES = {
  blue:{cls:'t-blue',sw:'linear-gradient(150deg,#DCE4FF,#B9C6FF)'}, mint:{cls:'t-mint',sw:'linear-gradient(150deg,#D6F7EE,#9BE9D5)'},
  amber:{cls:'t-amber',sw:'linear-gradient(150deg,#FFE9CC,#FFCF9B)'}, violet:{cls:'t-violet',sw:'linear-gradient(150deg,#E7E0FF,#C7B6FF)'},
  sky:{cls:'t-sky',sw:'linear-gradient(150deg,#DCF0FF,#A9D8FF)'}, rose:{cls:'t-rose',sw:'linear-gradient(150deg,#FFE0EC,#FFB8D0)'},
};
const TONE_KEYS = Object.keys(TONES);
function cubeArt(tone) {
  const v = { mint:'c-mint', amber:'c-amber', rose:'c-pink' }[tone];
  const cls = v ? 'cube ' + v : 'cube';
  return `<span class="thumb__grid"></span><span class="thumb__art">
    <span class="${cls} float" style="--s:28px;left:42%;top:36%;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></span>
    <span class="${cls} float" style="--s:18px;left:58%;top:56%;animation-delay:-1.4s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></span></span>`;
}

const ICON = {
  folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>',
  file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l5 5v13H6z"></path><path d="M14 3v5h5"></path></svg>',
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-6-6l-1 1"></path><path d="M15 10a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 6 6l1-1"></path></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="2.6"></circle></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path></svg>',
  check:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 5"></path></svg>',
  search:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"></circle><path d="m10.5 10.5 3 3"></path></svg>',
};
const extColor = ext => ({ '.md':'#6171F0', '.html':'#E0658E', '.canvas':'#C2782B' }[ext] || '#6171F0');

/* ───────── 仪表盘表格 ───────── */
function renderDashTable() {
  const tb = $('#dash-tbody'); if (!tb) return;
  const recent = NOTES.slice().sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 6);
  tb.innerHTML = recent.map(n => `
    <tr onclick="go('note/${n.id}')" style="cursor:pointer;">
      <td><div class="note-cell"><span class="note-cell__ic" style="--ec:${extColor(n.ext)}">${n.ext.replace('.', '')}</span>
        <div class="note-cell__txt"><span class="note-cell__title">${n.title}</span><span class="note-cell__path">${n.path}</span></div></div></td>
      <td><span class="vbadge ${VIS[n.vis].cls}">${VIS[n.vis].short}</span></td>
      <td>${fmt(n.words)}</td>
      <td style="color:var(--muted);">${n.updated}</td>
    </tr>`).join('');
}

/* ───────── 笔记库（目录 / 平铺） ───────── */
let vaultMode = 'folders';   // folders | flat
let vaultVis = 'all';
let vaultSort = 'updated';
let vaultFolder = null;       // 进入某目录
let vaultQuery = '';

function renderVault() {
  const v = document.querySelector('.view[data-view="vault"]'); if (!v) return;
  // header stats
  $('#vault-stat').textContent = `${FOLDERS.length} 目录 · ${NOTES.length} 篇`;
  // mode buttons
  $('#mode-folders').classList.toggle('is-active', vaultMode === 'folders' && !vaultFolder);
  $('#mode-flat').classList.toggle('is-active', vaultMode === 'flat' || vaultFolder);
  // breadcrumb
  $('#vault-crumb').innerHTML = vaultFolder
    ? `<a onclick="exitFolder()">${VAULT}</a><span class="sep">/</span><b>${vaultFolder}</b>`
    : `<b>${VAULT}</b>`;
  // filter chips counts
  $('#vf-all').innerHTML = `全部 (${NOTES.length})`;
  VIS_ORDER.forEach(k => { const el = $('#vf-' + k); if (el) el.innerHTML = `${VIS[k].label} (${visCount(k)})`; });
  document.querySelectorAll('#vault-filter button').forEach(b => b.classList.toggle('is-active', b.dataset.val === vaultVis));

  const showFlat = vaultMode === 'flat' || vaultFolder;
  $('#vault-grid').style.display = showFlat ? 'none' : '';
  $('#vault-flat').style.display = showFlat ? '' : 'none';

  if (!showFlat) renderFolderGrid();
  else renderFlatList();
}

function renderFolderGrid() {
  $('#vault-grid').innerHTML = FOLDERS.map(f => {
    const pub = folderNotes(f.name).filter(n => n.vis === 'public').length;
    return `<div class="foldercard" onclick="enterFolder('${f.name}')">
      <span class="foldercard__ic">${ICON.folder}</span>
      <div class="foldercard__body">
        <div class="foldercard__name">${f.name}</div>
        <div class="foldercard__meta">${f.count} 篇 · ${f.updated}</div>
      </div>
      ${pub ? `<span class="foldercard__pub">${pub} 公开</span>` : ''}
    </div>`;
  }).join('');
}

function renderFlatList() {
  let list = vaultFolder ? folderNotes(vaultFolder) : NOTES.slice();
  if (vaultVis !== 'all') list = list.filter(n => n.vis === vaultVis);
  if (vaultQuery) list = list.filter(n => n.title.toLowerCase().includes(vaultQuery) || n.path.toLowerCase().includes(vaultQuery));
  if (vaultSort === 'words') list.sort((a, b) => b.words - a.words);
  else if (vaultSort === 'title') list.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  else list.sort((a, b) => b.updated.localeCompare(a.updated));

  $('#flat-count').textContent = list.length;
  const rows = list.slice(0, 40); // 演示截断，避免一次渲染过多
  $('#flat-tbody').innerHTML = rows.map(n => `
    <tr onclick="go('note/${n.id}')">
      <td><div class="note-cell"><span class="note-cell__ic" style="--ec:${extColor(n.ext)}">${n.ext.replace('.', '')}</span>
        <div class="note-cell__txt"><span class="note-cell__title">${n.title}</span><span class="note-cell__path">${n.path}</span></div></div></td>
      <td><span class="vbadge ${VIS[n.vis].cls}">${VIS[n.vis].short}</span></td>
      <td class="ic-cell">${n.disc.search ? `<i class="ok">${ICON.check}</i>` : '<i class="no">—</i>'}</td>
      <td class="ic-cell">${n.short ? `<code>/n/${n.short}</code>` : '<i class="no">—</i>'}</td>
      <td>${fmt(n.words)}</td>
      <td style="color:var(--muted);">${n.updated}</td>
      <td onclick="event.stopPropagation()"><div class="row-act">
        <button title="数据" onclick="go('note/${n.id}')">${ICON.chart}</button>
      </div></td>
    </tr>`).join('');
  $('#flat-more').style.display = list.length > 40 ? '' : 'none';
  $('#flat-more-n').textContent = list.length - 40;
}

function enterFolder(name) { vaultFolder = name; go('vault/' + encodeURIComponent(name)); }
function exitFolder() { vaultFolder = null; go('vault'); }

/* ───────── 笔记详情 ───────── */
let curNote = null;
function renderNote(id) {
  curNote = noteById(id);
  if (!curNote) { go('vault'); return; }
  const n = curNote;
  $('#nd-title').textContent = n.title;
  $('#nd-sub').innerHTML = `<code>${n.path}</code> · 修改于 ${n.updated} · ${n.readMin} min · ${fmt(n.words)} 字`;
  // 可见性 radios
  $('#nd-vis').innerHTML = VIS_ORDER.map(k => `
    <label class="visopt ${n.vis === k ? 'is-sel' : ''}" onclick="setVis('${k}')">
      <span class="visopt__radio"></span>
      <span class="visopt__txt"><b>${VIS[k].label}</b><small>${VIS[k].desc}</small></span>
    </label>`).join('');
  // 可发现性 toggles
  const dlock = n.vis === 'private';
  const tog = (key, name, desc) => `
    <div class="disc-row">
      <div><div class="disc-row__t">${name}</div><div class="disc-row__d">${desc}</div></div>
      <span class="switch ${n.disc[key] ? '' : 'off'} ${dlock ? 'is-locked' : ''}" onclick="toggleDisc('${key}')"></span>
    </div>`;
  $('#nd-disc').innerHTML =
    tog('search', '站内搜索', '出现在 /search') +
    tog('seo', 'SEO robots', '允许搜索引擎抓取 / 收入 sitemap') +
    tog('rss', 'RSS 收录', '出现在 /feed.xml') +
    tog('home', '首页推荐', '上首页推荐位');
  $('#nd-disc-note').style.display = dlock ? '' : 'none';
  // 分享短链
  $('#nd-short').innerHTML = n.short
    ? `<a class="shortlink" href="#">/n/${n.short}</a>`
    : `<span class="shortlink is-empty">尚未生成短链</span>`;
  $('#nd-shortbtn').innerHTML = n.short ? '重新生成' : `${ICON.link} 生成短链`;
  // 投递专栏
  $('#nd-col').innerHTML = `
    <option value="">不归入专栏</option>` +
    COLUMNS.map(c => `<option value="${c.id}" ${n.colId === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
  // 标签
  renderNoteTags();
  // 元数据
  $('#nd-meta').innerHTML = [
    ['slug', n.slug], ['source', n.path], ['created', n.created], ['updated', n.updated],
    ['words', fmt(n.words) + ' 字'], ['tags', n.tags.length ? n.tags.map(t => '#' + t).join(' ') : '—'],
  ].map(([k, val]) => `<div class="metarow"><span class="metarow__k">${k}</span><span class="metarow__v">${val}</span></div>`).join('');
  // 反向 / 出链
  const linkList = (ids, empty) => ids.length
    ? ids.map(i => { const t = noteById(i); return `<a class="graph-item" onclick="go('note/${i}')">${ICON.file}<span>${t ? t.title : i}</span></a>`; }).join('')
    : `<div class="empty-note">${empty}</div>`;
  $('#nd-back-n').textContent = n.backlinks.length;
  $('#nd-out-n').textContent = n.outlinks.length;
  $('#nd-back').innerHTML = linkList(n.backlinks, '暂无引用本笔记的笔记');
  $('#nd-out').innerHTML = linkList(n.outlinks, '本笔记没有内部链接');
}
function setVis(k) {
  if (!curNote) return;
  curNote.vis = k;
  if (k === 'private') curNote.disc = { search:false, seo:false, rss:false, home:false };
  if (k === 'linkonly' && !curNote.short) curNote.short = Math.random().toString(36).slice(2, 7);
  renderNote(curNote.id);
  toast('可见性已设为「' + VIS[k].label + '」');
}
function toggleDisc(key) {
  if (!curNote || curNote.vis === 'private') { if (curNote.vis === 'private') toast('私有笔记已关闭全部可发现性'); return; }
  curNote.disc[key] = !curNote.disc[key];
  renderNote(curNote.id);
}
function genShort() {
  if (!curNote) return;
  curNote.short = Math.random().toString(36).slice(2, 7);
  renderNote(curNote.id);
  toast('短链已生成：/n/' + curNote.short);
}
function setNoteCol(v) { if (curNote) { curNote.colId = v || null; renderColumns(); toast(v ? '已投递到专栏' : '已移出专栏'); } }

/* 笔记标签编辑 */
function renderNoteTags() {
  const box = $('#nd-tags'); if (!box || !curNote) return;
  const chips = curNote.tags.map(t => `
    <span class="ntag" style="--tc:${tagTone(t)}">#${t}
      <button class="ntag__x" title="移除" onclick="removeNoteTag('${t}')"><svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"></path></svg></button>
    </span>`).join('');
  box.innerHTML = chips + `<button class="ntag-add" onclick="openTagPop(event)"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 3v10M3 8h10"></path></svg>添加标签</button>`;
}
function tagTone(name) { const t = TAGS.find(x => x.name === name); return t ? TONES[t.tone].sw : 'linear-gradient(150deg,#DCE4FF,#B9C6FF)'; }
function removeNoteTag(name) { if (!curNote) return; curNote.tags = curNote.tags.filter(t => t !== name); renderNoteTags(); toast('已移除 #' + name); }
function openTagPop(e) {
  e.stopPropagation();
  const pop = $('#tag-pop');
  const avail = TAGS.map(t => t.name).filter(n => !curNote.tags.includes(n));
  pop.innerHTML = `
    <div class="tag-pop__head">选择已有标签</div>
    <div class="tag-pop__list">${avail.length ? avail.map(n => `<span class="tag-pop__item" onclick="addNoteTag('${n}')">#${n}</span>`).join('') : '<span class="tag-pop__empty">已全部添加</span>'}</div>
    <div class="tag-pop__new"><input id="tag-pop-input" placeholder="新建标签后回车" maxlength="12"><button onclick="addNoteTagNew()">添加</button></div>`;
  pop.classList.add('is-open');
  setTimeout(() => { const i = $('#tag-pop-input'); if (i) i.onkeydown = ev => { if (ev.key === 'Enter') addNoteTagNew(); }; }, 0);
  const close = ev => { if (!ev.target.closest('#tag-pop') && !ev.target.closest('.ntag-add')) { pop.classList.remove('is-open'); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 0);
}
function addNoteTag(name) {
  if (!curNote || curNote.tags.includes(name)) return;
  curNote.tags.push(name);
  const tg = TAGS.find(t => t.name === name); if (tg) tg.count++;
  $('#tag-pop').classList.remove('is-open');
  renderNoteTags(); toast('已添加 #' + name);
}
function addNoteTagNew() {
  const inp = $('#tag-pop-input'); if (!inp) return;
  const val = inp.value.trim(); if (!val) { inp.focus(); return; }
  if (!TAGS.some(t => t.name === val)) TAGS.push({ id:'t' + Date.now(), name:val, count:1, tone:TONE_KEYS[Math.floor(Math.random() * 6)], trend:'up' });
  addNoteTag(val);
}

/* ───────── 专栏管理（保留，整合 vault） ───────── */
let CATEGORIES = ['AI', '工程', '工作', '渲染', '性能', '学习'];
function renderColumns() {
  const grid = $('#col-grid'); if (!grid) return;
  $('#col-count').textContent = COLUMNS.length;
  grid.innerHTML = COLUMNS.map(c => {
    const num = colNoteCount(c.id), priv = c.vis === 'private';
    return `<div class="colcard">
      <div class="colcard__cover thumb ${TONES[c.tone].cls}">
        <span class="colcard__vis ${priv ? 'is-private' : ''}">${priv ? '私密' : '公开'}</span>${cubeArt(c.tone)}
      </div>
      <div class="colcard__body">
        <div class="colcard__name">${c.name}</div>
        <div class="colcard__intro">${c.intro}</div>
        <div class="colcard__meta">
          <span class="m"><b>${num}</b><span>篇笔记</span></span>
          <span class="m"><b>${fmt(c.follows)}</b><span>关注者</span></span>
          <span class="m"><b>${fmt(c.reads)}</b><span>总阅读</span></span>
        </div>
      </div>
      <div class="colcard__foot"><span class="spacer"></span>
        <button class="btn-mini" onclick="window.open('Columns.html','_blank')">前台查看</button>
        <button class="btn-mini is-primary" onclick="openColumn('${c.id}')">管理专栏</button>
      </div>
    </div>`;
  }).join('');
}

const scrim = () => $('#scrim');
function closeDrawers() { document.querySelectorAll('.drawer').forEach(d => d.classList.remove('is-open')); scrim().classList.remove('is-open'); }
function openDrawer(id) { closeDrawers(); scrim().classList.add('is-open'); $('#' + id).classList.add('is-open'); }

let editingCol = null;
function openColumn(id) {
  editingCol = id ? colById(id) : { id:null, name:'', intro:'', tone:'blue', vis:'public', cat:'AI' };
  const isNew = !id;
  $('#col-drawer-title').textContent = isNew ? '新建专栏' : '专栏设置';
  $('#col-drawer-sub').textContent = isNew ? '把同主题笔记聚合成一个专栏' : editingCol.name;
  $('#cf-name').value = editingCol.name;
  $('#cf-intro').value = editingCol.intro;
  $('#cf-intro-count').textContent = editingCol.intro.length + ' / 120';
  $('#cf-cover').className = 'cover-pick__preview thumb ' + TONES[editingCol.tone].cls;
  $('#cf-cover').innerHTML = cubeArt(editingCol.tone);
  $('#cf-tones').innerHTML = TONE_KEYS.map(k => `<span class="tone-sw ${k === editingCol.tone ? 'is-sel' : ''}" style="background:${TONES[k].sw}" onclick="pickTone('${k}')"></span>`).join('');
  setSeg('#cf-vis', editingCol.vis);
  renderCatSeg(editingCol.cat);
  renderIncluded();
  openDrawer('col-drawer');
}
function renderCatSeg(sel) {
  $('#cf-cat').innerHTML = CATEGORIES.map(c => `<button data-val="${c}" class="${c === sel ? 'is-active' : ''}">${c}</button>`).join('') +
    `<button class="seg__add" type="button" onclick="showCatAdd()">+ 自定义</button>`;
  $('#cf-cat-add').style.display = 'none';
}
function showCatAdd() { const b = $('#cf-cat-add'); b.style.display = 'flex'; $('#cf-cat-input').value = ''; $('#cf-cat-input').focus(); }
function confirmCatAdd() {
  const inp = $('#cf-cat-input'); const val = inp.value.trim(); if (!val) { inp.focus(); return; }
  if (!CATEGORIES.includes(val)) CATEGORIES.push(val);
  renderCatSeg(val); toast('已添加分类「' + val + '」');
}
function pickTone(k) {
  editingCol.tone = k;
  $('#cf-cover').className = 'cover-pick__preview thumb ' + TONES[k].cls;
  $('#cf-cover').innerHTML = cubeArt(k);
  document.querySelectorAll('#cf-tones .tone-sw').forEach((s, i) => s.classList.toggle('is-sel', TONE_KEYS[i] === k));
}
function renderIncluded() {
  const box = $('#cf-included');
  if (!editingCol.id) { box.innerHTML = '<div class="empty-note">保存后即可从「笔记库」把笔记投递到本专栏</div>'; return; }
  const arts = NOTES.filter(a => a.colId === editingCol.id).slice(0, 12);
  box.innerHTML = arts.length ? `<div class="inclist">${arts.map(a => `
    <div class="incrow"><span class="incrow__name">${a.title}</span>
      <button class="incrow__del" title="移出专栏" onclick="removeFromCol('${a.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"></path></svg></button>
    </div>`).join('')}</div>` : '<div class="empty-note">本专栏暂无笔记，去「笔记库」投递吧</div>';
}
function removeFromCol(aid) { const a = noteById(aid); if (a) a.colId = null; renderIncluded(); renderColumns(); toast('已移出专栏'); }
function saveColumn() {
  const name = $('#cf-name').value.trim(); if (!name) { $('#cf-name').focus(); toast('请填写专栏名称'); return; }
  editingCol.name = name; editingCol.intro = $('#cf-intro').value.trim();
  editingCol.vis = getSeg('#cf-vis'); editingCol.cat = getSeg('#cf-cat');
  if (!editingCol.id) { editingCol.id = 'c' + Date.now(); editingCol.follows = 0; editingCol.reads = 0; COLUMNS.push(editingCol); toast('专栏已创建'); }
  else toast('专栏已保存');
  closeDrawers(); renderColumns();
}

/* 分段控件 */
function setSeg(sel, val) { document.querySelectorAll(sel + ' button').forEach(b => b.classList.toggle('is-active', b.dataset.val === val)); }
function getSeg(sel) { const b = $(sel + ' button.is-active'); return b ? b.dataset.val : ''; }
document.addEventListener('click', e => {
  const b = e.target.closest('.seg button');
  if (b && !b.classList.contains('seg__add')) { b.parentElement.querySelectorAll('button:not(.seg__add)').forEach(x => x.classList.remove('is-active')); b.classList.add('is-active'); }
});

/* toast */
let toastTimer;
function toast(msg) { const t = $('#toast'); $('#toast-msg').textContent = msg; t.classList.add('is-show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-show'), 2000); }

/* ───────── 标签管理 ───────── */
let tagQuery = '';
const trendMeta = { up:{t:'↑ 上升', c:'#1F8A5B'}, flat:{t:'— 平稳', c:'#9AA6BE'}, down:{t:'↓ 下降', c:'#C2415B'} };
function renderTags() {
  const grid = $('#tag-cloud'); if (!grid) return;
  let list = TAGS.slice().sort((a, b) => b.count - a.count);
  if (tagQuery) list = list.filter(t => t.name.toLowerCase().includes(tagQuery));
  const max = Math.max(...TAGS.map(t => t.count));
  $('#tag-count').textContent = TAGS.length;
  grid.innerHTML = list.map(t => {
    const big = t.count > max * 0.6 ? 'is-big' : (t.count > max * 0.3 ? 'is-mid' : '');
    return `<span class="tagpill ${big}" style="--tc:${TONES[t.tone].sw}" onclick="filterTag('${t.name}')">#${t.name}<b>${t.count}</b></span>`;
  }).join('');
  $('#tag-tbody').innerHTML = list.map(t => `
    <tr>
      <td><span class="tag-name"><span class="tag-dot" style="background:${TONES[t.tone].sw}"></span>#${t.name}</span></td>
      <td><b style="font-family:var(--font);">${t.count}</b> 篇</td>
      <td><div class="bar"><span style="width:${Math.round(t.count / max * 100)}%;background:${TONES[t.tone].sw}"></span></div></td>
      <td style="color:${trendMeta[t.trend].c};font-weight:700;font-size:12.5px;">${trendMeta[t.trend].t}</td>
      <td><div class="row-act">
        <button title="重命名" onclick="toast('重命名标签 #${t.name}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16z"></path><path d="M13.5 6.5l4 4"></path></svg></button>
        <button title="合并" onclick="toast('合并标签 #${t.name}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v6a5 5 0 0 0 5 5h5M17 12l3 3-3 3"></path></svg></button>
        <button class="danger" title="删除" onclick="delTag('${t.id}')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"></path></svg></button>
      </div></td>
    </tr>`).join('');
}
function delTag(id) { const i = TAGS.findIndex(t => t.id === id); if (i >= 0) { const n = TAGS[i].name; TAGS.splice(i, 1); renderTags(); toast('已删除标签 #' + n); } }
function filterTag(name) { tagQuery = name.toLowerCase(); const s = $('#tag-search'); if (s) s.value = name; renderTags(); }
function addTag() {
  const name = prompt && false; // 占位：用 toast 演示
  const t = { id:'t' + Date.now(), name:'新标签', count:0, tone:TONE_KEYS[Math.floor(Math.random() * TONE_KEYS.length)], trend:'flat' };
  TAGS.push(t); renderTags(); toast('已新建标签 #新标签，可重命名');
}

/* ───────── 评论审核 ───────── */
let cmtFilter = 'pending';
const CSTAT = { pending:'待审核', approved:'已通过', spam:'垃圾' };
function cmtCount(s) { return s === 'all' ? COMMENTS.length : COMMENTS.filter(c => c.status === s).length; }
function renderComments() {
  const box = $('#cmt-list'); if (!box) return;
  document.querySelectorAll('#cmt-tabs .tab').forEach(b => {
    b.classList.toggle('is-active', b.dataset.val === cmtFilter);
    const n = b.querySelector('.tab__n'); if (n) n.textContent = cmtCount(b.dataset.val);
  });
  let list = cmtFilter === 'all' ? COMMENTS.slice() : COMMENTS.filter(c => c.status === cmtFilter);
  box.innerHTML = list.length ? list.map(c => `
    <div class="cmt">
      <span class="cmt__av thumb ${TONES[c.tone].cls}">${c.author.slice(0, 1)}</span>
      <div class="cmt__main">
        <div class="cmt__top"><b>${c.author}</b><span class="cmt__time">${c.time}</span>
          <span class="cstat ${c.status}">${CSTAT[c.status]}</span></div>
        <div class="cmt__text">${c.text}</div>
        <div class="cmt__on">评论于 <a onclick="toast('打开《${c.note}》')">《${c.note}》</a> <code>${c.path}</code></div>
      </div>
      <div class="cmt__acts">
        ${c.status !== 'approved' ? `<button class="cbtn ok" onclick="setCmt('${c.id}','approved')"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 5"></path></svg>通过</button>` : ''}
        ${c.status !== 'spam' ? `<button class="cbtn warn" onclick="setCmt('${c.id}','spam')">垃圾</button>` : ''}
        <button class="cbtn del" onclick="delCmt('${c.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"></path></svg></button>
      </div>
    </div>`).join('') : '<div class="empty-note" style="margin:8px 0;">该分类下暂无评论</div>';
}
function setCmt(id, s) { const c = COMMENTS.find(x => x.id === id); if (c) { c.status = s; renderComments(); updateBadges(); toast(s === 'approved' ? '评论已通过' : '已标记为垃圾'); } }
function delCmt(id) { const i = COMMENTS.findIndex(x => x.id === id); if (i >= 0) { COMMENTS.splice(i, 1); renderComments(); updateBadges(); toast('评论已删除'); } }

/* ───────── 广告位 ───────── */
function renderAds() {
  const wrap = $('#ad-views'); if (!wrap) return;
  $('#ad-count').textContent = ADS.filter(a => a.on).length;
  // 按投放位置分组
  wrap.innerHTML = Object.keys(SLOTS).map(slot => {
    const ads = ADS.filter(a => a.slot === slot);
    const onN = ads.filter(a => a.on).length;
    return `
    <div class="ad-slot">
      <div class="ad-slot__head">
        <span class="ad-slot__name">${SLOTS[slot].label}</span>
        <span class="ad-slot__meta">${SLOTS[slot].size} · ${ads.length} 个广告${onN > 1 && slot === 'home' ? ' · 首页轮播' : ''}</span>
        <span class="spacer"></span>
        <button class="btn-mini is-primary" onclick="openAd(null,'${slot}')"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3v10M3 8h10"></path></svg>添加</button>
      </div>
      <div class="ad-grid">
        ${ads.length ? ads.map(a => adCard(a)).join('') : '<div class="empty-note" style="grid-column:1/-1;">该位置暂无广告，点击「添加」</div>'}
      </div>
    </div>`;
  }).join('');
}
function adCard(a) {
  return `<div class="adcard ${a.on ? '' : 'is-off'}">
    <div class="adcard__thumb thumb ${TONES[a.tone].cls}"><span class="thumb__grid"></span>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" style="position:relative;opacity:.9"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10" r="1.6"></circle><path d="m4 17 5-4 4 3 3-2 4 3"></path></svg>
    </div>
    <div class="adcard__body">
      <div class="adcard__top"><div class="adcard__name">${a.name}</div><span class="switch ${a.on ? '' : 'off'}" onclick="toggleAd('${a.id}')"></span></div>
      <div class="adcard__place">${a.title} — ${a.desc}</div>
      <div class="adcard__url"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 15l6-6M10 7h5v5"></path></svg>${a.url}</div>
      <div class="adcard__stats">
        <span class="m"><b>${fmt(a.imp)}</b><span>曝光 / 周</span></span>
        <span class="m"><b>${fmt(a.click)}</b><span>点击 / 周</span></span>
        <span class="m"><b>${a.imp ? (a.click / a.imp * 100).toFixed(1) : '0.0'}%</b><span>CTR</span></span>
      </div>
    </div>
    <div class="adcard__foot"><span class="spacer"></span>
      <button class="btn-mini" onclick="openAd('${a.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16z"></path><path d="M13.5 6.5l4 4"></path></svg>编辑</button>
      <button class="btn-mini" style="color:#C2415B;border-color:#F3C2CD;" onclick="delAd('${a.id}')">删除</button>
    </div>
  </div>`;
}
function toggleAd(id) { const a = ADS.find(x => x.id === id); if (a) { a.on = !a.on; renderAds(); updateBadges(); toast(a.on ? '广告位已开启' : '广告位已暂停'); } }
function delAd(id) { const i = ADS.findIndex(x => x.id === id); if (i >= 0) { ADS.splice(i, 1); renderAds(); updateBadges(); toast('广告位已删除'); } }

/* 广告编辑抽屉 */
let editingAd = null;
function openAd(id, slot) {
  editingAd = id ? ADS.find(a => a.id === id) : { id:null, name:'', slot:slot || 'home', tone:'blue', title:'', desc:'', cta:'了解更多', url:'', imp:0, click:0, on:true };
  const isNew = !id;
  $('#ad-drawer-title').textContent = isNew ? '新建广告' : '编辑广告';
  $('#ad-drawer-sub').textContent = SLOTS[editingAd.slot].label;
  $('#af-name').value = editingAd.name;
  $('#af-title').value = editingAd.title;
  $('#af-desc').value = editingAd.desc;
  $('#af-cta').value = editingAd.cta;
  $('#af-url').value = editingAd.url === '—' ? '' : editingAd.url;
  // slot seg
  $('#af-slot').innerHTML = Object.keys(SLOTS).map(s => `<button data-val="${s}" class="${s === editingAd.slot ? 'is-active' : ''}">${SLOTS[s].label.split(' · ')[0]}</button>`).join('');
  // tone swatches
  $('#af-cover').className = 'cover-pick__preview thumb ' + TONES[editingAd.tone].cls;
  $('#af-cover').innerHTML = `<span class="thumb__grid"></span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" style="position:relative;opacity:.9"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10" r="1.6"></circle><path d="m4 17 5-4 4 3 3-2 4 3"></path></svg>`;
  $('#af-tones').innerHTML = TONE_KEYS.map(k => `<span class="tone-sw ${k === editingAd.tone ? 'is-sel' : ''}" style="background:${TONES[k].sw}" onclick="pickAdTone('${k}')"></span>`).join('');
  setSeg('#af-on', editingAd.on ? 'on' : 'off');
  renderAdPreview();
  openDrawer('ad-drawer');
}
function pickAdTone(k) {
  editingAd.tone = k;
  $('#af-cover').className = 'cover-pick__preview thumb ' + TONES[k].cls;
  document.querySelectorAll('#af-tones .tone-sw').forEach((s, i) => s.classList.toggle('is-sel', TONE_KEYS[i] === k));
  renderAdPreview();
}
function renderAdPreview() {
  const t = $('#af-title').value || '广告标题';
  const d = $('#af-desc').value || '一句话广告文案描述';
  const cta = $('#af-cta').value || '了解更多';
  $('#ad-preview').className = 'adprev thumb ' + TONES[editingAd.tone].cls;
  $('#ad-preview').innerHTML = `<span class="thumb__grid"></span>
    <div class="adprev__body"><span class="adprev__label">赞助</span>
      <div class="adprev__t">${t}</div><div class="adprev__d">${d}</div></div>
    <span class="adprev__cta">${cta}</span>`;
}
function saveAd() {
  const name = $('#af-name').value.trim() || $('#af-title').value.trim();
  if (!$('#af-title').value.trim()) { $('#af-title').focus(); toast('请填写广告标题'); return; }
  editingAd.name = name || $('#af-title').value.trim();
  editingAd.title = $('#af-title').value.trim();
  editingAd.desc = $('#af-desc').value.trim();
  editingAd.cta = $('#af-cta').value.trim() || '了解更多';
  editingAd.url = $('#af-url').value.trim() || '—';
  editingAd.slot = getSeg('#af-slot');
  editingAd.on = getSeg('#af-on') === 'on';
  if (!editingAd.id) { editingAd.id = 'ad' + Date.now(); ADS.push(editingAd); toast('广告已创建'); }
  else toast('广告已保存');
  closeDrawers(); renderAds(); updateBadges();
}
function addAd() { openAd(null, 'home'); }

/* 侧栏徽标同步 */
function updateBadges() {
  const set = (route, n) => { const a = document.querySelector(`.adm-nav a[data-route="${route}"] .badge-n`); if (a) a.textContent = n; };
  set('comments', cmtCount('pending')); set('ads', ADS.filter(a => a.on).length); set('tags', TAGS.length);
}

/* ───────── 路由 ───────── */
function go(path) { location.hash = '#/' + path; }
const NAVMETA = {
  dashboard:{ title:'仪表盘', sub:'欢迎回来，这是今天的数据概览', nav:'dashboard' },
  vault:    { title:'笔记库', sub:'你的 Obsidian 笔记库，按目录管理与发布', nav:'vault' },
  note:     { title:'笔记详情', sub:'管理单篇笔记的可见性与发布', nav:'vault' },
  columns:  { title:'专栏管理', sub:'像知乎专栏一样，把同主题笔记聚合成系列', nav:'columns' },
  tags:     { title:'标签管理', sub:'维护笔记标签体系，重命名、合并与删除', nav:'tags' },
  comments: { title:'评论审核', sub:'审核访客评论，通过、拦截垃圾与删除', nav:'comments' },
  ads:      { title:'广告位', sub:'管理站内广告位的投放与数据', nav:'ads' },
};
function route() {
  const parts = location.hash.replace(/^#\//, '').split('/');
  const key = parts[0] || 'dashboard';
  const view = NAVMETA[key] ? key : 'dashboard';
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('is-active', el.dataset.view === view));
  document.querySelectorAll('.adm-nav a[data-route]').forEach(a => a.classList.toggle('is-active', a.dataset.route === NAVMETA[view].nav));
  $('#top-title').textContent = NAVMETA[view].title;
  $('#top-sub').textContent = NAVMETA[view].sub;
  const btn = $('#btn-new');
  const NEWLABEL = { columns:'新建专栏', vault:'新建笔记', tags:'新建标签', ads:'新建广告' };
  if (NEWLABEL[view]) { btn.dataset.act = view; $('#btn-new-label').textContent = NEWLABEL[view]; btn.style.display = ''; }
  else btn.style.display = 'none';
  closeDrawers();

  if (view === 'vault') {
    vaultFolder = parts[1] ? decodeURIComponent(parts[1]) : null;
    if (vaultFolder && !FOLDERS.some(f => f.name === vaultFolder)) vaultFolder = null;
    renderVault();
  }
  if (view === 'note') renderNote(parts[1]);
  if (view === 'columns') renderColumns();
  if (view === 'tags') renderTags();
  if (view === 'comments') renderComments();
  if (view === 'ads') renderAds();
}
window.addEventListener('hashchange', route);

/* ───────── 初始化 ───────── */
document.addEventListener('DOMContentLoaded', () => {
  renderDashTable(); renderColumns(); route();
  scrim().addEventListener('click', closeDrawers);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawers(); });
  $('#btn-new').addEventListener('click', () => {
    const act = $('#btn-new').dataset.act;
    if (act === 'columns') openColumn(null);
    else if (act === 'tags') addTag();
    else if (act === 'ads') addAd();
    else toast('在 Obsidian 中新建 .md 笔记后会自动同步到这里');
  });
  // vault 控件
  $('#mode-folders').addEventListener('click', () => { vaultMode = 'folders'; vaultFolder = null; if (location.hash !== '#/vault') go('vault'); else renderVault(); });
  $('#mode-flat').addEventListener('click', () => { vaultMode = 'flat'; vaultFolder = null; if (location.hash !== '#/vault') go('vault'); else renderVault(); });
  document.querySelectorAll('#vault-filter button').forEach(b => b.addEventListener('click', () => { vaultVis = b.dataset.val; renderVault(); }));
  $('#vault-sort').addEventListener('change', e => { vaultSort = e.target.value; renderVault(); });
  $('#vault-search').addEventListener('input', e => { vaultQuery = e.target.value.trim().toLowerCase(); renderVault(); });
  // 专栏简介字数 + 自定义分类
  $('#cf-intro').addEventListener('input', e => { $('#cf-intro-count').textContent = e.target.value.length + ' / 120'; });
  $('#cf-cat-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); confirmCatAdd(); } });
  // 标签搜索
  $('#tag-search').addEventListener('input', e => { tagQuery = e.target.value.trim().toLowerCase(); renderTags(); });
  // 评论筛选 tab
  document.querySelectorAll('#cmt-tabs .tab').forEach(b => b.addEventListener('click', () => { cmtFilter = b.dataset.val; renderComments(); }));
  // 旧广告开关（仪表盘）
  document.querySelectorAll('.adlist .switch').forEach(s => s.addEventListener('click', () => s.classList.toggle('off')));
});

Object.assign(window, { go, enterFolder, exitFolder, openColumn, saveColumn, pickTone, removeFromCol, showCatAdd, confirmCatAdd, closeDrawers, setVis, toggleDisc, genShort, setNoteCol, renderNoteTags, removeNoteTag, openTagPop, addNoteTag, addNoteTagNew, delTag, addTag, filterTag, setCmt, delCmt, toggleAd, delAd, addAd, openAd, saveAd, pickAdTone, renderAdPreview });
