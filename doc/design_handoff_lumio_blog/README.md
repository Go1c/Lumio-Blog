# Handoff: Lumio Game Tech Blog（含管理后台）

## Overview
一个面向游戏开发的技术博客「Lumio Game Tech Blog」，包含 5 个公开页面（首页 / 文章列表 / 专栏 / 标签 / 关于）和 1 个管理员后台（仪表盘 + 文章/广告管理）。视觉基调为**明亮、清爽、专业、科技感、游戏化**，统一使用等距 3D 体素立方体（voxel cube）作为插画语言。

## About the Design Files
本包内的文件是**用 HTML/CSS/JS 制作的设计参考稿**——它们展示了目标产品的外观与交互意图，**不是直接拿去上线的生产代码**。

你的任务是：**在目标代码库的现有技术环境中（React / Vue / Next / SwiftUI / 原生等）重建这些设计**，沿用该项目既有的组件体系、样式方案与约定。如果项目尚无前端环境，请为其选择最合适的框架（推荐 React + TypeScript + Vite，或 Next.js）再实现。

数据（文章、统计、广告）目前都是写死的示例内容，后台的开关/筛选是纯前端原型逻辑——实现时应替换为真实的接口与状态管理。

## Fidelity
**高保真（Hi-fi）**。配色、字体、间距、圆角、阴影、悬停态均为最终值，请按像素还原，并用代码库现有的组件库落地。下文「Design Tokens」给出了全部精确数值。

---

## Design Tokens

### Colors
| Token | Hex | 用途 |
|---|---|---|
| primary | `#7C8CFF` | 主色（按钮、激活态、链接、主图标） |
| primary-d | `#6171F0` | 主色深（渐变尾、文字强调） |
| secondary | `#5DE2C6` | 辅助色（薄荷绿，点缀、第二类立方体/图标） |
| accent | `#FFB86B` | 强调色（琥珀，金币、第三类立方体） |
| bg | `#F7FAFF` | 页面背景 |
| ink | `#1E2A3A` | 主文字 |
| muted | `#6B7894` | 次要文字 |
| faint | `#9AA6BE` | 弱文字 / 占位 |
| line | `#E7ECF6` | 描边、分隔线 |
| card | `#FFFFFF` | 卡片/面板背景 |

页面背景为多层径向渐变叠加：`radial-gradient(120% 90% at 88% -10%, #EAF0FF, transparent 55%)` + `radial-gradient(90% 80% at -5% 110%, #E7FBF4, transparent 50%)` + `#F7FAFF`，`background-attachment: fixed`。

后台侧边栏专用深色：背景 `#1E2440`，文字 `#C5CCE6`，分组标题 `#5C6699`，激活项用 primary 渐变。

状态色（后台/标签）：成功/已发布 文字 `#1F8A5B` 底 `#E3F7ED`；草稿 文字 `#8A6A1F` 底 `#FBF1DA`；审核 文字 `#2C7FC9` 底 `#E2F0FE`；危险 `#C2415B` 底 `#FCE7EC`。

### Typography
- 英文/数字字体栈：`'Inter', 'Noto Sans SC', sans-serif`（变量 `--font`）
- 中文字体栈：`'Noto Sans SC', 'Inter', sans-serif`（变量 `--font-zh`）
- 通过 Google Fonts 引入：Inter 400/500/600/700/800，Noto Sans SC 400/500/700/900
- 字号节选：Hero 主标题 52px/800/line-height 1.02/letter-spacing -.02em；页面标题 40px/800；区块标题 19–22px/700；卡片标题 16px/700；正文 13–15px/400–500；元信息 12px/500；统计大数字 30px/800。
- 标题用 800/700（Bold），正文用 400–500（Regular/Medium）。

