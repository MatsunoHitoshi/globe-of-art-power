import {
  geoAzimuthalEquidistant,
  geoCircle,
  geoGraticule10,
  geoPath,
  type GeoPermissibleObjects,
  type GeoProjection,
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

export const buildAeqdBackgroundPaths = (
  layout: AeqdLayout,
  originLat: number,
  originLng: number,
) => {
  const path = geoPath(layout.projection);
  const land = getLandFeature();
  const landPath = path(land) ?? "";
  const graticulePath = path(geoGraticule10()) ?? "";
  const angularDeg = Math.min(
    179,
    (layout.maxGeoKm / EARTH_RADIUS_KM) * (180 / Math.PI),
  );
  const outlinePath =
    path(geoCircle().center([originLng, originLat]).radius(angularDeg)()) ?? "";

  return { landPath, graticulePath, outlinePath };
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
