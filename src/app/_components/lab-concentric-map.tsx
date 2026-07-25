"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ConcentricMapModel } from "@/app/_utils/conceptual-distance";
import { placeHref } from "@/app/_utils/conceptual-distance";
import type { LabMode } from "@/app/_utils/lab-modes";
import type { TopicId } from "@/app/const/topic-defs";

type Props = {
  model: ConcentricMapModel;
  year: number;
  mode: LabMode;
  topic?: TopicId;
  size?: number;
};

const RING_COUNT = 4;

export const LabConcentricMap = ({
  model,
  year,
  mode,
  topic,
  size = 720,
}: Props) => {
  const center = size / 2;
  const maxRadius = size * 0.42;
  const minRadius = size * 0.08;

  const plotted = useMemo(() => {
    return model.neighbors.map((neighbor) => {
      const radius =
        minRadius + neighbor.conceptualDistance * (maxRadius - minRadius);
      // SVG: 0° = east, geographic bearing 0 = north → rotate
      const angle = neighbor.bearing - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      return { ...neighbor, x, y, radius };
    });
  }, [model.neighbors, center, maxRadius, minRadius]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto h-auto w-full max-w-3xl"
        role="img"
        aria-label={`${model.origin.label} からの概念距離同心円地図`}
      >
        <defs>
          <radialGradient id="lab-ring-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.05" />
          </radialGradient>
        </defs>

        <circle
          cx={center}
          cy={center}
          r={maxRadius}
          fill="url(#lab-ring-fill)"
        />

        {Array.from({ length: RING_COUNT }, (_, i) => {
          const t = (i + 1) / RING_COUNT;
          const r = minRadius + t * (maxRadius - minRadius);
          return (
            <g key={i}>
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="rgba(148,163,184,0.28)"
                strokeWidth={1}
                strokeDasharray={i === RING_COUNT - 1 ? undefined : "4 6"}
              />
              <text
                x={center + 6}
                y={center - r + 4}
                fill="rgba(148,163,184,0.7)"
                fontSize={11}
              >
                d={t.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* 方位の補助線 */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const x2 = center + maxRadius * Math.cos(rad);
          const y2 = center + maxRadius * Math.sin(rad);
          const label =
            deg === 0 ? "N" : deg === 90 ? "E" : deg === 180 ? "S" : "W";
          const lx = center + (maxRadius + 18) * Math.cos(rad);
          const ly = center + (maxRadius + 18) * Math.sin(rad);
          return (
            <g key={deg}>
              <line
                x1={center}
                y1={center}
                x2={x2}
                y2={y2}
                stroke="rgba(148,163,184,0.15)"
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(148,163,184,0.55)"
                fontSize={12}
              >
                {label}
              </text>
            </g>
          );
        })}

        {plotted.map((neighbor) => (
          <g key={neighbor.place.id}>
            <Link
              href={placeHref(neighbor.place.id, { year, mode, topic })}
              className="cursor-pointer"
            >
              <circle
                cx={neighbor.x}
                cy={neighbor.y}
                r={neighbor.place.kind === "country" ? 7 : 5.5}
                fill={
                  neighbor.place.kind === "country" ? "#fbbf24" : "#38bdf8"
                }
                stroke="rgba(15,23,42,0.9)"
                strokeWidth={1.5}
              />
              <text
                x={neighbor.x + 9}
                y={neighbor.y + 3}
                fill="rgba(226,232,240,0.92)"
                fontSize={11}
              >
                {neighbor.place.label}
              </text>
            </Link>
          </g>
        ))}

        {/* 原点 */}
        <circle
          cx={center}
          cy={center}
          r={10}
          fill="#f472b6"
          stroke="white"
          strokeWidth={2}
        />
        <text
          x={center}
          y={center + 28}
          textAnchor="middle"
          fill="#fda4af"
          fontSize={13}
          fontWeight={600}
        >
          {model.origin.label}
        </text>
      </svg>

      <p className="border-t border-white/10 px-4 py-2 text-[11px] leading-relaxed text-white/55">
        角度は地理的な方位、半径は選択モードの概念距離です。地理的に近くても言説・社会関係が遠ければ外周へ、その逆なら中心寄りに配置されます。
      </p>
    </div>
  );
};
