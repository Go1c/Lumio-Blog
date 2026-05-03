/**
 * WS-E 专属样式 — 在每个 WS-E 页面顶部 import 这个组件以注入 styles。
 *
 * 不动 web-admin/public/style.css(那是另一个 WS 的产物),也不引入新依赖。
 * 用 <style> 标签把所有 .ws-e__* 规则写一次,后续打包时 Preact 会去重。
 */
const STYLE = `
/* ============================================================
 * WS-E styles (settings / tokens / webhooks / audit)
 * 完全使用 CSS 变量,与 hf-extras / hf-extras2 视觉对齐
 * ============================================================ */

.ws-e { padding: 20px 28px; max-width: 1100px; }
.ws-e--settings { padding: 0; max-width: none; }

.ws-e__header { margin-bottom: 24px; }
.ws-e__h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px 0; letter-spacing: -0.005em; }
.ws-e__lead { font-size: 13px; color: var(--ink-3); line-height: 1.6; margin: 4px 0 0 0; }
.ws-e__lead code {
  font-family: var(--mono); font-size: 12px;
  background: var(--bg-sunk); padding: 1px 5px; border-radius: 3px; color: var(--accent);
}
.ws-e__sm { font-size: 12px; line-height: 1.6; margin: 6px 0; }

/* panel = card */
.ws-e__panel {
  background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-lg);
  margin-bottom: 16px; overflow: hidden;
}
.ws-e__panel-head {
  display: flex; align-items: center; padding: 12px 16px;
  border-bottom: 1px solid var(--line); background: var(--bg-soft);
}
.ws-e__panel-head h2 {
  margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 0.01em;
}
.ws-e__panel-head > * + * { margin-left: 12px; }
.ws-e__panel-hint { font-family: var(--mono); font-size: 11px; color: var(--ink-4); margin-left: auto; }
.ws-e__empty { padding: 16px; color: var(--ink-3); font-size: 13px; }

/* tables */
.ws-e__table-wrap { overflow-x: auto; }
.ws-e__table { width: 100%; border-collapse: collapse; }
.ws-e__table th, .ws-e__table td {
  text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--line); vertical-align: middle;
}
.ws-e__table thead th {
  font-family: var(--mono); font-size: 11px; text-transform: uppercase;
  color: var(--ink-4); letter-spacing: 0.05em; background: var(--bg-soft);
}
.ws-e__table tbody tr:last-child td { border-bottom: none; }
.ws-e__row--dim td { opacity: 0.55; }

.ws-e__token-name { font-weight: 500; font-size: 13px; }
.ws-e__scope-badge--read { color: var(--ink-3); background: var(--bg-sunk); border-color: transparent; }
.ws-e__scope-badge--write { color: var(--accent-2); background: var(--accent-soft); border-color: transparent; }
.ws-e__scope-badge--admin { color: var(--warn-text); background: var(--warn-soft); border-color: transparent; }

.ws-e__exp--muted { color: var(--ink-3); }
.ws-e__exp--warn  { color: var(--warn-text); }
.ws-e__exp--danger { color: var(--danger-text); }

/* row buttons */
.ws-e__row-btn {
  background: var(--bg); color: var(--ink-2);
  border: 1px solid var(--line-strong);
  padding: 4px 10px; min-height: 28px; min-width: 36px;
  border-radius: var(--radius-sm); cursor: pointer;
  font: inherit; font-size: 12px; line-height: 1;
}
.ws-e__row-btn:hover { background: var(--bg-soft); border-color: var(--ink-3); }
.ws-e__row-btn--danger { color: var(--danger-text); border-color: var(--line); }
.ws-e__row-btn--danger:hover { background: var(--danger-soft); border-color: var(--danger); }

/* scope docs */
.ws-e__scope-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;
}
.ws-e__scope {
  background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-lg);
  padding: 14px 16px;
}
.ws-e__scope ul { padding-left: 18px; margin: 8px 0 0 0; font-size: 13px; color: var(--ink-2); line-height: 1.6; }
.ws-e__scope-tag {
  font-family: var(--mono); font-size: 12px; padding: 2px 8px;
  background: var(--bg-sunk); color: var(--ink); border-radius: 4px; font-weight: 500;
}
.ws-e__scope--accent .ws-e__scope-tag { background: var(--accent-soft); color: var(--accent-2); }
.ws-e__scope--warn   .ws-e__scope-tag { background: var(--warn-soft); color: var(--warn-text); }

/* forms */
.ws-e__form {
  display: flex; flex-wrap: wrap; gap: 12px; padding: 16px; align-items: flex-end;
}
.ws-e__form--col { flex-direction: column; align-items: stretch; gap: 14px; }
.ws-e__field { flex: 1 1 200px; min-width: 0; }
.ws-e__field--narrow { flex: 0 0 140px; }
.ws-e__field label,
.ws-e__field-label,
.ws-e__field legend {
  display: block; font-size: 13px; color: var(--ink-3); margin-bottom: 4px;
}
.ws-e__field-err { margin-top: 4px; font-size: 12px; color: var(--danger-text); }
.ws-e__form-actions { display: flex; gap: 8px; }
.ws-e__form-err { width: 100%; margin: 0; }
.ws-e__form-grid2 {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}

.ws-e__inline-group { display: flex; gap: 8px; align-items: center; }
.ws-e__inline-group input[type=text] { flex: 1; }
.ws-e__color-swatch {
  display: inline-block; width: 28px; height: 28px;
  border: 1px solid var(--line); border-radius: var(--radius-sm);
}

.ws-e__check-label {
  display: flex !important; align-items: center; gap: 8px;
  margin: 0 !important; cursor: pointer;
  color: var(--ink-2);
}

/* modal — token created */
.ws-e__modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.ws-e__modal {
  background: var(--bg); border: 1px solid var(--line);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-3);
  width: min(560px, 90vw); padding: 24px;
}
.ws-e__modal-title { font-size: 17px; font-weight: 700; margin: 0 0 8px 0; color: var(--ok-text); }
.ws-e__modal-body { font-size: 13px; color: var(--ink-2); line-height: 1.6; margin: 0 0 12px 0; }
.ws-e__modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
.ws-e__token-display {
  font-family: var(--mono); font-size: 12px;
  background: var(--bg-sunk); border: 1px solid var(--line);
  border-radius: var(--radius); padding: 12px 14px; word-break: break-all;
}

/* webhooks */
.ws-e__webhook-list { list-style: none; padding: 0; margin: 0; }
.ws-e__webhook { border-bottom: 1px solid var(--line); }
.ws-e__webhook:last-child { border-bottom: none; }

.ws-e__webhook-row {
  display: flex; align-items: center; gap: 8px; padding: 12px 14px;
}
.ws-e__webhook-toggle {
  background: transparent; border: none; padding: 0 6px;
  cursor: pointer; color: var(--ink-3); font-size: 14px; min-width: 24px;
}
.ws-e__webhook-toggle:hover { color: var(--ink); }
.ws-e__caret { display: inline-block; width: 14px; }
.ws-e__webhook-main { flex: 1; min-width: 0; }
.ws-e__webhook-url {
  display: block; font-family: var(--mono); font-size: 13px;
  word-break: break-all; color: var(--ink); margin-bottom: 4px;
}
.ws-e__webhook-meta {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
}
.ws-e__event-tag {
  display: inline-block; padding: 1px 7px; border-radius: 3px;
  background: var(--bg-sunk); color: var(--ink-3);
}
.ws-e__pill {
  display: inline-block; font-family: var(--mono); font-size: 10px;
  padding: 2px 7px; border-radius: 999px; text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ws-e__pill--ok { color: var(--ok-text); background: var(--ok-soft); }
.ws-e__pill--warn { color: var(--warn-text); background: var(--warn-soft); }
.ws-e__pill--danger { color: var(--danger-text); background: var(--danger-soft); }
.ws-e__pill--muted { color: var(--ink-3); background: var(--bg-sunk); }

.ws-e__webhook-actions { display: flex; gap: 6px; flex-shrink: 0; }

.ws-e__deliveries {
  background: var(--bg-soft); padding: 12px 14px 14px 38px;
  border-top: 1px dashed var(--line);
}
.ws-e__deliveries-h { margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.04em; }
.ws-e__deliveries-table { width: 100%; border-collapse: collapse; }
.ws-e__deliveries-table th, .ws-e__deliveries-table td {
  text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--line);
  font-size: 12px;
}
.ws-e__delivery-status--ok { color: var(--ok-text); }
.ws-e__delivery-status--danger { color: var(--danger-text); }

/* events checkbox grid */
.ws-e__events {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px;
  padding: 8px 12px; background: var(--bg-soft);
  border: 1px solid var(--line); border-radius: var(--radius-sm);
}
.ws-e__event-check {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; cursor: pointer; margin-bottom: 0 !important;
}

/* sidebar */
.ws-e__sidebar {
  position: fixed; right: 0; top: 0; bottom: 0; width: min(420px, 100vw);
  background: var(--bg); border-left: 1px solid var(--line);
  box-shadow: var(--shadow-3); z-index: 50;
  display: flex; flex-direction: column;
}
.ws-e__sidebar-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--line); background: var(--bg-soft);
}
.ws-e__sidebar-head h2 { margin: 0; font-size: 14px; font-weight: 600; }
.ws-e__sidebar-body { padding: 16px; overflow-y: auto; flex: 1; }
.ws-e__sidebar-body .ws-e__field { margin-bottom: 16px; }
.ws-e__code {
  font-family: var(--mono); font-size: 11px; line-height: 1.55;
  background: var(--bg-sunk); border: 1px solid var(--line);
  border-radius: var(--radius); padding: 10px 12px;
  white-space: pre-wrap; word-break: break-all; margin: 4px 0 0 0;
}

/* audit */
.ws-e__filters {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;
  padding: 14px 16px; margin-bottom: 14px;
  background: var(--bg-soft); border: 1px solid var(--line); border-radius: var(--radius-lg);
}
.ws-e__audit-table tr.has-diff td:first-child { cursor: pointer; }
.ws-e__audit-row.is-open td { background: var(--bg-soft); }
.ws-e__audit-diff-row td {
  background: var(--bg-sunk); padding: 0 14px 14px;
  border-bottom: 1px solid var(--line);
}
.ws-e__action { color: var(--accent); }

/* settings layout */
.ws-e__settings-grid {
  display: grid; grid-template-columns: 200px 1fr; min-height: calc(100vh - 60px);
}
.ws-e__settings-nav {
  border-right: 1px solid var(--line);
  background: var(--bg-soft);
  padding: 18px 12px;
}
.ws-e__settings-nav-h {
  font-family: var(--mono); font-size: 11px;
  color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: 8px; padding: 0 6px;
}
.ws-e__settings-nav ul { list-style: none; padding: 0; margin: 0; }
.ws-e__settings-nav li { margin-bottom: 1px; }
.ws-e__settings-nav-item {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 5px; font-size: 13px;
  color: var(--ink-3); text-decoration: none;
  border: 1px solid transparent;
}
.ws-e__settings-nav-item:hover { color: var(--ink); background: var(--bg); text-decoration: none; }
.ws-e__settings-nav-item.is-active {
  background: var(--bg); color: var(--ink); font-weight: 600;
  border: 1px solid var(--line);
}

.ws-e__settings-main {
  padding: 24px 28px;
  overflow-y: auto;
}

.ws-e__save-bar {
  position: sticky; bottom: 0; margin-top: 18px;
  padding: 10px 14px; background: var(--bg);
  border: 1px solid var(--line); border-radius: 8px;
  display: flex; align-items: center; gap: 10px;
  box-shadow: var(--shadow-2);
}
.ws-e__save-bar .error { margin: 0; font-size: 12px; }
.ws-e__dirty { color: var(--warn-text); }

/* features */
.ws-e__feature-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px; padding: 14px 16px;
}
.ws-e__feature-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: var(--bg-soft);
  border: 1px solid var(--line); border-radius: var(--radius);
  cursor: pointer; margin-bottom: 0 !important;
}
.ws-e__feature-name { flex: 1; font-size: 13px; color: var(--ink-2); }

/* social rows */
.ws-e__social-row {
  display: grid; grid-template-columns: 1fr 1.4fr 32px;
  gap: 10px; align-items: end;
  padding: 10px 0; border-bottom: 1px dashed var(--line);
}
.ws-e__social-row:last-of-type { border-bottom: none; }

/* toasts */
.ws-e__toasts {
  position: fixed; bottom: 18px; right: 18px;
  display: flex; flex-direction: column; gap: 6px;
  z-index: 200; pointer-events: none;
}
.ws-e__toast {
  background: var(--bg); border: 1px solid var(--ok);
  padding: 10px 16px; border-radius: var(--radius);
  box-shadow: var(--shadow-2); font-size: 13px;
}
.ws-e__toast--success { border-color: var(--ok); color: var(--ok-text); }
.ws-e__toast--error { border-color: var(--danger); color: var(--danger-text); }

/* responsive */
@media (max-width: 720px) {
  .ws-e__scope-grid { grid-template-columns: 1fr; }
  .ws-e__settings-grid { grid-template-columns: 1fr; }
  .ws-e__settings-nav { border-right: none; border-bottom: 1px solid var(--line); }
  .ws-e__form-grid2 { grid-template-columns: 1fr; }
  .ws-e__sidebar { width: 100vw; }
}
`;

let injected = false;

export function WsEStyles(): null {
  if (typeof document !== 'undefined' && !injected) {
    injected = true;
    const tag = document.createElement('style');
    tag.setAttribute('data-ws-e', '1');
    tag.textContent = STYLE;
    document.head.appendChild(tag);
  }
  return null;
}
