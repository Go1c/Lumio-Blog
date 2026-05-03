import { useEffect, useState, useCallback } from 'preact/hooks';
import type { ThemeMode } from '../theme-boot.js';

export type { ThemeMode } from '../theme-boot.js';
export { THEME_BOOT_SCRIPT } from '../theme-boot.js';

const KEY = 'theme';

function detectInitial(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'auto';
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  } catch {
    return 'auto';
  }
  return 'auto';
}

function resolveEffective(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode;
  if (typeof matchMedia === 'undefined') return 'light';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', mode);
  }
}

export interface UseThemeResult {
  /** 用户选择(可能是 'auto') */
  mode: ThemeMode;
  /** 实际生效的模式(消解 auto 后) */
  effective: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  /** 在 light <-> dark 间切换;auto 时按当前生效切到反面 */
  toggle: () => void;
}

export function useTheme(): UseThemeResult {
  const [mode, setModeState] = useState<ThemeMode>(detectInitial);
  const [effective, setEffective] = useState<'light' | 'dark'>(() => resolveEffective(detectInitial()));

  useEffect(() => {
    applyTheme(mode);
    setEffective(resolveEffective(mode));
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'auto' || typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setEffective(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => setModeState(m), []);
  const toggle = useCallback(() => {
    setModeState((cur) => {
      const eff = resolveEffective(cur);
      return eff === 'dark' ? 'light' : 'dark';
    });
  }, []);

  return { mode, effective, setMode, toggle };
}
