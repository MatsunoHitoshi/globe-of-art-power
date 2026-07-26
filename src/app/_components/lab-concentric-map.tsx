"use client";

import { useId, useMemo, useState } from "react";
import type { ConcentricMapModel } from "@/app/_utils/conceptual-distance";
import { placeHref } from "@/app/_utils/conceptual-distance";
import {
  anchorsFromNeighbors,
  buildAeqdBackgroundPaths,
  createAeqdLayout,
  morphRadius,
  polarToXy,
} from "@/app/_utils/aeqd-land";
import type { LabMode } from "@/app/_utils/lab-modes";
import type { TopicId } from "@/app/const/topic-defs";

type Props = {
  model: ConcentricMapModel;
  /** 陸地ワープ用（時系列補間中は離散年モデルを渡す） */
  warpModel?: ConcentricMapModel;
  year: number;
  /** マップ上の年表示（補間中は小数可） */
  yearLabel?: number;
  mode: LabMode;
  topic?: TopicId;
  size?: number;
  showEdges?: boolean;
  /** ラベルを付ける近傍の上限（モバイル向け） */
  labelLimit?: number;
  /** 時系列スクラブ/再生中は陸地を地理のままにしてメインスレッド負荷を抑える */
  lightBackground?: boolean;
  /** タイムライン全体で固定した地理スケール（スクラブ中の再投影を防ぐ） */
  stableMaxGeoKm?: number;
  /** 描画する近傍の上限 */
  plotLimit?: number;
};

const RING_COUNT = 4;

type PlottedPoint = {
  id: string;
  x: number;
  y: number;
  geoX: number;
  geoY: number;
  label: string;
  kind: string;
  href?: string;
  opacity: number;
  showLabel: boolean;
};

