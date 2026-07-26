"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TOPIC_DEFS, type TopicId } from "@/app/const/topic-defs";
import {
  LAB_YEAR_END,
  LAB_YEAR_START,
} from "@/app/_utils/blurb-analysis";
import {
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
import {
  resolveTimelineFrame,
  TIMELINE_SPEEDS,
  type TimelineSpeedId,
} from "@/app/_utils/lab-timeline";
import { useLabPlaceTimelineData } from "@/app/_hooks/use-lab-place-timeline-data";
import { LabConcentricMap } from "./lab-concentric-map";
import { LabTimelineControls } from "./lab-timeline-controls";

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
  const [mode, setMode] = useState<LabMode>(
    isLabMode(initialMode) ? initialMode : "activity",
  );
  const [topic, setTopic] = useState<TopicId>(
    TOPIC_DEFS.some((t) => t.id === initialTopic)
      ? (initialTopic as TopicId)
      : "biennial",
  );

  const { frames, availableYears, bundles, loading, loadedCount, totalYears } =
    useLabPlaceTimelineData(placeId, mode);

  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [speedId, setSpeedId] = useState<TimelineSpeedId>("normal");
  const syncedInitial = useRef(false);

  useEffect(() => {
    syncedInitial.current = false;
  }, [placeId]);

  // 初回は initialYear が揃ってからスナップ。以降はフレーム数変化に合わせて範囲内へ
  useEffect(() => {
    if (frames.length === 0) return;
    if (!syncedInitial.current) {
      const target = Math.min(
        LAB_YEAR_END,
        Math.max(LAB_YEAR_START, initialYear),
      );
      const idx = frames.findIndex((f) => f.year === target);
      if (idx >= 0) {
        setProgress(idx);
        syncedInitial.current = true;
      } else if (!loading) {
        setProgress(frames.length - 1);
        syncedInitial.current = true;
      }
      return;
    }
    setProgress((prev) => Math.min(prev, frames.length - 1));
  }, [frames, initialYear, loading]);

  const resolved = useMemo(
    () => resolveTimelineFrame(frames, progress),
    [frames, progress],
  );

  const stableMaxGeoKm = useMemo(() => {
    let maxKm = 2500;
    for (const frame of frames) {
      for (const n of frame.model.neighbors) {
        if (Number.isFinite(n.geoDistanceKm) && n.geoDistanceKm > maxKm) {
          maxKm = n.geoDistanceKm;
        }
      }
    }
    return maxKm;
  }, [frames]);

  const year = resolved?.discreteYear ?? initialYear;
  const bundle = bundles.get(year) ?? null;

  const secondsPerYear =
    TIMELINE_SPEEDS.find((s) => s.id === speedId)?.secondsPerYear ?? 1.2;

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    let raf = 0;
    let last = performance.now();
    let stopAtEnd = false;

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const delta = dt / secondsPerYear;
      setProgress((prev) => {
        const max = frames.length - 1;
        const next = prev + delta;
        if (next >= max) {
          if (loop) return next - max;
          stopAtEnd = true;
          return max;
        }
        return next;
      });
      if (stopAtEnd) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, frames.length, secondsPerYear, loop]);

  useEffect(() => {
    if (!resolved) return;
    const params = new URLSearchParams({
      year: String(resolved.discreteYear),
      mode,
    });
    if (mode === "topic") params.set("topic", topic);
    const href = `/lab/place/${encodeURIComponent(placeId)}?${params.toString()}`;
    // スクラブ中の replaceState 連打を避ける
    const handle = window.setTimeout(() => {
      window.history.replaceState(null, "", href);
    }, resolved.transitioning || playing ? 120 : 0);
    return () => window.clearTimeout(handle);
  }, [resolved, mode, topic, placeId, playing]);

  const nodes = useMemo(
    () => (bundle ? buildPlaceNodes(bundle) : []),
    [bundle],
  );
  const origin = useMemo(
    () => (bundle ? findPlaceNode(nodes, placeId) : undefined),
    [bundle, nodes, placeId],
  );

  const linkedPeople = useMemo(() => {
    if (!bundle || !origin) return [];
    const idSet = new Set(origin.personIds);
    return bundle.people
      .filter((person) => idSet.has(person.id))
      .sort((a, b) => a.rank - b.rank);
  }, [bundle, origin]);

  const nearest = resolved?.model.neighbors.slice(0, 8) ?? [];
  const farthest = resolved
    ? [...resolved.model.neighbors].reverse().slice(0, 5)
    : [];

  const stepYear = (delta: number) => {
    setPlaying(false);
    setProgress((prev) => {
      const next = Math.round(prev) + delta;
      return Math.min(frames.length - 1, Math.max(0, next));
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-48 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-6xl flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <Link
              href="/lab"
              className="flex h-10 shrink-0 items-center rounded-xl bg-white/10 px-3 text-xs hover:bg-white/20"
            >
              ← Lab
            </Link>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold tracking-wide">
                {origin?.label ?? resolved?.model.origin.label ?? placeId}
              </div>
              <div className="text-[11px] text-white/55">
                概念距離の時系列 · 角度=方位 / 半径=近さ
              </div>
            </div>
          </div>

          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {LAB_MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setPlaying(false);
                  setMode(option.id);
                }}
                className={`h-10 shrink-0 rounded-xl px-3 text-xs ${
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
                className="h-10 shrink-0 rounded-xl bg-white/10 px-2 text-xs outline-none"
              >
                {TOPIC_DEFS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-3 py-4 sm:px-4 sm:py-6 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="space-y-3">
          <p className="text-sm leading-relaxed text-white/70">
            {LAB_MODE_DISTANCE_HELP[mode]}
          </p>

          {loading && frames.length === 0 && (
            <div className="rounded-xl border border-white/10 p-8 text-sm text-white/50">
              年次データを読み込み中… ({loadedCount}/{totalYears})
            </div>
          )}

          {!loading && frames.length === 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
              地点「{placeId}」は Lab 対象年に見つかりませんでした。
              <Link href="/lab" className="ml-1 underline">
                Lab
              </Link>
              の言及リストから選んでください。
            </div>
          )}

          {resolved && (
            <LabConcentricMap
              model={resolved.model}
              warpModel={resolved.warpModel}
              year={resolved.discreteYear}
              yearLabel={resolved.displayYear}
              mode={mode}
              topic={mode === "topic" ? topic : undefined}
              showEdges
              lightBackground={resolved.transitioning || playing}
              stableMaxGeoKm={stableMaxGeoKm}
              labelLimit={12}
              plotLimit={48}
            />
          )}
        </section>

        <aside className="space-y-4">
          <Panel title="Origin">
            {origin || resolved ? (
              <div className="space-y-1 text-sm">
                <div className="font-semibold">
                  {origin?.label ?? resolved?.model.origin.label}
                </div>
                <div className="text-white/55">
                  {(origin ?? resolved?.model.origin)?.kind} · linked people{" "}
                  {(origin ?? resolved?.model.origin)?.personIds.length ?? 0}
                </div>
                <div className="text-white/45">
                  出現年: {availableYears.join(", ") || "—"}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/50">Unknown place</p>
            )}
          </Panel>

          <Panel title={`Nearest · ${year}`}>
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

          <Panel title={`Farthest · ${year}`}>
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
            <ul className="max-h-64 space-y-2 overflow-y-auto text-sm sm:max-h-80">
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

      <LabTimelineControls
        years={availableYears}
        progress={progress}
        playing={playing}
        loop={loop}
        speedId={speedId}
        loading={loading}
        loadedCount={loadedCount}
        totalYears={totalYears}
        displayYear={resolved?.displayYear ?? year}
        onProgressChange={(value) => {
          setPlaying(false);
          setProgress(value);
        }}
        onTogglePlay={() => {
          if (frames.length < 2) return;
          setPlaying((p) => {
            if (!p && progress >= frames.length - 1) setProgress(0);
            return !p;
          });
        }}
        onLoopChange={setLoop}
        onSpeedChange={setSpeedId}
        onStep={stepYear}
      />
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
