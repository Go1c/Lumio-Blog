import type { JSX } from 'preact';

export type HfIconName =
  | 'search' | 'plus' | 'chev' | 'chevd' | 'folder' | 'doc' | 'eye' | 'eyeoff'
  | 'link' | 'sync' | 'star' | 'edit' | 'trash' | 'tag' | 'chart' | 'cmd'
  | 'pin' | 'rss' | 'sun' | 'moon' | 'arrowR' | 'layers' | 'bell' | 'dots'
  | 'copy' | 'book' | 'note' | 'home' | 'settings' | 'flame' | 'activity'
  | 'lock' | 'unlock' | 'image' | 'mail' | 'webhook' | 'download' | 'upload'
  | 'comment' | 'graph' | 'users' | 'database';

export interface HfIconProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, 'name' | 'width' | 'height'> {
  name: HfIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** 装饰性图标必须 aria-hidden;有意义图标传 aria-label */
  'aria-label'?: string;
}

const PATHS: Record<HfIconName, JSX.Element[]> = {
  search:  [<circle cx="7" cy="7" r="4.5" />, <path d="M10.5 10.5 L14 14" />],
  plus:    [<path d="M8 3 V13 M3 8 H13" />],
  chev:    [<path d="M5 4 L10 8 L5 12" />],
  chevd:   [<path d="M4 6 L8 10 L12 6" />],
  folder:  [<path d="M2 5 L2 12 H14 V6 H8 L7 5 Z" />],
  doc:     [<path d="M3 2 H10 L13 5 V14 H3 Z M10 2 V5 H13" />],
  eye:     [<path d="M1 8 Q 8 2.5, 15 8 Q 8 13.5, 1 8 Z" />, <circle cx="8" cy="8" r="2" />],
  eyeoff:  [<path d="M2 8 Q 8 3, 14 8 M3 13 L13 3" />],
  link:    [<path d="M7 9 L9 7 M6 11 Q 3 11, 3 8 Q 3 5, 6 5 H8 M10 11 H8 M10 5 Q 13 5, 13 8 Q 13 11, 10 11" />],
  sync:    [<path d="M3 8 Q 3 3, 8 3 H11 M9 1 L11 3 L9 5 M13 8 Q 13 13, 8 13 H5 M7 15 L5 13 L7 11" />],
  star:    [<path d="M8 2 L9.5 6 L14 6.5 L10.5 9.5 L11.5 14 L8 11.5 L4.5 14 L5.5 9.5 L2 6.5 L6.5 6 Z" />],
  edit:    [<path d="M3 13 L3 11 L11 3 L13 5 L5 13 Z M10 4 L12 6" />],
  trash:   [<path d="M3 4 H13 M5 4 V13 H11 V4 M6 2 H10" />],
  tag:     [<path d="M2 8 L2 3 L7 3 L14 10 L10 14 L3 7" />, <circle cx="5" cy="6" r=".8" fill="currentColor" stroke="none" />],
  chart:   [<path d="M2 14 H14 M4 14 V9 M7 14 V5 M10 14 V11 M13 14 V7" />],
  cmd:     [<path d="M5 5 H11 V11 H5 Z M3 3 Q5 3, 5 5 V11 Q3 11, 3 13 Q5 13, 5 11 Q3 11, 3 9 V5 Q5 5, 5 3 Q3 3, 3 5" />],
  pin:     [<path d="M9.5 1 L15 6.5 L13 7 L11 9 L7 5 L9 3 Z M7 5 L2 10 M2 10 L1 14 L5 13 M2 10 L5 13" />],
  rss:     [<circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />, <path d="M2 8 Q8 8, 8 14 M2 4 Q12 4, 12 14" />],
  sun:     [<circle cx="8" cy="8" r="3" />, <path d="M8 1 V3 M8 13 V15 M1 8 H3 M13 8 H15 M3 3 L4.5 4.5 M11.5 11.5 L13 13 M3 13 L4.5 11.5 M11.5 4.5 L13 3" />],
  moon:    [<path d="M13 9.5 A6 6 0 1 1 6.5 3 A4.5 4.5 0 0 0 13 9.5 Z" />],
  arrowR:  [<path d="M3 8 H13 M9 4 L13 8 L9 12" />],
  layers:  [<path d="M8 2 L14 5 L8 8 L2 5 Z M2 8 L8 11 L14 8 M2 11 L8 14 L14 11" />],
  bell:    [<path d="M4 11 V7 Q4 4, 8 4 Q12 4, 12 7 V11 L13 12 H3 Z M7 13 Q8 14, 9 13" />],
  dots:    [
    <circle cx="3" cy="8" r="1.2" fill="currentColor" stroke="none" />,
    <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />,
    <circle cx="13" cy="8" r="1.2" fill="currentColor" stroke="none" />,
  ],
  copy:    [<path d="M5 5 H12 V13 H5 Z M3 3 H10 V5 M3 3 V11 H5" />],
  book:    [<path d="M3 3 H7 Q8 3, 8 4 V13 Q8 12, 7 12 H3 Z M13 3 H9 Q8 3, 8 4 V13 Q8 12, 9 12 H13 Z" />],
  note:    [<path d="M3 2 H10 L13 5 V14 H3 Z M5 7 H11 M5 10 H9" />],
  home:    [<path d="M2 8 L8 2 L14 8 M4 7 V14 H12 V7" />],
  settings:[<circle cx="8" cy="8" r="2" />, <path d="M8 1 V3 M8 13 V15 M1 8 H3 M13 8 H15 M3 3 L4.5 4.5 M11.5 11.5 L13 13 M3 13 L4.5 11.5 M11.5 4.5 L13 3" />],
  flame:   [<path d="M8 1 Q11 5, 9 7 Q12 7, 12 11 Q12 14, 8 14 Q4 14, 4 11 Q4 8, 6 7 Q5 4, 8 1 Z" />],
  activity:[<path d="M1 8 H4 L6 3 L9 13 L11 8 H15" />],
  lock:    [<path d="M5 7 V5 Q5 2, 8 2 Q11 2, 11 5 V7 M3 7 H13 V14 H3 Z" />],
  unlock:  [<path d="M5 7 V5 Q5 2, 8 2 Q10 2, 10.5 4 M3 7 H13 V14 H3 Z" />],
  image:   [<path d="M2 3 H14 V13 H2 Z M2 11 L6 7 L9 10 L11 8 L14 11" />, <circle cx="11" cy="6" r="1" />],
  mail:    [<path d="M2 4 H14 V12 H2 Z M2 4 L8 9 L14 4" />],
  webhook: [<circle cx="5" cy="5" r="2" />, <circle cx="11" cy="5" r="2" />, <circle cx="8" cy="12" r="2" />, <path d="M6.5 6.5 L7.5 11 M9.5 6.5 L8.5 11 M5 7 Q3 9, 6 11" />],
  download:[<path d="M8 2 V11 M5 8 L8 11 L11 8 M3 13 H13" />],
  upload:  [<path d="M8 11 V2 M5 5 L8 2 L11 5 M3 13 H13" />],
  comment: [<path d="M2 3 H14 V11 H8 L5 14 V11 H2 Z" />],
  graph:   [<circle cx="4" cy="12" r="2" />, <circle cx="12" cy="4" r="2" />, <circle cx="12" cy="12" r="2" />, <path d="M5 11 L11 5 M6 12 H10" />],
  users:   [<circle cx="6" cy="6" r="2.5" />, <circle cx="12" cy="6" r="2" />, <path d="M2 14 Q2 10, 6 10 Q10 10, 10 14 M11 14 Q11 11, 14 11" />],
  database:[<ellipse cx="8" cy="4" rx="5" ry="2" />, <path d="M3 4 V8 Q3 10, 8 10 Q13 10, 13 8 V4 M3 8 V12 Q3 14, 8 14 Q13 14, 13 12 V8" />],
};

export function HfIcon({
  name,
  size = 16,
  color = 'currentColor',
  strokeWidth = 1.6,
  class: className,
  className: cn2,
  ...rest
}: HfIconProps): JSX.Element | null {
  const paths = PATHS[name];
  if (!paths) return null;
  const ariaLabel = (rest as Record<string, unknown>)['aria-label'] as string | undefined;
  const cls = [className as string | undefined, cn2 as string | undefined].filter(Boolean).join(' ') || undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden={ariaLabel ? undefined : 'true'}
      role={ariaLabel ? 'img' : undefined}
      class={cls}
      {...rest}
    >
      {paths}
    </svg>
  );
}
