"use client";

import React, { useMemo, useState } from "react";
import {
  formatCompactNumber,
  formatNumber,
  formatShortChartDate,
} from "@/lib/format";

export interface PerformanceSeriesPoint {
  date: string;
  sent: number;
  delivered: number;
  clicks: number;
  leads: number;
  revenueCents: number;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return path;
}

function buildAreaPath(
  points: Array<{ x: number; y: number }>,
  baseY: number
): string {
  if (points.length === 0) return "";
  const line = buildSmoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
}

export function PerformanceSplineChart({
  series,
  hasData,
  locale,
  timezone,
}: {
  series: PerformanceSeriesPoint[];
  hasData: boolean;
  locale: string;
  timezone: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 660;
  const height = 108;
  const padLeft = 40;
  const padRight = 14;
  const padTop = 14;
  const padBottom = 26;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const baseY = padTop + plotH;

  const displaySeries = useMemo(() => {
    if (series.length <= 31) return series;
    const step = Math.ceil(series.length / 30);
    const sampled: PerformanceSeriesPoint[] = [];
    for (let i = 0; i < series.length; i += step) {
      sampled.push(series[i]);
    }
    if (sampled[sampled.length - 1]?.date !== series[series.length - 1]?.date) {
      sampled.push(series[series.length - 1]);
    }
    return sampled;
  }, [series]);

  const maxY = useMemo(() => {
    let peak = 0;
    for (const p of displaySeries) {
      peak = Math.max(peak, p.sent, p.delivered, p.clicks);
    }
    if (peak <= 0) return 50;
    const mag = Math.pow(10, Math.floor(Math.log10(peak)));
    return Math.ceil((peak * 1.15) / mag) * mag;
  }, [displaySeries]);

  const coords = useMemo(() => {
    const n = Math.max(1, displaySeries.length - 1);
    return displaySeries.map((pt, idx) => {
      const x = padLeft + (displaySeries.length === 1 ? plotW / 2 : (idx / n) * plotW);
      const ySent = baseY - (pt.sent / maxY) * plotH;
      const yDel = baseY - (pt.delivered / maxY) * plotH;
      const yClicks = baseY - (pt.clicks / maxY) * plotH;
      return { x, ySent, yDel, yClicks, pt };
    });
  }, [displaySeries, maxY, padLeft, plotW, plotH, baseY]);

  const sentPoints = coords.map((c) => ({ x: c.x, y: c.ySent }));
  const delPoints = coords.map((c) => ({ x: c.x, y: c.yDel }));
  const clickPoints = coords.map((c) => ({ x: c.x, y: c.yClicks }));

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    value: Math.round(maxY * frac),
    y: baseY - frac * plotH,
  }));

  const xLabelIndices = useMemo(() => {
    if (coords.length <= 1) return [0];
    const count = Math.min(9, coords.length);
    const set = new Set<number>();
    for (let i = 0; i < count; i++) {
      set.add(Math.round((i / (count - 1)) * (coords.length - 1)));
    }
    return Array.from(set);
  }, [coords.length]);

  const activePoint = hoverIdx !== null ? coords[hoverIdx] : null;

  return (
    <div className="relative mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 min-w-0">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none" className="h-[108px] w-full overflow-visible"
          role="img"
          aria-label="Marketing performance trend chart"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="delGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EC4899" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => (
            <g key={tick.value}>
              <line
                x1={padLeft}
                y1={tick.y}
                x2={width - padRight}
                y2={tick.y}
                stroke="#F1F5F9"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={tick.y + 3.5}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-medium"
              >
                {tick.value === 0 ? "0" : formatCompactNumber(tick.value, locale)}
              </text>
            </g>
          ))}

          {coords.length > 0 && (
            <>
              <path d={buildAreaPath(sentPoints, baseY)} fill="url(#sentGrad)" />
              <path d={buildAreaPath(delPoints, baseY)} fill="url(#delGrad)" />
              <path d={buildAreaPath(clickPoints, baseY)} fill="url(#clickGrad)" />

              <path
                d={buildSmoothPath(sentPoints)}
                fill="none"
                stroke="#7C3AED"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d={buildSmoothPath(delPoints)}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d={buildSmoothPath(clickPoints)}
                fill="none"
                stroke="#EC4899"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </>
          )}

          {xLabelIndices.map((idx) => {
            const c = coords[idx];
            if (!c) return null;
            return (
              <text
                key={c.pt.date}
                x={c.x}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-medium"
              >
                {formatShortChartDate(
                  `${c.pt.date}T12:00:00.000Z`,
                  timezone,
                  locale
                )}
              </text>
            );
          })}

          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={padTop}
                x2={activePoint.x}
                y2={baseY}
                stroke="#C4B5FD"
                strokeDasharray="3 3"
              />
              <circle cx={activePoint.x} cy={activePoint.ySent} r="4" fill="#7C3AED" stroke="#fff" strokeWidth="1.5" />
              <circle cx={activePoint.x} cy={activePoint.yDel} r="4" fill="#F59E0B" stroke="#fff" strokeWidth="1.5" />
              <circle cx={activePoint.x} cy={activePoint.yClicks} r="4" fill="#EC4899" stroke="#fff" strokeWidth="1.5" />
            </g>
          )}

          {coords.map((c, idx) => {
            const sliceW = plotW / Math.max(1, coords.length);
            return (
              <rect
                key={c.pt.date}
                x={c.x - sliceW / 2}
                y={padTop}
                width={sliceW}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(idx)}
              />
            );
          })}
        </svg>

        {activePoint && (
          <div className="pointer-events-none absolute top-2 right-4 z-10 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
            <div className="font-semibold text-slate-800">
              {formatShortChartDate(
                `${activePoint.pt.date}T12:00:00.000Z`,
                timezone,
                locale
              )}
            </div>
            <div className="mt-1 space-y-0.5 text-[11px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-violet-600 font-medium">Sent</span>
                <span className="font-semibold text-slate-800">
                  {formatNumber(activePoint.pt.sent, locale)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-amber-600 font-medium">Delivered</span>
                <span className="font-semibold text-slate-800">
                  {formatNumber(activePoint.pt.delivered, locale)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-pink-600 font-medium">Clicks</span>
                <span className="font-semibold text-slate-800">
                  {formatNumber(activePoint.pt.clicks, locale)}
                </span>
              </div>
            </div>
          </div>
        )}

        {!hasData && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full border border-violet-200/80 bg-white/90 px-4 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur">
              No telemetry recorded yet — create a campaign &amp; log events to populate live trends.
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-row gap-4 sm:flex-col sm:gap-2.5 sm:pl-2 sm:w-28 shrink-0 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#7C3AED]" />
          <span className="font-semibold text-slate-700">Messages Sent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
          <span className="font-semibold text-slate-700">Delivered</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EC4899]" />
          <span className="font-semibold text-slate-700">Clicks</span>
        </div>
      </div>
    </div>
  );
}

