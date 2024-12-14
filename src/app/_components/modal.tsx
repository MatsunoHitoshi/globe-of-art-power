import { useState } from "react";
import type { DataType } from "../types/types";

import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/20/solid";

export const Modal = ({
  focusedData,
  setFocusedData,
}: {
  focusedData: DataType[] | undefined | null;
  setFocusedData: React.Dispatch<
    React.SetStateAction<DataType[] | undefined | null>
  >;
}) => {
  const [isSpread, setIsSpread] = useState<boolean>(false);
  const ARTIST_BASE_URL = "https://artreview.com/";
  if (!focusedData) return null;
  return (
    <div
      className={`absolute bottom-0 z-20 flex ${isSpread ? "h-[580px]" : "h-80"} w-full flex-col gap-2 rounded-t-2xl bg-slate-700/30 px-6 pt-8 text-white backdrop-blur-xl`}
    >
      <div className="sticky top-0 flex flex-row items-center justify-between">
        <div className="text-xl font-bold">
          Country Code: {focusedData?.[0]?.country}
        </div>
        <div className="flex flex-row items-center gap-2">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/30"
            onClick={() => {
              setIsSpread(!isSpread);
            }}
          >
            {isSpread ? (
              <ArrowsPointingInIcon
                className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
                aria-hidden="true"
              />
            ) : (
              <ArrowsPointingOutIcon
                className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
                aria-hidden="true"
              />
            )}
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/30"
            onClick={() => {
              setFocusedData(null);
            }}
          >
            <XMarkIcon
              className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-gray-500 overflow-scroll">
        {focusedData
          ?.slice()
          .reverse()
          .map((artist, index) => {
            return (
              <a
                key={index}
                className="flex cursor-pointer flex-row gap-2 p-3 hover:bg-white/5"
                href={`${ARTIST_BASE_URL}${artist.path}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="flex flex-col gap-2">
                  <div className="text-sm">in {artist.year}</div>
                  <div className="text-2xl font-bold">{artist.rank}.</div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm">{artist.category}</div>
                  <div className="text-2xl font-bold">{artist.name}</div>
                </div>
              </a>
            );
          })}
      </div>
    </div>
  );
};
