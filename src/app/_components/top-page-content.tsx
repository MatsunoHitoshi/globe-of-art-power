"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import { useWindowSize } from "@/app/_hooks/use-window-size";
import { useAnimatedHeatmapData } from "@/app/_hooks/use-animated-heatmap-data";
import { scaleSequentialSqrt, interpolateInferno } from "d3";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

import dynamic from "next/dynamic";

import { Header } from "./header";
import type {
  SelectOption,
  DataType,
  EvaluationMode,
  VisualizationMode,
} from "../types/types";
import { ArtistModal } from "./artist-modal";
import { handler, powerData } from "../_utils/globe-data-organizer";

const Globe = dynamic(
  () => import("react-globe.gl").then((mod) => mod.default),
  {
    ssr: false,
  },
);

const DEFAULT_HEATMAP_BANDWIDTH = 4.3;
const DEFAULT_HEATMAP_TOP_ALTITUDE = 0.3;
const DEFAULT_HEATMAP_COLOR_SATURATION = 1.15;
const DEFAULT_BAR_HEIGHT_SCALE = 1;
const DEFAULT_HEX_BIN_RESOLUTION = 2;
const DEFAULT_BAR_COLOR_GAMMA = 1;
const HEATMAP_YEAR_TRANSITION_MS = 650;

const angularDistance = (
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
) => {
  const latDiff = latA - latB;
  const lngRawDiff = Math.abs(lngA - lngB);
  const lngDiff = Math.min(lngRawDiff, 360 - lngRawDiff);
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
};

