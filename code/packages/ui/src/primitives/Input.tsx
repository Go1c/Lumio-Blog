import type { JSX } from 'preact';

export interface InputProps extends JSX.HTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'password' | 'email' | 'url' | 'search' | 'number' | 'tel' | 'date' | 'datetime-local';
}

export function Input({
  type = 'text',
  class: className,
  className: cn2,
  ...rest
}: InputProps): JSX.Element {
  const cls = ['ui-input', className as string | undefined, cn2 as string | undefined]
    .filter(Boolean).join(' ');
  return <input type={type} class={cls} {...rest} />;
}
