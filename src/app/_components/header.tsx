import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import type { SelectOption } from "../types/types";

const years = [
  { id: 1, name: "2024" },
  { id: 2, name: "2023" },
  { id: 3, name: "2022" },
  { id: 4, name: "2021" },
  { id: 5, name: "2020" },
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

          <div className="w-36">
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
        </div>
      </div>
    </>
  );
};
