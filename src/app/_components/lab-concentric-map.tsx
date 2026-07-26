"use client";

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

type PlottedPoint = {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: string;
  href?: string;
};

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

  const plottedNeighbors = useMemo(() => {
    return model.neighbors.map((neighbor) => {
      const radius =
        minRadius + neighbor.conceptualDistance * (maxRadius - minRadius);
      const angle = neighbor.bearing - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      return {
        id: neighbor.place.id,
        x,
        y,
        label: neighbor.place.label,
        kind: neighbor.place.kind,
        href: placeHref(neighbor.place.id, { year, mode, topic }),
      } satisfies PlottedPoint;
    });
  }, [model.neighbors, center, maxRadius, minRadius, year, mode, topic]);

  const pointById = useMemo(() => {
    const map = new Map<string, PlottedPoint>();
    map.set(model.origin.id, {
      id: model.origin.id,
      x: center,
      y: center,
      label: model.origin.label,
      kind: model.origin.kind,
    });
    for (const point of plottedNeighbors) {
      map.set(point.id, point);
    }
    return map;
  }, [model.origin, plottedNeighbors, center]);

  const edgePaths = useMemo(() => {
    return model.relationEdges
      .map((edge) => {
        const from = pointById.get(edge.fromId);
        const to = pointById.get(edge.toId);
        if (!from || !to) return null;

        // わずかに外側へ膨らむ二次曲線（交差を読みやすく）
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const bulge = edge.kind === "spoke" ? 0.08 : 0.14;
        const cx = mx + (-dy / len) * len * bulge;
        const cy = my + (dx / len) * len * bulge;
        const d = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;

        const opacity =
          edge.kind === "spoke"
            ? 0.18 + edge.weight * 0.42
            : 0.1 + edge.weight * 0.28;
        const strokeWidth =
          edge.kind === "spoke"
            ? 0.7 + edge.weight * 1.6
            : 0.45 + edge.weight * 1.1;
        const stroke =
          edge.kind === "spoke"
            ? "rgba(125, 211, 252, 0.95)"
            : "rgba(244, 114, 182, 0.85)";

        return {
          key: `${edge.kind}-${edge.fromId}-${edge.toId}`,
          d,
          opacity,
          strokeWidth,
          stroke,
          kind: edge.kind,
        };
      })
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null);
  }, [model.relationEdges, pointById]);

  const spokeCount = model.relationEdges.filter((e) => e.kind === "spoke").length;
  const peerCount = model.relationEdges.filter((e) => e.kind === "peer").length;

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

        {/* 関係エッジ: 地点の下に薄い曲線 */}
        <g aria-hidden="true">
          {edgePaths.map((edge) => (
            <path
              key={edge.key}
              d={edge.d}
              fill="none"
              stroke={edge.stroke}
              strokeWidth={edge.strokeWidth}
              strokeOpacity={edge.opacity}
              strokeLinecap="round"
            />
          ))}
        </g>

        {plottedNeighbors.map((neighbor) => (
          <a key={neighbor.id} href={neighbor.href}>
            <circle
              cx={neighbor.x}
              cy={neighbor.y}
              r={neighbor.kind === "country" ? 7 : 5.5}
              fill={neighbor.kind === "country" ? "#fbbf24" : "#38bdf8"}
              stroke="rgba(15,23,42,0.9)"
              strokeWidth={1.5}
            />
            <text
              x={neighbor.x + 9}
              y={neighbor.y + 3}
              fill="rgba(226,232,240,0.92)"
              fontSize={11}
            >
              {neighbor.label}
            </text>
          </a>
        ))}

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

      <div className="space-y-1 border-t border-white/10 px-4 py-2 text-[11px] leading-relaxed text-white/55">
        <p>
          角度は地理的な方位、半径は選択モードの概念距離です。薄い線は関係エッジで、
          <span className="text-sky-300/90"> 水色</span>が原点からの接続（
          {spokeCount}）、
          <span className="text-pink-300/90"> 桃色</span>が近傍地点同士（
          {peerCount}）です。線が太い／濃いほど関係が強いです。
        </p>
      </div>
    </div>
  );
};
