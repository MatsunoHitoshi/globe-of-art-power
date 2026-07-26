import {
  geoAzimuthalEquidistant,
  geoCircle,
  geoGraticule10,
  geoPath,
  geoStream,
  type GeoPermissibleObjects,
  type GeoProjection,
  type GeoStream,
} from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import landTopologyJson from "world-atlas/land-110m.json";

const EARTH_RADIUS_KM = 6371;

const landTopology = landTopologyJson as Topology<{
  land: GeometryCollection;
}>;

let cachedLandFeature: GeoPermissibleObjects | null = null;

const getLandFeature = (): GeoPermissibleObjects => {
  if (cachedLandFeature) return cachedLandFeature;
  cachedLandFeature = feature(landTopology, landTopology.objects.land);
  return cachedLandFeature;
};

export type AeqdLayout = {
  center: number;
  maxRadius: number;
  minRadius: number;
  /** 地理距離の正規化に使う最大 km（近傍の最大大圏距離） */
  maxGeoKm: number;
  projection: GeoProjection;
};

/** 地点アンカー: 同方位 θ で地理半径→概念半径へ写す */
export type RadialWarpAnchor = {
  bearing: number;
  /** AEQD 投影上の原点からの px 半径 */
  geoRadius: number;
  /** morph=1 で地点が載る px 半径 */
  conceptRadius: number;
};

/** 地理 AEQD 上の極座標サンプル（投影は一度だけ） */
export type PolarPoint = {
  bearing: number;
  r: number;
};

export type PolarRing = PolarPoint[];

export type PolarLandCache = {
  key: string;
  landRings: PolarRing[];
  outlineRing: PolarRing;
  graticulePathGeo: string;
  landPathGeo: string;
  outlinePathGeo: string;
};

/** 正距方位図法: 角度距離 c (rad) が投影半径に比例。scale で km→px を合わせる */
export const createAeqdLayout = (opts: {
  originLat: number;
  originLng: number;
  size: number;
  maxRadius: number;
  minRadius: number;
  maxGeoKm: number;
}): AeqdLayout => {
  const center = opts.size / 2;
  const maxGeoKm = Math.max(opts.maxGeoKm, 1);
  const scale = (opts.maxRadius * EARTH_RADIUS_KM) / maxGeoKm;

  const projection = geoAzimuthalEquidistant()
    .rotate([-opts.originLng, -opts.originLat])
    .translate([center, center])
    .scale(scale)
    .clipAngle(Math.min(179, (maxGeoKm / EARTH_RADIUS_KM) * (180 / Math.PI) * 1.02));

  return {
    center,
    maxRadius: opts.maxRadius,
    minRadius: opts.minRadius,
    maxGeoKm,
    projection,
  };
};

export const anchorsFromNeighbors = (
  neighbors: {
    bearing: number;
    geoDistanceKm: number;
    conceptualDistance: number;
  }[],
  layout: Pick<AeqdLayout, "minRadius" | "maxRadius" | "maxGeoKm">,
  limit = 24,
): RadialWarpAnchor[] => {
  return neighbors
    .map((n) => {
      const geoT = Math.min(1, Math.max(0, n.geoDistanceKm / layout.maxGeoKm));
      const conceptT = Math.min(1, Math.max(0, n.conceptualDistance));
      return {
        bearing: n.bearing,
        geoRadius: layout.maxRadius * geoT,
        conceptRadius:
          layout.minRadius +
          conceptT * (layout.maxRadius - layout.minRadius),
        conceptualDistance: conceptT,
      };
    })
    .filter((a) => a.geoRadius > 1 && Number.isFinite(a.geoRadius))
    .sort((a, b) => a.conceptualDistance - b.conceptualDistance)
    .slice(0, limit)
    .map(({ bearing, geoRadius, conceptRadius }) => ({
      bearing,
      geoRadius,
      conceptRadius,
    }));
};

/** 年A/Bのアンカーを方位で対応づけて conceptRadius を補間 */
export const interpolateAnchors = (
  a: RadialWarpAnchor[],
  b: RadialWarpAnchor[],
  t: number,
): RadialWarpAnchor[] => {
  const tt = Math.min(1, Math.max(0, t));
  if (tt < 1e-6) return a;
  if (tt > 1 - 1e-6) return b;

  const out: RadialWarpAnchor[] = [];
  const usedB = new Set<number>();

  for (const aa of a) {
    let bestIdx = -1;
    let bestD = Infinity;
    for (let i = 0; i < b.length; i++) {
      if (usedB.has(i)) continue;
      const d = angularDistance(aa.bearing, b[i]!.bearing);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestD < 0.35) {
      usedB.add(bestIdx);
      const bb = b[bestIdx]!;
      out.push({
        bearing: aa.bearing + angularDelta(aa.bearing, bb.bearing) * tt,
        geoRadius: aa.geoRadius * (1 - tt) + bb.geoRadius * tt,
        conceptRadius: aa.conceptRadius * (1 - tt) + bb.conceptRadius * tt,
      });
    } else {
      // 消滅: concept を外側へ
      out.push({
        bearing: aa.bearing,
        geoRadius: aa.geoRadius,
        conceptRadius:
          aa.conceptRadius * (1 - tt) + aa.geoRadius * 1.05 * tt,
      });
    }
  }

  for (let i = 0; i < b.length; i++) {
    if (usedB.has(i)) continue;
    const bb = b[i]!;
    out.push({
      bearing: bb.bearing,
      geoRadius: bb.geoRadius,
      conceptRadius: bb.geoRadius * 1.05 * (1 - tt) + bb.conceptRadius * tt,
    });
  }

  return out.slice(0, 28);
};

