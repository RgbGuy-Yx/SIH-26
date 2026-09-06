import React from 'react';

/**
 * Tab 2: Virtual Corridor Simulation (Clean, Industrial OCC Digital Twin Layout)
 */
export function VirtualSimulationView({
  isExpanded = false,
  showVirtualSim,
  onToggleVirtualSim,
  lastSyncTime,
  hasActiveConflict,
  conflictDelay = 0,
  currentStn,
  getStationLabel = (s) => s || '—',
  accumulatedDelay = 0,
  finalDelay = 0,
  scheduledEtaFormatted = '—',
  predictedEtaFormatted = '—',
  originStn = '—',
  destStn = '—',
  progressPercent = 0,
  nextUpcomingStations = [],
  formatIsoOrTime = (t) => t || '—',
  operationalReasoning = '',
}) {
  const isDelayed = finalDelay > 0;
  const isSeverelyDelayed = finalDelay > 15;

  return (
    <div className={`space-y-3 ${isExpanded ? 'grid grid-cols-2 gap-3.5 space-y-0' : ''}`}>
      {/* Column 1: Conflict Alerts, Primary Metric Strip, Corridor Progress */}
      <div className="space-y-3">
        {/* NetworkX Conflict Advisory (Rendered only on active contention) */}
        {hasActiveConflict && (
          <div className="p-2.5 rounded-lg bg-red-50/90 border-l-4 border-red-500 border-y border-r border-red-200 text-red-900 text-[11px] space-y-0.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-red-800">
              <span className="material-symbols-outlined text-[15px] text-red-600">warning</span>
              <span>NetworkX Interlocking Conflict Detected</span>
            </div>
            <p className="text-[10px] text-red-700 leading-snug">
              Loop line precedence hold active at {getStationLabel(currentStn)} (+{conflictDelay || 8}m buffer) for passing express movement.
            </p>
          </div>
        )}

        {/* Primary Simulation Metrics Strip (4-Col Clean Grid) */}
        <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <div className="p-1">
            <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Current Lag</span>
            <span
              className={`font-mono text-[11px] font-bold block ${
                accumulatedDelay > 0 ? 'text-amber-600' : 'text-slate-900'
              }`}
            >
              {accumulatedDelay > 0 ? `+${accumulatedDelay}m` : '0m'}
            </span>
          </div>

          <div className="p-1 border-l border-slate-200">
            <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Final Delay</span>
            <span
              className={`font-mono text-[11px] font-bold block ${
                isSeverelyDelayed
                  ? 'text-red-600'
                  : isDelayed
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {isDelayed ? `+${finalDelay}m` : '0m'}
            </span>
          </div>

          <div className="p-1 border-l border-slate-200">
            <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Dest ETA</span>
            <span className="font-mono text-[11px] font-bold text-[#00A3C4] block truncate">
              {predictedEtaFormatted}
            </span>
          </div>

          <div className="p-1 border-l border-slate-200">
            <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Scheduled</span>
            <span className="font-mono text-[11px] font-bold text-slate-500 block truncate">
              {scheduledEtaFormatted}
            </span>
          </div>
        </div>

        {/* Corridor Progress & Section Occupancy */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-slate-500 uppercase tracking-wider">Corridor Progress</span>
            <span className="font-mono font-bold text-slate-900">{progressPercent}% Completed</span>
          </div>

          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
            <div
              className="h-full bg-gradient-to-r from-[#00A3C4] to-indigo-600 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
            <span className="truncate max-w-[150px]">{getStationLabel(originStn)}</span>
            <span className="truncate max-w-[150px] text-right">{getStationLabel(destStn)}</span>
          </div>
        </div>

        {/* Compact Bottom Action & Layer Strip */}
        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
          <button
            type="button"
            onClick={onToggleVirtualSim}
            className={`px-2 py-1 rounded border font-semibold flex items-center gap-1 transition-all ${
              showVirtualSim
                ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
            }`}
            title={showVirtualSim ? 'Hide simulation trains from map' : 'Show simulation trains on map'}
          >
            <span className="material-symbols-outlined text-[13px]">
              {showVirtualSim ? 'visibility' : 'visibility_off'}
            </span>
            <span>{showVirtualSim ? 'Sim Layer: ON' : 'Sim Layer: OFF'}</span>
          </button>

          <span className="font-mono text-slate-400">
            Sim Clock: {lastSyncTime}
          </span>
        </div>
      </div>

      {/* Column 2: Next Upcoming Corridor Halts & AI Dispatch Strategy */}
      <div className="space-y-3">
        {/* Next Upcoming Corridor Stations */}
        {nextUpcomingStations.length > 0 && (
          <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Upcoming Corridor Halts</span>
              <span className="font-mono text-slate-400 text-[9px]">Downstream Sequence</span>
            </div>

            <div className="divide-y divide-slate-100">
              {nextUpcomingStations.map((stn, idx) => (
                <div
                  key={stn.station_code || idx}
                  className="flex items-center justify-between py-1.5 text-[11px]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`font-mono text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      idx === 0 ? 'bg-cyan-100 text-[#008ba8]' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {idx === 0 ? 'NEXT' : `+${idx + 1}`}
                    </span>
                    <span className="font-bold text-slate-800 truncate max-w-[170px]">
                      {stn.station_name || getStationLabel(stn.station_code)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-right shrink-0">
                    <span className="font-bold text-slate-900">
                      {formatIsoOrTime(stn.predicted_eta || stn.scheduled_arrival)}
                    </span>
                    {stn.platform && (
                      <span className="text-[9px] text-slate-400 px-1 py-0.2 bg-slate-50 rounded">
                        {stn.platform}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dispatch Advisory Reasoning */}
        <div className="p-3 rounded-xl bg-slate-900 text-white space-y-1.5 shadow-xs border border-slate-800">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              Dispatch Engine Strategy
            </span>
            <span className="font-mono text-[9px] text-slate-400">NETWORK-X</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans pt-0.5">
            {operationalReasoning}
          </p>
        </div>
      </div>
    </div>
  );
}