### Spacing / Radius / Shadow
- 圆角：`--radius: 18px`（卡片）、`--radius-sm: 12px`、shell 外框 26px、按钮/输入 11–13px、徽章 8px。
- 阴影：
  - card：`0 1px 2px rgba(30,42,58,.04), 0 10px 30px -12px rgba(53,68,120,.18)`
  - pop（悬停）：`0 18px 50px -16px rgba(53,68,120,.40)`
  - shell 外框：`0 30px 80px -40px rgba(40,54,110,.45), 0 2px 4px rgba(30,42,58,.04)`
- 主按钮渐变：`linear-gradient(135deg, #7C8CFF, #6171F0)`，阴影 `0 12px 26px -10px rgba(97,113,240,.85)`，悬停 `translateY(-2px)`。
- 卡片悬停统一 `translateY(-4px)` + pop 阴影 + 边框转 `#D4DCF5`，过渡 `.18s`。

### 标志性元素：等距 3D 体素立方体（voxel cube）
统一插画语言，用纯 CSS 3D 实现，**不要用位图**。结构：
```html
<div class="cube" style="--s:46px"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></div>
```
关键 CSS：
```css
.cube { --s:46px; --t:#C7D0FF; --l:#6E80F5; --r:#98A6FF;
  position:absolute; width:var(--s); height:var(--s);
  transform-style:preserve-3d; transform:rotateX(-24deg) rotateZ(-45deg); }
.cube i { position:absolute; width:var(--s); height:var(--s); border-radius:3px; backface-visibility:hidden; }
.cube .f-t { background:var(--t); transform:rotateX(90deg) translateZ(calc(var(--s)/2)); }  /* 顶面（亮） */
.cube .f-r { background:var(--r); transform:translateZ(calc(var(--s)/2)); }                  /* 右面（中） */
.cube .f-l { background:var(--l); transform:rotateY(-90deg) translateZ(calc(var(--s)/2)); }  /* 左面（暗） */
```
配色变体（顶/暗左/中右）：
- 默认蓝：`--t:#C7D0FF; --l:#6E80F5; --r:#98A6FF`
- 薄荷 `.c-mint`：`#B6F2E4 / #43C9AD / #6FE0C9`
- 琥珀 `.c-amber`：`#FFE0B8 / #F39A47 / #FFC078`
- 粉 `.c-pink`：`#FFCEDD / #F0658E / #FF93B4`
- 紫（内联）：`--t:#D9D2FF; --r:#B5A6FF; --l:#8E76F0`
- 天蓝（内联）：`--t:#BFE6FF; --r:#86C8FF; --l:#4FA0E8`

漂浮动画必须保留旋转（否则只剩正面、退化成平面方块）：
```css
@keyframes bobcube { 0%,100%{transform:translateY(0) rotateX(-24deg) rotateZ(-45deg);}
  50%{transform:translateY(-8px) rotateX(-24deg) rotateZ(-45deg);} }
.cube.float { animation:bobcube 4s ease-in-out infinite; }
```
其他游戏化点缀：像素爱心 `.px-heart`（5×5 网格红色像素 `#FF7EA6`）、金币 `.coin`（径向渐变 + 边框 + 星号）、发光球 `.orb`（Shader 卡用的橙色径向渐变光球）。详见 `gametech.css`。

---

## Screens / Views

### 公共框架
- **外层 shell**：`max-width:1180px` 居中，白底，圆角 26px，外阴影。页面 body 有 `padding:40px 28px`，四角有淡像素点阵装饰。
- **顶部导航 `.nav`**：左侧品牌（38px 圆角方块 logo「LUMIO / .GAMES」内含 3×3 像素点阵）+ 导航链接（首页/文章/专栏/标签/关于，激活项 primary 色 + 底部 2.5px 下划线条）+ 弹性空隙 + 搜索框（230px）+ 主题切换图标按钮 + 头像（点击进入后台）。半透明白底 + 模糊。

