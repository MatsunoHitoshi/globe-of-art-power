"use client";

import { useEffect, useMemo, useState } from "react";
import {
  analyzeYearBlurbs,
  type AnalysisBundle,
} from "@/app/_utils/blurb-analysis";
import { buildConcentricMapModel } from "@/app/_utils/conceptual-distance";
import { powerData } from "@/app/_utils/globe-data-organizer";
import type { LabMode } from "@/app/_utils/lab-modes";
import {
  LAB_YEARS_ASC,
  type TimelineFrame,
} from "@/app/_utils/lab-timeline";

export const useLabPlaceTimelineData = (placeId: string, mode: LabMode) => {
  const [bundles, setBundles] = useState<Map<number, AnalysisBundle>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadedCount(0);
      const next = new Map<number, AnalysisBundle>();

      for (let i = 0; i < LAB_YEARS_ASC.length; i++) {
        if (cancelled) return;
        const year = LAB_YEARS_ASC[i]!;
        const data = powerData(String(year));
        if (data) {
          next.set(year, analyzeYearBlurbs(data, year));
        }
        setBundles(new Map(next));
        setLoadedCount(i + 1);
        // メインスレッドを譲ってモバイルでも固まりにくくする
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }

      if (!cancelled) setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const frames: TimelineFrame[] = useMemo(() => {
    const list: TimelineFrame[] = [];
    for (const year of LAB_YEARS_ASC) {
      const bundle = bundles.get(year);
      if (!bundle) continue;
      const model = buildConcentricMapModel(bundle, placeId, mode);
      if (!model) continue;
      list.push({ year, model });
    }
    return list;
  }, [bundles, placeId, mode]);

  const availableYears = useMemo(
    () => frames.map((f) => f.year),
    [frames],
  );

  return {
    bundles,
    frames,
    availableYears,
    loading,
    loadedCount,
    totalYears: LAB_YEARS_ASC.length,
  };
};
