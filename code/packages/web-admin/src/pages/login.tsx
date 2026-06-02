import { useState } from 'preact/hooks';
import { api } from '../api.js';

const LOGIN_PAGE_STYLE = `
.login__shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 16% 18%, rgba(0,102,255,.22), transparent 28%),
    radial-gradient(circle at 82% 12%, rgba(22,163,74,.16), transparent 24%),
    linear-gradient(135deg, #f8fafc 0%, #eef4ff 46%, #fffaf0 100%);
}
.login__shell::before {
  content: "";
  position: absolute;
  inset: 18px;
  border: 1px solid rgba(10,10,10,.08);
  border-radius: 28px;
  pointer-events: none;
}
.login__orb {
  position: absolute;
  width: 280px;
  aspect-ratio: 1;
  border-radius: 50%;
  filter: blur(5px);
  opacity: .55;
  pointer-events: none;
}
.login__orb--blue { left: -90px; bottom: 10%; background: rgba(0,102,255,.18); }
.login__orb--gold { right: -80px; top: 12%; background: rgba(202,138,4,.18); }
.login__panel {
  position: relative;
  z-index: 1;
  width: min(960px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, .72fr);
  gap: 18px;
  align-items: stretch;
}
.login__story,
.login__card {
  border: 1px solid rgba(10,10,10,.09);
  border-radius: 24px;
  box-shadow: 0 24px 70px rgba(15,23,42,.12);
  backdrop-filter: blur(20px);
}
.login__story {
  padding: clamp(28px, 5vw, 56px);
  background:
    linear-gradient(160deg, rgba(255,255,255,.88), rgba(255,255,255,.56)),
    repeating-linear-gradient(90deg, rgba(0,102,255,.08) 0 1px, transparent 1px 38px);
}
.login__eyebrow {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 12px;
}
.login__story h1 {
  margin: 0;
  font-size: clamp(34px, 6vw, 68px);
  line-height: 1.04;
  letter-spacing: -.06em;
}
.login__lead {
  max-width: 560px;
  margin: 22px 0 0;
  color: var(--ink-2);
  font-size: 15px;
  line-height: 1.75;
}
.login__signals {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;
}
.login__signal {
  border: 1px solid rgba(10,10,10,.08);
  background: rgba(255,255,255,.7);
  border-radius: 999px;
  padding: 7px 10px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-3);
}
.login__card {
  margin: 0;
  padding: 28px;
  align-self: center;
  background: rgba(255,255,255,.92);
}
.login__card h2 { margin: 0 0 6px; font-size: 22px; letter-spacing: -.02em; }
.login__hint { margin: 0 0 22px; color: var(--ink-3); font-size: 13px; line-height: 1.6; }
.login__submit { margin-top: 14px; width: 100%; }
.login__footer {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  color: var(--ink-4);
  font-family: var(--mono);
  font-size: 11px;
}
html[data-theme="dark"] .login__shell {
  background:
    radial-gradient(circle at 16% 18%, rgba(77,142,255,.18), transparent 28%),
    radial-gradient(circle at 82% 12%, rgba(34,197,94,.13), transparent 24%),
    linear-gradient(135deg, #05070a 0%, #0b101b 52%, #151006 100%);
}
html[data-theme="dark"] .login__story,
html[data-theme="dark"] .login__card {
  background: rgba(10,10,10,.74);
  border-color: rgba(255,255,255,.09);
}
html[data-theme="dark"] .login__signal {
  background: rgba(255,255,255,.06);
  border-color: rgba(255,255,255,.08);
}
@media (prefers-color-scheme: dark) {
  html:not([data-theme="light"]) .login__shell {
    background:
      radial-gradient(circle at 16% 18%, rgba(77,142,255,.18), transparent 28%),
      radial-gradient(circle at 82% 12%, rgba(34,197,94,.13), transparent 24%),
      linear-gradient(135deg, #05070a 0%, #0b101b 52%, #151006 100%);
  }
  html:not([data-theme="light"]) .login__story,
  html:not([data-theme="light"]) .login__card {
    background: rgba(10,10,10,.74);
    border-color: rgba(255,255,255,.09);
  }
  html:not([data-theme="light"]) .login__signal { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.08); }
}
@media (max-width: 760px) {
  .login__shell { padding: 18px; place-items: stretch; }
  .login__shell::before { inset: 8px; border-radius: 22px; }
  .login__panel { grid-template-columns: 1fr; align-content: center; }
  .login__story { padding: 28px 24px; }
  .login__card { padding: 24px; }
}
`;

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.login(pw);
      onSuccess();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main class="login__shell">
      <style>{LOGIN_PAGE_STYLE}</style>
      <span class="login__orb login__orb--blue" aria-hidden="true" />
      <span class="login__orb login__orb--gold" aria-hidden="true" />
      <div class="login__panel">
        <section class="login__story" aria-labelledby="login-story-h">
          <p class="login__eyebrow">Lumio control room</p>
          <h1 id="login-story-h">Blog ops, not a back office.</h1>
          <p class="login__lead">
            同步 FNS 内容、检查公开文章、生成 OG 图与订阅数据都从这里进入。后台需要像游戏控制台一样稳定、清晰、可快速操作。
          </p>
          <div class="login__signals" aria-label="后台能力">
            <span class="login__signal">FNS sync</span>
            <span class="login__signal">Public notes</span>
            <span class="login__signal">OG renderer</span>
            <span class="login__signal">Audit trail</span>
          </div>
        </section>

        <form class="login__card" onSubmit={submit} aria-labelledby="login-h">
          <h2 id="login-h">登录 Lumio Blog</h2>
          <p class="login__hint">输入站长密码进入内容控制台。</p>
          <label htmlFor="admin-password">站长密码</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            disabled={busy}
            value={pw}
            aria-describedby={err ? 'login-err' : undefined}
            aria-invalid={err ? 'true' : 'false'}
            onInput={(e) => setPw((e.target as HTMLInputElement).value)}
            placeholder="password"
          />
          {err && <p id="login-err" class="error" role="alert">{err}</p>}
          <button type="submit" class="primary login__submit" disabled={busy} aria-busy={busy ? 'true' : 'false'}>
            {busy ? '登录中…' : '进入控制台'}
          </button>
          <div class="login__footer">blog.lumio.games/admin</div>
        </form>
      </div>
    </main>
  );
}
