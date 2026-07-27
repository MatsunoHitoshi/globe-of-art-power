import type {
  ConceptualNeighbor,
  ConcentricMapModel,
  PlaceNode,
} from "./conceptual-distance";
import { LAB_YEARS } from "./blurb-analysis";

/** 時系列アニメ用（古い→新しい） */
export const LAB_YEARS_ASC: number[] = [...LAB_YEARS].sort((a, b) => a - b);

export type TimelineFrame = {
  year: number;
  model: ConcentricMapModel;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/**
 * progress は 0 .. frames.length-1 の連続値。
 * 整数年のあいだは概念距離を補間し、出現/消滅は外側からフェード。
 */
export const resolveTimelineFrame = (
  frames: TimelineFrame[],
  progress: number,
): {
  displayYear: number;
  discreteYear: number;
  frac: number;
  model: ConcentricMapModel;
  warpModel: ConcentricMapModel;
  transitioning: boolean;
} | null => {
  if (frames.length === 0) return null;
  if (!Number.isFinite(progress)) {
    const only = frames[0]!;
    return {
      displayYear: only.year,
      discreteYear: only.year,
      frac: 0,
      model: only.model,
      warpModel: only.model,
      transitioning: false,
    };
  }
  if (frames.length === 1) {
    const only = frames[0]!;
    return {
      displayYear: only.year,
      discreteYear: only.year,
      frac: 0,
      model: only.model,
      warpModel: only.model,
      transitioning: false,
    };
  }

  const max = frames.length - 1;
  const clamped = Math.min(max, Math.max(0, progress));
  const i0 = Math.min(max - 1, Math.floor(clamped));
  const i1 = i0 + 1;
  const frac = clamped - i0;
  const a = frames[i0]!;
  const b = frames[i1]!;
  const t = easeInOut(frac);
  const discreteIdx = Math.round(clamped);
  const discrete = frames[discreteIdx]!;

  if (frac < 0.001) {
    return {
      displayYear: a.year,
      discreteYear: a.year,
      frac: 0,
      model: a.model,
      warpModel: a.model,
      transitioning: false,
    };
  }
  if (frac > 0.999) {
    return {
      displayYear: b.year,
      discreteYear: b.year,
      frac: 0,
      model: b.model,
      warpModel: b.model,
      transitioning: false,
    };
  }

  return {
    displayYear: lerp(a.year, b.year, t),
    discreteYear: discrete.year,
    frac,
    model: interpolateModels(a.model, b.model, t),
    warpModel: discrete.model,
    transitioning: true,
  };
};

const neighborMap = (model: ConcentricMapModel) => {
  const map = new Map<string, ConceptualNeighbor>();
  for (const n of model.neighbors) map.set(n.place.id, n);
  return map;
};

const ghostNeighbor = (
  place: PlaceNode,
  from: ConceptualNeighbor,
  side: "in" | "out",
  t: number,
): ConceptualNeighbor => {
  const target = from.conceptualDistance;
  const conceptualDistance =
    side === "in" ? lerp(1, target, t) : lerp(target, 1, t);
  const opacity = side === "in" ? t : 1 - t;
  return {
    place,
    conceptualDistance,
    bearing: from.bearing,
    geoDistanceKm: from.geoDistanceKm,
    similarity: 1 - conceptualDistance,
    opacity,
  };
};

export const interpolateModels = (
  a: ConcentricMapModel,
  b: ConcentricMapModel,
  t: number,
): ConcentricMapModel => {
  const mapA = neighborMap(a);
  const mapB = neighborMap(b);
  const ids = new Set([...mapA.keys(), ...mapB.keys()]);
  const neighbors: ConceptualNeighbor[] = [];

  for (const id of ids) {
    const na = mapA.get(id);
    const nb = mapB.get(id);
    if (na && nb) {
      neighbors.push({
        place: nb.place,
        conceptualDistance: lerp(
          na.conceptualDistance,
          nb.conceptualDistance,
          t,
        ),
        bearing: nb.bearing,
        geoDistanceKm: nb.geoDistanceKm,
        similarity: lerp(na.similarity, nb.similarity, t),
        opacity: 1,
      });
    } else if (na && !nb) {
      neighbors.push(ghostNeighbor(na.place, na, "out", t));
    } else if (!na && nb) {
      neighbors.push(ghostNeighbor(nb.place, nb, "in", t));
    }
  }

  neighbors.sort((x, y) => x.conceptualDistance - y.conceptualDistance);

  return {
    origin: b.origin,
    year: Math.round(lerp(a.year, b.year, t)),
    mode: b.mode,
    neighbors,
    // 遷移中はエッジを空にしてちらつきを避ける
    relationEdges: [],
  };
};

/** 再生速度: 1 年あたりの秒数（小さいほど速い） */
export const TIMELINE_SPEEDS = [
  { id: "slow", label: "ゆっくり", secondsPerYear: 2.2 },
  { id: "normal", label: "標準", secondsPerYear: 1.2 },
  { id: "fast", label: "速い", secondsPerYear: 0.55 },
] as const;

export type TimelineSpeedId = (typeof TIMELINE_SPEEDS)[number]["id"];
