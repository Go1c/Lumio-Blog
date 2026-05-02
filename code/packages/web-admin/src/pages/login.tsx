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
      <form class="login" onSubmit={submit}>
        <h2>opennote</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>输入站长密码登录后台。</p>
        <input
          type="password"
          autoFocus
          value={pw}
          onInput={(e) => setPw((e.target as HTMLInputElement).value)}
          placeholder="password"
        />
        {err && <p class="error">{err}</p>}
        <button class="primary" disabled={busy} style={{ marginTop: 12, width: '100%' }}>
          {busy ? '…' : '登录'}
        </button>
      </form>
    </main>
  );
}
