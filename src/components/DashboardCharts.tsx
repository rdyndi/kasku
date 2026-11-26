"use client";

import React, { useState } from "react";

function fmtShort(n: number) {
  return Math.round(n).toLocaleString("id-ID");
}

export function AreaChartSVG({
  data,
  color,
  height = 190,
}: {
  data: Array<{ label: string; value: number }>;
  color: string;
  height?: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const w = 520;
  const h = height;
  const padL = 62;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const vals = data.map((d) => d.value);
  const minV = Math.min(0, ...vals);
  const maxV = Math.max(100000, ...vals);
  const range = maxV - minV || 1;

  const points = data.map((d, i) => {
    const x = padL + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = padT + plotH - ((d.value - minV) / range) * plotH;
    return { x, y, label: d.label, value: d.value };
  });

  const zeroY = padT + plotH - ((0 - minV) / range) * plotH;
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${zeroY.toFixed(1)} L${points[0].x.toFixed(1)},${zeroY.toFixed(1)} Z`
      : "";

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => minV + t * range);
  const hovered = hoverIdx !== null ? points[hoverIdx] : null;
  const colW = plotW / Math.max(1, points.length);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        {ticks.map((val, i) => {
          const y = padT + plotH - ((val - minV) / range) * plotH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#eef1f6" strokeWidth="1" />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b">
                {fmtShort(val)}
              </text>
            </g>
          );
        })}
        {areaPath && <path d={areaPath} fill={color} fillOpacity="0.88" />}
        {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="2" />}
        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={padT}
              x2={hovered.x}
              y2={padT + plotH}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={hovered.x} cy={hovered.y} r="4.5" fill={color} stroke="#ffffff" strokeWidth="2" />
          </>
        )}
        {points.map((p, i) => (
          <g key={i}>
            <text x={p.x} y={h - 6} textAnchor="middle" fontSize="10" fill="#64748b">
              {p.label}
            </text>
            <rect
              x={p.x - colW / 2}
              y={padT}
              width={colW}
              height={plotH + padB}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          </g>
        ))}
      </svg>
      {hovered && hoverIdx !== null && (
        <div
          className="pointer-events-none absolute z-20 rounded-md bg-slate-900/95 px-2.5 py-1.5 text-[11px] text-white shadow-lg"
          style={{
            left: `${Math.min(76, Math.max(12, (hovered.x / w) * 100))}%`,
            top: `${Math.max(4, (hovered.y / h) * 100 - 18)}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-semibold text-slate-200">{hovered.label}</div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block w-2 h-2 rounded-xs" style={{ background: color }} />
            <span>{fmtShort(hovered.value)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function AgingBarChartSVG({
  buckets,
  color = "#ff5a79",
}: {
  buckets: Array<{ label: string; value: number }>;
  color?: string;
}) {
  const w = 520;
  const h = 195;
  const padL = 56;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const maxV = Math.max(1, ...buckets.map((b) => b.value));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxV);
  const colW = plotW / buckets.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {ticks.map((val, i) => {
        const y = padT + plotH - (val / maxV) * plotH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#eef1f6" strokeWidth="1" />
            <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b">
              {fmtShort(val)}
            </text>
          </g>
        );
      })}
      {buckets.map((b, i) => {
        const barW = Math.min(54, colW * 0.62);
        const x = padL + i * colW + (colW - barW) / 2;
        const barH = (b.value / maxV) * plotH;
        const y = padT + plotH - barH;
        return (
          <g key={b.label}>
            {b.value > 0 && <rect x={x} y={y} width={barW} height={barH} fill={color} rx="2" />}
            <text x={padL + i * colW + colW / 2} y={h - 8} textAnchor="middle" fontSize="10" fill="#64748b">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function GroupedBarChartSVG({
  data,
  bars,
  lineKey,
  lineColor = "#b884d4",
}: {
  data: Array<{ label: string; [key: string]: string | number }>;
  bars: Array<{ key: string; label: string; color: string }>;
  lineKey?: string;
  lineColor?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const w = 520;
  const h = 210;
  const padL = 62;
  const padR = 14;
  const padT = 14;
  const padB = 42;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const allVals = data.flatMap((d) => [
    ...bars.map((b) => Number(d[b.key]) || 0),
    ...(lineKey ? [Number(d[lineKey]) || 0] : []),
  ]);
  const minV = Math.min(0, ...allVals);
  const maxV = Math.max(100000, ...allVals);
  const range = maxV - minV || 1;
  const zeroY = padT + plotH - ((0 - minV) / range) * plotH;

  const colW = plotW / Math.max(1, data.length);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => minV + t * range);

  const linePts = lineKey
    ? data.map((d, i) => ({
        x: padL + i * colW + colW / 2,
        y: padT + plotH - (((Number(d[lineKey]) || 0) - minV) / range) * plotH,
      }))
    : [];

  const hoveredItem = hoverIdx !== null ? data[hoverIdx] : null;
  const hoverCenterPct =
    hoverIdx !== null ? ((padL + hoverIdx * colW + colW / 2) / w) * 100 : 50;

  return (
    <div className="space-y-2 relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        {ticks.map((val, i) => {
          const y = padT + plotH - ((val - minV) / range) * plotH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#eef1f6" strokeWidth="1" />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b">
                {fmtShort(val)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const groupW = colW * 0.72;
          const barW = groupW / bars.length - 3;
          const startX = padL + i * colW + (colW - groupW) / 2;
          const isHovered = hoverIdx === i;
          return (
            <g
              key={d.label}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {isHovered && (
                <rect
                  x={padL + i * colW + 2}
                  y={padT}
                  width={Math.max(10, colW - 4)}
                  height={plotH}
                  fill="#0f172a"
                  fillOpacity="0.04"
                  rx="3"
                />
              )}
              {bars.map((b, bi) => {
                const v = Number(d[b.key]) || 0;
                const yVal = padT + plotH - ((v - minV) / range) * plotH;
                const barH = Math.abs(zeroY - yVal);
                const y = v >= 0 ? yVal : zeroY;
                return (
                  <rect
                    key={b.key}
                    x={startX + bi * (barW + 3)}
                    y={y}
                    width={Math.max(6, barW)}
                    height={barH}
                    fill={b.color}
                    fillOpacity={hoverIdx === null || isHovered ? 1 : 0.65}
                    rx="1.5"
                  />
                );
              })}
              <text x={padL + i * colW + colW / 2} y={h - 22} textAnchor="middle" fontSize="10" fill="#64748b">
                {d.label}
              </text>
              <rect
                x={padL + i * colW}
                y={padT}
                width={colW}
                height={plotH + 22}
                fill="transparent"
              />
            </g>
          );
        })}

        {linePts.length > 1 && (
          <>
            <path
              d={linePts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={lineColor}
              strokeWidth="2"
            />
            {linePts.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={hoverIdx === i ? "4.5" : "3"}
                fill={lineColor}
                className="pointer-events-none"
              />
            ))}
          </>
        )}
      </svg>

      {hoveredItem && hoverIdx !== null && (
        <div
          className="pointer-events-none absolute z-20 rounded-md bg-slate-900/95 px-3 py-2 text-[11px] text-white shadow-lg min-w-[140px]"
          style={{
            left: hoverIdx >= data.length - 2 ? undefined : `${Math.min(82, hoverCenterPct)}%`,
            right: hoverIdx >= data.length - 2 ? `${Math.max(4, 100 - hoverCenterPct)}%` : undefined,
            top: "26%",
            transform: hoverIdx >= data.length - 2 ? "translateY(-50%)" : "translate(-50%, -50%)",
          }}
        >
          <div className="font-semibold text-white mb-1">{hoveredItem.label}</div>
          <div className="space-y-0.5">
            {bars.map((b) => (
              <div key={b.key} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="inline-block w-2.5 h-2.5 rounded-xs shrink-0" style={{ background: b.color }} />
                <span className="text-slate-200">{b.label}:</span>
                <span className="font-semibold text-white">{fmtShort(Number(hoveredItem[b.key]) || 0)}</span>
              </div>
            ))}
            {lineKey && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="inline-block w-2.5 h-2.5 rounded-xs shrink-0" style={{ background: lineColor }} />
                <span className="text-slate-200">Net:</span>
                <span className="font-semibold text-white">{fmtShort(Number(hoveredItem[lineKey]) || 0)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
        {lineKey && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-2.5 rounded-xs" style={{ background: lineColor }} />
            Net
          </span>
        )}
        {bars.map((b) => (
          <span key={b.key} className="inline-flex items-center gap-1.5">
            <span className="w-4 h-2.5 rounded-xs" style={{ background: b.color }} />
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LineChartSVG({
  data,
  color = "#2f80ed",
}: {
  data: Array<{ label: string; value: number }>;
  color?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const w = 520;
  const h = 195;
  const padL = 62;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const maxV = Math.max(100000, ...data.map((d) => d.value));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxV);

  const pts = data.map((d, i) => ({
    x: padL + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
    y: padT + plotH - (d.value / maxV) * plotH,
    label: d.label,
    value: d.value,
  }));
  const hovered = hoverIdx !== null ? pts[hoverIdx] : null;
  const colW = plotW / Math.max(1, pts.length);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        {ticks.map((val, i) => {
          const y = padT + plotH - (val / maxV) * plotH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#eef1f6" strokeWidth="1" />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b">
                {fmtShort(val)}
              </text>
            </g>
          );
        })}
        {pts.length > 1 && (
          <path
            d={pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth="2.2"
          />
        )}
        {hovered && (
          <line
            x1={hovered.x}
            y1={padT}
            x2={hovered.x}
            y2={padT + plotH}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? "5" : "3.5"}
              fill={color}
              stroke={hoverIdx === i ? "#ffffff" : undefined}
              strokeWidth={hoverIdx === i ? "2" : undefined}
            />
            <text x={p.x} y={h - 8} textAnchor="middle" fontSize="10" fill="#64748b">
              {p.label}
            </text>
            <rect
              x={p.x - colW / 2}
              y={padT}
              width={colW}
              height={plotH + padB}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          </g>
        ))}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute z-20 rounded-md bg-slate-900/95 px-2.5 py-1.5 text-[11px] text-white shadow-lg"
          style={{
            left: `${Math.min(78, Math.max(12, (hovered.x / w) * 100))}%`,
            top: `${Math.max(14, (hovered.y / h) * 100 - 12)}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-semibold text-slate-200">{hovered.label}</div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="inline-block w-2 h-2 rounded-xs" style={{ background: color }} />
            <span className="font-semibold">{fmtShort(hovered.value)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const DONUT_COLORS = ["#ff5a79", "#f7c348", "#42bfb9", "#2f80ed", "#c084fc", "#e879f9"];

export function DonutChartSVG({
  slices,
}: {
  slices: Array<{ name: string; value: number }>;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const size = 190;
  const cx = size / 2;
  const cy = size / 2;
  const r = 68;
  const strokeW = 34;
  const circ = 2 * Math.PI * r;

  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="space-y-1.5 text-xs text-slate-600 min-w-[140px]">
        {slices.map((s, i) => (
          <div key={s.name} className="flex items-center gap-2">
            <span
              className="w-5 h-2.5 rounded-xs shrink-0"
              style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="truncate">{s.name}</span>
          </div>
        ))}
        {slices.length === 0 && <span className="text-slate-400">Belum ada biaya</span>}
      </div>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef1f6" strokeWidth={strokeW} />
        ) : (
          slices.map((s, i) => {
            const dash = (s.value / total) * circ;
            const el = (
              <circle
                key={s.name}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth={strokeW}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            );
            offset += dash;
            return el;
          })
        )}
      </svg>
    </div>
  );
}
