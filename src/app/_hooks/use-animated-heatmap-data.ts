"use client";

import { useEffect, useRef, useState } from "react";
import type { DataType } from "../types/types";

type HeatmapPoint = {
  key: string;
  lat: number;
  lng: number;
  pos: number;
};

const aggregateHeatmapPoints = (data: DataType[]): HeatmapPoint[] => {
  const map = new Map<string, HeatmapPoint>();

  for (const item of data) {
    const key = `${item.country}-${item.lat}-${item.lng}`;
    const existing = map.get(key);
    if (existing) {
      existing.pos += item.pos;
    } else {
      map.set(key, {
        key,
        lat: item.lat,
        lng: item.lng,
        pos: item.pos,
      });
    }
  }

  return Array.from(map.values());
};

const interpolateHeatmapPoints = (
  fromPoints: HeatmapPoint[],
  toPoints: HeatmapPoint[],
  t: number,
): HeatmapPoint[] => {
  const fromMap = new Map(fromPoints.map((p) => [p.key, p]));
  const toMap = new Map(toPoints.map((p) => [p.key, p]));
  const allKeys = new Set([...fromMap.keys(), ...toMap.keys()]);

  const result: HeatmapPoint[] = [];
  for (const key of allKeys) {
    const from = fromMap.get(key);
    const to = toMap.get(key);

    const lat = to?.lat ?? from?.lat ?? 0;
    const lng = to?.lng ?? from?.lng ?? 0;
    const fromPos = from?.pos ?? 0;
    const toPos = to?.pos ?? 0;
    const pos = fromPos + (toPos - fromPos) * t;

    if (pos > 0.0001) {
      result.push({ key, lat, lng, pos });
    }
  }

  return result;
};

export const useAnimatedHeatmapData = (
  sourceData: DataType[],
  durationMs = 700,
) => {
  const [animatedData, setAnimatedData] = useState<HeatmapPoint[]>([]);
  const previousDataRef = useRef<HeatmapPoint[]>([]);
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const nextData = aggregateHeatmapPoints(sourceData);
    const prevData = previousDataRef.current;

    if (frameIdRef.current !== null) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }

    if (prevData.length === 0 || durationMs <= 0) {
      setAnimatedData(nextData);
      previousDataRef.current = nextData;
      return;
    }

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const interpolated = interpolateHeatmapPoints(prevData, nextData, t);
      setAnimatedData(interpolated);

      if (t < 1) {
        frameIdRef.current = requestAnimationFrame(animate);
      } else {
        previousDataRef.current = nextData;
        frameIdRef.current = null;
      }
    };

    frameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    };
  }, [sourceData, durationMs]);

  return animatedData;
};