const angularDistance = (a: number, b: number) => {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
};

const angularDelta = (from: number, to: number) => {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

const radialScaleAtBearing = (
  bearing: number,
  anchors: RadialWarpAnchor[],
  layout: Pick<AeqdLayout, "maxRadius">,
) => {
  if (anchors.length === 0) return 1;
  const floorR = layout.maxRadius * 0.06;
  const PRIOR = 0.45;
  let sumW = PRIOR;
  let sumS = PRIOR;
  for (const anchor of anchors) {
    const dθ = angularDistance(bearing, anchor.bearing);
    const w = 1 / (dθ * dθ + 0.045 * 0.045);
    const raw = anchor.conceptRadius / Math.max(anchor.geoRadius, floorR);
    const s = Math.min(3.5, Math.max(0.12, raw));
    sumW += w;
    sumS += w * s;
  }
  return sumS / sumW;
};

/**
 * 投影済み (x,y) を、地点アンカーの地理→概念スケールで半径方向にワープ。
 * morph=0 で恒等、1 で概念レイアウトに追従。
 */
export const warpProjectedXy = (
  x: number,
  y: number,
  layout: Pick<AeqdLayout, "center" | "maxRadius">,
  anchors: RadialWarpAnchor[],
  morph: number,
) => {
  const t = Math.min(1, Math.max(0, morph));
  if (t < 1e-6 || anchors.length === 0) return { x, y };

  const dx = x - layout.center;
  const dy = y - layout.center;
  const r = Math.hypot(dx, dy);
  if (r < 1e-6) return { x, y };

  const bearing = Math.atan2(dy, dx) + Math.PI / 2;
  const scale = radialScaleAtBearing(bearing, anchors, layout);
  const rWarped = r * ((1 - t) + t * scale);
  const ux = dx / r;
  const uy = dy / r;
  return {
    x: layout.center + ux * rWarped,
    y: layout.center + uy * rWarped,
  };
};

const warpPolarPoint = (
  point: PolarPoint,
  layout: Pick<AeqdLayout, "center" | "maxRadius">,
  anchors: RadialWarpAnchor[],
  morph: number,
) => {
  const t = Math.min(1, Math.max(0, morph));
  const scale =
    t < 1e-6 || anchors.length === 0
      ? 1
      : radialScaleAtBearing(point.bearing, anchors, layout);
  const r = point.r * ((1 - t) + t * scale);
  return polarToXy(layout.center, point.bearing, r);
};

const decimateRing = (ring: PolarRing, maxPoints: number): PolarRing => {
  if (maxPoints <= 0 || ring.length <= maxPoints) return ring;
  const stride = Math.ceil(ring.length / maxPoints);
  const out: PolarRing = [];
  for (let i = 0; i < ring.length; i += stride) {
    out.push(ring[i]!);
  }
  const first = ring[0]!;
  const last = out[out.length - 1]!;
  if (
    out.length > 0 &&
    (Math.abs(last.bearing - first.bearing) > 1e-6 ||
      Math.abs(last.r - first.r) > 1e-3)
  ) {
    out.push(first);
  }
  return out;
};

const sampleFeatureAsPolarRings = (
  layout: AeqdLayout,
  object: GeoPermissibleObjects,
  /** 0 以下で間引きなし（全頂点を保持） */
  maxPointsPerRing = 0,
): PolarRing[] => {
  const rings: PolarRing[] = [];
  let current: PolarRing = [];

  const sink: GeoStream = {
    point(x, y) {
      if (![x, y].every(Number.isFinite)) return;
      const dx = x - layout.center;
      const dy = y - layout.center;
      const r = Math.hypot(dx, dy);
      if (r > layout.maxRadius * 1.15) return;
      const bearing = Math.atan2(dy, dx) + Math.PI / 2;
      current.push({ bearing, r });
    },
    lineStart() {
      current = [];
    },
    lineEnd() {
      if (current.length >= 3) {
        rings.push(
          maxPointsPerRing > 0
            ? decimateRing(current, maxPointsPerRing)
            : current,
        );
      }
      current = [];
    },
    polygonStart() {},
    polygonEnd() {},
    sphere() {},
  };

  geoStream(object, layout.projection.stream(sink));
  return rings;
};

const makeOutlinePolarRing = (layout: AeqdLayout, steps = 96): PolarRing => {
  const ring: PolarRing = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * Math.PI * 2 - Math.PI;
    ring.push({ bearing, r: layout.maxRadius });
  }
  return ring;
};

