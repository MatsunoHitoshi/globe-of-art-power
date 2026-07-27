import type { DataType, EvaluationMode } from "../types/types";

export type EvaluationMetricKey = "pos" | "posAreaAdjusted" | "posPowerIndex";

export const evaluationModeToMetricKey = (
  evaluationMode: EvaluationMode,
): EvaluationMetricKey => {
  if (evaluationMode === "areaAdjusted") return "posAreaAdjusted";
  if (evaluationMode === "powerIndex") return "posPowerIndex";
  return "pos";
};

export const getEvaluationMetricValue = (
  point: Pick<DataType, EvaluationMetricKey> | Record<string, unknown>,
  evaluationMode: EvaluationMode,
): number => {
  const key = evaluationModeToMetricKey(evaluationMode);
  const value = (point as Record<string, unknown>)[key];
  return typeof value === "number" ? value : 0;
};
