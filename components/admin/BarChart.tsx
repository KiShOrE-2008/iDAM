'use client';

import React, { useMemo, useState } from 'react';

export interface BarDatum {
  /** Short axis label, e.g. "28 Oct" */
  label: string;
  value: number;
  /** Extra lines for the hover tooltip */
  detail?: string[];
}

interface BarChartProps {
  data: BarDatum[];
  /** Accessible summary of what the chart shows */
  title: string;
  formatValue?: (n: number) => string;
  height?: number;
}

// Single series: one brand hue, validated against the white surface (dataviz palette checks)
const BAR_COLOR = '#059669';
const GRID_COLOR = '#e2e8f0';

/** Rounded top corners only, anchored flat to the baseline. */
function barPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function niceMax(max: number) {
  if (max <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= max / 1) ?? 10;
  return step * magnitude;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title, formatValue = (n) => String(n), height = 180 }) => {
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const pad = { top: 8, right: 8, bottom: 22, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.value))), [data]);
  const ticks = [0, max / 2, max];
  const slot = data.length ? innerW / data.length : innerW;
  const gap = 2;
  const barW = Math.max(1, slot - gap);
  // Label at most ~8 x-axis ticks so they never collide
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));
  const hovered = hover !== null ? data[hover] : null;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${title}. ${data.length} days, total ${formatValue(total)}.`}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => {
          const y = pad.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
              <text x={pad.left - 6} y={y + 3} textAnchor="end" className="fill-slate-500" fontSize={10}>
                {formatValue(t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = pad.left + i * slot + gap / 2;
          const y = pad.top + innerH - h;
          return (
            <g key={i}>
              {d.value > 0 && (
                <path d={barPath(x, y, barW, h, 4)} fill={BAR_COLOR} opacity={hover === null || hover === i ? 1 : 0.45} />
              )}
              {/* Hit target: the full column, larger than the bar */}
              <rect
                x={pad.left + i * slot}
                y={pad.top}
                width={slot}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              />
              {i % labelEvery === 0 && (
                <text x={pad.left + i * slot + slot / 2} y={height - 6} textAnchor="middle" className="fill-slate-500" fontSize={10}>
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 bg-slate-900 text-white rounded-lg px-2.5 py-1.5 text-[11px] font-semibold shadow-lg whitespace-nowrap"
          style={{ left: `${((pad.left + hover * slot + slot / 2) / width) * 100}%` }}
        >
          <div className="text-slate-300">{hovered.label}</div>
          <div className="text-sm font-black">{formatValue(hovered.value)}</div>
          {hovered.detail?.map((line) => <div key={line} className="text-slate-300">{line}</div>)}
        </div>
      )}
    </div>
  );
};
