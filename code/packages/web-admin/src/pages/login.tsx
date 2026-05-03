import { useState } from 'preact/hooks';
import { api } from '../api.js';

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
    <main>
      <form class="login" onSubmit={submit} aria-labelledby="login-h">
        <h2 id="login-h">opennote</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>输入站长密码登录后台。</p>
        <label htmlFor="admin-password">站长密码</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={pw}
          aria-describedby={err ? 'login-err' : undefined}
          aria-invalid={err ? 'true' : 'false'}
          onInput={(e) => setPw((e.target as HTMLInputElement).value)}
          placeholder="password"
        />
        {err && <p id="login-err" class="error" role="alert">{err}</p>}
        <button type="submit" class="primary" disabled={busy} aria-busy={busy ? 'true' : 'false'} style={{ marginTop: 12, width: '100%' }}>
          {busy ? '登录中…' : '登录'}
        </button>
      </form>
    </main>
  );
}
