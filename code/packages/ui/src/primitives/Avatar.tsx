import type { JSX } from 'preact';

export interface AvatarProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** 显示的初始字母 / 短缩写 */
  initials?: string;
  /** 真名;无 src 时用来生成 aria-label */
  name?: string;
  src?: string;
  size?: number;
  /** 必填:用于屏读器朗读 */
  'aria-label'?: string;
}

export function Avatar({
  initials,
  name,
  src,
  size = 28,
  class: className,
  className: cn2,
  ...rest
}: AvatarProps): JSX.Element {
  const cls = ['ui-avatar', className as string | undefined, cn2 as string | undefined]
    .filter(Boolean).join(' ');
  const ariaLabel = (rest['aria-label'] as string | undefined) ?? name ?? (initials ? `头像 ${initials}` : '用户头像');
  if (src) {
    return (
      <img
        src={src}
        alt={ariaLabel}
        width={size}
        height={size}
        class={cls}
        style={{ objectFit: 'cover' }}
      />
    );
  }
  return (
    <span
      class={cls}
      role="img"
      aria-label={ariaLabel}
      style={{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(10, Math.round(size * 0.42))}px` }}
      {...rest}
    >
      <span aria-hidden="true">{initials ?? (name?.[0] ?? '?')}</span>
    </span>
  );
}
