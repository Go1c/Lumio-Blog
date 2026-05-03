import type { JSX, ComponentChildren } from 'preact';
import { HfIcon, type HfIconName } from '@opennote/ui';
import { Sparkline } from './sparkline.js';

export interface KpiCardProps {
  label: string;
  value: string | number;
  /** 副文字 (例如 "+8 / 7d", "↑ 22% vs prev") */
  sub?: ComponentChildren;
  /** 突出色,作用于 icon + sub 文字 */
  tone?: string;
  icon?: HfIconName;
  /** 装饰用迷你 sparkline */
  spark?: number[];
}

export function KpiCard({ label, value, sub, tone = 'var(--accent)', icon, spark }: KpiCardProps): JSX.Element {
  return (
    <div class="ui-card kpi-card" style={{ padding: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon && <HfIcon name={icon} size={14} color={tone} />}
        <span class="hf-tiny hf-muted">{label}</span>
      </div>
      <div
        class="hf-mono"
        style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </div>
      {sub && <div class="hf-tiny" style={{ color: tone, marginTop: 6 }}>{sub}</div>}
      {spark && spark.length > 0 && (
        <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, opacity: 0.35 }}>
          <Sparkline values={spark} width={100} height={20} color={tone} />
        </div>
      )}
    </div>
  );
}
