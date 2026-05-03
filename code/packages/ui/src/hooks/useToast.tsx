import { createContext, type JSX, type ComponentChildren } from 'preact';
import { useContext, useState, useCallback, useEffect } from 'preact/hooks';

export type ToastTone = 'default' | 'success' | 'error';
export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastCtx {
  push: (message: string, tone?: ToastTone) => void;
}

const Ctx = createContext<ToastCtx>({ push: () => {} });

export function ToastProvider({ children }: { children: ComponentChildren }): JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: ToastTone = 'default') => {
    const id = Date.now() + Math.random();
    setItems((cur) => [...cur, { id, message, tone }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div class="ui-toast-region" role="region" aria-label="通知" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            class={`ui-toast${t.tone === 'error' ? ' ui-toast--error' : ''}${t.tone === 'success' ? ' ui-toast--success' : ''}`}
            role={t.tone === 'error' ? 'alert' : 'status'}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  return useContext(Ctx);
}

/** 不需要 provider 的极简版本(纯 DOM,自己挂 region) */
export function showToast(message: string, tone: ToastTone = 'default'): void {
  if (typeof document === 'undefined') return;
  let region = document.querySelector<HTMLDivElement>('.ui-toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'ui-toast-region';
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', '通知');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  const el = document.createElement('div');
  el.className = `ui-toast${tone === 'error' ? ' ui-toast--error' : ''}${tone === 'success' ? ' ui-toast--success' : ''}`;
  el.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// hush unused-import warning
void useEffect;
