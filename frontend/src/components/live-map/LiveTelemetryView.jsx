import React, { useState } from 'react';

/**
 * Tab 1: Live Telemetry View (Handcrafted, Modular & Divided Subsections)
 * Subsections:
 * 1. 'journey'   - Current Station, Speed, Delay, 3-Point Track Progression & Next Stop ETA
 * 2. 'signals'   - Platform Allocation, Interlocking Conflict Risk & OCC Dispatch Advisory
 * 3. 'timetable' - Route Specs, Distance, Speeds, XGBoost Timetable Forecast
 */
export function LiveTelemetryView({
  isExpanded = false,
  showLiveFeed,
  onToggleHideLiveFeed,
  liveStatusLoading,
  liveStatusError,
  onDismissError,
  liveStatusData,
  onFetchLiveStatus,
  onClearLiveData,
  customTrainInput,
  trainNo,
  liveTrainNo,
  liveTrainName,
  liveOverallStatus,
  liveDelay = 0,
  liveRelativeTime,
  liveSpeed,
  liveBearing,
  liveIsActualPos,
  currStationCode,
  currStationName,
  nextStationCode,
  nextStationName,
  prevStationCode,
  prevStationName,
  isDiverted,
  divertedRoutes = [],
  originCode,
  originName,
  destCode,
  destName,
  totalDistanceKm,
  totalHalts,
  avgSpeedKmh,
  maxSpeedKmh,
  trainType = 'Express',
  updatedTotalDelay = 0,
  updatedEta = '—',
  nextHaltEta = null,
  nextHaltScheduled = null,
  scheduledEta = '—',
  operationalAnalysis = null,
  liveMlPrediction = null,
  formatHumanTime = (t) => t || '—',
}) {
  const [activeSubTab, setActiveSubTab] = useState('journey'); // 'journey' | 'signals' | 'timetable'

  const live = liveStatusData?.live_status;
  const raw = live?.raw_data || {};
  const opAnalysis = operationalAnalysis || liveStatusData?.operational_analysis;
  const conflictRisk = opAnalysis?.conflict_risk;
  const platformAlloc = opAnalysis?.platform_allocation;
  const dispatchAdvisory = opAnalysis?.dispatch_advisory;

  // 1. Loading State
  if (liveStatusLoading) {
    return (
      <div className="py-10 px-6 text-center space-y-3 bg-slate-50/60 rounded-2xl border border-slate-200/80">
        <div className="w-8 h-8 mx-auto border-2 border-slate-300 border-t-[#0284C7] rounded-full animate-spin" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-800">Synchronizing Live Telemetry</p>
          <p className="text-[11px] text-slate-500 font-mono">
            Tracking satellite GPS & block positions for #{customTrainInput || trainNo}...
          </p>
        </div>
      </div>
    );
  }

  // 2. Empty State (Clean & Handcrafted)
  if (!liveStatusData) {
    return (
      <div className="py-10 px-6 text-center space-y-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
        <div className="w-12 h-12 rounded-2xl bg-[#0284C7]/10 border border-[#0284C7]/20 text-[#0284C7] flex items-center justify-center mx-auto shadow-xs">
          <span className="material-symbols-outlined text-2xl">satellite_alt</span>
        </div>
        <div className="space-y-1.5">
          <h4 className="text-sm font-bold text-slate-900">Real-Time Satellite Feed</h4>
          <p className="text-xs text-slate-500 leading-relaxed max-w-[280px] mx-auto">
            Pull verified GPS coordinates, speed telemetry, delay drift, and carrier interlocking data for train #{customTrainInput || trainNo}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onFetchLiveStatus && onFetchLiveStatus()}
          className="w-full max-w-[260px] mx-auto py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <span className="material-symbols-outlined text-[16px]">sensors</span>
          <span>Fetch Real-Time Status</span>
        </button>
      </div>
    );
  }

  // 3. Computed Metrics
  const delayMinutes = Math.round(liveDelay);
  const isDelayed = delayMinutes > 0;
  const isSeverelyDelayed = delayMinutes > 15;

  const subTabs = [
    { id: 'journey', label: 'Live Journey', icon: 'near_me' },
    { id: 'signals', label: 'Signals & OCC', icon: 'traffic' },
    { id: 'timetable', label: 'Specs & Timetable', icon: 'schedule' },
  ];

  return (
    <div className="space-y-3.5 select-none">
      {/* Provider Error Notice */}
      {liveStatusError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start justify-between gap-2 shadow-2xs">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-rose-600 mt-0.5 shrink-0">error</span>
            <span className="leading-snug">{liveStatusError}</span>
          </div>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              className="text-rose-500 hover:text-rose-700 text-xs font-bold shrink-0 px-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Carrier Diversion Alert */}
      {isDiverted && (
        <div className="p-3 rounded-xl bg-amber-50/90 border-l-4 border-amber-500 border-y border-r border-amber-200 text-amber-900 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <span className="material-symbols-outlined text-[16px] text-amber-600">alt_route</span>
            <span>Route Diverted by Carrier</span>
          </div>
          <p className="text-[11px] text-amber-700 leading-snug">
            {divertedRoutes.length > 0
              ? `Operating on alternate track segment between ${divertedRoutes[0]?.startStation || 'En Route'} and ${divertedRoutes[0]?.endStation || 'Downstream'}.`
              : 'Carrier operating along diverted chord line.'}
          </p>
        </div>
      )}

      {/* Handcrafted Subsection Switcher (Pill Style) */}
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
              <span className={`material-symbols-outlined text-[15px] ${isActive ? 'text-[#0284C7]' : 'text-slate-400'}`}>
                {tab.icon}
              </span>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SUBSECTION 1: LIVE JOURNEY & GPS                                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'journey' && (
        <div className="space-y-3 animate-fadeIn">
          {/* Top 4 Metric Cards Grid: Speed, Delay, Next Station ETA, and Final Destination ETA */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {/* 1. Speed */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Speed & Bearing</span>
              <div className="font-mono text-sm font-extrabold text-slate-900">
                {liveSpeed != null ? `${Math.round(Number(liveSpeed))} km/h` : '—'}
              </div>
              <span className="text-[9px] text-slate-500 font-mono flex items-center justify-center gap-0.5">
                <span className="material-symbols-outlined text-[11px] text-slate-400">explore</span>
                {liveBearing != null ? `${Math.round(liveBearing)}°` : '0°'}
              </span>
            </div>

            {/* 2. Delay / Status */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Running Status</span>
              <div
                className={`font-mono text-sm font-extrabold ${isSeverelyDelayed
                    ? 'text-rose-600'
                    : isDelayed
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
              >
                {isDelayed ? `+${delayMinutes}m Late` : 'On Time'}
              </div>
              <span className="text-[9px] text-slate-500 font-medium block truncate">
                {liveOverallStatus}
              </span>
            </div>

            {/* 3. Next Upcoming Station ETA */}
            <div className="p-2.5 rounded-xl bg-white border border-cyan-200/90 shadow-2xs space-y-0.5 ring-1 ring-cyan-100">
              <span className="text-[9px] font-bold text-cyan-700 uppercase tracking-wider block truncate">
                Next Halt ({nextStationCode || 'Next'})
              </span>
              <div className="font-mono text-sm font-extrabold text-[#00A3C4] truncate">
                {nextHaltEta || (nextHaltScheduled ? formatHumanTime(calculateExpectedTime(nextHaltScheduled, delayMinutes)) : (updatedEta !== 'Schedule Synchronized' ? updatedEta : 'On Time'))}
              </div>
              <span className="text-[9px] text-slate-500 font-mono block truncate">
                Sched: {nextHaltScheduled ? formatHumanTime(nextHaltScheduled) : (scheduledEta !== '—' ? scheduledEta : '—')}
              </span>
            </div>

            {/* 4. Final Destination Terminus ETA */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                Terminus ({destCode || destName || 'Dest'})
              </span>
              <div className="font-mono text-sm font-extrabold text-slate-900 truncate">
                {updatedEta}
              </div>
              <span className="text-[9px] text-slate-500 font-mono block truncate">
                Sched: {scheduledEta !== '—' ? scheduledEta : 'Syncing'}
              </span>
            </div>
          </div>

          {/* Linear 3-Point Track Progression Stepper */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#0284C7]">route</span>
                Live Track Progression
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {liveIsActualPos ? 'GPS Locked' : 'Interpolated'}
              </span>
            </div>

            {/* Visual Stepper */}
            <div className="relative pt-2 pb-1">
              <div className="absolute top-5 left-6 right-6 h-[2px] bg-slate-200" />
              <div className="relative flex items-start justify-between">
                {/* 1. Departed */}
                <div className="flex flex-col items-center text-center max-w-[120px]">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-slate-300 text-slate-600 flex items-center justify-center text-xs font-bold z-10">
                    ✓
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-800 mt-1.5 truncate max-w-full">
                    {prevStationCode || originCode || 'START'}
                  </span>
                  <span className="text-[9px] text-slate-400 truncate max-w-full">
                    {prevStationName || originName || 'Departed'}
                  </span>
                </div>

                {/* 2. Current Location */}
                <div className="flex flex-col items-center text-center max-w-[150px]">
                  <div className="relative w-7 h-7 rounded-full bg-[#0284C7] border-2 border-white text-white flex items-center justify-center shadow-xs z-10 ring-3 ring-[#0284C7]/25">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  </div>
                  <span className="text-xs font-mono font-extrabold text-slate-900 mt-1.5 truncate max-w-full">
                    {currStationCode || 'EN ROUTE'}
                  </span>
                  <span className="text-[10px] font-semibold text-[#0284C7] truncate max-w-full">
                    {currStationName}
                  </span>
                </div>

                {/* 3. Next Halt */}
                <div className="flex flex-col items-center text-center max-w-[120px]">
                  <div className="w-7 h-7 rounded-full bg-white border-2 border-[#00A3C4] text-[#00A3C4] flex items-center justify-center text-xs font-bold z-10 ring-2 ring-cyan-100">
                    <span className="w-2 h-2 rounded-full bg-[#00A3C4]" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-900 mt-1.5 truncate max-w-full">
                    {nextStationCode || destCode || 'DEST'}
                  </span>
                  <span className="text-[9px] text-[#00A3C4] font-semibold truncate max-w-full">
                    {nextHaltEta ? `ETA: ${nextHaltEta}` : (nextStationName || destName || 'Next Stop')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBSECTION 2: SIGNALS & OCC DISPATCH                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'signals' && (
        <div className="space-y-3 animate-fadeIn">
          {/* Platform Berth Allocation Card */}
          {platformAlloc ? (
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">door_front</span>
                  Platform Berth & Clearance
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-extrabold uppercase border ${platformAlloc.clearance_status.includes('OCCUPIED') || platformAlloc.clearance_status.includes('CONTENTION')
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : platformAlloc.clearance_status.includes('RESERVED')
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                >
                  {platformAlloc.clearance_status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-medium">Assigned Berth</span>
                    <span className="font-mono text-base font-extrabold text-slate-900">
                      {platformAlloc.platform}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono text-right max-w-[80px] leading-tight">
                    {platformAlloc.track_type}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase font-medium">Target Station</span>
                  <span className="font-bold text-slate-900 text-xs block truncate">
                    {platformAlloc.station_name}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block">
                    Code: {platformAlloc.station_code}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-snug">
                {platformAlloc.clearance_detail}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 text-center text-slate-400 text-xs">
              No platform reservation active at current block section.
            </div>
          )}

          {/* Downstream Interlocking Conflict Risk */}
          {conflictRisk && (
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">traffic</span>
                  Interlocking Precedence Risk
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-extrabold uppercase border flex items-center gap-1 ${conflictRisk.level === 'HIGH'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : conflictRisk.level === 'MODERATE'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${conflictRisk.level === 'HIGH'
                        ? 'bg-rose-500 animate-pulse'
                        : conflictRisk.level === 'MODERATE'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                  />
                  {conflictRisk.level} RISK
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Critical Junction:</span>
                  <span className="font-mono font-bold text-slate-900 truncate max-w-[180px]">
                    {conflictRisk.junction_name} ({conflictRisk.junction_code})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Headway Margin:</span>
                  <span className="font-mono font-bold text-slate-800">
                    +{conflictRisk.headway_buffer_minutes}m • {conflictRisk.headway_status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 leading-snug pt-1.5 border-t border-slate-200/60">
                  {conflictRisk.summary}
                </p>
              </div>
            </div>
          )}

          {/* OCC Dispatch Advisory */}
          {dispatchAdvisory && (
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 shadow-xs border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                  <span className="material-symbols-outlined text-[15px]">tune</span>
                  OCC Controller Advisory
                </span>
                {dispatchAdvisory.time_saved_minutes > 0 && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                    +{dispatchAdvisory.time_saved_minutes}m Saved
                  </span>
                )}
              </div>

              <div className="font-mono text-xs font-bold text-emerald-400">
                {dispatchAdvisory.action}
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {dispatchAdvisory.detail}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBSECTION 3: SPECS & FULL TIMETABLE FORECAST                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'timetable' && (
        <div className="space-y-3 animate-fadeIn">
          {/* Route Profile Grid */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-slate-500">train</span>
                Carrier Route Profile
              </span>
              <span className="font-mono text-slate-500 font-bold text-[10px] px-2 py-0.5 bg-slate-100 rounded-md">
                {trainType || 'Express'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Origin</span>
                <span className="font-mono font-bold text-slate-900">{originCode || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Destination</span>
                <span className="font-mono font-bold text-slate-900">{destCode || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Total Distance</span>
                <span className="font-mono font-bold text-slate-900">
                  {totalDistanceKm ? `${totalDistanceKm} km` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Scheduled Halts</span>
                <span className="font-mono font-bold text-slate-900">{totalHalts || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Average Speed</span>
                <span className="font-mono font-bold text-slate-900">
                  {avgSpeedKmh ? `${Math.round(avgSpeedKmh)} km/h` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Max Permitted</span>
                <span className="font-mono font-bold text-slate-900">
                  {maxSpeedKmh ? `${Math.round(maxSpeedKmh)} km/h` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* ML ETA Forecast Breakdown: Explicit Next Station ETA + Final Destination ETA + Upcoming Stops */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#0284C7]">neurology</span>
                XGBoost ML Delay Prediction Engine
              </span>
              <span className="text-[10px] font-mono text-[#0284C7] font-bold px-2 py-0.5 bg-cyan-50 border border-cyan-200 rounded-md">
                Multi-Hop Inference
              </span>
            </div>

            {/* Side-by-Side Dual ETA Cards: Next Station vs Final Destination */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* 1. Next Station Predicted Arrival */}
              <div className="p-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200/80 space-y-1">
                <span className="text-[9px] font-bold text-cyan-800 uppercase block tracking-tight">
                  1. Next Halt • {nextStationCode || 'Next Station'}
                </span>
                <div className="font-mono font-extrabold text-[#00A3C4] text-sm">
                  {nextHaltEta || (nextHaltScheduled ? formatHumanTime(calculateExpectedTime(nextHaltScheduled, delayMinutes)) : (updatedEta !== 'Schedule Synchronized' ? updatedEta : 'On Time'))}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                  <span>Sched: {nextHaltScheduled ? formatHumanTime(nextHaltScheduled) : (scheduledEta !== '—' ? scheduledEta : '—')}</span>
                  <span className={delayMinutes > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                    {delayMinutes > 0 ? `+${delayMinutes}m` : '0m'}
                  </span>
                </div>
              </div>

              {/* 2. Final Destination Terminus ETA */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[9px] font-bold text-slate-600 uppercase block tracking-tight">
                  2. Terminus • {destCode || destName || 'Destination'}
                </span>
                <div className="font-mono font-extrabold text-slate-900 text-sm">
                  {updatedEta}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                  <span>Sched: {scheduledEta}</span>
                  <span className={updatedTotalDelay > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                    {updatedTotalDelay > 0 ? `+${updatedTotalDelay}m` : '0m'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Upcoming Stations ML Predicted Sequence */}
            {liveMlPrediction?.upcoming_stations_predictions && liveMlPrediction.upcoming_stations_predictions.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Upcoming Station Forecasts Sequence
                </span>
                <div className="divide-y divide-slate-100 max-h-[140px] overflow-y-auto thin-scrollbar rounded-xl border border-slate-100 bg-slate-50/50 p-1.5">
                  {liveMlPrediction.upcoming_stations_predictions.slice(0, 5).map((pred, pIdx) => (
                    <div key={pred.station_code || pIdx} className="flex items-center justify-between py-1 px-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`font-mono text-[9px] px-1 py-0.2 rounded font-bold ${pIdx === 0 ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200/80 text-slate-700'
                          }`}>
                          {pred.station_code}
                        </span>
                        <span className="font-medium text-slate-800 truncate max-w-[130px]">
                          {pred.station_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-right shrink-0">
                        <span className="text-slate-400 text-[10px]">
                          {pred.scheduled_arrival ? formatHumanTime(pred.scheduled_arrival) : '—'}
                        </span>
                        <span className="font-bold text-[#00A3C4]">
                          {formatHumanTime(pred.predicted_eta)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Handcrafted Bottom Utility Bar */}
      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleHideLiveFeed}
            className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${showLiveFeed
                ? 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
              }`}
            title={showLiveFeed ? 'Hide live GPS route from map' : 'Show live GPS route on map'}
          >
            <span className="material-symbols-outlined text-[14px]">
              {showLiveFeed ? 'visibility' : 'visibility_off'}
            </span>
            <span>{showLiveFeed ? 'Live Route ON' : 'Live Route OFF'}</span>
          </button>

          {onClearLiveData && (
            <button
              type="button"
              onClick={onClearLiveData}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all font-medium cursor-pointer"
              title="Clear telemetry session"
            >
              Clear
            </button>
          )}
        </div>

        {liveRelativeTime && (
          <span className="font-mono text-[10px] text-slate-400">
            Updated {liveRelativeTime}
          </span>
        )}
      </div>
    </div>
  );
}

export default LiveTelemetryView;
