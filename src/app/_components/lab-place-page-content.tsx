"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TOPIC_DEFS, type TopicId } from "@/app/const/topic-defs";
import { powerData } from "@/app/_utils/globe-data-organizer";
import {
  analyzeYearBlurbs,
  LAB_YEAR_END,
  LAB_YEAR_START,
  LAB_YEARS,
  type AnalysisBundle,
} from "@/app/_utils/blurb-analysis";
import {
  buildConcentricMapModel,
  buildPlaceNodes,
  findPlaceNode,
  placeHref,
} from "@/app/_utils/conceptual-distance";
import {
  isLabMode,
  LAB_MODE_DISTANCE_HELP,
  LAB_MODE_OPTIONS,
  type LabMode,
} from "@/app/_utils/lab-modes";
import { LabConcentricMap } from "./lab-concentric-map";

type Props = {
  placeId: string;
  initialYear: number;
  initialMode: string;
  initialTopic?: string;
};

export const LabPlacePageContent = ({
  placeId,
  initialYear,
  initialMode,
  initialTopic,
}: Props) => {
  const [year, setYear] = useState(
    Math.min(LAB_YEAR_END, Math.max(LAB_YEAR_START, initialYear)),
  );
  const [mode, setMode] = useState<LabMode>(
    isLabMode(initialMode) ? initialMode : "activity",
  );
  const [topic, setTopic] = useState<TopicId>(
    TOPIC_DEFS.some((t) => t.id === initialTopic)
      ? (initialTopic as TopicId)
      : "biennial",
  );
  const [bundle, setBundle] = useState<AnalysisBundle | null>(null);

  useEffect(() => {
    const data = powerData(String(year));
    if (!data) return;
    setBundle(analyzeYearBlurbs(data, year));
  }, [year]);

  useEffect(() => {
    const params = new URLSearchParams({
      year: String(year),
      mode,
    });
    if (mode === "topic") params.set("topic", topic);
    window.history.replaceState(
      null,
      "",
      `/lab/place/${encodeURIComponent(placeId)}?${params.toString()}`,
    );
  }, [year, mode, topic, placeId]);

  const nodes = useMemo(
    () => (bundle ? buildPlaceNodes(bundle) : []),
    [bundle],
  );
  const origin = useMemo(
    () => (bundle ? findPlaceNode(nodes, placeId) : undefined),
    [bundle, nodes, placeId],
  );
  const model = useMemo(() => {
    if (!bundle) return null;
    return buildConcentricMapModel(bundle, placeId, mode);
  }, [bundle, placeId, mode]);

  const linkedPeople = useMemo(() => {
    if (!bundle || !origin) return [];
    const idSet = new Set(origin.personIds);
    return bundle.people
      .filter((person) => idSet.has(person.id))
      .sort((a, b) => a.rank - b.rank);
  }, [bundle, origin]);

  const nearest = model?.neighbors.slice(0, 8) ?? [];
  const farthest = model
    ? [...model.neighbors].reverse().slice(0, 5)
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <Link
            href={`/lab`}
            className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
          >
            ← Lab
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold tracking-wide">
              {origin?.label ?? placeId}
            </div>
            <div className="text-[11px] text-white/55">
              概念距離マップ · 角度=地理方位 / 半径=概念近さ（陸地もワープ）
            </div>
          </div>

          <select
            aria-label="Year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded bg-white/10 px-2 py-1 text-xs outline-none"
          >
            {LAB_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {LAB_MODE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={`rounded px-2 py-1 text-xs ${
                mode === option.id
                  ? "bg-sky-500/80"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {option.label}
            </button>
          ))}

          {mode === "topic" && (
            <select
              aria-label="Topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value as TopicId)}
              className="rounded bg-white/10 px-2 py-1 text-xs outline-none"
            >
              {TOPIC_DEFS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="space-y-3">
          <p className="text-sm leading-relaxed text-white/70">
            {LAB_MODE_DISTANCE_HELP[mode]}
          </p>

          {!bundle && (
            <div className="rounded-xl border border-white/10 p-8 text-sm text-white/50">
              Loading…
            </div>
          )}

          {bundle && !model && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
              この年のデータに地点「{placeId}」が見つかりませんでした。別の年を試すか、
              <Link href="/lab" className="underline">
                Lab
              </Link>
              の言及リストから選んでください。
            </div>
          )}

          {model && (
            <LabConcentricMap
              model={model}
              year={year}
              mode={mode}
              topic={mode === "topic" ? topic : undefined}
            />
          )}
        </section>

        <aside className="space-y-4">
          <Panel title="Origin">
            {origin ? (
              <div className="space-y-1 text-sm">
                <div className="font-semibold">{origin.label}</div>
                <div className="text-white/55">
                  {origin.kind} · linked people {origin.personIds.length}
                </div>
                <div className="text-white/45">
                  {origin.lat.toFixed(2)}, {origin.lng.toFixed(2)}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/50">Unknown place</p>
            )}
          </Panel>

          <Panel title="Conceptually nearest">
            <ul className="space-y-1.5 text-sm">
              {nearest.map((n) => (
                <li key={n.place.id} className="flex justify-between gap-2">
                  <Link
                    href={placeHref(n.place.id, {
                      year,
                      mode,
                      topic: mode === "topic" ? topic : undefined,
                    })}
                    className="truncate text-sky-300 hover:underline"
                  >
                    {n.place.label}
                  </Link>
                  <span className="shrink-0 text-white/45">
                    d={n.conceptualDistance.toFixed(2)}
                  </span>
                </li>
              ))}
              {nearest.length === 0 && (
                <li className="text-white/45">No neighbors</li>
              )}
            </ul>
          </Panel>

          <Panel title="Conceptually farthest">
            <ul className="space-y-1.5 text-sm">
              {farthest.map((n) => (
                <li key={n.place.id} className="flex justify-between gap-2">
                  <Link
                    href={placeHref(n.place.id, {
                      year,
                      mode,
                      topic: mode === "topic" ? topic : undefined,
                    })}
                    className="truncate text-white/80 hover:underline"
                  >
                    {n.place.label}
                  </Link>
                  <span className="shrink-0 text-white/45">
                    d={n.conceptualDistance.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={`Linked people (${linkedPeople.length})`}>
            <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {linkedPeople.slice(0, 30).map((person) => (
                <li key={person.id} className="border-b border-white/5 pb-2">
                  <div className="font-medium">
                    #{person.rank} {person.name}
                  </div>
                  <div className="text-xs text-white/45">
                    {person.countryName ?? "Unknown"} · {person.category}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Switch origin">
            <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
              {nodes
                .slice()
                .sort((a, b) => b.personIds.length - a.personIds.length)
                .slice(0, 24)
                .map((node) => (
                  <li key={node.id}>
                    <Link
                      href={placeHref(node.id, {
                        year,
                        mode,
                        topic: mode === "topic" ? topic : undefined,
                      })}
                      className={`hover:underline ${
                        node.id === placeId ? "text-pink-300" : "text-white/75"
                      }`}
                    >
                      {node.label}
                      <span className="text-white/40">
                        {" "}
                        ({node.personIds.length})
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </Panel>
        </aside>
      </main>
    </div>
  );
};

const Panel = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">
      {title}
    </h2>
    {children}
  </section>
);
