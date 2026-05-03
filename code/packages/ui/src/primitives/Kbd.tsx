import type { JSX, ComponentChildren } from 'preact';

export interface KbdProps extends JSX.HTMLAttributes<HTMLElement> {
  children?: ComponentChildren;
}

export function Kbd({
  class: className,
  className: cn2,
  children,
  ...rest
}: KbdProps): JSX.Element {
  const cls = ['ui-kbd', className as string | undefined, cn2 as string | undefined]
    .filter(Boolean).join(' ');
  return <kbd class={cls} {...rest}>{children}</kbd>;
}