export const polarCacheKey = (
  layout: AeqdLayout,
  originLat: number,
  originLng: number,
) =>
  [
    originLat.toFixed(4),
    originLng.toFixed(4),
    layout.center,
    layout.maxRadius.toFixed(2),
    layout.maxGeoKm.toFixed(1),
  ].join("|");

/** 地理投影を一度だけ行い、以降のフレームは半径付け替えだけで歪ませる */
export const buildPolarLandCache = (
  layout: AeqdLayout,
  originLat: number,
  originLng: number,
): PolarLandCache => {
  const key = polarCacheKey(layout, originLat, originLng);
  const path = geoPath(layout.projection);
  const land = getLandFeature();
  const landRings = sampleFeatureAsPolarRings(layout, land, 0);
  const angularDeg = Math.min(
    179,
    (layout.maxGeoKm / EARTH_RADIUS_KM) * (180 / Math.PI),
  );
  const outlineGeo = geoCircle()
    .center([originLng, originLat])
    .radius(angularDeg)();

  return {
    key,
    landRings,
    outlineRing: makeOutlinePolarRing(layout),
    graticulePathGeo: path(geoGraticule10()) ?? "",
    landPathGeo: path(land) ?? "",
    outlinePathGeo: path(outlineGeo) ?? "",
  };
};

export const pathFromPolarRings = (
  rings: PolarRing[],
  layout: Pick<AeqdLayout, "center" | "maxRadius">,
  anchors: RadialWarpAnchor[],
  morph: number,
) => {
  const parts: string[] = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    let d = "";
    for (let i = 0; i < ring.length; i++) {
      const { x, y } = warpPolarPoint(ring[i]!, layout, anchors, morph);
      if (![x, y].every(Number.isFinite)) continue;
      d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    if (d) {
      d += "Z";
      parts.push(d);
    }
  }
  return parts.join("");
};

/** キャッシュ済み極座標から、アンカー追従の背景パスを高速生成 */
export const buildWarpedBackgroundFromPolarCache = (
  cache: PolarLandCache,
  layout: AeqdLayout,
  anchors: RadialWarpAnchor[],
  morph: number,
) => {
  const t = Math.min(1, Math.max(0, morph));
  if (t < 1e-6 || anchors.length === 0) {
    return {
      landPath: cache.landPathGeo,
      landPathGeo: cache.landPathGeo,
      graticulePath: cache.graticulePathGeo,
      outlinePath: cache.outlinePathGeo,
    };
  }

  return {
    landPath: pathFromPolarRings(cache.landRings, layout, anchors, t),
    landPathGeo: cache.landPathGeo,
    // 経緯線は重いので地理のまま薄く残す
    graticulePath: cache.graticulePathGeo,
    outlinePath: pathFromPolarRings([cache.outlineRing], layout, anchors, t),
  };
};

/** 互換: 重いフル再投影版（キャッシュ未使用時のフォールバック） */
export const buildAeqdBackgroundPaths = (
  layout: AeqdLayout,
  originLat: number,
  originLng: number,
  anchors: RadialWarpAnchor[] = [],
  morph = 0,
) => {
  try {
    const cache = buildPolarLandCache(layout, originLat, originLng);
    return buildWarpedBackgroundFromPolarCache(cache, layout, anchors, morph);
  } catch {
    return {
      landPath: "",
      landPathGeo: "",
      graticulePath: "",
      outlinePath: "",
    };
  }
};

/** 地理距離・概念距離を同じ円盤上の半径へ写し、morph で補間する */
export const morphRadius = (
  geoKm: number,
  conceptualDistance: number,
  morph: number,
  layout: Pick<AeqdLayout, "minRadius" | "maxRadius" | "maxGeoKm">,
) => {
  const geoT = Math.min(1, Math.max(0, geoKm / layout.maxGeoKm));
  const rGeo =
    layout.minRadius + geoT * (layout.maxRadius - layout.minRadius);
  const rConcept =
    layout.minRadius +
    Math.min(1, Math.max(0, conceptualDistance)) *
      (layout.maxRadius - layout.minRadius);
  const t = Math.min(1, Math.max(0, morph));
  return rGeo * (1 - t) + rConcept * t;
};

export const polarToXy = (
  center: number,
  bearing: number,
  radius: number,
) => {
  const angle = bearing - Math.PI / 2;
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
};
