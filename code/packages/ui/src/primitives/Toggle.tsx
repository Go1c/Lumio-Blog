import type { JSX } from 'preact';

export interface ToggleProps extends Omit<JSX.HTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'checked'> {
  checked?: boolean;
  /** 屏幕阅读器需要,必填(非装饰开关) */
  'aria-label': string;
}

/** 真 checkbox + role="switch",支持键盘 / 屏读器 */
export function Toggle({
  checked = false,
  class: className,
  className: cn2,
  onChange,
  ...rest
}: ToggleProps): JSX.Element {
  const cls = ['ui-toggle', className as string | undefined, cn2 as string | undefined]
    .filter(Boolean).join(' ');
  return (
    <input
      type="checkbox"
      role="switch"
      aria-checked={checked ? 'true' : 'false'}
      checked={checked}
      class={cls}
      onChange={onChange}
      {...rest}
    />
  );
}