export const LabConcentricMap = ({
  model,
  warpModel,
  year,
  yearLabel,
  mode,
  topic,
  size = 720,
  showEdges = true,
  labelLimit = 14,
  lightBackground = false,
  stableMaxGeoKm,
  plotLimit = 48,
}: Props) => {
  const reactId = useId();
  const gradId = `lab-ring-fill-${reactId}`;
  const [morph, setMorph] = useState(1);
  const landSource = warpModel ?? model;

  const maxGeoKm = useMemo(() => {
    // 補間中の model.neighbors を混ぜると maxGeoKm が毎フレーム変わり、
    // 投影ごと陸地パスを再生成してクライアントが落ちることがある
    const fromLand = Math.max(
      0,
      ...landSource.neighbors.map((n) => n.geoDistanceKm),
    );
    return Math.max(stableMaxGeoKm ?? 0, fromLand, 2500);
  }, [landSource.neighbors, stableMaxGeoKm]);

  const layout = useMemo(() => {
    const maxRadius = size * 0.42;
    const minRadius = size * 0.06;
    return createAeqdLayout({
      originLat: landSource.origin.lat,
      originLng: landSource.origin.lng,
      size,
      maxRadius,
      minRadius,
      maxGeoKm,
    });
  }, [
    landSource.origin.lat,
    landSource.origin.lng,
    size,
    maxGeoKm,
  ]);

  const warpAnchors = useMemo(
    () => anchorsFromNeighbors(landSource.neighbors, layout, 24),
    [landSource.neighbors, layout],
  );

  const backgroundMorph = lightBackground ? 0 : morph;

  const background = useMemo(
    () =>
      buildAeqdBackgroundPaths(
        layout,
        landSource.origin.lat,
        landSource.origin.lng,
        warpAnchors,
        backgroundMorph,
      ),
    [
      layout,
      landSource.origin.lat,
      landSource.origin.lng,
      warpAnchors,
      backgroundMorph,
    ],
  );

  const plottedNeighbors = useMemo(() => {
    const sorted = [...model.neighbors]
      .filter(
        (n) =>
          Number.isFinite(n.conceptualDistance) &&
          Number.isFinite(n.bearing) &&
          Number.isFinite(n.geoDistanceKm),
      )
      .sort((a, b) => a.conceptualDistance - b.conceptualDistance);
    const visible = sorted.slice(0, plotLimit);
    const labeled = new Set(
      visible.slice(0, labelLimit).map((n) => n.place.id),
    );

    return visible.map((neighbor) => {
      const rMorph = morphRadius(
        neighbor.geoDistanceKm,
        neighbor.conceptualDistance,
        morph,
        layout,
      );
      const rGeo = morphRadius(
        neighbor.geoDistanceKm,
        neighbor.conceptualDistance,
        0,
        layout,
      );
      const pos = polarToXy(layout.center, neighbor.bearing, rMorph);
      const geoPos = polarToXy(layout.center, neighbor.bearing, rGeo);
      return {
        id: neighbor.place.id,
        x: pos.x,
        y: pos.y,
        geoX: geoPos.x,
        geoY: geoPos.y,
        label: neighbor.place.label,
        kind: neighbor.place.kind,
        href: placeHref(neighbor.place.id, { year, mode, topic }),
        opacity: neighbor.opacity ?? 1,
        showLabel: labeled.has(neighbor.place.id),
      } satisfies PlottedPoint;
    });
  }, [
    model.neighbors,
    layout,
    morph,
    year,
    mode,
    topic,
    labelLimit,
    plotLimit,
  ]);

  const pointById = useMemo(() => {
    const map = new Map<string, PlottedPoint>();
    map.set(model.origin.id, {
      id: model.origin.id,
      x: layout.center,
      y: layout.center,
      geoX: layout.center,
      geoY: layout.center,
      label: model.origin.label,
      kind: model.origin.kind,
      opacity: 1,
      showLabel: true,
    });
    for (const point of plottedNeighbors) {
      map.set(point.id, point);
    }
    return map;
  }, [model.origin, plottedNeighbors, layout.center]);

  const edgePaths = useMemo(() => {
    if (!showEdges) return [];
    // 年補間中は model.relationEdges が空になるので、離散年のエッジを補完する
    const edges =
      model.relationEdges.length > 0
        ? model.relationEdges
        : (warpModel?.relationEdges ?? []);
    return edges
      .map((edge) => {
        const from = pointById.get(edge.fromId);
        const to = pointById.get(edge.toId);
        if (!from || !to) return null;

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
            ? 0.16 + edge.weight * 0.4
            : 0.09 + edge.weight * 0.26;
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
        };
      })
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null);
  }, [model.relationEdges, warpModel?.relationEdges, pointById, showEdges]);

  const edgeSource =
    model.relationEdges.length > 0
      ? model.relationEdges
      : (warpModel?.relationEdges ?? []);
  const spokeCount = edgeSource.filter((e) => e.kind === "spoke").length;
  const peerCount = edgeSource.filter((e) => e.kind === "peer").length;
  const showGeoGhosts = morph > 0.08 && morph < 0.98;
  const yearText =
    yearLabel !== undefined
      ? yearLabel % 1 < 0.05 || yearLabel % 1 > 0.95
        ? String(Math.round(yearLabel))
        : yearLabel.toFixed(1)
      : String(year);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 text-xs text-white/80 sm:gap-3 sm:px-4 sm:py-2.5">
        <label
          htmlFor={`morph-${reactId}`}
          className="shrink-0 font-medium text-white/70"
        >
          配置
        </label>
        <input
          id={`morph-${reactId}`}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={morph}
          onChange={(e) => setMorph(Number(e.target.value))}
          className="h-2 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/15 [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-300 [&::-webkit-slider-thumb]:bg-sky-500 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/15 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-sky-300 [&::-moz-range-thumb]:bg-sky-500"
        />
        <div className="flex w-full items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:justify-end">
          <div className="flex items-center gap-1.5 text-[11px] text-white/55">
            <span className={morph < 0.15 ? "text-sky-300" : undefined}>
              地理
            </span>
            <span>→</span>
            <span className={morph > 0.85 ? "text-pink-300" : undefined}>
              概念
            </span>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className="min-h-9 rounded-lg bg-white/10 px-2.5 text-[11px] hover:bg-white/20"
              onClick={() => setMorph(0)}
            >
              地理
            </button>
            <button
              type="button"
              className="min-h-9 rounded-lg bg-white/10 px-2.5 text-[11px] hover:bg-white/20"
              onClick={() => setMorph(1)}
            >
              概念
            </button>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto h-auto w-full max-w-3xl"
        role="img"
        aria-label={`${model.origin.label} ${yearText} 年の概念距離マップ`}
      >
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.04" />
          </radialGradient>
          <clipPath id={`clip-${reactId}`}>
            <circle cx={layout.center} cy={layout.center} r={layout.maxRadius} />
          </clipPath>
        </defs>

        <circle
          cx={layout.center}
          cy={layout.center}
          r={layout.maxRadius}
          fill={`url(#${gradId})`}
        />

        <text
          x={layout.center}
          y={layout.center - layout.maxRadius * 0.72}
          textAnchor="middle"
          fill="rgba(125,211,252,0.18)"
          fontSize={size * 0.14}
          fontWeight={700}
          className="pointer-events-none select-none"
        >
          {yearText}
        </text>

        <g clipPath={`url(#clip-${reactId})`} opacity={0.9}>
          {showGeoGhosts && background.landPathGeo && (
            <path
              d={background.landPathGeo}
              fill="none"
              stroke="rgba(251,191,36,0.22)"
              strokeWidth={0.8}
              strokeDasharray="3 4"
            />
          )}
          {background.graticulePath && (
            <path
              d={background.graticulePath}
              fill="none"
              stroke="rgba(148,163,184,0.12)"
              strokeWidth={0.6}
            />
          )}
          {background.landPath && (
            <path
              d={background.landPath}
              fill="rgba(148,163,184,0.22)"
              stroke="rgba(226,232,240,0.28)"
              strokeWidth={0.7}
            />
          )}
          {background.outlinePath && (
            <path
              d={background.outlinePath}
              fill="none"
              stroke="rgba(148,163,184,0.35)"
              strokeWidth={1}
            />
          )}
        </g>

        {Array.from({ length: RING_COUNT }, (_, i) => {
          const t = (i + 1) / RING_COUNT;
          const r =
            layout.minRadius + t * (layout.maxRadius - layout.minRadius);
          const geoKm = Math.round(layout.maxGeoKm * t);
          return (
            <g key={i}>
              <circle
                cx={layout.center}
                cy={layout.center}
                r={r}
                fill="none"
                stroke="rgba(148,163,184,0.22)"
                strokeWidth={1}
                strokeDasharray={i === RING_COUNT - 1 ? undefined : "4 6"}
              />
              <text
                x={layout.center + 6}
                y={layout.center - r + 4}
                fill="rgba(148,163,184,0.65)"
                fontSize={10}
              >
                {morph < 0.5 ? `${geoKm}km` : `d=${t.toFixed(2)}`}
              </text>
            </g>
          );
        })}

        {[0, 90, 180, 270].map((deg) => {
          const rad = ((deg - 90) * Math.PI) / 180;
          const x2 = layout.center + layout.maxRadius * Math.cos(rad);
          const y2 = layout.center + layout.maxRadius * Math.sin(rad);
          const label =
            deg === 0 ? "N" : deg === 90 ? "E" : deg === 180 ? "S" : "W";
          const lx = layout.center + (layout.maxRadius + 18) * Math.cos(rad);
          const ly = layout.center + (layout.maxRadius + 18) * Math.sin(rad);
          return (
            <g key={deg}>
              <line
                x1={layout.center}
                y1={layout.center}
                x2={x2}
                y2={y2}
                stroke="rgba(148,163,184,0.12)"
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

        <g aria-hidden="true">
          {edgePaths.map((edge) => (
            <path
              key={edge.key}
              d={edge.d}
              fill="none"
              stroke={edge.stroke}
              strokeWidth={edge.strokeWidth}
              strokeOpacity={edge.opacity * (0.65 + morph * 0.35)}
              strokeLinecap="round"
            />
          ))}
        </g>

        {showGeoGhosts &&
          plottedNeighbors
            .filter(
              (neighbor) =>
                Number.isFinite(neighbor.x) &&
                Number.isFinite(neighbor.y) &&
                Number.isFinite(neighbor.geoX) &&
                Number.isFinite(neighbor.geoY),
            )
            .map((neighbor) => (
            <g
              key={`ghost-${neighbor.id}`}
              opacity={0.35 * neighbor.opacity}
            >
              <line
                x1={neighbor.geoX}
                y1={neighbor.geoY}
                x2={neighbor.x}
                y2={neighbor.y}
                stroke="rgba(251,191,36,0.45)"
                strokeWidth={0.8}
                strokeDasharray="2 3"
              />
              <circle
                cx={neighbor.geoX}
                cy={neighbor.geoY}
                r={2.2}
                fill="rgba(251,191,36,0.7)"
              />
            </g>
          ))}

        {plottedNeighbors
          .filter(
            (neighbor) =>
              Number.isFinite(neighbor.x) && Number.isFinite(neighbor.y),
          )
          .map((neighbor) => (
          <a
            key={neighbor.id}
            href={neighbor.href}
            style={{ opacity: neighbor.opacity }}
          >
            <circle
              cx={neighbor.x}
              cy={neighbor.y}
              r={neighbor.kind === "country" ? 7 : 5.5}
              fill={neighbor.kind === "country" ? "#fbbf24" : "#38bdf8"}
              stroke="rgba(15,23,42,0.9)"
              strokeWidth={1.5}
            />
            {neighbor.showLabel && (
              <text
                x={neighbor.x + 9}
                y={neighbor.y + 3}
                fill="rgba(226,232,240,0.92)"
                fontSize={11}
              >
                {neighbor.label}
              </text>
            )}
          </a>
        ))}

        <circle
          cx={layout.center}
          cy={layout.center}
          r={10}
          fill="#f472b6"
          stroke="white"
          strokeWidth={2}
        />
        <text
          x={layout.center}
          y={layout.center + 28}
          textAnchor="middle"
          fill="#fda4af"
          fontSize={13}
          fontWeight={600}
        >
          {model.origin.label}
        </text>
      </svg>

      <div className="space-y-1 border-t border-white/10 px-3 py-2 text-[11px] leading-relaxed text-white/55 sm:px-4">
        <p>
          方位は地理のまま、半径と陸地を概念距離でワープ。下のタイムラインで年ごとの距離の変遷を再生できます。
        </p>
        {showEdges && (
          <p>
            薄い線は関係エッジ（
            <span className="text-sky-300/90">水色=原点接続 {spokeCount}</span>
            ／
            <span className="text-pink-300/90">桃色=近傍同士 {peerCount}</span>
            ）。
          </p>
        )}
      </div>
    </div>
  );
};