export const TopPageContent = () => {
  const globeEl = useRef<GlobeMethods>();
  const [innerWidth, innerHeight] = useWindowSize();
  const [sizeData, setSizeData] = useState<DataType[]>([]);
  const [focusedData, setFocusedData] = useState<DataType[] | null>();
  const [year, setYear] = useState<SelectOption>({ id: 0, name: "ALL" });
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("hex");
  const [heatmapBandwidth, setHeatmapBandwidth] = useState<number>(
    DEFAULT_HEATMAP_BANDWIDTH,
  );
  const [heatmapTopAltitude, setHeatmapTopAltitude] = useState<number>(
    DEFAULT_HEATMAP_TOP_ALTITUDE,
  );
  const [heatmapColorSaturation, setHeatmapColorSaturation] = useState<number>(
    DEFAULT_HEATMAP_COLOR_SATURATION,
  );
  const [barHeightScale, setBarHeightScale] = useState<number>(
    DEFAULT_BAR_HEIGHT_SCALE,
  );
  const [hexBinResolution, setHexBinResolution] = useState<number>(
    DEFAULT_HEX_BIN_RESOLUTION,
  );
  const [barColorGamma, setBarColorGamma] = useState<number>(
    DEFAULT_BAR_COLOR_GAMMA,
  );
  const [evaluationMode, setEvaluationMode] = useState<EvaluationMode>("total");
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const heatmapMetric: "pos" | "posAreaAdjusted" =
    evaluationMode === "areaAdjusted" ? "posAreaAdjusted" : "pos";
  const animatedHeatmapData = useAnimatedHeatmapData(
    sizeData,
    heatmapMetric,
    HEATMAP_YEAR_TRANSITION_MS,
  );
  const heatmapPointWeight = (point: unknown): number => {
    if (typeof point !== "object" || point === null) {
      return 0;
    }

    const value =
      evaluationMode === "areaAdjusted" && "posAreaAdjusted" in point
        ? (point as { posAreaAdjusted?: unknown }).posAreaAdjusted
        : "pos" in point
          ? (point as { pos?: unknown }).pos
          : 0;

    return typeof value === "number" ? Math.sqrt(value) : 0;
  };

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
  const getBarColor = (sumWeight: number) => {
    const normalized = Math.min(Math.max(sumWeight / 1e7, 0), 1);
    const gammaAdjusted = Math.pow(normalized, barColorGamma);
    return weightColor(gammaAdjusted * 1e7);
  };
  const findNearestCountryData = (lat: number, lng: number) => {
    const dataByCountry = new Map<string, DataType[]>();
    for (const item of sizeData) {
      const list = dataByCountry.get(item.country) ?? [];
      list.push(item);
      dataByCountry.set(item.country, list);
    }

    let best: DataType[] | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const countryData of dataByCountry.values()) {
      const sample = countryData[0];
      if (!sample) continue;
      const distance = angularDistance(lat, lng, sample.lat, sample.lng);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = countryData;
      }
    }

    return best;
  };

  return (
    <>
      <Header
        selectedYear={year}
        setSelectedYear={setYear}
        visualizationMode={visualizationMode}
        setVisualizationMode={setVisualizationMode}
      />
      <>
        <button
          className="fixed bottom-3 right-3 z-10 flex h-9 items-center gap-1 rounded-lg bg-slate-900/55 px-3 text-xs text-white backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileSettingsOpen((prev) => !prev)}
        >
          <AdjustmentsHorizontalIcon className="size-4" />
          <span>Visualization Settings</span>
        </button>
        <div
          className={`fixed bottom-14 left-1/2 z-10 w-[92%] max-w-sm -translate-x-1/2 rounded-lg bg-slate-900/45 px-3 py-2 text-white backdrop-blur-sm md:absolute md:bottom-auto md:left-auto md:right-4 md:top-20 md:block md:w-72 md:translate-x-0 ${
            isMobileSettingsOpen ? "block" : "hidden"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-white/90">
              Visualization Properties
            </span>
            <button
              className="rounded bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20"
              onClick={() => {
                setHeatmapBandwidth(DEFAULT_HEATMAP_BANDWIDTH);
                setHeatmapTopAltitude(DEFAULT_HEATMAP_TOP_ALTITUDE);
                setHeatmapColorSaturation(DEFAULT_HEATMAP_COLOR_SATURATION);
                setBarHeightScale(DEFAULT_BAR_HEIGHT_SCALE);
                setHexBinResolution(DEFAULT_HEX_BIN_RESOLUTION);
                setBarColorGamma(DEFAULT_BAR_COLOR_GAMMA);
                setEvaluationMode("total");
              }}
            >
              Reset
            </button>
          </div>

          <label
            htmlFor="heatmap-evaluation-mode"
            className="mb-2 flex items-center justify-between text-xs"
          >
            <span>Evaluation</span>
            <select
              id="heatmap-evaluation-mode"
              value={evaluationMode}
              onChange={(e) => {
                const value = e.target.value;
                setEvaluationMode(
                  value === "areaAdjusted" ? "areaAdjusted" : "total",
                );
              }}
              className="rounded bg-white/10 px-2 py-1 text-xs outline-none"
            >
              <option value="total">Total Power</option>
              <option value="areaAdjusted">Area Adjusted</option>
            </select>
          </label>

          {visualizationMode === "hex" && (
            <>
              <label
                htmlFor="bar-height-scale-slider"
                className="flex items-center justify-between text-xs"
              >
                <span>Bar Height Scale</span>
                <span className="font-semibold">{barHeightScale.toFixed(2)}</span>
              </label>
              <input
                id="bar-height-scale-slider"
                type="range"
                min={0.1}
                max={3}
                step={0.01}
                value={barHeightScale}
                onChange={(e) => setBarHeightScale(Number(e.target.value))}
                className="mt-1 w-full accent-indigo-400"
              />

              <label
                htmlFor="hex-bin-resolution-slider"
                className="mt-2 flex items-center justify-between text-xs"
              >
                <span>Hex Bin Resolution</span>
                <span className="font-semibold">{hexBinResolution}</span>
              </label>
              <input
                id="hex-bin-resolution-slider"
                type="range"
                min={1}
                max={6}
                step={1}
                value={hexBinResolution}
                onChange={(e) => setHexBinResolution(Number(e.target.value))}
                className="mt-1 w-full accent-indigo-400"
              />

              <label
                htmlFor="bar-color-gamma-slider"
                className="mt-2 flex items-center justify-between text-xs"
              >
                <span>Color Intensity / Gamma</span>
                <span className="font-semibold">{barColorGamma.toFixed(2)}</span>
              </label>
              <input
                id="bar-color-gamma-slider"
                type="range"
                min={0.4}
                max={2.5}
                step={0.01}
                value={barColorGamma}
                onChange={(e) => setBarColorGamma(Number(e.target.value))}
                className="mt-1 w-full accent-indigo-400"
              />
            </>
          )}

          {visualizationMode === "heatmap" && (
            <>
            <label
              htmlFor="heatmap-bandwidth-slider"
              className="flex items-center justify-between text-xs"
            >
              <span>Bandwidth</span>
              <span className="font-semibold">{heatmapBandwidth.toFixed(1)}</span>
            </label>
            <input
              id="heatmap-bandwidth-slider"
              type="range"
              min={1}
              max={10}
              step={0.1}
              value={heatmapBandwidth}
              onChange={(e) => setHeatmapBandwidth(Number(e.target.value))}
              className="mt-1 w-full accent-indigo-400"
            />

            <label
              htmlFor="heatmap-top-altitude-slider"
              className="mt-2 flex items-center justify-between text-xs"
            >
              <span>Top Altitude</span>
              <span className="font-semibold">{heatmapTopAltitude.toFixed(2)}</span>
            </label>
            <input
              id="heatmap-top-altitude-slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={heatmapTopAltitude}
              onChange={(e) => setHeatmapTopAltitude(Number(e.target.value))}
              className="mt-1 w-full accent-indigo-400"
            />

            <label
              htmlFor="heatmap-color-saturation-slider"
              className="mt-2 flex items-center justify-between text-xs"
            >
              <span>Color Saturation</span>
              <span className="font-semibold">
                {heatmapColorSaturation.toFixed(2)}
              </span>
            </label>
            <input
              id="heatmap-color-saturation-slider"
              type="range"
              min={0.2}
              max={3}
              step={0.01}
              value={heatmapColorSaturation}
              onChange={(e) => setHeatmapColorSaturation(Number(e.target.value))}
              className="mt-1 w-full accent-indigo-400"
            />
            </>
          )}
        </div>
      </>
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
        hexBinPointWeight={(point) =>
          evaluationMode === "areaAdjusted"
            ? (point as { posAreaAdjusted?: number }).posAreaAdjusted ?? 0
            : (point as { pos?: number }).pos ?? 0
        }
        hexAltitude={(d) =>
          visualizationMode === "hex" ? d.sumWeight * 6e-8 * barHeightScale : 0
        }
        hexBinResolution={hexBinResolution}
        hexTopColor={(d) =>
          visualizationMode === "hex"
            ? getBarColor(d.sumWeight)
            : "rgba(255,255,255,0)"
        }
        hexSideColor={(d) =>
          visualizationMode === "hex"
            ? getBarColor(d.sumWeight)
            : "rgba(255,255,255,0)"
        }
        hexTransitionDuration={1000}
        heatmapsData={visualizationMode === "heatmap" ? [animatedHeatmapData] : []}
        heatmapPointLat="lat"
        heatmapPointLng="lng"
        heatmapPointWeight={heatmapPointWeight}
        heatmapBandwidth={heatmapBandwidth}
        heatmapTopAltitude={heatmapTopAltitude}
        heatmapColorSaturation={heatmapColorSaturation}
        heatmapsTransitionDuration={0}
        onHexClick={(e) => {
          if (visualizationMode !== "hex") return;
          setFocusedData(e.points as DataType[]);
        }}
        onGlobeClick={(coords) => {
          if (visualizationMode !== "heatmap") return;
          if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
            return;
          }
          const nearestData = findNearestCountryData(coords.lat, coords.lng);
          if (nearestData && nearestData.length > 0) {
            setFocusedData(nearestData);
          }
        }}
        onHeatmapClick={(_, __, coords) => {
          if (visualizationMode !== "heatmap") return;
          if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
            return;
          }
          const nearestData = findNearestCountryData(coords.lat, coords.lng);
          if (nearestData && nearestData.length > 0) {
            setFocusedData(nearestData);
          }
        }}
        // enablePointerInteraction={false}
        // hexBinMerge={true}

        showGraticules={true}
      />
    </>
  );
};
