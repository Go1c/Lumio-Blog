import type { JSX } from 'preact';

export interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  fill?: boolean;
  /** 装饰图加 aria-hidden,有意义传 aria-label */
  'aria-label'?: string;
  class?: string;
}

/**
 * 极简 sparkline (纯 SVG)。装饰用,默认 aria-hidden。
 */
export function Sparkline({
  values,
  width = 100,
  height = 20,
  color = 'var(--accent)',
  strokeWidth = 1.5,
  fill = false,
  'aria-label': ariaLabel,
  class: className,
}: SparklineProps): JSX.Element {
  const n = values.length;
  if (n === 0) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        aria-hidden={ariaLabel ? undefined : 'true'}
        role={ariaLabel ? 'img' : undefined}
        aria-label={ariaLabel}
        class={className}
      />
    );
  }
  let max = -Infinity;
  let min = Infinity;
  for (const v of values) {
    if (v > max) max = v;
    if (v < min) min = v;
  }
  const span = max - min || 1;
  const stepX = n === 1 ? 0 : width / (n - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = `M ${points.join(' L ')}`;
  const fillD = fill ? `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z` : null;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden={ariaLabel ? undefined : 'true'}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      class={className}
      preserveAspectRatio="none"
    >
      {fillD && <path d={fillD} fill={color} opacity={0.15} />}
      <path d={pathD} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
