import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/20/solid";
import clsx from "clsx";
import type { SelectOption } from "../types/types";

const years = [
  { id: 0, name: "ALL" },
  { id: 1, name: "2024" },
  { id: 2, name: "2023" },
  { id: 3, name: "2022" },
  { id: 4, name: "2021" },
  { id: 5, name: "2020" },
  { id: 6, name: "2019" },
  { id: 7, name: "2018" },
  { id: 8, name: "2017" },
  { id: 9, name: "2016" },
  { id: 10, name: "2015" },
  { id: 11, name: "2014" },
  { id: 12, name: "2013" },
  { id: 13, name: "2012" },
  { id: 14, name: "2011" },
  { id: 15, name: "2010" },
  { id: 16, name: "2009" },
  { id: 17, name: "2008" },
  { id: 18, name: "2007" },
  { id: 19, name: "2006" },
  { id: 20, name: "2005" },
  { id: 21, name: "2004" },
];

type HeaderProps = {
  selectedYear: SelectOption;
  setSelectedYear: React.Dispatch<React.SetStateAction<SelectOption>>;
};
export const Header = ({ selectedYear, setSelectedYear }: HeaderProps) => {
  return (
    <>
      <div className="absolute z-10 w-full bg-slate-700/30 p-4 text-white backdrop-blur-sm">
        <div className="flex flex-row items-center justify-between">
          <div className="text-lg font-bold">The Globe of Art Power</div>

          <div className="flex flex-row items-center gap-1">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/30"
              onClick={() => {
                if (
                  selectedYear.name === "2004" ||
                  selectedYear.name === "ALL"
                ) {
                  return;
                } else {
                  const prevYear = Number(selectedYear.name) - 1;
                  const prevYearString = String(prevYear);
                  setSelectedYear(
                    years.find((y) => {
                      return y.name === prevYearString;
                    }) ?? { id: 21, name: "2004" },
                  );
                }
              }}
            >
              <ChevronLeftIcon
                className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
                aria-hidden="true"
              />
            </button>

            <div className="w-24">
              <Listbox value={selectedYear} onChange={setSelectedYear}>
                <ListboxButton
                  className={clsx(
                    "relative block w-full rounded-lg bg-white/5 py-1.5 pl-3 pr-8 text-left text-sm/6 text-white",
                    "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
                  )}
                >
                  {selectedYear.name}
                  <ChevronDownIcon
                    className="group pointer-events-none absolute right-2.5 top-2.5 size-4 fill-white/60"
                    aria-hidden="true"
                  />
                </ListboxButton>
                <ListboxOptions
                  anchor="bottom"
                  transition
                  className={clsx(
                    "z-20 w-[var(--button-width)] rounded-xl border border-white/5 bg-slate-700/30 p-1 [--anchor-gap:var(--spacing-1)] focus:outline-none",
                    "transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0",
                  )}
                >
                  {years.map((year) => (
                    <ListboxOption
                      key={year.name}
                      value={year}
                      className="group flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-1.5 data-[focus]:bg-white/10"
                    >
                      <CheckIcon className="invisible size-4 fill-white group-data-[selected]:visible" />
                      <div className="text-sm/6 text-white">{year.name}</div>
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </Listbox>
            </div>

            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 hover:bg-white/30"
              onClick={() => {
                if (
                  selectedYear.name === "2024" ||
                  selectedYear.name === "ALL"
                ) {
                  return;
                } else {
                  const prevYear = Number(selectedYear.name) + 1;
                  const prevYearString = String(prevYear);
                  setSelectedYear(
                    years.find((y) => {
                      return y.name === prevYearString;
                    }) ?? { id: 1, name: "2024" },
                  );
                }
              }}
            >
              <ChevronRightIcon
                className="pointer-events-none right-2.5 top-2.5 size-4 fill-white/60"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
