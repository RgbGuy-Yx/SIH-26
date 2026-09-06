import React from 'react';

/**
 * Floating Left Sidebar: Station Timetable & Route Progression Inspector
 */
export function StationTimelineSidebar({
  isCollapsed,
  onToggleCollapse,
  trainNo,
  trainName,
  trains = [],
  onSelectTrain,
  setCustomTrainInput,
  searchQuery,
  setSearchQuery,
  filteredStations = [],
  totalStops = 0,
  currentStn = '',
  activeStationCode = null,
  onSelectStation,
  wsConnected = false,
  formatHumanTime = (t) => t || '—',
}) {
  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        className="absolute top-4 left-4 z-20 px-3.5 py-2.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg flex items-center gap-2 text-xs font-bold text-slate-800 hover:bg-white transition-all hover:scale-105"
        title="Expand Station Timetable"
      >
        <span className="material-symbols-outlined text-[18px] text-[#00A3C4]">directions_railway</span>
        <span>{trainNo} • Stops</span>
        <span className="material-symbols-outlined text-[16px] text-slate-400">chevron_right</span>
      </button>
    );
  }

  return (
    <aside className="absolute top-4 left-4 bottom-4 z-20 w-[360px] sm:w-[390px] bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl flex flex-col overflow-hidden transition-all">
      {/* Pinned Top Header */}
      <div className="p-4 border-b border-slate-100 shrink-0 space-y-2.5 bg-white/70">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            ROUTE STATIONS • {totalStops} STOPS
          </span>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
            title="Collapse Station Panel"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
        </div>

        {/* Selected Train Selector */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-900 text-white shrink-0">
              {trainNo}
            </span>
            <h2 className="text-sm font-bold text-slate-900 truncate tracking-tight">{trainName}</h2>
          </div>

          <select
            value={trainNo}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (onSelectTrain) onSelectTrain(val);
              if (setCustomTrainInput) setCustomTrainInput(String(val));
            }}
            className="text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium focus:outline-none focus:border-slate-400 shrink-0 cursor-pointer"
          >
            <option value="12919">#12919 Malwa Exp</option>
            {trains.map((t) => (
              <option key={t.train_no} value={t.train_no}>
                #{t.train_no} {t.train_name ? `(${t.train_name.slice(0, 14)})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Search filter input */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">search</span>
          <input
            type="text"
            placeholder="Search station or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* Scrollable Stations Timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-3.5 space-y-2">
        {filteredStations.length === 0 ? (
          <div className="py-8 px-4 text-center text-slate-400 space-y-1">
            <span className="material-symbols-outlined text-2xl text-slate-300">location_off</span>
            <p className="text-xs font-medium text-slate-600">No stations found</p>
            <p className="text-[11px] text-slate-400">
              {searchQuery ? 'Try adjusting your search query' : 'Awaiting route telemetry...'}
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-2">
            <div className="absolute left-[7px] top-3 bottom-3 w-[1.5px] bg-slate-200 pointer-events-none" />

            {filteredStations.map((stop, idx) => {
              const isCurrent = stop.station_code === currentStn;
              const isNext = stop.status === 'NEXT_STOP';
              const isDeparted = stop.status === 'DEPARTED';
              const isSelected = activeStationCode === stop.station_code;

              return (
                <div key={stop.station_code || idx} className="relative">
                  <div
                    className={`absolute -left-6 top-3 w-3.5 h-3.5 rounded-full border-2 bg-white transition-all ${
                      isCurrent
                        ? 'border-[#00A3C4] bg-[#00A3C4] ring-3 ring-[#00A3C4]/25 scale-110'
                        : isNext
                        ? 'border-[#00A3C4] bg-white ring-2 ring-cyan-100'
                        : isDeparted
                        ? 'border-slate-400 bg-slate-200'
                        : 'border-slate-300 bg-white'
                    }`}
                  />

                  <div
                    onClick={() => onSelectStation && onSelectStation(stop.station_code)}
                    className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#00A3C4] bg-cyan-50/50 shadow-xs ring-1 ring-[#00A3C4]'
                        : isCurrent
                        ? 'border-slate-300 bg-slate-50/90 shadow-xs'
                        : 'border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                          {stop.station_code}
                        </span>
                        <span className="font-bold text-xs text-slate-900 truncate max-w-[150px]">
                          {stop.station_name}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight ${
                          isCurrent
                            ? 'bg-emerald-100 text-emerald-800'
                            : isNext
                            ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                            : isDeparted
                            ? 'bg-slate-100 text-slate-600'
                            : stop.delay_minutes > 15
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : stop.delay_minutes > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isCurrent
                          ? 'At Station'
                          : isNext
                          ? 'Next Stop'
                          : isDeparted
                          ? 'Departed'
                          : stop.delay_minutes > 0
                          ? `+${stop.delay_minutes}m`
                          : 'On Time'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1.5 text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-400 font-medium block uppercase tracking-tight">
                          Scheduled
                        </span>
                        <span className="font-mono text-slate-700 font-semibold">
                          {formatHumanTime(stop.scheduled_arrival)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-400 font-medium block uppercase tracking-tight">
                          Estimated ETA
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            stop.delay_minutes > 0 ? 'text-amber-600' : 'text-[#00A3C4]'
                          }`}
                        >
                          {formatHumanTime(stop.predicted_eta || stop.scheduled_arrival)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-medium">
                      <span>{stop.distance_km != null ? `${stop.distance_km} km` : '—'}</span>
                      <span className="font-mono text-slate-500">{stop.platform || 'PF 1'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
