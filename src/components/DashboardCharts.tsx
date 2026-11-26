"use client";

import React from "react";

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
    return { x, y, label: d.label };
  });

  const zeroY = padT + plotH - ((0 - minV) / range) * plotH;
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${zeroY.toFixed(1)} L${points[0].x.toFixed(1)},${zeroY.toFixed(1)} Z`
      : "";

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => minV + t * range);

  return (
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
      {points.map((p, i) => (
        <text key={i} x={p.x} y={h - 6} textAnchor="middle" fontSize="10" fill="#64748b">
          {p.label}
        </text>
      ))}
    </svg>
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

  return (
    <div className="space-y-2">
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
          return (
            <g key={d.label}>
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
                    rx="1.5"
                  />
                );
              })}
              <text x={padL + i * colW + colW / 2} y={h - 22} textAnchor="middle" fontSize="10" fill="#64748b">
                {d.label}
              </text>
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
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={lineColor} />
            ))}
          </>
        )}
      </svg>

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
  }));

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
      {pts.length > 1 && (
        <path
          d={pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
        />
      )}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
          <text x={p.x} y={h - 8} textAnchor="middle" fontSize="10" fill="#64748b">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
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
