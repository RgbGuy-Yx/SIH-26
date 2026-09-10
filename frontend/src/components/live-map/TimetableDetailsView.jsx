import React, { useState, useMemo } from 'react';

/**
 * TimetableDetailsView - Secondary Tab for Full Route Timetable & Specifications
 *
 * Operational Sections:
 * 1. Train Specifications & Permitted Speed Limits
 * 2. Full Route Timetable Inspector (All Scheduled Halts, ETAs, Platforms & Delays)
 */
export function TimetableDetailsView({
  trainNo,
  trainName,
  trainType = 'Express',
  originCode = '',
  originName = '',
  destCode = '',
  destName = '',
  totalDistanceKm,
  totalHalts,
  avgSpeedKmh,
  maxSpeedKmh,
  stationTimetable = [],
  currentStn = '',
  nextStn = '',
  formatHumanTime = (t) => t || '—',
  calculateExpectedTime = (t, d) => t || '—',
  totalDelay = 0,
}) {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredStops = useMemo(() => {
    if (!filterQuery.trim()) return stationTimetable;
    const q = filterQuery.toLowerCase();
    return stationTimetable.filter(
      (s) =>
        s.station_code?.toLowerCase().includes(q) ||
        s.station_name?.toLowerCase().includes(q) ||
        String(s.stop_no).includes(q)
    );
  }, [stationTimetable, filterQuery]);

  return (
    <div className="space-y-3.5 select-none animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. TRAIN SPECIFICATIONS & ROUTE SPECS                                     */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-slate-500">train</span>
            Train Profile & Speed Limits
          </span>
          <span className="font-mono text-slate-600 font-bold text-[10px] px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
            {trainType || 'Express'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-medium">Origin</span>
            <span className="font-mono font-bold text-slate-900 block truncate">
              {originCode || '—'}
            </span>
            <span className="text-[9px] text-slate-500 truncate block">{originName}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-medium">Destination</span>
            <span className="font-mono font-bold text-slate-900 block truncate">
              {destCode || '—'}
            </span>
            <span className="text-[9px] text-slate-500 truncate block">{destName}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-medium">Distance</span>
            <span className="font-mono font-bold text-slate-900 block">
              {totalDistanceKm ? `${totalDistanceKm} km` : '—'}
            </span>
            <span className="text-[9px] text-slate-500 block">Total Route</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-medium">Total Halts</span>
            <span className="font-mono font-bold text-slate-900 block">
              {totalHalts || stationTimetable.length || '—'}
            </span>
            <span className="text-[9px] text-slate-500 block">Scheduled Stops</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-medium">Average Speed</span>
            <span className="font-mono font-bold text-slate-900 block">
              {avgSpeedKmh ? `${Math.round(avgSpeedKmh)} km/h` : '75 km/h'}
            </span>
            <span className="text-[9px] text-slate-500 block">Corridor Velocity</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-medium">Speed Limit</span>
            <span className="font-mono font-bold text-slate-900 block">
              {maxSpeedKmh ? `${Math.round(maxSpeedKmh)} km/h` : '130 km/h'}
            </span>
            <span className="text-[9px] text-slate-500 block">Max Permissible</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FULL ROUTE TIMETABLE & STOPS SEQUENCE                                  */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-slate-500">schedule</span>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Route Timetable ({stationTimetable.length} Stops)
            </span>
          </div>

          {/* Quick search input */}
          <div className="relative w-36 sm:w-44">
            <input
              type="text"
              placeholder="Search station..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-6 pr-2 py-1 text-[11px] rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0284C7] focus:bg-white transition-all font-mono"
            />
            <span className="material-symbols-outlined absolute left-1.5 top-1.5 text-slate-400 text-[13px]">
              search
            </span>
          </div>
        </div>

        {/* Scrollable Timetable Stop Table */}
        <div className="border border-slate-200/90 rounded-xl overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto thin-scrollbar divide-y divide-slate-100">
            {filteredStops.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs font-medium">
                No stops match the filter criteria.
              </div>
            ) : (
              filteredStops.map((stop, sIdx) => {
                const isDeparted = stop.status === 'DEPARTED';
                const isCurrent = stop.status === 'AT_STATION' || stop.station_code === currentStn;
                const isNext = stop.status === 'NEXT_STOP' || stop.station_code === nextStn;

                return (
                  <div
                    key={stop.station_code || sIdx}
                    className={`p-2.5 flex items-center justify-between text-xs transition-colors ${
                      isCurrent
                        ? 'bg-blue-50/70 border-l-4 border-[#0284C7]'
                        : isNext
                          ? 'bg-cyan-50/50 border-l-4 border-[#00A3C4]'
                          : isDeparted
                            ? 'opacity-60 bg-slate-50/40'
                            : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Left: Station identity & Stop status */}
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                          isCurrent
                            ? 'bg-[#0284C7] text-white'
                            : isNext
                              ? 'bg-[#00A3C4] text-white'
                              : isDeparted
                                ? 'bg-slate-200 text-slate-600'
                                : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isDeparted ? '✓' : stop.stop_no || sIdx + 1}
                      </span>

                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 text-[11px]">
                            {stop.station_code}
                          </span>
                          <span className="text-slate-700 truncate font-medium text-[11px]">
                            {stop.station_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>{stop.platform || 'PF 1'}</span>
                          {stop.distance_km != null && (
                            <>
                              <span>•</span>
                              <span>{stop.distance_km} km</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Sched vs Predicted Arrival */}
                    <div className="text-right shrink-0 font-mono space-y-0.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[10px] text-slate-400">
                          {stop.scheduled_arrival
                            ? formatHumanTime(stop.scheduled_arrival)
                            : stop.scheduled_departure
                              ? formatHumanTime(stop.scheduled_departure)
                              : '—'}
                        </span>
                        <span
                          className={`font-bold text-[11px] ${
                            isCurrent
                              ? 'text-[#0284C7]'
                              : isNext
                                ? 'text-[#00A3C4]'
                                : 'text-slate-800'
                          }`}
                        >
                          {stop.predicted_eta
                            ? formatHumanTime(stop.predicted_eta)
                            : stop.scheduled_arrival
                              ? formatHumanTime(
                                  calculateExpectedTime(
                                    stop.scheduled_arrival,
                                    stop.delay_minutes || totalDelay
                                  )
                                )
                              : '—'}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-bold block ${
                          stop.delay_minutes > 0
                            ? 'text-amber-600'
                            : isDeparted
                              ? 'text-slate-400'
                              : 'text-emerald-600'
                        }`}
                      >
                        {stop.delay_minutes > 0 ? `+${stop.delay_minutes}m Delay` : 'On Time'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimetableDetailsView;
