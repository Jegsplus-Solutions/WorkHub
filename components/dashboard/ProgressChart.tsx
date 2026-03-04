"use client";
import { useState } from "react";

// ─── Layout constants ────────────────────────────────────────────────────────
const COL_W    = 44;              // px per column (Mon–Sat = 6 cols)
const BAR_W    = 26;              // bar width in px
const SVG_W    = 6 * COL_W;      // 264 px total
const SVG_H    = 120;
const TIP_T    = 2;               // tooltip bubble top y
const TIP_BH   = 15;              // bubble box height
const TIP_PH   = 5;               // pointer triangle height
const BAR_BASE = 86;              // y of bar bottom baseline
const BAR_MAX  = 56;              // max bar height in px (= MAX_HRS)
const BAR_R    = 4;               // top corner radius on bars
const DATE_Y   = 95;
const CIRC_Y   = 109;
const CIRC_R   = 9;
const MAX_HRS  = 10;              // hours that fills full bar height

const LABELS = ["M", "T", "W", "T", "F", "S"];

function fmtH(h: number): string {
  const wh = Math.floor(h);
  const wm = Math.round((h - wh) * 60);
  return wm > 0 ? `${wh}h ${wm}m` : `${wh}h`;
}

/** Rounded-top-only bar path */
function roundedBar(x: number, baseY: number, w: number, h: number, r: number): string {
  if (h <= 0) return "";
  const r2 = Math.min(r, h / 2, w / 2);
  const topY = baseY - h;
  return [
    `M${x},${baseY}`,
    `L${x},${topY + r2}`,
    `Q${x},${topY} ${x + r2},${topY}`,
    `L${x + w - r2},${topY}`,
    `Q${x + w},${topY} ${x + w},${topY + r2}`,
    `L${x + w},${baseY} Z`,
  ].join(" ");
}

/** Speech-bubble pointing downward, centred at cx */
function bubblePath(cx: number): string {
  const l = cx - 16, r = cx + 16;
  const t = TIP_T, b = TIP_T + TIP_BH;
  const rr = 4, py = b + TIP_PH;
  return [
    `M${l + rr},${t}`, `L${r - rr},${t}`,
    `Q${r},${t} ${r},${t + rr}`,
    `L${r},${b - rr}`,
    `Q${r},${b} ${r - rr},${b}`,
    `L${cx + 4},${b}`, `L${cx},${py}`, `L${cx - 4},${b}`,
    `L${l + rr},${b}`,
    `Q${l},${b} ${l},${b - rr}`,
    `L${l},${t + rr}`,
    `Q${l},${t} ${l + rr},${t} Z`,
  ].join(" ");
}

interface Props {
  dailyHoursMap: Record<string, number>;
  todayStr: string;
  todayHours: number;
}

export function ProgressChart({ dailyHoursMap, todayStr, todayHours }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Monday of the current week
  const today  = new Date(todayStr + "T12:00:00");
  const dow    = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  // Mon–Sat (indices 0–5)
  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      str,
      idx:     i,
      dateNum: d.getDate(),
      hours:   dailyHoursMap[str] ?? 0,
      isToday: str === todayStr,
      isFuture: str > todayStr,
    };
  });

  const cx   = (i: number) => i * COL_W + COL_W / 2;
  const barX = (i: number) => i * COL_W + (COL_W - BAR_W) / 2;
  const barH = (h: number) => Math.min(h / MAX_HRS, 1) * BAR_MAX;

  return (
    <div style={{ paddingTop: "4px" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", overflow: "visible" }}
      >

        {/* Baseline */}
        <line x1={0} y1={BAR_BASE} x2={SVG_W} y2={BAR_BASE} stroke="#f3f4f6" strokeWidth="1.5"/>

        {/* Subtle horizontal guide lines at 25 / 50 / 75 % */}
        {[0.25, 0.5, 0.75].map(pct => (
          <line
            key={pct}
            x1={0}  y1={BAR_BASE - pct * BAR_MAX}
            x2={SVG_W} y2={BAR_BASE - pct * BAR_MAX}
            stroke="#f3f4f6" strokeWidth="1" strokeDasharray="3,3"
          />
        ))}

        {/* Per-day columns */}
        {days.map((day) => {
          const x      = cx(day.idx);
          const bx     = barX(day.idx);
          const hrs    = day.isToday ? todayHours : day.hours;
          const bh     = barH(hrs);
          const hasData = hrs > 0;
          const isHov  = hovered === day.idx && !day.isToday && hasData;

          const barFill = day.isToday
            ? "#2563eb"
            : day.isFuture || !hasData ? "#f3f4f6"
            : "#fb923c";

          return (
            <g
              key={day.str}
              onMouseEnter={() => setHovered(day.idx)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "default" }}
            >
              {/* Hit area */}
              <rect x={day.idx * COL_W} y={0} width={COL_W} height={SVG_H} fill="transparent"/>

              {/* Bar (or stub for empty days) */}
              {bh > 0
                ? <path d={roundedBar(bx, BAR_BASE, BAR_W, bh, BAR_R)} fill={barFill}/>
                : <rect x={bx} y={BAR_BASE - 3} width={BAR_W} height={3} rx="1.5" fill="#f3f4f6"/>
              }

              {/* Date number */}
              <text
                x={x} y={DATE_Y}
                textAnchor="middle"
                fill={day.isToday ? "#2563eb" : "#c4c9d4"}
                fontSize="8"
                fontWeight={day.isToday ? "700" : "400"}
                fontFamily="system-ui,sans-serif"
              >
                {day.dateNum}
              </text>

              {/* Day-letter circle */}
              <circle
                cx={x} cy={CIRC_Y} r={CIRC_R}
                fill={day.isToday ? "#111827" : "white"}
                stroke={day.isToday ? "#111827" : "#e5e7eb"}
                strokeWidth="1.5"
              />
              <text
                x={x} y={CIRC_Y + 3.5}
                textAnchor="middle"
                fill={day.isToday ? "white" : "#9ca3af"}
                fontSize="8.5" fontWeight="600" fontFamily="system-ui,sans-serif"
              >
                {LABELS[day.idx]}
              </text>

              {/* Tooltip — always on today, hover on other worked days */}
              {(day.isToday || isHov) && hasData && (
                <g>
                  <path d={bubblePath(x)} fill={day.isToday ? "#2563eb" : "#6b7280"}/>
                  <text
                    x={x} y={TIP_T + TIP_BH / 2 + 4}
                    textAnchor="middle" fill="white"
                    fontSize="7.5" fontWeight="700" fontFamily="system-ui,sans-serif"
                  >
                    {fmtH(hrs)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
