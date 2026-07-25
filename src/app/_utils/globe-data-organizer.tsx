import { getCountryAreaKm2, getCountryLocation } from "../const/country-code";
import {
  power2025,
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
} from "../const/power";
import type { DataType } from "../types/types";

export type PowerYearData = {
  results: Array<{
    hits: Array<{
      title: string;
      path: string;
      nationality?: { name: string } | null;
      artist_category?: { name: string } | null;
      acf: {
        artist_power_100: Array<{
          place: number;
          edition: { name: string };
        }>;
      };
      featured_media?: { source_url?: string } | null;
    }>;
  }>;
};

export const powerData = (y: string): PowerYearData | undefined => {
  const dataMap: Record<string, PowerYearData> = {
    "2025": power2025 as PowerYearData,
    "2024": power2024 as PowerYearData,
    "2023": power2023 as PowerYearData,
    "2022": power2022 as PowerYearData,
    "2021": power2021 as PowerYearData,
    "2020": power2020 as PowerYearData,
    "2019": power2019 as PowerYearData,
    "2018": power2018 as PowerYearData,
    "2017": power2017 as PowerYearData,
    "2016": power2016 as PowerYearData,
    "2015": power2015 as PowerYearData,
    "2014": power2014 as PowerYearData,
    "2013": power2013 as PowerYearData,
    "2012": power2012 as PowerYearData,
    "2011": power2011 as PowerYearData,
    "2010": power2010 as PowerYearData,
    "2009": power2009 as PowerYearData,
    "2008": power2008 as PowerYearData,
    "2007": power2007 as PowerYearData,
    "2006": power2006 as PowerYearData,
    "2005": power2005 as PowerYearData,
    "2004": power2004 as PowerYearData,
  };

  return dataMap[y];
};

export const handler = (data: PowerYearData, y: string, scale: number) => {
  const artistsWithLocation = data.results.flatMap((item) =>
    item.hits
      .map((hit) => {
        if (!hit.nationality?.name) return null;

        const c_name = hit.nationality.name.split("-");
        const rawCountry = c_name[c_name.length - 1] ?? "";
        if (!rawCountry) return null;

        // 未登録・国際コード (INT 等) は座標が取れないためプロットしない
        // （undefined を lat/lng ?? 0 に落とすと Null Island = アフリカ沖 0,0 に積もる）
        const location = getCountryLocation(rawCountry);
        if (!location) return null;

        const artistPos = hit.acf.artist_power_100.find((i) => {
          return y === i.edition.name;
        })?.place;

        return {
          pos: 101 - (artistPos ?? 0),
          country: location.code,
          lat: location.lat,
          lng: location.lng,
          countryName: location.countryName,
          name: hit.title,
          rank: artistPos ?? 0,
          year: Number(y),
          path: hit.path,
          category: hit.artist_category?.name ?? "",
          iconSrc:
            hit.featured_media?.source_url ??
            "https://placehold.jp/300x300.png",
        };
      })
      .filter((x): x is Omit<DataType, "posAreaAdjusted" | "areaKm2"> => x !== null),
  );

  console.log("year-", y, ":\n", artistsWithLocation);

  return artistsWithLocation.map((artist) => {
    const areaKm2 = getCountryAreaKm2(artist.country);
    // 面積100万km²を基準に補正係数を正規化する。
    const areaAdjustedFactor = 1000 / Math.sqrt(areaKm2);
    const weightedPos = artist.pos * scale;
    return {
      lat: artist.lat,
      lng: artist.lng,
      country: artist.country,
      rank: artist.rank,
      year: artist.year,
      name: artist.name,
      path: artist.path,
      pos: weightedPos,
      posAreaAdjusted: weightedPos * areaAdjustedFactor,
      areaKm2,
      category: artist.category,
      countryName: artist.countryName,
      iconSrc: artist.iconSrc,
    };
  });
};
