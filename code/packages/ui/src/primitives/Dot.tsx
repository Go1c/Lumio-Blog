import type { JSX } from 'preact';

export type DotTone = 'default' | 'ok' | 'warn' | 'danger' | 'accent';

export interface DotProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'children'> {
  tone?: DotTone;
  /** 给屏读器一个名字;不填则视为纯装饰 */
  'aria-label'?: string;
}

export function Dot({
  tone = 'default',
  class: className,
  className: cn2,
  ...rest
}: DotProps): JSX.Element {
  const cls = [
    'ui-dot',
    tone === 'ok' && 'ui-dot--ok',
    tone === 'warn' && 'ui-dot--warn',
    tone === 'danger' && 'ui-dot--danger',
    tone === 'accent' && 'ui-dot--accent',
    className as string | undefined,
    cn2 as string | undefined,
  ].filter(Boolean).join(' ');
  const isLabeled = typeof rest['aria-label'] === 'string';
  return (
    <span
      class={cls}
      aria-hidden={isLabeled ? undefined : 'true'}
      role={isLabeled ? 'img' : undefined}
      {...rest}
    />
  );
}
