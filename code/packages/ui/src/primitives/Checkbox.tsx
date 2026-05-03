import type { JSX, ComponentChildren } from 'preact';

export interface CheckboxProps extends Omit<JSX.HTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ComponentChildren;
  describedBy?: string;
}

export function Checkbox({
  label,
  describedBy,
  class: className,
  className: cn2,
  ...rest
}: CheckboxProps): JSX.Element {
  const cls = ['ui-check', className as string | undefined, cn2 as string | undefined]
    .filter(Boolean).join(' ');
  const input = (
    <input type="checkbox" class={cls} aria-describedby={describedBy} {...rest} />
  );
  if (!label) return input;
  return (
    <label class="ui-check-label">
      {input}
      <span>{label}</span>
    </label>
  );
}
