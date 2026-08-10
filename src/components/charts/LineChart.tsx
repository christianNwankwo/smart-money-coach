"use client";

/**
 * Theme-aware multiline SVG chart.
 *
 * Thin marks, a hover crosshair, a legend for ≥ 2 series, and end labels on
 * the last point of each line. Every color is a CSS custom property with a
 * light and dark definition — the SVG never ships a bare hex.
 *
 * No CDN, no D3, no library — ~340 lines of self-contained SVG.
 */

import { useId, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------- geometry
const MARGIN = { top: 28, right: 24, bottom: 40, left: 58 };
const FULL_HEIGHT = 320;

// ---------------------------------------------------------------- the CSS-variable sheet
//
// Series hues are indexed via --series-N so the SVG never branches on theme.
// The light/dark swap is pure CSS; the React side only writes the slot index.
const CHART_STYLES = /* css */ `
  .chart-root {
    /* series — light mode */
    --series-1: #2a78d6;
    --series-2: #eb6834;
    --series-3: #1baf7a;
    --series-4: #eda100;

    /* ink */
    --chart-text-primary: #0b0b0b;
    --chart-text-secondary: #52514e;
    --chart-text-muted: #898781;

    /* chrome */
    --chart-surface: #fcfcfb;
    --chart-gridline: #e1e0d9;
    --chart-axis: #c3c2b7;

    /* tooltip */
    --chart-tooltip-bg: rgba(11, 11, 11, 0.85);
    --chart-tooltip-text: #ffffff;

    /* highlight */
    --chart-hl-fill: #eb6834;
    --chart-hl-text: #c2480f;
  }

  @media (prefers-color-scheme: dark) {
    .chart-root:where(:not([data-theme="light"])) {
      --series-1: #3987e5;
      --series-2: #d95926;
      --series-3: #199e70;
      --series-4: #c98500;

      --chart-text-primary: #ffffff;
      --chart-text-secondary: #c3c2b7;
      --chart-text-muted: #898781;

      --chart-surface: #1a1a19;
      --chart-gridline: #2c2c2a;
      --chart-axis: #383835;

      --chart-tooltip-bg: rgba(255, 255, 255, 0.92);
      --chart-tooltip-text: #0b0b0b;

      --chart-hl-fill: #d95926;
      --chart-hl-text: #f0a070;
    }
  }

  [data-theme="dark"] .chart-root {
    --series-1: #3987e5;
    --series-2: #d95926;
    --series-3: #199e70;
    --series-4: #c98500;

    --chart-text-primary: #ffffff;
    --chart-text-secondary: #c3c2b7;
    --chart-text-muted: #898781;

    --chart-surface: #1a1a19;
    --chart-gridline: #2c2c2a;
    --chart-axis: #383835;

    --chart-tooltip-bg: rgba(255, 255, 255, 0.92);
    --chart-tooltip-text: #0b0b0b;

    --chart-hl-fill: #d95926;
    --chart-hl-text: #f0a070;
  }

  .chart-root .gridline { stroke: var(--chart-gridline); }
  .chart-root .axis { stroke: var(--chart-axis); }
  .chart-root .tick-text { fill: var(--chart-text-muted); }
  .chart-root .label-text { fill: var(--chart-text-secondary); }
  .chart-root .surface-ring { fill: var(--chart-surface); stroke: var(--chart-surface); }
`;

interface Series {
  id: string;
  label: string;
  values: number[];
  fill?: boolean;
}

export interface LineChartProps {
  series: Series[];
  xLabels: string[];
  yLabel?: string;
  yFractionDigits?: number;
  highlightAt?: number;
  highlightLabel?: string;
  className?: string;
}

const BASE_CLASS =
  "chart-root w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";

export default function LineChart({
  series,
  xLabels,
  yLabel,
  yFractionDigits = 0,
  highlightAt,
  highlightLabel,
  className = BASE_CLASS,
}: LineChartProps) {
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const SIDEBAR_W = 60;
  const legendH = series.length > 1 ? 28 : 0;
  const innerH = FULL_HEIGHT - MARGIN.top - MARGIN.bottom - legendH;
  const innerW = useMemo(() => {
    if (typeof window === "undefined") return 700;
    const maxW = Math.max(200, Math.min(900, window.innerWidth - 40));
    return maxW - MARGIN.left - MARGIN.right - SIDEBAR_W;
  }, []);

  const { yMax, yTicks } = useMemo(() => {
    let hi = 0;
    for (const s of series) {
      for (const v of s.values) {
        if (Number.isFinite(v) && v > hi) hi = v;
      }
    }
    if (hi <= 0) hi = 1;
    const padded = Math.max(0, hi * 1.08);
    const tickCount = 5;
    const rawStep = padded / (tickCount - 1);
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const niceStep =
      rawStep <= mag * 1.5
        ? mag
        : rawStep <= mag * 2.5
          ? mag * 2
          : rawStep <= mag * 5
            ? mag * 3
            : mag * 5;
    const niceMax = Math.ceil(padded / niceStep) * niceStep;
    const ticks: number[] = [];
    for (let i = 0; i <= tickCount - 1; i++) {
      ticks.push(Math.round((niceMax * i) / (tickCount - 1) / niceStep) * niceStep);
    }
    return { yMax: niceMax, yTicks: ticks };
  }, [series]);

  const xStep = useMemo(() => {
    if (xLabels.length < 2) return innerW / Math.max(series[0]?.values.length - 1 || 1, 1);
    return innerW / (xLabels.length - 1);
  }, [innerW, xLabels]);

  const toX = (i: number) => MARGIN.left + i * xStep;
  const toY = (v: number) =>
    MARGIN.top + innerH - (v / yMax) * innerH;

  const toColor = (slot: number) => `var(--series-${(slot % 4) + 1})`;

  const pointsFor = (s: Series) =>
    s.values.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const idx = Math.round((mx - MARGIN.left) / xStep);
    const n = series[0]?.values.length ?? 0;
    if (idx >= 0 && idx < n) setHoverIndex(idx);
    else setHoverIndex(null);
  };

  return (
    <div className={className}>
      <style>{CHART_STYLES}</style>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${innerW + SIDEBAR_W} ${FULL_HEIGHT}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        role="img"
        aria-label={`Line chart. ${yLabel ?? ""} ${series.map((s) => s.label).join(", ")}`}
      >
        <defs>
          {series.map((s, i) =>
            s.fill ? (
              <linearGradient
                key={`grad-${s.id}`}
                id={`${id}-area-${i}`}
                x1="0" x2="0" y1="0" y2="1"
              >
                <stop offset="0%" stopColor={toColor(i)} stopOpacity={0.22} />
                <stop offset="100%" stopColor={toColor(i)} stopOpacity={0.02} />
              </linearGradient>
            ) : null
          )}
          <clipPath id={`${id}-clip`}>
            <rect x={MARGIN.left} y={MARGIN.top} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        {/* Gridlines */}
        {yTicks.map((tick) => (
          <line
            key={tick}
            x1={MARGIN.left} x2={MARGIN.left + innerW}
            y1={toY(tick)} y2={toY(tick)}
            className="gridline"
            strokeWidth={1}
          />
        ))}
        {xLabels.map((_, i) => (
          <line
            key={i}
            x1={toX(i)} x2={toX(i)}
            y1={MARGIN.top} y2={MARGIN.top + innerH}
            className="gridline"
            strokeWidth={1}
            strokeDasharray={i === 0 ? undefined : "3 3"}
          />
        ))}

        {/* Axes */}
        <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={MARGIN.top + innerH} className="axis" strokeWidth={1} />
        <line x1={MARGIN.left} x2={MARGIN.left + innerW} y1={MARGIN.top + innerH} y2={MARGIN.top + innerH} className="axis" strokeWidth={1} />

        {/* Y-axis ticks */}
        {yTicks.map((tick) => (
          <text
            key={tick}
            x={MARGIN.left - 8}
            y={toY(tick) + 4}
            textAnchor="end"
            className="tick-text"
            style={{ font: "11px system-ui, sans-serif", fontVariantNumeric: "tabular-nums" }}
          >
            {tick.toLocaleString("en-US", { maximumFractionDigits: yFractionDigits })}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, i) => {
          const max = xLabels.length - 1;
          const step = max <= 6 ? 1 : max <= 12 ? 2 : max <= 24 ? 4 : Math.ceil(max / 6);
          if (i % step !== 0 && i !== max) return null;
          return (
            <text
              key={i}
              x={toX(i)}
              y={MARGIN.top + innerH + 22}
              textAnchor={i === 0 ? "start" : i === max ? "end" : "middle"}
              className="tick-text"
              style={{ font: "11px system-ui, sans-serif" }}
            >
              {label}
            </text>
          );
        })}

        {/* Y-axis label */}
        {yLabel && (
          <text
            x={-MARGIN.top - innerH / 2}
            y={14}
            textAnchor="middle"
            transform="rotate(-90)"
            className="label-text"
            style={{ font: "11px system-ui, sans-serif", fontWeight: 500 }}
          >
            {yLabel}
          </text>
        )}

        {/* Data */}
        <g clipPath={`url(#${id}-clip)`}>
          {series.map((s, i) =>
            s.fill ? (
              <polygon
                key={`area-${s.id}`}
                points={`${toX(0)},${MARGIN.top + innerH} ${pointsFor(s)} ${toX(s.values.length - 1)},${MARGIN.top + innerH}`}
                fill={`url(#${id}-area-${i})`}
              />
            ) : null
          )}

          {series.map((s, i) => (
            <polyline
              key={s.id}
              points={pointsFor(s)}
              fill="none"
              stroke={toColor(i)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* End markers */}
          {series.map((s, i) => {
            const last = s.values.length - 1;
            const v = s.values[last];
            if (!Number.isFinite(v)) return null;
            return (
              <g key={`end-${s.id}`}>
                <circle cx={toX(last)} cy={toY(v)} r={6} className="surface-ring" strokeWidth={2} />
                <circle cx={toX(last)} cy={toY(v)} r={4} fill={toColor(i)} />
                <text
                  x={toX(last) + 10}
                  y={toY(v) + 4}
                  className="label-text"
                  style={{ font: "12px system-ui, sans-serif", fontWeight: 600 }}
                >
                  {v.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </text>
              </g>
            );
          })}
        </g>

        {/* Hover layer */}
        {hoverIndex !== null && (
          <g>
            <line
              x1={toX(hoverIndex)} x2={toX(hoverIndex)}
              y1={MARGIN.top} y2={MARGIN.top + innerH}
              className="tick-text" strokeWidth={1} strokeDasharray="4 3"
            />
            {series.map((s, i) => {
              const v = s.values[hoverIndex];
              if (v === undefined || !Number.isFinite(v)) return null;
              const cx = toX(hoverIndex);
              const cy = toY(v);
              const onLeft = cx > MARGIN.left + innerW * 0.78;
              const tipX = onLeft ? cx - 120 : cx + 10;
              const tipY = Math.max(MARGIN.top, cy - 10);
              return (
                <g key={`hover-${s.id}`}>
                  <circle cx={cx} cy={cy} r={6} className="surface-ring" strokeWidth={2} />
                  <circle cx={cx} cy={cy} r={4} fill={toColor(i)} />
                  <rect
                    x={tipX} y={tipY}
                    width={110} height={20} rx={4}
                    fill="var(--chart-tooltip-bg)"
                  />
                  <text
                    x={tipX + 6} y={tipY + 14}
                    fill="var(--chart-tooltip-text)"
                    style={{ font: "11px system-ui, sans-serif", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                  >
                    {v.toLocaleString("en-US", { style: "decimal", maximumFractionDigits: yFractionDigits })}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Highlight band */}
        {highlightAt !== undefined && highlightAt >= 0 && (
          <g>
            <rect
              x={toX(highlightAt) - 4} y={MARGIN.top}
              width={8} height={innerH} rx={2}
              fill="var(--chart-hl-fill)" fillOpacity={0.08}
            />
            {highlightLabel && (
              <text
                x={toX(highlightAt)} y={MARGIN.top - 8}
                textAnchor="middle"
                fill="var(--chart-hl-text)"
                style={{ font: "11px system-ui, sans-serif", fontWeight: 600 }}
              >
                {highlightLabel}
              </text>
            )}
          </g>
        )}

        {/* Legend */}
        {series.length > 1 && (
          <g>
            {series.map((s, i) => {
              const lx = MARGIN.left + i * 140;
              const ly = 14;
              return (
                <g key={`legend-${s.id}`} transform={`translate(${lx},${ly})`}>
                  <line x1={0} y1={0} x2={14} y2={0} stroke={toColor(i)} strokeWidth={2} />
                  <circle cx={7} cy={0} r={4} className="surface-ring" strokeWidth={2} />
                  <circle cx={7} cy={0} r={3} fill={toColor(i)} />
                  <text
                    x={20} y={4}
                    className="label-text"
                    style={{ font: "12px system-ui, sans-serif", fontWeight: 500 }}
                  >
                    {s.label}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
}

/** Helper: resample a data array to fit within `maxPoints`. */
export function downsample(values: number[], maxPoints: number): number[] {
  if (values.length <= maxPoints) return values;
  const step = values.length / maxPoints;
  const result: number[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(values[Math.floor(i * step)]);
  }
  result[result.length - 1] = values[values.length - 1];
  return result;
}
