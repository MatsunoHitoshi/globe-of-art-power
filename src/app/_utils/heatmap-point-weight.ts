export const heatmapPointWeight = (point: unknown): number => {
  if (typeof point !== "object" || point === null || !("pos" in point)) {
    return 0;
  }

  const { pos } = point as { pos: unknown };
  return typeof pos === "number" ? Math.sqrt(pos) : 0;
};
