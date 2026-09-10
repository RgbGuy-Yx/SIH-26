import React from 'react';
import { formatDuration } from '../../utils/dateTimeUtils';

const DAYS_OF_WEEK = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

/**
 * Memoized TrainCard Component
 * Isolates per-card renders to prevent re-rendering 40+ cards when search filters or inputs change.
 */
export const TrainCard = React.memo(function TrainCard({
  item,
  originCode,
  originName,
  destCode,
  destName,
  onSelectTrain,
}) {
  const tr = item?.train || {};
  const fromData = item?.from || {};
  const toData = item?.to || {};
  const durationFormatted = formatDuration(item?.duration);
  const distanceKm = item?.distance ? `${item.distance} km` : '--';
  const haltsCount = item?.totalHaltsBetween !== undefined ? item.totalHaltsBetween : (item?.totalHalts || '--');
  const runDays = Array.isArray(tr.runDays)
    ? tr.runDays.map((d) => String(d).toLowerCase())
    : [];

  return (
    <div
      onClick={() => onSelectTrain(tr.number)}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-[#0284C7]/50 hover:shadow-md transition-all p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer group"
      title="Click to view live running status & timetable"
    >
      {/* Left: Train Number Badge + Name + Runs on */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-[280px]">
        <div className="px-3 py-2 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-900 font-mono text-sm font-extrabold shrink-0 group-hover:bg-[#0284C7]/10 group-hover:text-[#0284C7] transition-colors">
          {tr.number}
        </div>

        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight group-hover:text-[#0284C7] transition-colors">
            {tr.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-sans">
            <span className="font-medium text-slate-600">{tr.type || 'Superfast'}</span>
            <span>•</span>
            <span className="text-[11px] text-slate-400">Runs on:</span>
            <div className="flex items-center gap-1">
              {DAYS_OF_WEEK.map((d) => {
                const isRunning = runDays.includes(d.key);
                return (
                  <span
                    key={d.key}
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isRunning
                      ? 'bg-[#0284C7]/15 text-[#0284C7] font-bold'
                      : 'text-slate-300'
                      }`}
                  >
                    {d.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Center: Journey Corridor & Timings */}
      <div className="flex items-center justify-between sm:justify-center gap-4 sm:gap-6 flex-1 py-1 lg:py-0">
        <div className="text-left">
          <span className="font-mono text-base sm:text-lg font-extrabold text-slate-900 block leading-none">
            {fromData.departure || '--'}
          </span>
          <span className="font-mono text-xs font-bold text-slate-700 block mt-1">
            {fromData.code || originCode}
          </span>
          <span className="text-[11px] text-slate-400 block truncate max-w-[110px]">
            {fromData.name || fromData.city || originName}
          </span>
        </div>

        <div className="flex flex-col items-center px-2 min-w-[100px] sm:min-w-[140px]">
          <div className="w-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <div className="flex-1 border-t border-slate-300" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          </div>
          <span className="text-[11px] font-mono text-slate-500 mt-1 whitespace-nowrap">
            {durationFormatted}
          </span>
        </div>

        <div className="text-right">
          <span className="font-mono text-base sm:text-lg font-extrabold text-slate-900 block leading-none">
            {toData.arrival || '--'}
          </span>
          <span className="font-mono text-xs font-bold text-[#0284C7] block mt-1">
            {toData.code || destCode}
          </span>
          <span className="text-[11px] text-slate-400 block truncate max-w-[110px]">
            {toData.name || toData.city || destName}
          </span>
        </div>
      </div>

      {/* Right: Distance & Halts + Action Button */}
      <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
        <div className="text-left lg:text-right">
          <span className="font-mono text-xs font-bold text-slate-800 block">
            {distanceKm}
          </span>
          <span className="text-[11px] text-slate-400 block font-mono">
            {haltsCount} halts
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTrain(tr.number);
          }}
          className="px-4 py-2 rounded-xl border border-slate-200 hover:border-[#0284C7] bg-white hover:bg-slate-50 text-slate-800 hover:text-[#0284C7] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <span>View Details</span>
          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
});

export default TrainCard;
