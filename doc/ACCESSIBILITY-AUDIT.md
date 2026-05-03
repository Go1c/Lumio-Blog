# Accessibility Audit: Lumio-Blog 高保真原型

**Standard:** WCAG 2.1 AA  **Date:** 2026-05-03  **Scope:** `doc/prototype/` 高保真原型 + `styles-hifi.css` 设计 token

## Summary

**Issues found:** 17  **Critical:** 5  **Major:** 8  **Minor:** 4

总体设计语言简洁、现代、token 体系清晰,但语义结构和键盘可达性这两块缺口比较大 — 多数交互元素是 `<span>`(按钮、标签、排序控件、复选框、Toggle),无键盘可达、无 focus 指示、无可访问名称。色彩 token 的"软底+同色文字"模式对比度也偏低,移动端触控目标普遍不达标。

## Findings

### Perceivable

| # | Issue | WCAG | Severity | Recommendation |
|---|-------|------|----------|----------------|
| 1 | `--ink-4` (#a3a3a3) 在白底上对比度仅 **2.52:1**,但被 `hf-faint` 大量用于日期、阅读时长、阅读数、目录小标题等 11–12px 文字 | 1.4.3 | Critical | 把 `--ink-4` 调暗到 ≥ #767676(对比 ≥ 4.54),或将这些 metadata 改用 `--ink-3` |
| 2 | `hf-tag--warn`(`#ca8a04` on `#fef9c3`)= **2.74:1**,`hf-vis--link`("仅链接") 同色样式 | 1.4.3 | Critical | warn 文字改 `#854d0e`(对比 ≥ 6.4),或加深背景 |
| 3 | `hf-tag--ok` `#16a34a` on `#dcfce7` = **3.00:1**;`hf-tag--danger` 3.95:1;`hf-tag--accent` 4.18:1。这些 tag 字号 11–12px 全部按"普通文字"算 | 1.4.3 | Major | 文字改用同色族更深的 700 阶(`--accent-2 #003fb8` 已有,danger/ok/warn 同样需要 darker token) |
| 4 | 暗色模式 `--ink-4 #737373` on `--bg #0a0a0a` = **4.18:1**,普通文字未达标 | 1.4.3 | Major | 暗色 ink-4 至少改到 `#8a8a8a` |
| 5 | 装饰性 `hf-blob`(渐变模糊圆斑)、avatar 渐变彩球都没有 `aria-hidden="true"` | 1.1.1 | Minor | 给纯装饰元素加 `aria-hidden="true"`;avatar 的 `L` 字母如果是用户首字母缩写,应配 `aria-label` |
| 6 | `hf-mark` 高亮(`#fde68a`)只用颜色区分,active 状态用 `outline: 1px dashed` — 1px 虚线在小字号下视觉权重很弱 | 1.4.1 / 2.4.7 | Minor | 加一个非颜色信号(下划线/角标),active 加粗 outline 至 2px solid |

### Operable

| # | Issue | WCAG | Severity | Recommendation |
|---|-------|------|----------|----------------|
| 7 | 主按钮、辅助按钮全部以 `<span className="hf-btn">` 渲染(看 hf-home.jsx L80–86, L220–222),非键盘可达、屏读器读不出 button 角色 | 2.1.1 / 4.1.2 | Critical | 全部改为 `<button type="button">`;链接型按钮("看最新文章")用 `<a>` |
| 8 | 排序控件 "排序: 最新 ↓"(hf-home.jsx L147)、过滤 tag chip("全部/游戏 AI/渲染")都是静态 `<div>`/`<span>`,没有 role、tabindex、键盘事件 | 2.1.1 / 4.1.2 | Critical | 排序改 `<button aria-haspopup="listbox">` + 真实下拉;chip 改 `<button aria-pressed>` |
| 9 | 文章卡片(article)用 `cursor: default`,没有 `<a href>`,整张卡看似可点实则不能点也不能 Tab 进入 | 2.1.1 / 2.4.4 | Major | 标题包 `<a>`,或整卡用 `<a class="hf-card">` 包裹,加可见 focus 样式 |
| 10 | 全站只有 `.hf-input:focus` 写了 focus 样式,按钮、tag、目录项、卡片均无 `:focus-visible` | 2.4.7 | Critical | 全局 `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` |
| 11 | 触控目标尺寸普遍不达标:`hf-btn--sm` ≈ 22×n、`hf-btn--icon` 30×30、`hf-toggle` 28×16、`hf-check` 14×14 | 2.5.5 | Major | 关键交互目标 ≥ 44×44(或 24×24 + 充分间距,WCAG 2.2 SC 2.5.8) |
| 12 | 无 skip link,且没有可见的 `<main>` / `<nav>` landmark(JSX 里只在 home 用了 `<main>`,article 用 `<aside>`/`<div>`) | 2.4.1 / 1.3.1 | Major | 在 `HFBrowser` 顶部加 `<a class="skip" href="#main">跳到正文</a>`,统一所有页加 `<main id="main">` |
| 13 | `float-blob`、`pulse-dot` 无限循环动画,无 `@media (prefers-reduced-motion: reduce)` 兜底 | 2.3.3 | Minor | 包一层 `@media (prefers-reduced-motion: reduce) { .hf-blob, .hf-pulse { animation: none; } }` |

### Understandable

| # | Issue | WCAG | Severity | Recommendation |
|---|-------|------|----------|----------------|
| 14 | `<html lang>` 未在原型 `index.html` 设置;站点主语言为中文,屏读器无法切换发音 | 3.1.1 | Major | `<html lang="zh-CN">`;混排英文术语用 `<span lang="en">` |
| 15 | `hf-input` 在 hf-cli/hf-config 等场景使用,代码里看不到对应 `<label>`,占位文字单独承担标签职能 | 3.3.2 | Major | 每个 input 关联 `<label htmlFor>`,placeholder 不能替代 label |
| 16 | 头像 "公开/仅链接/私有" 状态只靠颜色 chip 区分,虽然有文字,但 chip 内文字字号 10–11px 且对比度不达标(见 #2、#3) | 1.4.1 + 1.4.3 | Minor | 字号 ≥ 12px;颜色之外加图标(锁/链接/眼睛) |

### Robust

| # | Issue | WCAG | Severity | Recommendation |
|---|-------|------|----------|----------------|
| 17 | `hf-toggle`、`hf-check`(模拟开关与复选框)是 `<div>`,无 `role="switch"`/`role="checkbox"`、无 `aria-checked`、无键盘交互 | 4.1.2 | Critical | 改用真实 `<input type="checkbox" role="switch">` 或加完整 ARIA + 键盘 handler |

## Color Contrast Check

| Token / 用法 | Foreground | Background | Ratio | Required | Pass? |
|---|---|---|---|---|---|
| Body / `--ink` | `#0a0a0a` | `#ffffff` | 20.5:1 | 4.5:1 | ✅ |
| Muted / `--ink-3` (light) | `#737373` | `#ffffff` | 4.74:1 | 4.5:1 | ✅ |
| Faint / `--ink-4` (light) | `#a3a3a3` | `#ffffff` | **2.52:1** | 4.5:1 | ❌ |
| Faint on bg-soft | `#a3a3a3` | `#fafafa` | **2.42:1** | 4.5:1 | ❌ |
| Accent / `--accent` | `#0066ff` | `#ffffff` | 4.83:1 | 4.5:1 | ✅ |
| `hf-tag--accent` | `#0066ff` | `#e6efff` | **4.18:1** | 4.5:1 | ❌(11–12px 文字) |
| `hf-tag--warn` | `#ca8a04` | `#fef9c3` | **2.74:1** | 4.5:1 | ❌ |
| `hf-tag--ok` / `hf-vis--public` | `#16a34a` | `#dcfce7` | **3.00:1** | 4.5:1 | ❌ |
| `hf-tag--danger` | `#dc2626` | `#fee2e2` | **3.95:1** | 4.5:1 | ❌ |
| Dark muted `--ink-3` | `#a3a3a3` | `#0a0a0a` | 7.85:1 | 4.5:1 | ✅ |
| Dark faint `--ink-4` | `#737373` | `#0a0a0a` | **4.18:1** | 4.5:1 | ❌ |
| Dark accent on accent-soft | `#4d8eff` | `#0d2547` | 4.83:1 | 4.5:1 | ✅ |
| `hf-mark` text on yellow | `#404040` | `#fde68a` | 8.33:1 | 4.5:1 | ✅ |

## Priority Fixes

1. **把假按钮换成真按钮(#7, #8, #11, #17)** — 这一项一改,键盘、屏读器、辅助技术的兼容立刻提升一大截。`<span className="hf-btn">` → `<button type="button">`。
2. **修 `--ink-4` 与所有 soft-tag 颜色对(#1–4)** — 把 token 基线改一次,所有页面的对比度问题一起解决:`--ink-4` 改到 `#767676`,`--warn-text/--ok-text/--danger-text/--accent-2` 用同色族更深的 700 阶。
3. **加全局 `:focus-visible`(#10)** — 一条规则全站受益,键盘用户立刻看得到自己在哪儿。
4. **触控目标 ≥ 44×44(#11)** — 移动端必修,`hf-btn--sm`、icon 按钮、toggle、check 都要扩大点击区。
5. **加 skip link + 真 landmark(#12)+ `<html lang="zh-CN">`(#14)** — 三处低成本结构修补,符合大多数中文站长被遗漏的可达性最佳实践。

## 备注

本次审查是基于 `doc/prototype/` 的设计稿源码完成的 — 还没看运行后的 HTML、键盘 Tab 顺序、屏读器实际朗读结果。把上面前 5 项落地后,建议:
- 用 axe DevTools / Lighthouse 跑一遍渲染后的页面
- 用 VoiceOver(macOS)和 NVDA(Windows)各遍历一次主要流程
- 用 Tab/Shift+Tab 走完整个首页 + 文章页,记录焦点顺序是否合理

---

## Remediation 已完成 (2026-05-03)

按上述审查结果修了一遍。涉及 22 个文件。

### Token 修复(对比度全部达 WCAG AA)

`doc/prototype/styles-hifi.css`、`code/packages/web-public/src/render-site.ts`、`code/packages/web-admin/public/style.css` 三处的色彩 token 统一收紧:

| Token | 修前 | 修后 | 对比度 |
|---|---|---|---|
| 原型 `--ink-3` (light) | #737373 (4.74:1) | #595959 | 7.00:1 |
| 原型 `--ink-4` (light) | #a3a3a3 (2.52:1 ❌) | #707070 | 4.95:1 |
| 原型 `--ink-3` (dark) | #a3a3a3 | #b8b8b8 | 9.98:1 |
| 原型 `--ink-4` (dark) | #737373 (4.18:1 ❌) | #8a8a8a | 5.73:1 |
| Web-public `--muted` (light) | #6b6b6b | #595959 | 7.00:1 |
| Web-public `--muted` (dark) | #999 | #b8b8b8 | 9.66:1 |
| Web-admin `--muted` | #888 (5.40:1) | #a3a3a3 | 7.59:1 |

新增专用文字 token:`--accent-2` / `--ok-text` / `--warn-text` / `--danger-text`,所有 soft-tag 和 visibility chip 的文字都改用这套(原来直接用 `--ok` / `--warn` 在 soft 底色上一律 < 4.5:1)。明暗模式都验证过,见复核脚本输出。

### 结构 / 语义修复

- `<span className="hf-btn">` → `<button type="button">`:在 5 个原型文件里共 66 处转换(自动化脚本 + 手动校对)
- `<span className="hf-toggle/hf-check">` → `<button role="switch|checkbox" aria-checked>`:7 处转换 + 1 处手动改 `<label class="hf-check-label">` 包裹
- `cursor: pointer` 的"假按钮"(复制/眼睛/打开等)→ 真 `<button aria-label>`:hf-config、hf-extras 共 5 处
- `wf-admin.jsx` 装饰圆点:加 `aria-label="公开/仅链接/私有"`,内部符号 `aria-hidden`
- 装饰元素 `aria-hidden="true"`:`hf-blob`、avatar gradient ball、traffic-light 圆点、表情符号、↑↓ 箭头、分隔点 ·

### Focus / Motion / Skip-link

三套 CSS 都加了:

- 全局 `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`
- `.skip-link`(视觉隐藏,Tab 进入时弹出)
- `.sr-only` 工具类
- `@media (prefers-reduced-motion: reduce)`(原型 CSS 还单独把 `.hf-blob` / `.hf-pulse` 的动画停掉)

每个页面入口都加了 `<a class="skip-link" href="#main-content">跳到正文</a>`,正文容器加 `id="main-content"`。

### 触控目标

- `.hf-btn`:padding 6→8,加 `min-height: 36px`
- `.hf-btn--sm`:padding 3→6,`min-height: 30px`
- `.hf-btn--icon`:30×30 → **36×36**
- `.hf-toggle`:28×16 → **36×20**(白圆点 12→16)
- `.hf-check`:14×14 → **18×18**(对勾标记同步放大)
- `.hf-check-label` / `.hf-toggle-label`:`min-height: 24px`,padding 4 — 用作 hit-area 包装
- web-admin `<button>`:padding 6→8,`min-height: 36px`;input/textarea/select 加 `min-height: 40px`

### Web-public(生产构建模板)

- `layout.ts`:加 skip-link、`<nav aria-label="主导航">`、`<main id="main-content">`、RSS 链接 `aria-label`
- `home.ts`:文章列表加 `aria-label`,日期改 `<time datetime>`,阅读时长加可读 `aria-label`
- `post.ts`:meta 用 `<time>`,可见性 chip 加可读 `aria-label`,中文化 visibility 词汇
- `tag.ts`:标签链接合成可读 label("标签 X,共 N 篇")
- `render-site.ts`:404 页加 `<html lang>`、skip-link、`id="main-content"`;CSS 加 `:focus-visible`、`.skip-link`、`.sr-only`、reduced-motion;数学渲染错误色用 token 替代裸 hex

### Web-admin(后台)

- `app.tsx`:skip-link、`<nav aria-label="后台导航" aria-current>`、按钮加 `aria-label`、loading 状态 `aria-busy`
- `login.tsx`:`<label htmlFor>`、`autoComplete`、`required`、`aria-describedby`/`aria-invalid` 关联错误、错误 `role="alert"`、按钮 `aria-busy`
- `note-list.tsx`:KPI 改 `<ul>` + `<li>`、表头加 `scope="col"`、`<caption class="sr-only">`、可见性/搜索性单元格 `aria-label`、loading `role="status" aria-live="polite"`、日期 `<time>`
- `note-detail.tsx`:可见性 radio-group 用 `<fieldset><legend>`,`name="visibility"`,searchable checkbox 用 `aria-describedby` 关联说明,toast 用 `role="alert|status" aria-live`
- `tokens.tsx` / `webhooks.tsx`:每个表单字段加 `<label htmlFor>`,新 token 提示 `role="alert"`,删除/撤销按钮加描述性 `aria-label`,日期改 `<time>`,空表头用 `<span class="sr-only">`

### 验证

- Babel parser 跑过所有 11 个修改过的原型 jsx 文件 → 全部 OK
- TypeScript `tsc --noEmit` 跑过 web-public 和 web-admin → 0 错误
- 对比度脚本(标准 WCAG 公式)验过所有新 token 在明暗模式各底色组合下 → 全部 ≥ 4.5:1

剩余事项:跑 axe / Lighthouse、用 VoiceOver/NVDA 实际听一遍、Tab 走完所有流程检查 focus 顺序。