### 1. 首页 `Game Tech Blog.html`
- **布局**：导航下方为两列 `grid-template-columns: 380px 1fr`。左列 Hero，右列文章内容。窄屏（≤980px）退化为单列。
- **Hero（左列）**：渐变背景 `linear-gradient(160deg,#DCE4FF,#E4ECFF 38%,#DFF7F0)` + 网格遮罩。内容：eyebrow「Lumio Dev Notes」、主标题「Game / Tech Blog」(52px/800)、副标 标签串（技术文章·游戏开发·实践分享，用薄荷小圆点分隔）、主按钮「阅读最新文章」（带箭头，悬停箭头右移）。底部 `.hero__scene` 为体素游戏场景：地面 5 块立方体堆叠 + 漂浮立方体 + 像素爱心 + 金币。
- **内容（右列）**：区块标题「最新文章」（左侧 4px primary 竖条）+「查看全部」链接。两行各 3 张文章卡 `.grid`（3 列）。
- **广告位**：在两行卡片之间。`<a class="ad ad__link" href target="_blank" rel="noopener sponsored">`，右上角「赞助 · Sponsored」标签。内部目前是占位 `.ad__ph`（728×90 横幅说明），**上线时整体替换为 `<img class="ad__img" src="…">`，并把 `href` 改为跳转地址**。这是图片点击跳转广告的标准实现。
- **订阅条 `.subscribe`**：渐变底，左图标 + 文案「订阅更新」+ 邮箱输入 + 订阅按钮。

**文章卡 `.card` 结构**：封面 `.thumb`（132px 高，分色 t-blue/t-mint/t-amber/t-violet/t-sky/t-rose，含网格纹理 + 左上分类徽章 + 居中体素插画）→ `.card__body`（标题 16px/700、两行截断描述、元信息：日历图标+日期、时钟图标+时长）。悬停上浮 + 标题转 primary-d。

### 2. 文章列表 `Articles.html`
- 顶部 `.page-head`（渐变 + 网格，eyebrow「All Articles」+ 标题「全部文章」+ 副标）。
- 分类筛选 `.chips`（全部/渲染/性能/图形学/架构/网络/工具，带计数；激活态 primary 渐变）。**点击切换可过滤下方网格**（纯前端，按 `cat` 过滤示例数组）。
- 置顶大卡 `.feature`（左右两栏 1.1fr/1fr，左封面右文案，含阅读量等元信息）。
- 文章网格 `.grid-4`（3 列，由 JS 从 `ARTICLES` 数组渲染）。

### 3. 专栏 `Columns.html`
- `.page-head`（「Columns / 技术专栏」）。
- `.cols`（2 列）专栏卡 `.col-card`：左 132px 封面（体素插画）+ 右文案（专栏名 18px/700、两行描述、底部「N 篇文章」+「订阅专栏」幽灵按钮 `.btn-ghost`）。**注意**：`.col-card` 是 `<a>`，CSS 已加 `text-decoration:none; color:var(--ink)` 重置，实现时勿漏。

### 4. 标签 `Tags.html`
- `.page-head`（「Tags / 标签」）。
- 标签云 `.tagcloud`：`.tag-pill` 药丸，**字号随热度变化**（`.is-big`/`.is-mid`/默认），右侧彩色计数气泡（颜色变体 s-mint/s-amber/s-violet/s-sky/s-rose）。悬停上浮。
- 「#渲染 下的文章」区块标题 + `.grid-4` 文章卡。

### 5. 关于 `About.html`
- `.page-head`（「About / 关于 Lumio」）。
- 导语 `.about-lead`（19px，含 primary-d 高亮的 `<b>`）。
- 三大特点 `.feat-row`（3 列卡片：实战为先/原理透彻/持续更新，各带渐变图标）。
- 核心团队 `.team`（4 列，圆角方形渐变头像 + 姓名 + 角色）。
- 底部复用 `.subscribe` 作联系表单。

