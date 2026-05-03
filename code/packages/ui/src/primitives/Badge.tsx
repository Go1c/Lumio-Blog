import type { JSX, ComponentChildren } from 'preact';
import type { Visibility } from '@opennote/core';

export interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  visibility?: Visibility;
  children?: ComponentChildren;
}

export function Badge({
  visibility,
  class: className,
  className: cn2,
  children,
  ...rest
}: BadgeProps): JSX.Element {
  const cls = [
    'ui-badge',
    visibility === 'public' && 'ui-badge--public',
    visibility === 'unlisted' && 'ui-badge--unlisted',
    visibility === 'link-only' && 'ui-badge--link-only',
    visibility === 'private' && 'ui-badge--private',
    className as string | undefined,
    cn2 as string | undefined,
  ].filter(Boolean).join(' ');
  return <span class={cls} {...rest}>{children}</span>;
}
