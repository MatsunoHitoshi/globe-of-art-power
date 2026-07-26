import {
  geoAzimuthalEquidistant,
  geoCircle,
  geoGraticule10,
  geoPath,
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
  // d3: ρ = scale * c, c in radians ≈ km / R for sphere distance used by projection
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

const angularDistance = (a: number, b: number) => {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
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

  // polarToXy の逆: angle = bearing - π/2 → bearing = atan2(dy,dx) + π/2
  const bearing = Math.atan2(dy, dx) + Math.PI / 2;
  const floorR = layout.maxRadius * 0.06;
  // アンカーが無い方位はほぼ恒等に戻すための事前分布
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

  const scale = sumS / sumW;
  const rWarped = r * ((1 - t) + t * scale);
  const ux = dx / r;
  const uy = dy / r;
  return {
    x: layout.center + ux * rWarped,
    y: layout.center + uy * rWarped,
  };
};

const wrapWarpStream = (
  output: GeoStream,
  layout: AeqdLayout,
  anchors: RadialWarpAnchor[],
  morph: number,
): GeoStream => ({
  point(x, y) {
    const w = warpProjectedXy(x, y, layout, anchors, morph);
    output.point(w.x, w.y);
  },
  lineStart() {
    output.lineStart();
  },
  lineEnd() {
    output.lineEnd();
  },
  polygonStart() {
    output.polygonStart();
  },
  polygonEnd() {
    output.polygonEnd();
  },
  sphere() {
    output.sphere?.();
  },
});

const makeWarpedProjection = (
  layout: AeqdLayout,
  anchors: RadialWarpAnchor[],
  morph: number,
): GeoProjection => {
  const stream = (output: GeoStream) =>
    layout.projection.stream(wrapWarpStream(output, layout, anchors, morph));
  // geoPath は .stream だけ使えればよい
  return { stream } as GeoProjection;
};

export const buildAeqdBackgroundPaths = (
  layout: AeqdLayout,
  originLat: number,
  originLng: number,
  anchors: RadialWarpAnchor[] = [],
  morph = 0,
) => {
  const empty = {
    landPath: "",
    landPathGeo: "",
    graticulePath: "",
    outlinePath: "",
  };
  if (
    ![originLat, originLng, layout.center, layout.maxRadius, layout.maxGeoKm].every(
      Number.isFinite,
    )
  ) {
    return empty;
  }

  try {
    const t = Math.min(1, Math.max(0, morph));
    const useWarp = t > 1e-6 && anchors.length > 0;
    const projection = useWarp
      ? makeWarpedProjection(layout, anchors, t)
      : layout.projection;
    const path = geoPath(projection);
    const geoPathFn = geoPath(layout.projection);

    const land = getLandFeature();
    const landPath = path(land) ?? "";
    const landPathGeo = useWarp ? (geoPathFn(land) ?? "") : landPath;
    const graticulePath = path(geoGraticule10()) ?? "";
    const angularDeg = Math.min(
      179,
      (layout.maxGeoKm / EARTH_RADIUS_KM) * (180 / Math.PI),
    );
    const outlineGeo = geoCircle()
      .center([originLng, originLat])
      .radius(angularDeg)();
    const outlinePath = path(outlineGeo) ?? "";

    const sanitize = (d: string) =>
      d.includes("NaN") || d.includes("Infinity") ? "" : d;

    return {
      landPath: sanitize(landPath),
      landPathGeo: sanitize(landPathGeo),
      graticulePath: sanitize(graticulePath),
      outlinePath: sanitize(outlinePath),
    };
  } catch {
    return empty;
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
  // SVG: 0°=東。地理 bearing 0=北 → -π/2
  const angle = bearing - Math.PI / 2;
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
};
