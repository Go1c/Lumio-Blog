/**
 * 设计 token + 全局重置 + a11y 工具类。
 * 与 doc/prototype/styles-hifi.css 保持同步。
 *
 * 这里只导出 CSS 字符串,实际写入文件由 web-public 在构建期完成,
 * web-admin 把这串字符串通过 vite static asset 拷过去。
 */

export const TOKENS_CSS = `/* ---- design tokens (light) ---- */
:root {
  --bg: #ffffff;
  --bg-soft: #fafafa;
  --bg-sunk: #f5f5f5;
  --line: #ececec;
  --line-strong: #d4d4d4;
  --ink: #0a0a0a;
  --ink-2: #404040;
  --ink-3: #595959;
  --ink-4: #707070;
  --accent: #0066ff;
  --accent-soft: #e6efff;
  --accent-2: #003fb8;
  --ok: #16a34a;
  --ok-soft: #dcfce7;
  --ok-text: #15803d;
  --warn: #ca8a04;
  --warn-soft: #fef9c3;
  --warn-text: #854d0e;
  --danger: #dc2626;
  --danger-soft: #fee2e2;
  --danger-text: #b91c1c;

  --error-fg: #991b1b;
  --error-bg: #fee2e2;
  --code-bg: #f5f5f7;

  --sans: 'Noto Sans SC', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;

  --radius-sm: 4px;
  --radius: 6px;
  --radius-lg: 10px;

  --shadow-1: 0 1px 2px rgba(0,0,0,.04);
  --shadow-2: 0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04);
  --shadow-3: 0 8px 28px rgba(0,0,0,.08);

  color-scheme: light;
}

/* ---- design tokens (dark) ---- */
html[data-theme="dark"] {
  --bg: #0a0a0a;
  --bg-soft: #111111;
  --bg-sunk: #1a1a1a;
  --line: #262626;
  --line-strong: #404040;
  --ink: #fafafa;
  --ink-2: #d4d4d4;
  --ink-3: #b8b8b8;
  --ink-4: #8a8a8a;
  --accent: #4d8eff;
  --accent-soft: #0d2547;
  --accent-2: #80abff;
  --ok: #22c55e;
  --ok-soft: #052e16;
  --ok-text: #86efac;
  --warn: #eab308;
  --warn-soft: #422006;
  --warn-text: #fde68a;
  --danger: #ef4444;
  --danger-soft: #450a0a;
  --danger-text: #fca5a5;
  --error-fg: #fca5a5;
  --error-bg: #450a0a;
  --code-bg: #1a1a1c;
  --shadow-1: 0 1px 2px rgba(0,0,0,.4);
  --shadow-2: 0 1px 3px rgba(0,0,0,.5), 0 4px 12px rgba(0,0,0,.4);
  --shadow-3: 0 8px 28px rgba(0,0,0,.6);
  color-scheme: dark;
}

/* prefers-color-scheme fallback when user hasn't picked manually */
@media (prefers-color-scheme: dark) {
  html:not([data-theme="light"]):not([data-theme="dark"]) {
    --bg: #0a0a0a;
    --bg-soft: #111111;
    --bg-sunk: #1a1a1a;
    --line: #262626;
    --line-strong: #404040;
    --ink: #fafafa;
    --ink-2: #d4d4d4;
    --ink-3: #b8b8b8;
    --ink-4: #8a8a8a;
    --accent: #4d8eff;
    --accent-soft: #0d2547;
    --accent-2: #80abff;
    --ok: #22c55e;
    --ok-soft: #052e16;
    --ok-text: #86efac;
    --warn: #eab308;
    --warn-soft: #422006;
    --warn-text: #fde68a;
    --danger: #ef4444;
    --danger-soft: #450a0a;
    --danger-text: #fca5a5;
    --error-fg: #fca5a5;
    --error-bg: #450a0a;
    --code-bg: #1a1a1c;
    color-scheme: dark;
  }
}

/* ---- reset ---- */
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--sans);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
a { color: inherit; text-decoration: none; }

/* ---- a11y: focus-visible / skip-link / sr-only ---- */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius);
}
.skip-link {
  position: absolute;
  left: -9999px;
  top: 8px;
  padding: 8px 14px;
  background: var(--accent);
  color: #fff;
  border-radius: var(--radius);
  font-weight: 500;
  z-index: 1000;
  text-decoration: none;
}
.skip-link:focus,
.skip-link:focus-visible {
  left: 8px;
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}

/* ---- reduced motion ---- */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}

/* ---- helpers ---- */
.hf-mono { font-family: var(--mono); }
.hf-muted { color: var(--ink-3); }
.hf-soft { color: var(--ink-2); }
.hf-faint { color: var(--ink-4); }
.hf-tiny { font-size: 11px; }
.hf-sm { font-size: 12px; }
.hf-md { font-size: 14px; }
.hf-lg { font-size: 16px; }
.hf-grow { flex: 1; min-width: 0; }
.hf-row { display: flex; }
.hf-col { display: flex; flex-direction: column; }
`;

