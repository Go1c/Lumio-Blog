import type { JSX, ComponentChildren } from 'preact';

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: ComponentChildren;
}

export function Card({
  class: className,
  className: cn2,
  children,
  ...rest
}: CardProps): JSX.Element {
  const cls = ['ui-card', className as string | undefined, cn2 as string | undefined]
    .filter(Boolean).join(' ');
  return <div class={cls} {...rest}>{children}</div>;
}
