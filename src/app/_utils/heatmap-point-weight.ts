import type { EvaluationMode } from "../types/types";

export const createHeatmapPointWeight = (evaluationMode: EvaluationMode) => {
  return (point: unknown): number => {
    if (typeof point !== "object" || point === null) {
      return 0;
    }

    const value =
      evaluationMode === "areaAdjusted" && "posAreaAdjusted" in point
        ? (point as { posAreaAdjusted?: unknown }).posAreaAdjusted
        : "pos" in point
          ? (point as { pos?: unknown }).pos
          : 0;

    return typeof value === "number" ? Math.sqrt(value) : 0;
  };
};

export const heatmapPointWeight = (point: unknown): number => {
  if (typeof point !== "object" || point === null || !("pos" in point)) {
    return 0;
  }

  const { pos } = point as { pos: unknown };
  return typeof pos === "number" ? Math.sqrt(pos) : 0;
};
