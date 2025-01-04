"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import { useWindowSize } from "@/app/_hooks/use-window-size";
import { scaleSequentialSqrt, interpolateInferno } from "d3";

import dynamic from "next/dynamic";

import { Header } from "./header";
import type { SelectOption, DataType } from "../types/types";
import { ArtistModal } from "./artist-modal";
import { handler, powerData } from "../_utils/globe-data-organizer";
import type { power2024 } from "../const/power";

const Globe = dynamic(
  () => import("react-globe.gl").then((mod) => mod.default),
  {
    ssr: false,
  },
);

export const TopPageContent = () => {
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
      <ArtistModal setFocusedData={setFocusedData} focusedData={focusedData} />

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
        hexTransitionDuration={1000}
        onHexClick={(e) => {
          setFocusedData(e.points as DataType[]);
        }}
        // enablePointerInteraction={false}
        // hexBinMerge={true}

        showGraticules={true}
      />
    </>
  );
};
