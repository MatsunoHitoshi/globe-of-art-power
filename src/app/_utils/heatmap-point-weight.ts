import type { EvaluationMode } from "../types/types";
import { getEvaluationMetricValue } from "./evaluation-metric";

export const createHeatmapPointWeight = (evaluationMode: EvaluationMode) => {
  return (point: unknown): number => {
    if (typeof point !== "object" || point === null) {
      return 0;
    }

    const value = getEvaluationMetricValue(
      point as Record<string, unknown>,
      evaluationMode,
    );
    return Math.sqrt(value);
  };
};

export const heatmapPointWeight = (point: unknown): number => {
  return createHeatmapPointWeight("total")(point);
};
