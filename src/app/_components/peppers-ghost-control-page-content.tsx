"use client";
import { useEffect, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import { useWindowSize } from "@/app/_hooks/use-window-size";
import { scaleSequentialSqrt, interpolateInferno } from "d3";

import dynamic from "next/dynamic";

import { Header } from "./header";
import type { SelectOption, DataType, CurrentControl } from "../types/types";
import { ArtistModal } from "./artist-modal";
import { handler, powerData } from "../_utils/globe-data-organizer";
import type { power2024 } from "../const/power";
import { initializeFirebaseApp } from "../_utils/firebase";
import { createId } from "../_utils/cuid/cuid";

import { getDatabase, set, ref } from "@firebase/database";
import { FirebaseError } from "@firebase/util";
import { InstructionModal } from "./instruction-modal";
import { env } from "@/env";

const Globe = dynamic(
  () => import("react-globe.gl").then((mod) => mod.default),
  {
    ssr: false,
  },
);

initializeFirebaseApp();

const pushData = async (data: CurrentControl, id: string) => {
  try {
    const db = getDatabase();
    const dbRef = ref(db, `current-controls/${id}`);
    await set(dbRef, data);
  } catch (e) {
    if (e instanceof FirebaseError) {
      console.log(e);
    }
  }
};

export const PeppersGhostControlPageContent = () => {
  const globeEl = useRef<GlobeMethods>();
  const [innerWidth, innerHeight] = useWindowSize();
  const [sizeData, setSizeData] = useState<DataType[]>([]);
  const [focusedData, setFocusedData] = useState<DataType[] | null>();
  const [year, setYear] = useState<SelectOption>({ id: 0, name: "ALL" });
  const [id, setId] = useState<string>(createId());
  const [instructionOpen, setInstructionOpen] = useState<boolean>(true);

  // For firebase realtime database
  const [currentControl, setCurrentControl] = useState<CurrentControl | null>();
  useEffect(() => {
    const updateControl = async () => {
      if (currentControl) {
        console.log(currentControl);
        await pushData(currentControl, id);
      }
    };
    void updateControl();
  }, [currentControl, id]);

  useEffect(() => {
    const yearData = powerData(year.name);

    if (currentControl?.view) {
      setCurrentControl({ ...currentControl, year: year });
    }

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
    <>
      <Header selectedYear={year} setSelectedYear={setYear} />
      <ArtistModal setFocusedData={setFocusedData} focusedData={focusedData} />
      {instructionOpen && (
        <InstructionModal
          qrUrl={`${env.NEXT_PUBLIC_BASE_URL}/peppers-ghost/${id}`}
          setIsOpen={setInstructionOpen}
        />
      )}

      <Globe
        ref={globeEl}
        width={innerWidth}
        height={innerHeight}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
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
        onZoom={(e) => {
          setCurrentControl({
            view: {
              lng: e.lng,
              lat: e.lat,
              altitude: e.altitude,
            },
            year: year,
          });
        }}
        showGraticules={true}
      />
    </>
  );
};
