import React, { useState } from 'react';

/**
 * Tab 2: Virtual Corridor Simulation (Handcrafted, Modular Subsections)
 * Subsections:
 * 1. 'corridor' - Virtual Delay Metrics, Corridor Progress Bar & Interlocking Conflict Advisory
 * 2. 'strategy' - Downstream Sequence, Scheduled Halts & NetworkX AI Dispatch Logic
 */
export function VirtualSimulationView({
  isExpanded = false,
  showVirtualSim,
  onToggleVirtualSim,
  lastSyncTime,
  hasActiveConflict,
  conflictDelay = 0,
  currentStn,
  nextStn = '',
  nextStationEtaFormatted = '—',
  nextStationScheduledFormatted = '—',
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
  const [activeSubTab, setActiveSubTab] = useState('corridor'); // 'corridor' | 'strategy'

  const isDelayed = finalDelay > 0;
  const isSeverelyDelayed = finalDelay > 15;

  const subTabs = [
    { id: 'corridor', label: 'Corridor Progress', icon: 'speed' },
    { id: 'strategy', label: 'Halts & Dispatch Strategy', icon: 'alt_route' },
  ];

  return (
    <div className="space-y-3.5 select-none">
      {/* NetworkX Conflict Advisory Alert (if any active contention) */}
      {hasActiveConflict && (
        <div className="p-3 rounded-xl bg-rose-50/90 border-l-4 border-rose-500 border-y border-r border-rose-200 text-rose-900 text-xs space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold text-rose-800">
            <span className="material-symbols-outlined text-[16px] text-rose-600">warning</span>
            <span>NetworkX Interlocking Hold Active</span>
          </div>
          <p className="text-[11px] text-rose-700 leading-snug">
            Loop line precedence hold active at {getStationLabel(currentStn)} (+{conflictDelay || 8}m buffer) for passing express movement.
          </p>
        </div>
      )}

      {/* Handcrafted Subsection Switcher */}
      <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 gap-1">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${isActive
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
            >
              <span className={`material-symbols-outlined text-[15px] ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                {tab.icon}
              </span>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SUBSECTION 1: CORRIDOR PROGRESS & DELAY METRICS                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'corridor' && (
        <div className="space-y-3 animate-fadeIn">
          {/* 4 Metric Cards Grid: Lag, Projected Delay, Next Halt ETA, Destination ETA */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {/* 1. Current Lag */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Current Lag</span>
              <div className="font-mono text-sm font-extrabold text-slate-900">
                {accumulatedDelay > 0 ? `+${accumulatedDelay}m` : '0 min'}
              </div>
              <span className="text-[9px] text-slate-400 font-medium block">
                Accumulated
              </span>
            </div>

            {/* 2. Final Projected Delay */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Projected Delay</span>
              <div
                className={`font-mono text-sm font-extrabold ${isSeverelyDelayed
                    ? 'text-rose-600'
                    : isDelayed
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
              >
                {isDelayed ? `+${finalDelay}m` : 'On Time'}
              </div>
              <span className="text-[9px] text-slate-400 font-medium block">
                ML Predicted
              </span>
            </div>

            {/* 3. Next Station ETA */}
            <div className="p-2.5 rounded-xl bg-white border border-indigo-200/80 shadow-2xs space-y-0.5 ring-1 ring-indigo-50">
              <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider block truncate">
                Next Halt ({nextStn || 'Next'})
              </span>
              <div className="font-mono text-sm font-extrabold text-indigo-600 truncate">
                {nextStationEtaFormatted !== '—' ? nextStationEtaFormatted : 'Syncing'}
              </div>
              <span className="text-[9px] text-slate-400 font-mono block truncate">
                Sched: {nextStationScheduledFormatted !== '—' ? nextStationScheduledFormatted : '—'}
              </span>
            </div>

            {/* 4. Destination Terminus ETA */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                Terminus ({destStn || 'Dest'})
              </span>
              <div className="font-mono text-sm font-extrabold text-slate-900 truncate">
                {predictedEtaFormatted}
              </div>
              <span className="text-[9px] text-slate-400 font-mono block truncate">
                Sched: {scheduledEtaFormatted}
              </span>
            </div>
          </div>

          {/* Corridor Progress Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-600">linear_scale</span>
                Corridor Progress
              </span>
              <span className="font-mono text-[11px] font-extrabold text-slate-900">
                {progressPercent}% Completed
              </span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-[#0284C7] rounded-full transition-all duration-700 shadow-xs"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono pt-0.5">
              <span className="truncate max-w-[150px] font-bold">{getStationLabel(originStn)}</span>
              <span className="truncate max-w-[150px] text-right font-bold">{getStationLabel(destStn)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBSECTION 2: UPCOMING HALTS & AI STRATEGY                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'strategy' && (
        <div className="space-y-3 animate-fadeIn">
          {/* Next Upcoming Corridor Stations */}
          {nextUpcomingStations.length > 0 ? (
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-600">upcoming</span>
                  Upcoming Corridor Halts
                </span>
                <span className="font-mono text-slate-400 text-[10px]">Sequence</span>
              </div>

              <div className="divide-y divide-slate-100">
                {nextUpcomingStations.map((stn, idx) => (
                  <div
                    key={stn.station_code || idx}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${idx === 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {idx === 0 ? 'NEXT' : `+${idx + 1}`}
                      </span>
                      <span className="font-bold text-slate-800 truncate max-w-[170px]">
                        {stn.station_name || getStationLabel(stn.station_code)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-right shrink-0">
                      <span className="font-bold text-slate-900 text-xs">
                        {formatIsoOrTime(stn.predicted_eta || stn.scheduled_arrival)}
                      </span>
                      {stn.platform && (
                        <span className="text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded font-semibold">
                          {stn.platform}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 text-center text-slate-400 text-xs">
              No further scheduled halts downstream.
            </div>
          )}

          {/* AI Operational Strategy Reasoning */}
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 shadow-xs border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                <span className="material-symbols-outlined text-[15px]">psychology</span>
                NetworkX Dispatch Strategy
              </span>
              <span className="font-mono text-[9px] text-slate-400">ENGINE v2.4</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans pt-0.5">
              {operationalReasoning || 'All block section signals clear. Nominal corridor cruising.'}
            </p>
          </div>
        </div>
      )}

      {/* Handcrafted Bottom Utility Bar */}
      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
        <button
          type="button"
          onClick={onToggleVirtualSim}
          className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${showVirtualSim
              ? 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
              : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
            }`}
          title={showVirtualSim ? 'Hide simulation trains from map' : 'Show simulation trains on map'}
        >
          <span className="material-symbols-outlined text-[14px]">
            {showVirtualSim ? 'visibility' : 'visibility_off'}
          </span>
          <span>{showVirtualSim ? 'Sim Layer ON' : 'Sim Layer OFF'}</span>
        </button>

        <span className="font-mono text-[10px] text-slate-400">
          Sim Clock: {lastSyncTime}
        </span>
      </div>
    </div>
  );
}

export default VirtualSimulationView;
