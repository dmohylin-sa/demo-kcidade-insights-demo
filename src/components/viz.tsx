// Shared chart chrome for Recharts: recessive hairline grid and axes, thin marks,
// one tooltip style. Specs follow the dataviz skill (marks-and-anatomy.md).

import type { ReactNode } from 'react';
import { INK } from '../lib/palette';

export const axisProps = {
  tick: { fill: INK.muted, fontSize: 11 },
  axisLine: { stroke: INK.axis },
  tickLine: false,
} as const;

export const yAxisProps = {
  tick: { fill: INK.muted, fontSize: 11 },
  axisLine: false,
  tickLine: false,
  width: 44,
} as const;

export const gridProps = {
  stroke: INK.grid,
  vertical: false,
} as const;

export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
export const HBAR_RADIUS: [number, number, number, number] = [0, 4, 4, 0];

interface TtItem {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export function makeTooltip(format: (v: number, name: string) => string, titleKey?: string) {
  return function VizTooltip({ active, payload, label }: { active?: boolean; payload?: TtItem[]; label?: ReactNode }) {
    if (!active || !payload || !payload.length) return null;
    const title = titleKey && payload[0].payload ? String(payload[0].payload[titleKey]) : label;
    return (
      <div className="viz-tooltip">
        {title !== undefined && title !== '' ? <div className="tt-title">{title}</div> : null}
        {payload.map((p, i) => (
          <div className="tt-row" key={i}>
            <span className="tt-key">
              <span className="tt-swatch" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="tt-val">{typeof p.value === 'number' ? format(p.value, String(p.name)) : String(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };
}

export const intTooltip = makeTooltip((v) => Math.round(v).toLocaleString('en-GB'));
export const pctTooltip = makeTooltip((v) => `${Math.round(v * 100)}%`);

export function compact(n: number): string {
  if (Math.abs(n) >= 10000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString('en-GB');
}

export function pctTick(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Y-axis tick for horizontal bars: one line, truncated, full text in a native tooltip. */
export function TruncTick(props: { x?: number; y?: number; payload?: { value: string }; max?: number }) {
  const { x = 0, y = 0, payload, max = 34 } = props;
  const full = String(payload?.value ?? '');
  const text = full.length > max ? `${full.slice(0, max - 1)}…` : full;
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{full}</title>
      <text x={-6} y={0} dy={4} textAnchor="end" fill={INK.secondary} fontSize={12}>
        {text}
      </text>
    </g>
  );
}
