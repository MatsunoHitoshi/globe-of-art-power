"use client";

import type { TimelineSpeedId } from "@/app/_utils/lab-timeline";
import { TIMELINE_SPEEDS } from "@/app/_utils/lab-timeline";

type Props = {
  years: number[];
  progress: number;
  playing: boolean;
  loop: boolean;
  speedId: TimelineSpeedId;
  loading: boolean;
  loadedCount: number;
  totalYears: number;
  displayYear: number;
  onProgressChange: (progress: number) => void;
  onTogglePlay: () => void;
  onLoopChange: (loop: boolean) => void;
  onSpeedChange: (speed: TimelineSpeedId) => void;
  onStep: (delta: number) => void;
};

export const LabTimelineControls = ({
  years,
  progress,
  playing,
  loop,
  speedId,
  loading,
  loadedCount,
  totalYears,
  displayYear,
  onProgressChange,
  onTogglePlay,
  onLoopChange,
  onSpeedChange,
  onStep,
}: Props) => {
  const max = Math.max(0, years.length - 1);
  const disabled = years.length < 2 || loading;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md"
      role="region"
      aria-label="時系列コントロール"
    >
      <div className="mx-auto max-w-6xl space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-white/45">
              時系列
            </div>
            <div className="font-mono text-2xl font-semibold tabular-nums leading-none text-sky-200 sm:text-3xl">
              {Number.isFinite(displayYear)
                ? String(Math.round(displayYear))
                : "—"}
            </div>
          </div>

          {loading ? (
            <div className="text-right text-[11px] text-white/50">
              データ読込 {loadedCount}/{totalYears}
              <div className="mt-1 h-1 w-28 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-sky-400/80 transition-[width]"
                  style={{
                    width: `${Math.round((loadedCount / Math.max(totalYears, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-right text-[11px] text-white/50">
              {years.length > 0 ? (
                <>
                  {years[0]}–{years[years.length - 1]}
                  <span className="text-white/35"> · {years.length}年分</span>
                </>
              ) : (
                "この地点の出現年なし"
              )}
            </div>
          )}
        </div>

        <div className="relative flex h-10 items-center">
          <input
            type="range"
            aria-label="年をスクラブ"
            min={0}
            max={max || 1}
            step={0.01}
            disabled={disabled}
            value={Math.min(progress, max)}
            onChange={(e) => onProgressChange(Number(e.target.value))}
            className="lab-range h-2 w-full cursor-pointer appearance-none bg-transparent disabled:opacity-40 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/15 [&::-webkit-slider-thumb]:-mt-2.5 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-300 [&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/15 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-sky-300 [&::-moz-range-thumb]:bg-sky-500"
          />
        </div>
        <div className="pointer-events-none mt-0.5 flex justify-between px-0.5 text-[10px] text-white/40">
          {years.length <= 6
            ? years.map((y) => <span key={y}>{y}</span>)
            : [years[0], years[Math.floor(years.length / 2)], years[years.length - 1]].map(
                (y, i) => (
                  <span key={`${y}-${i}`}>{y}</span>
                ),
              )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="1年戻る"
            disabled={disabled}
            onClick={() => onStep(-1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg disabled:opacity-40"
          >
            ‹
          </button>

          <button
            type="button"
            aria-label={playing ? "一時停止" : "再生"}
            disabled={disabled}
            onClick={onTogglePlay}
            className="flex h-12 min-w-[7.5rem] flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 text-sm font-semibold text-slate-950 disabled:opacity-40"
          >
            <span aria-hidden="true" className="text-base">
              {playing ? "❚❚" : "▶"}
            </span>
            {playing ? "一時停止" : "再生"}
          </button>

          <button
            type="button"
            aria-label="1年進む"
            disabled={disabled}
            onClick={() => onStep(1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg disabled:opacity-40"
          >
            ›
          </button>

          <button
            type="button"
            aria-pressed={loop}
            aria-label="ループ"
            onClick={() => onLoopChange(!loop)}
            className={`flex h-11 shrink-0 items-center justify-center rounded-xl px-3 text-xs font-medium ${
              loop ? "bg-pink-500/80 text-white" : "bg-white/10 text-white/70"
            }`}
          >
            ループ
          </button>
        </div>

        <div
          className="flex gap-1 rounded-xl bg-white/5 p-1"
          role="group"
          aria-label="再生速度"
        >
          {TIMELINE_SPEEDS.map((speed) => (
            <button
              key={speed.id}
              type="button"
              onClick={() => onSpeedChange(speed.id)}
              className={`h-9 flex-1 rounded-lg text-xs font-medium ${
                speedId === speed.id
                  ? "bg-white/15 text-white"
                  : "text-white/55"
              }`}
            >
              {speed.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
