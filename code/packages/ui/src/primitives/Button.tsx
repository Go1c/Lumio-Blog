import type { JSX, ComponentChildren } from 'preact';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm' | 'icon';

export interface ButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 显式注解,避免渲染成提交按钮误触发 form */
  type?: 'button' | 'submit' | 'reset';
  children?: ComponentChildren;
}

export function Button({
  variant = 'default',
  size = 'md',
  type = 'button',
  class: className,
  className: cn2,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  const cls = [
    'ui-btn',
    variant === 'primary' && 'ui-btn--primary',
    variant === 'ghost' && 'ui-btn--ghost',
    variant === 'danger' && 'ui-btn--danger',
    size === 'sm' && 'ui-btn--sm',
    size === 'icon' && 'ui-btn--icon',
    className as string | undefined,
    cn2 as string | undefined,
  ].filter(Boolean).join(' ');
  return (
    <button type={type} class={cls} {...rest}>
      {children}
    </button>
  );
}