export function CampaignDonutChart({
  overview,
  locale,
}: {
  overview: {
    total: number;
    active: number;
    scheduled: number;
    completed: number;
    drafts: number;
  };
  locale: string;
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const total = overview.total;

  const segments = [
    { key: "Active", count: overview.active, color: "#7C3AED", dot: "bg-[#7C3AED]" },
    { key: "Scheduled", count: overview.scheduled, color: "#F59E0B", dot: "bg-[#F59E0B]" },
    { key: "Completed", count: overview.completed, color: "#EC4899", dot: "bg-[#EC4899]" },
    { key: "Drafts", count: overview.drafts, color: "#CBD5E1", dot: "bg-slate-300" },
  ];

  let cumulativeOffset = 0;

  return (
    <div className="mt-3 flex items-center justify-between gap-4">
      <div className="relative h-[142px] w-[142px] shrink-0">
        <svg viewBox="0 0 142 142" className="h-full w-full -rotate-90">
          <circle
            cx="71"
            cy="71"
            r={radius}
            fill="none"
            stroke="#EEF2F6"
            strokeWidth="22"
          />
          {total > 0 &&
            segments.map((seg) => {
              if (seg.count <= 0) return null;
              const segLen = (seg.count / total) * circumference;
              const dashOffset = -cumulativeOffset;
              cumulativeOffset += segLen;
              return (
                <circle
                  key={seg.key}
                  cx="71"
                  cy="71"
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="22"
                  strokeDasharray={`${segLen} ${circumference - segLen}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[26px] font-extrabold text-slate-900 leading-none">
            {formatNumber(total, locale)}
          </span>
          <span className="mt-1 text-[11px] font-medium text-slate-500">
            Campaigns
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 text-xs">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${seg.dot}`} />
              <span className="font-medium">{seg.key}</span>
            </div>
            <span className="font-bold text-slate-900 tabular-nums">
              {String(seg.count).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
