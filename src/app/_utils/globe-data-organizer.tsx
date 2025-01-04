import { getCountryLocation } from "../const/country-code";
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
} from "../const/power";
import type { DataType } from "../types/types";

export const powerData = (y: string) => {
  return {
    "2024": power2024,
    "2023": power2023,
    "2022": power2022,
    "2021": power2021,
    "2020": power2020,
    "2019": power2019,
    "2018": power2018,
    "2017": power2017,
    "2016": power2016,
    "2015": power2015,
    "2014": power2014,
    "2013": power2013,
    "2012": power2012,
    "2011": power2011,
    "2010": power2010,
    "2009": power2009,
    "2008": power2008,
    "2007": power2007,
    "2006": power2006,
    "2005": power2005,
    "2004": power2004,
  }[y];
};

export const handler = (data: typeof power2024, y: string, scale: number) => {
  const artistsWithLocation = data.results.flatMap((item) =>
    item.hits
      .map((hit) => {
        if (hit.nationality?.name) {
          const c_name = hit.nationality.name.split("-");
          const country = c_name[c_name.length - 1] ?? "";
          if (!country) return null;

          const artistPos = hit.acf.artist_power_100.find((i) => {
            return y === i.edition.name;
          })?.place;

          return {
            pos: 101 - (artistPos ?? 0),
            country,
            name: hit.title,
            rank: artistPos ?? 0,
            year: Number(y),
            path: hit.path,
            category: hit.artist_category?.name ?? "",
            iconSrc:
              hit.featured_media?.source_url ??
              "https://placehold.jp/300x300.png",
            ...getCountryLocation(country),
          };
        }
        return null;
      })
      .filter((x): x is DataType => x !== null),
  );

  console.log("year-", y, ":\n", artistsWithLocation);

  return artistsWithLocation.map((artist) => {
    return {
      lat: artist.lat ?? 0,
      lng: artist.lng ?? 0,
      country: artist.country,
      rank: artist.rank,
      year: artist.year,
      name: artist.name,
      path: artist.path,
      pos: artist.pos * scale,
      category: artist.category,
      countryName: artist.countryName,
      iconSrc: artist.iconSrc,
    };
  });
};
