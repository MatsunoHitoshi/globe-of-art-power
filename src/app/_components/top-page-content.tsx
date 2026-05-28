"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import { useWindowSize } from "@/app/_hooks/use-window-size";
import { scaleSequentialSqrt, interpolateInferno } from "d3";

import dynamic from "next/dynamic";

import { Header } from "./header";
import type { SelectOption, DataType, VisualizationMode } from "../types/types";
import { ArtistModal } from "./artist-modal";
import { handler, powerData } from "../_utils/globe-data-organizer";
import { heatmapPointWeight } from "../_utils/heatmap-point-weight";

const Globe = dynamic(
  () => import("react-globe.gl").then((mod) => mod.default),
  {
    ssr: false,
  },
);

const HEATMAP_BANDWIDTH = 4.3;
const HEATMAP_TOP_ALTITUDE = 0.3;
const HEATMAP_COLOR_SATURATION = 1.15;

export const TopPageContent = () => {
  const globeEl = useRef<GlobeMethods>();
  const [innerWidth, innerHeight] = useWindowSize();
  const [sizeData, setSizeData] = useState<DataType[]>([]);
  const [focusedData, setFocusedData] = useState<DataType[] | null>();
  const [year, setYear] = useState<SelectOption>({ id: 0, name: "ALL" });
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("hex");

  useEffect(() => {
    const yearData = powerData(year.name);

    if (yearData) {
      const pointsData = handler(yearData, year.name, 8000);
      setSizeData(pointsData);
    } else if (year.name === "ALL") {
      let allPointsData: DataType[] = [];
      for (let i = 2004; i <= 2025; i++) {
        const yearData = powerData(i.toString());
        if (yearData) {
          const pointsData = handler(
            yearData,
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
      <Header
        selectedYear={year}
        setSelectedYear={setYear}
        visualizationMode={visualizationMode}
        setVisualizationMode={setVisualizationMode}
      />
      <ArtistModal setFocusedData={setFocusedData} focusedData={focusedData} />

      <Globe
        ref={globeEl}
        width={innerWidth}
        height={innerHeight}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        objectRotation={{ x: 50, y: 50, z: 1 }}
        hexBinPointsData={visualizationMode === "hex" ? sizeData : []}
        hexBinPointWeight="pos"
        hexAltitude={(d) =>
          visualizationMode === "hex" ? d.sumWeight * 6e-8 : 0
        }
        hexBinResolution={2}
        hexTopColor={(d) =>
          visualizationMode === "hex"
            ? weightColor(d.sumWeight)
            : "rgba(255,255,255,0)"
        }
        hexSideColor={(d) =>
          visualizationMode === "hex"
            ? weightColor(d.sumWeight)
            : "rgba(255,255,255,0)"
        }
        hexTransitionDuration={1000}
        heatmapsData={visualizationMode === "heatmap" ? [sizeData] : []}
        heatmapPointLat="lat"
        heatmapPointLng="lng"
        heatmapPointWeight={heatmapPointWeight}
        heatmapBandwidth={HEATMAP_BANDWIDTH}
        heatmapTopAltitude={HEATMAP_TOP_ALTITUDE}
        heatmapColorSaturation={HEATMAP_COLOR_SATURATION}
        heatmapsTransitionDuration={1000}
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
