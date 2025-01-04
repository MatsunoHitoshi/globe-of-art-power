"use client";

import { useEffect, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import { useWindowSize } from "@/app/_hooks/use-window-size";
import { scaleSequentialSqrt, interpolateInferno } from "d3";

import dynamic from "next/dynamic";

import type { SelectOption, DataType } from "../types/types";
import { handler, powerData } from "../_utils/globe-data-organizer";
import type { power2024 } from "../const/power";
import {
  // ChevronDownIcon,
  // ChevronLeftIcon,
  // ChevronRightIcon,
  // ChevronUpIcon,
  PlayPauseIcon,
} from "@heroicons/react/20/solid";
import { initializeFirebaseApp } from "../_utils/firebase";

import { getDatabase, onValue, ref } from "@firebase/database";
import { FirebaseError } from "@firebase/util";

const Globe = dynamic(
  () => import("react-globe.gl").then((mod) => mod.default),
  {
    ssr: false,
  },
);

type View = {
  lat: number;
  lng: number;
  altitude: number;
};

initializeFirebaseApp();

export const PeppersGhostPageContent = ({
  controlId,
}: {
  controlId: string;
}) => {
  const globeElTop = useRef<GlobeMethods>();
  const globeElRight = useRef<GlobeMethods>();
  const globeElLeft = useRef<GlobeMethods>();
  const globeElBottom = useRef<GlobeMethods>();
  const [innerWidth, innerHeight] = useWindowSize();
  const [shortSideLength, setShortSideLength] = useState<number>(1000);
  const [sizeData, setSizeData] = useState<DataType[]>([]);
  const [focusedData, setFocusedData] = useState<DataType[] | null>();
  const [year, setYear] = useState<SelectOption>({ id: 0, name: "ALL" });
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [pointOfView, setPointOfView] = useState<View>({
    lat: 0,
    lng: 0,
    altitude: 3,
  });

  const globeRotationHandler = (view: View) => {
    if (globeElTop.current) {
      globeElTop.current.pointOfView(view, 10);
    }
    if (globeElLeft.current) {
      globeElLeft.current.pointOfView(view, 10);
    }
    if (globeElRight.current) {
      globeElRight.current.pointOfView(view, 10);
    }
    if (globeElBottom.current) {
      globeElBottom.current.pointOfView(view, 10);
    }
  };

  useEffect(() => {
    try {
      const db = getDatabase();
      console.log(`current-controls/${controlId}`);
      const dbRef = ref(db, `current-controls/${controlId}`);
      return onValue(dbRef, (snapshot) => {
        const value = snapshot.val() as View;
        console.log("control: ", value);
        setPointOfView(value);
        globeRotationHandler(value);
      });
    } catch (e) {
      if (e instanceof FirebaseError) {
        console.error(e);
      }
      return;
    }
  }, []);

  useEffect(() => {
    const shorter =
      (innerHeight ?? 1000) > (innerWidth ?? 1000)
        ? (innerWidth ?? 1000)
        : (innerHeight ?? 1000);
    setShortSideLength(shorter);
  }, [innerHeight, innerWidth]);

  const autoRotateStart = () => {
    if (globeElTop.current) {
      // eslint-disable-next-line
      globeElTop.current.controls().autoRotate = !autoRotate;
      setAutoRotate(!autoRotate);
    }
    if (globeElLeft.current) {
      // eslint-disable-next-line
      globeElLeft.current.controls().autoRotate = !autoRotate;
      setAutoRotate(!autoRotate);
    }
    if (globeElRight.current) {
      // eslint-disable-next-line
      globeElRight.current.controls().autoRotate = !autoRotate;
      setAutoRotate(!autoRotate);
    }
    if (globeElBottom.current) {
      // eslint-disable-next-line
      globeElBottom.current.controls().autoRotate = !autoRotate;
      setAutoRotate(!autoRotate);
    }
  };

  // useEffect(() => {
  //   globeRotationHandler(pointOfView);
  // }, [pointOfView]);

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

  const weightColor = scaleSequentialSqrt(interpolateInferno).domain([0, 1e7]);

  return (
    <div className="relative flex h-screen flex-col bg-black">
      <div className="flex flex-row items-center justify-center">
        <div className="rotate-180 scale-x-[-1]">
          <Globe
            ref={globeElTop}
            width={shortSideLength / 3}
            height={shortSideLength / 3}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="black"
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
            showGraticules={true}
          />
        </div>
      </div>
      <div className="flex flex-row items-center justify-center">
        <div className="rotate-90 scale-x-[-1]">
          <Globe
            ref={globeElLeft}
            width={shortSideLength / 3}
            height={shortSideLength / 3}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="black"
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
            showGraticules={true}
          />
        </div>
        <div
          style={{
            width: `${shortSideLength / 3}px`,
            height: `${shortSideLength / 3}px`,
          }}
          className="flex flex-col items-center justify-between border border-gray-900 p-4"
        >
          {/* <button
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/30"
            onClick={() =>
              setPointOfView({ ...pointOfView, lat: pointOfView.lat + 20 })
            }
          >
            <ChevronUpIcon
              className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
              aria-hidden="true"
            />
          </button> */}
          <div className="flex w-full flex-row items-center justify-between">
            {/* <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/30"
              onClick={() =>
                setPointOfView({ ...pointOfView, lng: pointOfView.lng - 20 })
              }
            >
              <ChevronLeftIcon
                className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
                aria-hidden="true"
              />
            </button> */}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/30"
              onClick={() => autoRotateStart()}
            >
              <PlayPauseIcon
                className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
                aria-hidden="true"
              />
            </button>
            {/* <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/30"
              onClick={() =>
                setPointOfView({ ...pointOfView, lng: pointOfView.lng + 20 })
              }
            >
              <ChevronRightIcon
                className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
                aria-hidden="true"
              />
            </button> */}
          </div>
          {/* <button
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/30"
            onClick={() =>
              setPointOfView({ ...pointOfView, lat: pointOfView.lat - 20 })
            }
          >
            <ChevronDownIcon
              className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
              aria-hidden="true"
            />
          </button> */}
        </div>
        <div className="-rotate-90 scale-x-[-1]">
          <Globe
            ref={globeElRight}
            width={shortSideLength / 3}
            height={shortSideLength / 3}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="black"
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
            showGraticules={true}
          />
        </div>
      </div>
      <div className="flex flex-row items-center justify-center">
        <div className="scale-x-[-1]">
          <Globe
            ref={globeElBottom}
            width={shortSideLength / 3}
            height={shortSideLength / 3}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="black"
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
            showGraticules={true}
          />
        </div>
      </div>
    </div>
  );
};
