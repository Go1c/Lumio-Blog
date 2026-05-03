import type { JSX, ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** aria-labelledby 用的 id;若没有 title 必填 ariaLabel */
  titleId?: string;
  ariaLabel?: string;
  children: ComponentChildren;
}

export function Modal({ open, onClose, titleId, ariaLabel, children }: ModalProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const onBackdrop = (e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      class="ui-modal__backdrop"
      role="presentation"
      onClick={onBackdrop}
    >
      <div
        class="ui-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={titleId ? undefined : ariaLabel}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children }: { children: ComponentChildren }): JSX.Element {
  return <div class="ui-modal__header">{children}</div>;
}
export function ModalBody({ children }: { children: ComponentChildren }): JSX.Element {
  return <div class="ui-modal__body">{children}</div>;
}
export function ModalFooter({ children }: { children: ComponentChildren }): JSX.Element {
  return <div class="ui-modal__footer">{children}</div>;
}
