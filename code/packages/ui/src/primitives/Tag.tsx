import type { JSX, ComponentChildren } from 'preact';

export type TagTone = 'default' | 'accent' | 'ok' | 'warn' | 'danger' | 'solid';

export interface TagProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'children'> {
  tone?: TagTone;
  /** 渲染成 button 让它支持 aria-pressed */
  pressable?: boolean;
  pressed?: boolean;
  children?: ComponentChildren;
}

export function Tag({
  tone = 'default',
  pressable = false,
  pressed,
  class: className,
  className: cn2,
  children,
  ...rest
}: TagProps): JSX.Element {
  const cls = [
    'ui-tag',
    tone === 'accent' && 'ui-tag--accent',
    tone === 'ok' && 'ui-tag--ok',
    tone === 'warn' && 'ui-tag--warn',
    tone === 'danger' && 'ui-tag--danger',
    tone === 'solid' && 'ui-tag--solid',
    className as string | undefined,
    cn2 as string | undefined,
  ].filter(Boolean).join(' ');
  if (pressable) {
    return (
      <button
        type="button"
        class={cls}
        aria-pressed={pressed ? 'true' : 'false'}
        {...(rest as JSX.HTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );
  }
  return <span class={cls} {...rest}>{children}</span>;
}
