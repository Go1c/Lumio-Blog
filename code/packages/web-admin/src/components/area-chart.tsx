import type { JSX } from 'preact';

export interface AreaChartPoint {
  date: string;
  value: number;
}

export interface AreaChartProps {
  points: AreaChartPoint[];
  height?: number;
  color?: string;
  /** 横轴 label 数 (会等距取样) */
  xTicks?: number;
  yGuides?: number[];
  /** 整体 SVG aria-label */
  'aria-label'?: string;
}

/**
 * 简易 SVG area + line chart (替代 Recharts,避免新依赖)。
 * 自适配宽度 (preserveAspectRatio="none")。
 */
export function AreaChart({
  points,
  height = 160,
  color = 'var(--accent)',
  xTicks = 5,
  yGuides = [40, 80, 120],
  'aria-label': ariaLabel = '访问趋势',
}: AreaChartProps): JSX.Element {
  const w = 600;
  const h = height;
  if (points.length === 0) {
    return (
      <div role="img" aria-label="无数据" class="hf-tiny hf-muted" style={{ padding: 24, textAlign: 'center' }}>
        暂无数据
      </div>
    );
  }
  let max = -Infinity;
  let min = Infinity;
  for (const p of points) {
    if (p.value > max) max = p.value;
    if (p.value < min) min = p.value;
  }
  if (max === min) max = min + 1;
  const padTop = 6;
  const padBot = 4;
  const usableH = h - padTop - padBot;
  const stepX = points.length === 1 ? 0 : w / (points.length - 1);

  const linePts = points.map((p, i) => {
    const x = i * stepX;
    const y = padTop + (1 - (p.value - min) / (max - min)) * usableH;
    return [x, y] as const;
  });
  const pathD = linePts.map((pt, i) => (i === 0 ? `M ${pt[0]} ${pt[1]}` : `L ${pt[0]} ${pt[1]}`)).join(' ');
  const areaD = `${pathD} L ${linePts[linePts.length - 1]![0]} ${h} L 0 ${h} Z`;

  // x-axis ticks
  const tickIdxs: number[] = [];
  if (points.length <= xTicks) {
    for (let i = 0; i < points.length; i += 1) tickIdxs.push(i);
  } else {
    for (let i = 0; i < xTicks; i += 1) {
      tickIdxs.push(Math.round((i * (points.length - 1)) / (xTicks - 1)));
    }
  }
  const last = linePts[linePts.length - 1]!;
  const gradId = `chartfill-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: '100%', height }}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {yGuides.map((y) => (
          <line key={y} x1={0} x2={w} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" />
        ))}
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="4" fill={color} />
      </svg>
      <div
        class="hf-mono hf-tiny hf-faint"
        style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}
      >
        {tickIdxs.map((i) => {
          const p = points[i];
          if (!p) return null;
          // YYYY-MM-DD → MM-DD
          const label = p.date.length >= 10 ? p.date.slice(5, 10) : p.date;
          return (
            <span key={i}>
              <time dateTime={p.date}>{label}</time>
            </span>
          );
        })}
      </div>
    </div>
  );
}
