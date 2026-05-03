import type { JSX, ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';

export interface TooltipProps {
  /** tooltip 文字 */
  label: string;
  children: ComponentChildren;
}

export function Tooltip({ label, children }: TooltipProps): JSX.Element {
  const id = useId();
  return (
    <span class="ui-tooltip" aria-describedby={id}>
      {children}
      <span role="tooltip" id={id} class="ui-tooltip__bubble">{label}</span>
    </span>
  );
}
