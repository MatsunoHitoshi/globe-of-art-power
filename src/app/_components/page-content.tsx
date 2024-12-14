"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import { useWindowSize } from "@/app/_hooks/use-window-size";
import { scaleSequentialSqrt, interpolateInferno } from "d3";

import dynamic from "next/dynamic";
import {
  power2024,
  power2023,
  power2022,
  power2021,
  power2020,
  power2019,
  power2018,
  power2017,
  power2016,
  power2015,
  power2014,
  power2013,
  power2012,
  power2011,
  power2010,
  power2009,
  power2008,
  power2007,
  power2006,
  power2005,
  power2004,
} from "../const/power";
import { getCountryLocation } from "../const/country-code";
import { Header } from "./header";
import type { SelectOption, DataType } from "../types/types";
import { Modal } from "./modal";

const Globe = dynamic(
  () => import("react-globe.gl").then((mod) => mod.default),
  {
    ssr: false,
  },
);

const powerData = (y: string) => {
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

const handler = (data: typeof power2024, y: string, scale: number) => {
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
            ...getCountryLocation(country),
          };
        }
        return null;
      })
      .filter((x): x is DataType => x !== null),
  );
  console.log("year-", y, ":\n", artistsWithLocation);

  // const unifiedArtists = artistsWithLocation.reduce<ArtistLocation[]>(
  //   (acc, current) => {
  //     const x = acc.find((item) => item.country === current.country);
  //     if (!x) {
  //       return acc.concat([current]);
  //     } else {
  //       x.pos += current.pos;
  //       return acc;
  //     }
  //   },
  //   [],
  // );

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
    };
  });
};

export const PageContent = () => {
  const globeEl = useRef<GlobeMethods>();
  const [innerWidth, innerHeight] = useWindowSize();
  const [sizeData, setSizeData] = useState<DataType[]>([]);
  const [focusedData, setFocusedData] = useState<DataType[] | null>();
  const [year, setYear] = useState<SelectOption>({ id: 0, name: "ALL" });

  useEffect(() => {
    const yearData = powerData(year.name);

    if (yearData) {
      const pointsData = handler(yearData as typeof power2024, year.name, 8000);
      setSizeData(pointsData);
    } else if (year.name === "ALL") {
      let allPointsData: DataType[] = [];
      for (let i = 2004; i <= 2024; i++) {
        const yearData = powerData(i.toString());
        if (yearData) {
          const pointsData = handler(
            yearData as typeof power2024,
            i.toString(),
            800,
          );
          allPointsData = allPointsData.concat(pointsData);
        }
      }
      setSizeData(allPointsData);
      console.log("finalData:", allPointsData.length, " \n", allPointsData);
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

  const weightColor = scaleSequentialSqrt(interpolateInferno).domain([0, 1e7]);

  return (
    <>
      <Header selectedYear={year} setSelectedYear={setYear} />
      <Modal setFocusedData={setFocusedData} focusedData={focusedData} />

      <Globe
        ref={globeEl}
        width={innerWidth}
        height={innerHeight}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        objectRotation={{ x: 50, y: 50, z: 1 }}
        hexBinPointsData={sizeData}
        hexBinPointWeight="pos"
        hexAltitude={(d) => d.sumWeight * 6e-8}
        hexBinResolution={2}
        hexTopColor={(d) => weightColor(d.sumWeight)}
        hexSideColor={(d) => weightColor(d.sumWeight)}
        // hexBinMerge={true}
        hexTransitionDuration={1000}
        // enablePointerInteraction={false}
        onHexClick={(e) => {
          console.log(e);
          setFocusedData(e.points as DataType[]);
        }}
        // onHexHover={(e) => {
        //   console.log(e);
        // }}
        // onPointClick={(e) => {
        //   console.log(e);
        // }}
        // onArcClick={(e) => {
        //   console.log(e);
        // }}
        showGraticules={true}
      />
    </>
  );
};