### 6. 管理后台 `Admin.html`
- **独立布局**：`grid-template-columns: 248px 1fr`。左深色侧边栏，右主区。窄屏（≤1100px）侧栏转横向。
- **侧边栏 `.adm-side`**（深色 `#1E2440`）：品牌 + 分组导航（概览：仪表盘 / 内容：文章管理·专栏管理·标签管理·评论审核 / 运营：广告位·数据统计·系统设置，带计数徽章）+ 底部当前用户。激活项 primary 渐变。
- **顶栏 `.adm-top`**：页面标题「仪表盘」+ 副标 + 搜索 + 主按钮「写文章」。
- **统计卡 `.stat-row`**（4 列）：本月访问量 48,210 / 已发布文章 28 / 邮件订阅 3,642 / 广告点击 1,058。每卡含渐变图标 + 涨跌徽章（up 绿 / down 红）+ 大数字 + 标签。
- **两栏 `.two-col`**（1.55fr/1fr）：左为「近 7 日访问趋势」柱状图（纯 CSS，蓝/薄荷交替柱）；右为「广告位管理」列表 `.adlist`（缩略图 + 名称/URL + 周点击数 + 启停开关 `.switch`，**开关点击可切换**）。
- **文章管理表 `.tbl`**：列 标题(含作者副行)/分类(彩色标签)/状态(彩色圆点药丸)/浏览/发布日期/操作(编辑·预览·删除图标按钮)。由 JS 从 `ROWS` 数组渲染。

---

## Interactions & Behavior
- **导航**：5 个公开页 + 后台通过相对路径 `<a href>` 互联；头像 → `Admin.html`；后台「前台查看」→ `Articles.html`。
- **首页广告**：`<a>` 包图片，`target="_blank" rel="noopener sponsored"`，点击跳转外链。
- **文章筛选**（Articles）：点击 chip → 切换激活态 → 按分类过滤网格；空分类显示「该分类暂无文章」。
- **后台开关**（Admin）：点击 `.switch` 切换 `.off` 类（绿↔灰，圆钮左右滑，过渡 .15s）。
- **悬停态**：卡片上浮 + 阴影加深；按钮上浮；链接/箭头位移；表格行底色 `#FAFBFE`。
- **动画**：体素立方体 4s 漂浮（保留等距旋转）；过渡统一 .15–.18s。建议为 `prefers-reduced-motion` 提供静止回退。
- **响应式**：980px / 1100px / 680px 三档断点，详见各 CSS 媒体查询。

## State Management（实现时需替换为真实数据/接口）
- 文章列表：`articles[]`（标题/描述/分类/封面色/日期/时长/插画），支持按分类过滤。
- 专栏：`columns[]`（名称/描述/封面/篇数/订阅状态）。
- 标签：`tags[]`（名称/计数/色彩权重）。
- 后台仪表盘：统计指标（访问量/文章数/订阅数/广告点击，带环比）、7 日趋势序列、广告位 `ads[]`（名称/URL/周点击/启用开关）、文章管理 `rows[]`（标题/作者/分类/状态/浏览/日期）。
- 状态机：文章状态 `已发布 / 草稿 / 待审核`；广告 `启用 / 停用`。

## Assets
- **无位图资源**。所有插画（体素立方体、像素爱心、金币、发光球）与图标均为 CSS/内联 SVG。
- 字体来自 Google Fonts（Inter + Noto Sans SC）。
- 唯一需要用户提供的图片是**广告横幅图**（首页广告位 `.ad__img`，建议 728×90 或等比）。

## Files（设计参考稿，按页面对照实现）
- `Game Tech Blog.html` — 首页（含广告位）
- `Articles.html` — 文章列表（筛选 + 置顶）
- `Columns.html` — 专栏
- `Tags.html` — 标签云
- `About.html` — 关于
- `Admin.html` — 管理后台
- `gametech.css` — 全站设计 token、导航、卡片、体素立方体等核心样式（所有页面共享）
- `pages.css` — 子页面（文章/专栏/标签/关于）专用布局样式
- `admin.css` — 后台专用布局样式
