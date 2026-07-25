"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { GlobeMethods } from "react-globe.gl";
import { useWindowSize } from "@/app/_hooks/use-window-size";
import { TOPIC_DEFS, type TopicId } from "@/app/const/topic-defs";
import { powerData } from "@/app/_utils/globe-data-organizer";
import {
  analyzeYearBlurbs,
  LAB_YEAR_END,
  LAB_YEAR_START,
  LAB_YEARS,
  type AnalysisBundle,
  type AnalyzedPerson,
} from "@/app/_utils/blurb-analysis";

const Globe = dynamic(
  () => import("react-globe.gl").then((mod) => mod.default),
  { ssr: false },
);

type LabMode = "activity" | "topic" | "social" | "similar";

const MODE_HELP: Record<LabMode, string> = {
  activity:
    "国籍座標から、解説文で言及された都市・制度へアークを伸ばします（活動圏）。",
  topic:
    "選択トピックを含む人物の言及地理をヒートマップ化します（言説×場所）。",
  social:
    "同年リスト内の人物名が解説文に出てきた共起を、国籍間アークで示します。",
  similar:
    "解説文トークンの Jaccard 類似度が高いペア（上位40）を緑アークで示します。",
};

export const LabPageContent = () => {
  const globeEl = useRef<GlobeMethods>();
  const [innerWidth, innerHeight] = useWindowSize();
  const [year, setYear] = useState<number>(LAB_YEAR_END);
  const [mode, setMode] = useState<LabMode>("activity");
  const [topic, setTopic] = useState<TopicId>("biennial");
  const [bundle, setBundle] = useState<AnalysisBundle | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<AnalyzedPerson | null>(
    null,
  );
  const [selectedEdge, setSelectedEdge] = useState<{
    from: string;
    to: string;
    detail: string;
  } | null>(null);

  useEffect(() => {
    if (year < LAB_YEAR_START || year > LAB_YEAR_END) return;
    const data = powerData(String(year));
    if (!data) return;
    const next = analyzeYearBlurbs(data, year);
    setBundle(next);
    setSelectedPerson(null);
    setSelectedEdge(null);
  }, [year]);

  useLayoutEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({ lat: 20, lng: 10, altitude: 1.85 }, 0);
    }
  }, []);

  const peoplePoints = useMemo(() => {
    if (!bundle) return [];
    return bundle.people
      .filter((p) => p.homeLat != null && p.homeLng != null)
      .map((p) => ({
        ...p,
        lat: p.homeLat!,
        lng: p.homeLng!,
        size: Math.max(0.15, (101 - p.rank) / 120),
      }));
  }, [bundle]);

  const arcsData = useMemo(() => {
    if (!bundle) return [];
    if (mode === "activity") return bundle.activityArcs;
    if (mode === "social") return bundle.socialArcs;
    if (mode === "similar") return bundle.similarArcs;
    return [];
  }, [bundle, mode]);

  const heatData = useMemo(() => {
    if (!bundle || mode !== "topic") return [];
    return bundle.topicHeatByTopic[topic] ?? [];
  }, [bundle, mode, topic]);

  const onArcClick = (arc: Record<string, unknown>) => {
    if (!bundle) return;
    if (mode === "activity") {
      const person = bundle.people.find((p) => p.name === arc.personName);
      setSelectedPerson(person ?? null);
      setSelectedEdge(
        person
          ? {
              from: String(arc.personName),
              to: String(arc.placeLabel),
              detail: "国籍 → 言及地",
            }
          : null,
      );
      return;
    }
    if (mode === "social" || mode === "similar") {
      const from = String(arc.fromName);
      const to = String(arc.toName);
      setSelectedEdge({
        from,
        to,
        detail:
          mode === "social"
            ? `共起 weight=${String(arc.weight)}`
            : `Jaccard=${Number(arc.score).toFixed(3)}`,
      });
      setSelectedPerson(bundle.people.find((p) => p.name === from) ?? null);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white">
      <header className="absolute left-0 right-0 top-0 z-20 flex flex-wrap items-center gap-3 bg-slate-950/70 px-4 py-3 backdrop-blur-md">
        <Link
          href="/"
          className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
        >
          ← Main
        </Link>
        <div>
          <div className="text-sm font-semibold tracking-wide">
            Blurb Analysis Lab
          </div>
          <div className="text-[11px] text-white/60">
            {LAB_YEAR_START}–{LAB_YEAR_END}{" "}
            解説文の試験ビュー（非公開検証用）
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
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

          {(
            [
              ["activity", "Activity arcs"],
              ["topic", "Topic heat"],
              ["social", "Social links"],
              ["similar", "Similar blurbs"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`rounded px-2 py-1 text-xs ${
                mode === id
                  ? "bg-sky-500/80 text-white"
                  : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {label}
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

      <aside className="absolute bottom-3 left-3 z-20 max-h-[55vh] w-[min(92vw,22rem)] overflow-y-auto rounded-xl bg-slate-900/75 p-3 text-xs backdrop-blur-md md:top-20 md:max-h-[calc(100vh-6rem)]">
        <p className="mb-3 leading-relaxed text-white/75">{MODE_HELP[mode]}</p>

        {bundle && (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <Stat label="People" value={String(bundle.people.length)} />
              <Stat
                label="With home"
                value={String(
                  bundle.people.filter((p) => p.homeLat != null).length,
                )}
              />
              <Stat
                label="Activity arcs"
                value={String(bundle.activityArcs.length)}
              />
              <Stat
                label="Social edges"
                value={String(bundle.socialEdges.length)}
              />
            </div>

            <Section title="Top mentioned places">
              <ul className="space-y-1">
                {bundle.placeMentionCounts.slice(0, 8).map((p) => (
                  <li key={p.label} className="flex justify-between gap-2">
                    <span className="truncate text-white/85">{p.label}</span>
                    <span className="text-white/50">{p.count}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Topic coverage">
              <ul className="space-y-1">
                {bundle.topicCounts.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2">
                    <button
                      type="button"
                      className={`truncate text-left hover:underline ${
                        topic === t.id && mode === "topic"
                          ? "text-sky-300"
                          : "text-white/85"
                      }`}
                      onClick={() => {
                        setMode("topic");
                        setTopic(t.id);
                      }}
                    >
                      {t.label}
                    </button>
                    <span className="text-white/50">{t.count}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {mode === "social" && (
              <Section title="Top co-mentions">
                <ul className="space-y-1">
                  {bundle.socialEdges.slice(0, 10).map((e) => (
                    <li key={`${e.from}-${e.to}`}>
                      <button
                        type="button"
                        className="w-full text-left text-white/85 hover:text-sky-300"
                        onClick={() => {
                          setSelectedEdge({
                            from: e.from,
                            to: e.to,
                            detail: `共起 weight=${e.weight}`,
                          });
                          setSelectedPerson(
                            bundle.people.find((p) => p.name === e.from) ??
                              null,
                          );
                        }}
                      >
                        <span className="line-clamp-2">
                          {e.from} ↔ {e.to}
                          <span className="text-white/45"> ({e.weight})</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {mode === "similar" && (
              <Section title="Top similar pairs">
                <ul className="space-y-1">
                  {bundle.similarArcs.slice(0, 10).map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className="w-full text-left text-white/85 hover:text-emerald-300"
                        onClick={() => {
                          setSelectedEdge({
                            from: e.fromName,
                            to: e.toName,
                            detail: `Jaccard=${e.score.toFixed(3)}`,
                          });
                          setSelectedPerson(
                            bundle.people.find((p) => p.name === e.fromName) ??
                              null,
                          );
                        }}
                      >
                        <span className="line-clamp-2">
                          {e.fromName} ↔ {e.toName}
                          <span className="text-white/45">
                            {" "}
                            ({e.score.toFixed(3)})
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {(selectedPerson ?? selectedEdge) && (
              <Section title="Selection">
                {selectedEdge && (
                  <p className="mb-2 text-white/80">
                    {selectedEdge.from} → {selectedEdge.to}
                    <br />
                    <span className="text-white/50">{selectedEdge.detail}</span>
                  </p>
                )}
                {selectedPerson && (
                  <div className="space-y-1">
                    <div className="font-semibold text-white">
                      #{selectedPerson.rank} {selectedPerson.name}
                    </div>
                    <div className="text-white/55">
                      {selectedPerson.countryName ?? "Unknown"} ·{" "}
                      {selectedPerson.category}
                    </div>
                    {selectedPerson.excerpt && (
                      <p className="italic text-white/70">
                        {selectedPerson.excerpt}
                      </p>
                    )}
                    <p className="text-white/55">
                      Places:{" "}
                      {selectedPerson.places.length > 0
                        ? selectedPerson.places.map((p) => p.label).join(", ")
                        : "—"}
                    </p>
                    <p className="text-white/55">
                      Topics:{" "}
                      {selectedPerson.topics.length > 0
                        ? selectedPerson.topics
                            .map(
                              (id) =>
                                TOPIC_DEFS.find((t) => t.id === id)?.label ??
                                id,
                            )
                            .join(", ")
                        : "—"}
                    </p>
                    <p className="line-clamp-6 leading-relaxed text-white/65">
                      {selectedPerson.content.slice(0, 420)}
                      {selectedPerson.content.length > 420 ? "…" : ""}
                    </p>
                  </div>
                )}
              </Section>
            )}
          </>
        )}
      </aside>

      <Globe
        ref={globeEl}
        width={innerWidth}
        height={innerHeight}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        showGraticules
        pointsData={peoplePoints}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.01}
        pointRadius="size"
        pointColor={() => "rgba(148, 163, 184, 0.85)"}
        onPointClick={(p) => {
          setSelectedPerson(p as AnalyzedPerson);
          setSelectedEdge(null);
        }}
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={(d: object) =>
          (d as { color?: string }).color ?? "#7dd3fc"
        }
        arcAltitude={(d: object) => {
          const startLat = Number((d as { startLat?: number }).startLat ?? 0);
          const endLat = Number((d as { endLat?: number }).endLat ?? 0);
          const span = Math.abs(startLat - endLat);
          return Math.min(0.35, 0.08 + span / 180);
        }}
        arcStroke={(d: object) => {
          if (mode === "social") {
            return Math.min(
              1.8,
              0.4 + ((d as { weight?: number }).weight ?? 1) * 0.35,
            );
          }
          if (mode === "similar") {
            return Math.min(
              1.6,
              0.3 + ((d as { score?: number }).score ?? 0) * 4,
            );
          }
          return 0.45;
        }}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={4000}
        onArcClick={(arc) => onArcClick(arc as Record<string, unknown>)}
        heatmapsData={mode === "topic" ? [heatData] : []}
        heatmapPointLat="lat"
        heatmapPointLng="lng"
        heatmapPointWeight="pos"
        heatmapBandwidth={3.2}
        heatmapTopAltitude={0.22}
        heatmapColorSaturation={1.2}
        heatmapsTransitionDuration={400}
      />
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-white/5 px-2 py-1.5">
    <div className="text-[10px] uppercase tracking-wide text-white/45">
      {label}
    </div>
    <div className="text-sm font-semibold">{value}</div>
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="mb-3 border-t border-white/10 pt-3">
    <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/50">
      {title}
    </h2>
    {children}
  </section>
);
