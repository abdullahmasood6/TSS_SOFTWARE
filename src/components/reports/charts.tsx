"use client";

import { formatMoney } from "@/lib/utils";

type SeriesPoint = {
  label: string;
  revenue: number;
  cost: number;
  margin: number;
  isForecast?: boolean;
};

type BarItem = { label: string; value: number; tone?: "steel" | "navy" | "success" | "warn" };

const COLORS = {
  revenue: "#1f6feb",
  cost: "#8fa3b8",
  margin: "#0d7a52",
  forecast: "#93b8f5",
  forecastCost: "#c5d0db",
};

export function TrendChart({
  title,
  subtitle,
  series,
  height = 220,
}: {
  title: string;
  subtitle?: string;
  series: SeriesPoint[];
  height?: number;
}) {
  const w = 640;
  const h = height;
  const pad = { t: 16, r: 12, b: 36, l: 48 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const maxY = Math.max(
    1,
    ...series.flatMap((p) => [p.revenue, p.cost, Math.abs(p.margin)])
  );
  const n = Math.max(series.length, 1);

  function x(i: number) {
    return pad.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  }
  function y(v: number) {
    return pad.t + innerH - (v / maxY) * innerH;
  }

  function path(getter: (p: SeriesPoint) => number, dashedFrom?: number) {
    return series
      .map((p, i) => `${i === 0 || i === dashedFrom ? "M" : "L"} ${x(i).toFixed(1)} ${y(getter(p)).toFixed(1)}`)
      .join(" ");
  }

  const forecastStart = series.findIndex((p) => p.isForecast);

  return (
    <div className="rounded-xl border border-tss-border bg-white p-4 shadow-[0_1px_0_rgba(10,28,54,0.03)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-tss-navy">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-tss-slate">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-wide text-tss-slate">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-tss-steel" /> Revenue
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#8fa3b8]" /> Cost
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-tss-success" /> Margin
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={title}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yy = pad.t + innerH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={yy}
                y2={yy}
                stroke="#e4ebf3"
                strokeWidth={1}
              />
              <text x={pad.l - 8} y={yy + 3} textAnchor="end" fontSize={9} fill="#5a6a7d">
                {formatShort(maxY * t)}
              </text>
            </g>
          );
        })}

        {/* Actual lines */}
        <path
          d={path((p) => p.revenue)}
          fill="none"
          stroke={COLORS.revenue}
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={path((p) => p.cost)}
          fill="none"
          stroke={COLORS.cost}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={path((p) => p.margin)}
          fill="none"
          stroke={COLORS.margin}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {series.map((p, i) => (
          <g key={p.label + i}>
            <circle
              cx={x(i)}
              cy={y(p.revenue)}
              r={p.isForecast ? 3.5 : 3}
              fill={p.isForecast ? COLORS.forecast : COLORS.revenue}
              stroke="#fff"
              strokeWidth={1}
            />
            <text
              x={x(i)}
              y={h - 12}
              textAnchor="middle"
              fontSize={9}
              fill={p.isForecast ? "#1f6feb" : "#5a6a7d"}
              fontStyle={p.isForecast ? "italic" : "normal"}
            >
              {p.label}
            </text>
          </g>
        ))}

        {forecastStart > 0 ? (
          <line
            x1={x(forecastStart) - 8}
            x2={x(forecastStart) - 8}
            y1={pad.t}
            y2={pad.t + innerH}
            stroke="#1f6feb"
            strokeDasharray="4 3"
            strokeOpacity={0.35}
          />
        ) : null}
      </svg>
    </div>
  );
}

export function BarChart({
  title,
  subtitle,
  items,
  valueFormat = "money",
}: {
  title: string;
  subtitle?: string;
  items: BarItem[];
  valueFormat?: "money" | "number" | "percent";
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const toneClass = {
    steel: "bg-tss-steel",
    navy: "bg-tss-navy",
    success: "bg-tss-success",
    warn: "bg-amber-500",
  };

  function fmt(v: number) {
    if (valueFormat === "money") return formatMoney(v);
    if (valueFormat === "percent") return `${v.toFixed(1)}%`;
    return String(Math.round(v));
  }

  return (
    <div className="rounded-xl border border-tss-border bg-white p-4 shadow-[0_1px_0_rgba(10,28,54,0.03)]">
      <h3 className="text-sm font-semibold text-tss-navy">{title}</h3>
      {subtitle ? <p className="mt-0.5 mb-3 text-xs text-tss-slate">{subtitle}</p> : <div className="mb-3" />}
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-tss-slate">No data for this range.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.slice(0, 8).map((item) => (
            <li key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium text-tss-ink">{item.label}</span>
                <span className="shrink-0 tabular-nums text-tss-slate">{fmt(item.value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-tss-surface">
                <div
                  className={`h-full rounded-full transition-all ${toneClass[item.tone || "steel"]}`}
                  style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function FunnelChart({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-xl border border-tss-border bg-white p-4 shadow-[0_1px_0_rgba(10,28,54,0.03)]">
      <h3 className="mb-3 text-sm font-semibold text-tss-navy">{title}</h3>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-tss-slate">No pipeline data.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const width = 40 + (item.count / max) * 60;
            return (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-28 shrink-0 truncate text-xs text-tss-slate">{item.label}</div>
                <div className="flex-1">
                  <div
                    className="flex h-8 items-center justify-center rounded-md bg-gradient-to-r from-tss-navy to-tss-steel text-[11px] font-semibold text-white transition-all"
                    style={{ width: `${width}%`, opacity: 1 - idx * 0.04 }}
                  >
                    {item.count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}