export const PRIMITIVES_CSS = `/* ---- ui primitives ---- */
.ui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 36px;
  font-family: var(--sans);
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--line-strong);
  background: var(--bg);
  color: var(--ink);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all .15s;
  line-height: 1.4;
  text-decoration: none;
}
.ui-btn:hover { border-color: var(--ink-3); }
.ui-btn:disabled { opacity: .5; cursor: not-allowed; }
.ui-btn--primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.ui-btn--primary:hover { background: var(--accent-2); border-color: var(--accent-2); }
.ui-btn--ghost { background: transparent; border-color: var(--line); }
.ui-btn--danger { color: var(--danger-text); border-color: var(--danger-soft); }
.ui-btn--sm { padding: 6px 11px; min-height: 30px; font-size: 12px; }
.ui-btn--icon { padding: 0; width: 36px; height: 36px; }

.ui-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--bg);
  color: var(--ink-2);
  white-space: nowrap;
  line-height: 1.6;
  font-family: inherit;
}
.ui-tag--accent { background: var(--accent-soft); border-color: transparent; color: var(--accent-2); }
.ui-tag--ok { background: var(--ok-soft); border-color: transparent; color: var(--ok-text); }
.ui-tag--warn { background: var(--warn-soft); border-color: transparent; color: var(--warn-text); }
.ui-tag--danger { background: var(--danger-soft); border-color: transparent; color: var(--danger-text); }
.ui-tag--solid { background: var(--ink); color: var(--bg); border-color: var(--ink); }
button.ui-tag { cursor: pointer; }
.ui-tag[aria-pressed="true"] {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--accent-2);
}

.ui-card {
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.ui-input {
  font-family: var(--sans);
  font-size: 13px;
  padding: 8px 10px;
  min-height: 36px;
  background: var(--bg-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  color: var(--ink);
  width: 100%;
}
.ui-input:focus,
.ui-input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 0;
  border-color: var(--accent);
}

.ui-toggle {
  appearance: none;
  -webkit-appearance: none;
  width: 36px; height: 20px;
  border-radius: 999px;
  background: var(--line-strong);
  position: relative;
  cursor: pointer;
  transition: background .15s;
  flex-shrink: 0;
  border: 0;
  margin: 0;
  padding: 0;
}
.ui-toggle:checked,
.ui-toggle[aria-checked="true"] { background: var(--accent); }
.ui-toggle::after {
  content: '';
  position: absolute;
  top: 2px; left: 2px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: left .15s;
  pointer-events: none;
}
.ui-toggle:checked::after,
.ui-toggle[aria-checked="true"]::after { left: 18px; }

.ui-check {
  appearance: none;
  -webkit-appearance: none;
  width: 18px; height: 18px;
  border: 1.5px solid var(--line-strong);
  border-radius: 4px;
  display: inline-block;
  position: relative;
  background: var(--bg);
  vertical-align: -3px;
  cursor: pointer;
  flex-shrink: 0;
  margin: 0;
}
.ui-check:checked {
  background: var(--accent);
  border-color: var(--accent);
}
.ui-check:checked::after {
  content: '';
  position: absolute;
  left: 5px; top: 1px;
  width: 5px; height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.ui-check-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  cursor: pointer;
  padding: 4px 0;
}

.ui-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent), #a855f7);
}

.ui-kbd {
  display: inline-block;
  font-family: var(--mono);
  font-size: 10px;
  padding: 1px 5px;
  border: 1px solid var(--line);
  border-bottom-width: 2px;
  border-radius: 4px;
  background: var(--bg);
  color: var(--ink-3);
  line-height: 1.4;
}

.ui-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  vertical-align: 0;
  margin-right: 5px;
  background: var(--ink-3);
}
.ui-dot--ok { background: var(--ok); }
.ui-dot--warn { background: var(--warn); }
.ui-dot--danger { background: var(--danger); }
.ui-dot--accent { background: var(--accent); }

.ui-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  border: 1px solid var(--line);
  color: var(--ink-2);
}
.ui-badge--public { color: var(--ok-text); background: var(--ok-soft); border-color: transparent; }
.ui-badge--unlisted { color: var(--warn-text); background: var(--warn-soft); border-color: transparent; }
.ui-badge--link-only { color: var(--accent-2); background: var(--accent-soft); border-color: transparent; }
.ui-badge--private { color: var(--ink-3); background: var(--bg-sunk); }

/* ---- dropdown / modal / toast / tooltip (component CSS) ---- */
.ui-dropdown {
  position: relative;
  display: inline-block;
}
.ui-dropdown__menu {
  position: absolute;
  top: calc(100% + 4px); right: 0;
  min-width: 180px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-2);
  padding: 4px;
  z-index: 50;
}
.ui-dropdown__item {
  display: flex; align-items: center; gap: 8px;
  width: 100%;
  padding: 6px 10px;
  font-size: 13px;
  font-family: inherit;
  color: var(--ink);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  text-decoration: none;
}
.ui-dropdown__item:hover { background: var(--bg-soft); }

.ui-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.ui-modal {
  background: var(--bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-3);
  max-width: 540px;
  width: calc(100% - 32px);
  max-height: calc(100vh - 64px);
  overflow: auto;
  border: 1px solid var(--line);
}
.ui-modal__header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
}
.ui-modal__body { padding: 16px 20px; }
.ui-modal__footer {
  padding: 12px 20px;
  border-top: 1px solid var(--line);
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.ui-toast-region {
  position: fixed;
  bottom: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 200;
  pointer-events: none;
}
.ui-toast {
  pointer-events: auto;
  padding: 10px 14px;
  background: var(--bg);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow-2);
  font-size: 13px;
  min-width: 240px;
}
.ui-toast--error { border-color: var(--danger); color: var(--danger-text); }
.ui-toast--success { border-color: var(--ok); color: var(--ok-text); }

.ui-tooltip {
  position: relative;
  display: inline-block;
}
.ui-tooltip__bubble {
  position: absolute;
  bottom: calc(100% + 6px); left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: var(--ink);
  color: var(--bg);
  font-size: 11px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity .15s;
  z-index: 60;
}
.ui-tooltip:hover .ui-tooltip__bubble,
.ui-tooltip:focus-within .ui-tooltip__bubble { opacity: 1; }

/* ---- admin shell ---- */
.ui-admin {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: 100vh;
  width: 100%;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--sans);
}
.ui-admin__sidebar {
  border-right: 1px solid var(--line);
  background: var(--bg-soft);
  padding: 14px 12px;
  overflow: auto;
}
.ui-admin__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 14px;
}
.ui-admin__logo {
  width: 24px; height: 24px;
  border-radius: 6px;
  background: var(--ink);
  color: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 700;
}
.ui-admin__group-label {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: .05em;
  padding: 8px 10px 4px;
}
.ui-admin__nav { list-style: none; padding: 0; margin: 0; }
.ui-admin__nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--ink-2);
  text-decoration: none;
  font-weight: 400;
  min-height: 32px;
  cursor: pointer;
  background: transparent;
  border: 0;
  width: 100%;
  font-family: inherit;
  text-align: left;
}
.ui-admin__nav-item:hover { background: var(--bg-sunk); }
.ui-admin__nav-item[aria-current="page"] {
  background: var(--accent-soft);
  color: var(--accent-2);
  font-weight: 600;
}
.ui-admin__nav-item[aria-disabled="true"] {
  color: var(--ink-4);
  cursor: not-allowed;
}
.ui-admin__nav-item[aria-disabled="true"]:hover { background: transparent; }
.ui-admin__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
}
.ui-admin__topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
  flex-shrink: 0;
  min-height: 56px;
}
.ui-admin__crumbs {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
}
.ui-admin__crumbs a { color: var(--accent); text-decoration: none; }
.ui-admin__topbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  min-height: 32px;
  background: var(--bg-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  min-width: 220px;
  font-size: 12px;
  color: var(--ink-3);
  cursor: pointer;
  font: inherit;
  text-align: left;
  font-family: inherit;
}
.ui-admin__content {
  flex: 1;
  overflow: auto;
  background: var(--bg);
  padding: 24px 28px;
}

/* ---- public layout ---- */
.ui-public {
  font-family: var(--sans);
  color: var(--ink);
  background: var(--bg);
  min-height: 100vh;
}
.ui-public__nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  padding: 0 28px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.ui-public__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: inherit;
  font-weight: 700;
  font-size: 15px;
}
.ui-public__brand-logo {
  width: 26px; height: 26px;
  border-radius: 7px;
  background: var(--ink);
  color: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
}
.ui-public__nav-list {
  display: flex;
  gap: 4px;
  margin: 0 0 0 8px;
  padding: 0;
  list-style: none;
}
.ui-public__nav-link {
  display: inline-block;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-3);
  text-decoration: none;
  border-radius: var(--radius);
  position: relative;
}
.ui-public__nav-link:hover { color: var(--ink); }
.ui-public__nav-link[aria-current="page"] { color: var(--ink); }
.ui-public__nav-link[aria-current="page"]::after {
  content: '';
  position: absolute;
  bottom: -19px;
  left: 12px; right: 12px;
  height: 2px;
  background: var(--accent);
}
.ui-public__main {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px;
}
.ui-public__footer {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
  margin-top: 64px;
  border-top: 1px solid var(--line);
  color: var(--ink-3);
  font-size: 13px;
}

@media (max-width: 720px) {
  .ui-admin {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 100vh;
    overflow-x: hidden;
  }
  .ui-admin__sidebar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    max-height: 74px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    scrollbar-width: none;
  }
  .ui-admin__sidebar::-webkit-scrollbar { display: none; }
  .ui-admin__brand {
    flex: 0 0 auto;
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 6px;
    box-shadow: var(--shadow-1);
  }
  .ui-admin__brand-text { display: none; }
  .ui-admin__sidebar > div:not(.ui-admin__brand) {
    flex: 0 0 auto;
    min-width: 0;
  }
  .ui-admin__group-label { display: none; }
  .ui-admin__nav {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
  }
  .ui-admin__nav li { flex: 0 0 auto; }
  .ui-admin__nav-item {
    min-height: 40px;
    padding: 8px 10px;
    border-radius: var(--radius-lg);
    white-space: nowrap;
  }
  .ui-admin__nav-item span {
    max-width: 74px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ui-admin__main {
    height: auto;
    min-height: 0;
  }
  .ui-admin__topbar {
    min-height: 56px;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .ui-admin__topbar::-webkit-scrollbar { display: none; }
  .ui-admin__topbar > .hf-grow { display: none; }
  .ui-admin__crumbs {
    flex: 1 1 auto;
    min-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ui-admin__topbar-search {
    flex: 0 0 42px;
    min-width: 42px;
    width: 42px;
    padding: 0;
    justify-content: center;
  }
  .ui-admin__topbar-search .hf-grow,
  .ui-admin__topbar-search .ui-kbd { display: none; }
  .ui-admin__content {
    padding: 14px 12px;
    overflow-x: auto;
    overflow-y: visible;
  }
  .ui-public__nav {
    padding: 0 12px;
    gap: 10px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }
  .ui-public__nav::-webkit-scrollbar { display: none; }
  .ui-public__brand { flex: 0 0 auto; }
  .ui-public__brand span:last-child { display: none; }
  .ui-public__nav-list {
    flex: 0 0 auto;
    margin-left: 0;
  }
  .ui-public__nav-link {
    padding-left: 10px;
    padding-right: 10px;
    white-space: nowrap;
  }
  .ui-public__main {
    width: 100%;
    padding: 32px 16px;
  }
  .ui-public__footer { padding: 20px 16px; }
}
`;

export const ALL_CSS = TOKENS_CSS + '\n' + PRIMITIVES_CSS;
