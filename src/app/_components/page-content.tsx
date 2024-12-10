"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import { useWindowSize } from "@/app/_hooks/use-window-size";
import { scaleSequentialSqrt, interpolateYlOrRd } from "d3";

import dynamic from "next/dynamic";
import {
  power2024,
  power2023,
  power2022,
  power2021,
  power2020,
} from "../const/power";
import { getCountryLocation } from "../const/country-code";
import { Header } from "./header";
import type { SelectOption } from "../types/types";

const Globe = dynamic(
  () => import("react-globe.gl").then((mod) => mod.default),
  {
    ssr: false,
  },
);

type DataType = {
  lat: number;
  lng: number;
  pos: number;
};

type ArtistLocation = {
  country?: string;
  lat?: number;
  lon?: number;
  pos: number;
};

export const PageContent = () => {
  const globeEl = useRef<GlobeMethods>();
  const [innerWidth, innerHeight] = useWindowSize();
  const [sizeData, setSizeData] = useState<DataType[]>([]);
  const [year, setYear] = useState<SelectOption>({ id: 1, name: "2024" });
  // const places: any = placesData;

  useEffect(() => {
    // fetch("/const/world_population.csv")
    //   .then((res) => res.text())
    //   .then((csv) =>
    //     csvParse(csv, ({ lat, lng, pop }) => ({
    //       lat: +(lat ?? 0),
    //       lng: +(lng ?? 0),
    //       pos: +(pop ?? 0),
    //     })),
    //   )
    //   .then(setSizeData)
    //   .catch((error) => console.error("CSVの読み込みに失敗しました:", error));

    const powerData = {
      "2024": power2024,
      "2023": power2023,
      "2022": power2022,
      "2021": power2021,
      "2020": power2020,
    }[year.name];

    if (powerData) {
      const artistsWithLocation = powerData.results.flatMap((item) =>
        item.hits
          .map((hit) => {
            if (hit.acf.artist_power_100[0]) {
              const c_name = hit.nationality.name.split("-");
              const artistPos = hit.acf.artist_power_100.find((i) => {
                return year.name === i.edition.name;
              })?.place;

              return {
                pos: 101 - (artistPos ?? 0),
                ...getCountryLocation(c_name[c_name.length - 1] ?? ""),
              };
            }
            return null;
          })
          .filter((x): x is ArtistLocation => x !== null),
      );
      console.log(artistsWithLocation);

      const unifiedArtists = artistsWithLocation.reduce<ArtistLocation[]>(
        (acc, current) => {
          const x = acc.find((item) => item.country === current.country);
          if (!x) {
            return acc.concat([current]);
          } else {
            x.pos += current.pos;
            return acc;
          }
        },
        [],
      );

      console.log(unifiedArtists);

      setSizeData(
        unifiedArtists.map((country) => {
          return {
            lat: country.lat ?? 0,
            lng: country.lon ?? 0,
            pos: country.pos * 8000,
          };
        }),
      );
    } else {
      console.log("Data is not found");
    }
  }, [year]);

  useLayoutEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 20, lng: -16.6, altitude: 1.7 }, 0);
      // globeEl.current.controls().autoRotate = true;
      // globeEl.current.controls().enabled = false;
    }
  }, []);

  const weightColor = scaleSequentialSqrt(interpolateYlOrRd).domain([0, 1e7]);

  return (
    <>
      <Header selectedYear={year} setSelectedYear={setYear} />
      <Globe
        ref={globeEl}
        width={innerWidth}
        height={innerHeight}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        // backgroundColor="#000000"
        objectRotation={{ x: 50, y: 50, z: 1 }}
        // from word-population example
        hexBinPointsData={sizeData}
        hexBinPointWeight="pop"
        hexAltitude={(d) => d.sumWeight * 6e-8}
        hexBinResolution={2}
        hexTopColor={(d) => weightColor(d.sumWeight)}
        hexSideColor={(d) => weightColor(d.sumWeight)}
        hexBinMerge={true}
        enablePointerInteraction={false}
      />
    </>
  );
};
