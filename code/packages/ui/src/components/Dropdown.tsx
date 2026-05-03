import type { JSX, ComponentChildren } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

export interface DropdownProps {
  /** 触发器(必须是真按钮) */
  trigger: (props: { onClick: () => void; 'aria-expanded': 'true' | 'false'; 'aria-haspopup': 'menu' }) => JSX.Element;
  /** menu 内容(用 DropdownItem 组合) */
  children: ComponentChildren;
  label?: string;
}

export function Dropdown({ trigger, children, label = '菜单' }: DropdownProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div class="ui-dropdown" ref={ref}>
      {trigger({
        onClick: () => setOpen((v) => !v),
        'aria-expanded': open ? 'true' : 'false',
        'aria-haspopup': 'menu',
      })}
      {open && (
        <div class="ui-dropdown__menu" role="menu" aria-label={label}>
          {children}
        </div>
      )}
    </div>
  );
}

export interface DropdownItemProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  href?: string;
  children?: ComponentChildren;
}

export function DropdownItem({
  href,
  class: className,
  className: cn2,
  children,
  ...rest
}: DropdownItemProps): JSX.Element {
  const cls = ['ui-dropdown__item', className as string | undefined, cn2 as string | undefined]
    .filter(Boolean).join(' ');
  if (href) {
    return (
      <a href={href} role="menuitem" class={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" role="menuitem" class={cls} {...rest}>
      {children}
    </button>
  );
}
