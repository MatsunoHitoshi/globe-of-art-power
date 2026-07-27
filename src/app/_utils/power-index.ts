import {
  power2004,
  power2005,
  power2006,
  power2007,
  power2008,
  power2009,
  power2010,
  power2011,
  power2012,
  power2013,
  power2014,
  power2015,
  power2016,
  power2017,
  power2018,
  power2019,
  power2020,
  power2021,
  power2022,
  power2023,
  power2024,
  power2025,
} from "../const/power";
import type { PowerYearData } from "./globe-data-organizer";

/**
 * Prinz (2022) Power Index:
 *   P_i = (n - y) / (Σ r_{i,t} + y)
 * where n is the observation window length, y is years not ranked,
 * and Σ r is the sum of ranks in years the member appeared.
 *
 * @see SN Business & Economics (2022) 2:11, Eq. (5)
 */
export const POWER_INDEX_YEAR_START = 2004;
export const POWER_INDEX_YEAR_END = 2025;
export const POWER_INDEX_N =
  POWER_INDEX_YEAR_END - POWER_INDEX_YEAR_START + 1;

/** P=1 を単年ランク1位の逆順スコア (100) と同じスケールに揃える */
export const POWER_INDEX_TO_POS_FACTOR = 100;

const YEAR_DATA: Record<string, PowerYearData> = {
  "2004": power2004 as PowerYearData,
  "2005": power2005 as PowerYearData,
  "2006": power2006 as PowerYearData,
  "2007": power2007 as PowerYearData,
  "2008": power2008 as PowerYearData,
  "2009": power2009 as PowerYearData,
  "2010": power2010 as PowerYearData,
  "2011": power2011 as PowerYearData,
  "2012": power2012 as PowerYearData,
  "2013": power2013 as PowerYearData,
  "2014": power2014 as PowerYearData,
  "2015": power2015 as PowerYearData,
  "2016": power2016 as PowerYearData,
  "2017": power2017 as PowerYearData,
  "2018": power2018 as PowerYearData,
  "2019": power2019 as PowerYearData,
  "2020": power2020 as PowerYearData,
  "2021": power2021 as PowerYearData,
  "2022": power2022 as PowerYearData,
  "2023": power2023 as PowerYearData,
  "2024": power2024 as PowerYearData,
  "2025": power2025 as PowerYearData,
};

export const computePowerIndex = (ranks: number[], n: number): number => {
  if (ranks.length === 0 || n <= 0) return 0;
  const appearances = ranks.length;
  const y = Math.max(0, n - appearances);
  const sumRanks = ranks.reduce((sum, rank) => sum + rank, 0);
  return appearances / (sumRanks + y);
};

let cachedPowerIndexByPath: Map<string, number> | null = null;

export const getPowerIndexByPath = (): Map<string, number> => {
  if (cachedPowerIndexByPath) return cachedPowerIndexByPath;

  const ranksByPath = new Map<string, number[]>();

  for (let year = POWER_INDEX_YEAR_START; year <= POWER_INDEX_YEAR_END; year++) {
    const yearKey = String(year);
    const data = YEAR_DATA[yearKey];
    if (!data) continue;

    for (const hit of data.results.flatMap((result) => result.hits)) {
      const place = hit.acf.artist_power_100.find(
        (entry) => entry.edition.name === yearKey,
      )?.place;
      if (!place || place <= 0) continue;

      const ranks = ranksByPath.get(hit.path) ?? [];
      ranks.push(place);
      ranksByPath.set(hit.path, ranks);
    }
  }

  const indexByPath = new Map<string, number>();
  for (const [path, ranks] of ranksByPath) {
    indexByPath.set(path, computePowerIndex(ranks, POWER_INDEX_N));
  }

  cachedPowerIndexByPath = indexByPath;
  return indexByPath;
};

export const getPowerIndexForPath = (path: string): number => {
  return getPowerIndexByPath().get(path) ?? 0;
};
