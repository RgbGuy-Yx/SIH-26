import React from 'react';

/**
 * Tab 1: Real-Time Telemetry (Clean, High-Density Functional Layout)
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
  scheduledEta = '—',
  operationalAnalysis = null,
  formatHumanTime = (t) => t || '—',
}) {
  const live = liveStatusData?.live_status;
  const raw = live?.raw_data || {};
  const opAnalysis = operationalAnalysis || liveStatusData?.operational_analysis;
  const conflictRisk = opAnalysis?.conflict_risk;
  const platformAlloc = opAnalysis?.platform_allocation;
  const dispatchAdvisory = opAnalysis?.dispatch_advisory;

  // 1. Loading State
  if (liveStatusLoading) {
    return (
      <div className="p-6 text-center space-y-3 bg-slate-50/60 rounded-xl border border-slate-200">
        <div className="w-8 h-8 mx-auto border-2 border-slate-300 border-t-[#00A3C4] rounded-full animate-spin" />
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-800">Querying Real-Time Provider</p>
          <p className="text-[11px] text-slate-400 font-mono">Connecting to satellite radar for #{customTrainInput || trainNo}...</p>
        </div>
      </div>
    );
  }

  // 2. Empty State (Prompt user to fetch)
  if (!liveStatusData) {
    return (
      <div className="p-6 text-center space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
        <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-[#00A3C4] flex items-center justify-center mx-auto shadow-xs">
          <span className="material-symbols-outlined text-xl">satellite_alt</span>
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-900">Live Satellite Telemetry</h4>
          <p className="text-[11px] text-slate-500 leading-snug max-w-[240px] mx-auto">
            Pull GPS coordinates, actual station departures, speed, and carrier route diversions for train #{customTrainInput || trainNo}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onFetchLiveStatus && onFetchLiveStatus()}
          className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[15px]">sensors</span>
          <span>Fetch Real-Time Status</span>
        </button>
      </div>
    );
  }

  // 3. Render High-Density Live Telemetry View
  const delayMinutes = Math.round(liveDelay);
  const isDelayed = delayMinutes > 0;
  const isSeverelyDelayed = delayMinutes > 15;

  return (
    <div className={`space-y-3 ${isExpanded ? 'grid grid-cols-2 gap-3.5 space-y-0' : ''}`}>
      {/* Column 1: Physical Telemetry, Stepper, Platform Allocation & Route Profile */}
      <div className="space-y-3">
        {/* Live Status Provider Error Notice (if any) */}
        {liveStatusError && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px] flex items-start justify-between gap-2 shadow-2xs">
            <div className="flex items-start gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-red-600 mt-0.5 shrink-0">error</span>
              <span className="leading-snug">{liveStatusError}</span>
            </div>
            {onDismissError && (
              <button
                type="button"
                onClick={onDismissError}
                className="text-red-500 hover:text-red-700 text-xs font-bold shrink-0 px-1"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Route Diversion Alert (If any) */}
        {isDiverted && (
          <div className="p-2.5 rounded-lg bg-amber-50/90 border-l-4 border-amber-500 border-y border-r border-amber-200/80 text-amber-900 text-[11px] space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <span className="material-symbols-outlined text-[15px] text-amber-600">alt_route</span>
              <span>Route Diverted by Carrier</span>
            </div>
            <p className="text-[10px] text-amber-700 leading-snug">
              {divertedRoutes.length > 0
                ? `Detour active between ${divertedRoutes[0]?.startStation || 'En Route'} and ${divertedRoutes[0]?.endStation || 'Downstream'}.`
                : 'Carrier operating on alternate chord track.'}
            </p>
          </div>
        )}

        {/* Primary Telemetry Metric Strip (4-Col Clean Grid) */}
        <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <div className="p-1">
            <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Status</span>
            <span className="text-[11px] font-bold text-slate-900 block truncate">
              {liveOverallStatus}
            </span>
          </div>

          <div className="p-1 border-l border-slate-200">
            <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Delay</span>
            <span
              className={`font-mono text-[11px] font-bold block ${
                isSeverelyDelayed
                  ? 'text-red-600'
                  : isDelayed
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {isDelayed ? `+${delayMinutes}m` : '0m'}
            </span>
          </div>

          <div className="p-1 border-l border-slate-200">
            <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Speed</span>
            <span className="font-mono text-[11px] font-bold text-slate-900 block">
              {liveSpeed != null ? `${Math.round(Number(liveSpeed))} km/h` : '—'}
            </span>
          </div>

          <div className="p-1 border-l border-slate-200">
            <span className="text-[9px] font-semibold text-slate-400 block uppercase tracking-wider">Heading</span>
            <span className="font-mono text-[11px] font-bold text-slate-900 block">
              {liveBearing != null ? `${Math.round(liveBearing)}°` : '—'}
            </span>
          </div>
        </div>

        {/* Linear Track Section Progression (Departed ➔ Current ➔ Next Halt) */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-slate-500 uppercase tracking-wider">Track Progression</span>
            <span className="font-mono text-slate-400 text-[9px]">
              {liveIsActualPos ? 'GPS Verified' : 'Interpolated'}
            </span>
          </div>

          {/* 3-Point Stepper Bar */}
          <div className="relative pt-1 pb-1">
            <div className="absolute top-4 left-4 right-4 h-[2px] bg-slate-200" />
            <div className="relative flex items-start justify-between">
              {/* Departed Point */}
              <div className="flex flex-col items-center text-center max-w-[110px] sm:max-w-[130px]">
                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 text-slate-500 flex items-center justify-center text-[9px] font-bold z-10">
                  ✓
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-700 mt-1 truncate max-w-full">
                  {prevStationCode || 'START'}
                </span>
                <span className="text-[8px] text-slate-400 truncate max-w-full">
                  {prevStationName || 'Departed'}
                </span>
              </div>

              {/* Current Position Point */}
              <div className="flex flex-col items-center text-center max-w-[130px] sm:max-w-[160px]">
                <div className="relative w-6 h-6 rounded-full bg-[#00A3C4] border-2 border-white text-white flex items-center justify-center shadow-xs z-10 ring-2 ring-[#00A3C4]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </div>
                <span className="text-[10px] font-mono font-extrabold text-slate-900 mt-1 truncate max-w-full">
                  {currStationCode || 'EN ROUTE'}
                </span>
                <span className="text-[8px] font-medium text-[#008ba8] truncate max-w-full">
                  {currStationName}
                </span>
              </div>

              {/* Next Halt Point */}
              <div className="flex flex-col items-center text-center max-w-[110px] sm:max-w-[130px]">
                <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-300 text-slate-600 flex items-center justify-center text-[9px] font-bold z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-700 mt-1 truncate max-w-full">
                  {nextStationCode || 'DEST'}
                </span>
                <span className="text-[8px] text-slate-400 truncate max-w-full">
                  {nextStationName || 'Next Halt'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Allocation & Clearance */}
        {platformAlloc && (
          <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-slate-500">door_front</span>
                Platform Allocation & Clearance
              </span>
              <span
                className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-extrabold uppercase border ${
                  platformAlloc.clearance_status.includes('OCCUPIED') || platformAlloc.clearance_status.includes('CONTENTION')
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : platformAlloc.clearance_status.includes('RESERVED')
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {platformAlloc.clearance_status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-medium">Assigned Berth</span>
                  <span className="font-mono text-sm font-extrabold text-slate-900">
                    {platformAlloc.platform}
                  </span>
                </div>
                <span className="text-[9px] text-slate-500 font-mono text-right max-w-[85px] leading-tight">
                  {platformAlloc.track_type}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[9px] text-slate-400 block uppercase font-medium">Target Station</span>
                <span className="font-bold text-slate-900 text-xs block truncate">
                  {platformAlloc.station_name}
                </span>
                <span className="text-[9px] text-slate-500 font-mono block">
                  Station Code: {platformAlloc.station_code}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-snug">
              {platformAlloc.clearance_detail}
            </p>
          </div>
        )}

        {/* Service Profile Specs (Structured Key-Value Grid) */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] pb-1 border-b border-slate-100">
            <span className="font-bold text-slate-500 uppercase tracking-wider">Carrier Route Profile</span>
            <span className="font-mono text-slate-400 text-[9px]">{trainType || 'Express'}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">Origin</span>
              <span className="font-mono font-bold text-slate-800">{originCode || '—'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">Destination</span>
              <span className="font-mono font-bold text-slate-800">{destCode || '—'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">Total Distance</span>
              <span className="font-mono text-slate-800">{totalDistanceKm ? `${totalDistanceKm} km` : '—'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">Scheduled Halts</span>
              <span className="font-mono text-slate-800">{totalHalts || '—'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">Average Speed</span>
              <span className="font-mono text-slate-800">{avgSpeedKmh ? `${Math.round(avgSpeedKmh)} km/h` : '—'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">Max Speed</span>
              <span className="font-mono text-slate-800">{maxSpeedKmh ? `${Math.round(maxSpeedKmh)} km/h` : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: Tactical Intelligence, Conflict Risk, Timetable ML, & Actions */}
      <div className="space-y-3">
        {/* AI OCC Dispatch Advisory (Controller Recommendation) */}
        {dispatchAdvisory && (
          <div className="p-3 rounded-xl bg-slate-900 text-white space-y-1.5 shadow-xs border border-slate-800">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">tune</span>
                OCC Dispatch Advisory
              </span>
              {dispatchAdvisory.time_saved_minutes > 0 && (
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  +{dispatchAdvisory.time_saved_minutes}m headway saved
                </span>
              )}
            </div>

            <div className="font-mono text-xs font-bold text-emerald-400 tracking-tight">
              {dispatchAdvisory.action}
            </div>

            <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
              {dispatchAdvisory.detail}
            </p>
          </div>
        )}

        {/* Downstream Conflict Risk (NetworkX Interlocking) */}
        {conflictRisk && (
          <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-slate-500">traffic</span>
                Downstream Conflict Risk
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-extrabold uppercase border flex items-center gap-1 ${
                  conflictRisk.level === 'HIGH'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : conflictRisk.level === 'MODERATE'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    conflictRisk.level === 'HIGH'
                      ? 'bg-red-500 animate-pulse'
                      : conflictRisk.level === 'MODERATE'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />
                {conflictRisk.level} RISK
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 text-[10px]">Next Critical Interlocking:</span>
                <span className="font-mono font-bold text-slate-900 truncate max-w-[170px]">
                  {conflictRisk.junction_name} ({conflictRisk.junction_code})
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 text-[10px]">Headway Buffer Margin:</span>
                <span className="font-mono font-bold text-slate-800">
                  +{conflictRisk.headway_buffer_minutes}m • {conflictRisk.headway_status}
                </span>
              </div>
              <p className="text-[10px] text-slate-600 leading-snug pt-1 border-t border-slate-200/60">
                {conflictRisk.summary}
              </p>
            </div>
          </div>
        )}

        {/* Downstream Forecast & Timetable Adjustment */}
        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-slate-500 uppercase tracking-wider">Timetable & ETA Forecast</span>
            <span className="font-mono text-[9px] text-[#00A3C4] font-semibold">XGBoost ML</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
              <span className="text-[9px] font-medium text-slate-400 block uppercase">Expected Destination ETA</span>
              <span className="font-mono font-bold text-slate-900 text-xs block">
                {updatedEta}
              </span>
              <span className="text-[9px] text-slate-500 font-mono block">
                Sched: {scheduledEta !== '—' ? scheduledEta : formatHumanTime(raw.destinationETA || (Array.isArray(raw.route) && raw.route.length > 0 ? raw.route[raw.route.length - 1].scheduledArrival : null) || live?.expected_arrival_time)}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
              <span className="text-[9px] font-medium text-slate-400 block uppercase">Net Projected Delay</span>
              <span
                className={`font-mono font-bold text-xs block ${
                  updatedTotalDelay > 15
                    ? 'text-red-600'
                    : updatedTotalDelay > 0
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {updatedTotalDelay > 0 ? `+${updatedTotalDelay} min` : 'On Schedule'}
              </span>
              <span className="text-[9px] text-slate-400 block truncate">
                Downstream drift adjusted
              </span>
            </div>
          </div>
        </div>

        {/* Compact Bottom Action & Layer Strip */}
        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleHideLiveFeed}
              className={`px-2 py-1 rounded border font-semibold flex items-center gap-1 transition-all ${
                showLiveFeed
                  ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
              }`}
              title={showLiveFeed ? 'Hide live GPS route from map' : 'Show live GPS route on map'}
            >
              <span className="material-symbols-outlined text-[13px]">
                {showLiveFeed ? 'visibility' : 'visibility_off'}
              </span>
              <span>{showLiveFeed ? 'Map Layer: ON' : 'Map Layer: OFF'}</span>
            </button>

            {onClearLiveData && (
              <button
                type="button"
                onClick={onClearLiveData}
                className="px-2 py-1 rounded border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all font-medium"
                title="Clear telemetry session"
              >
                Clear
              </button>
            )}
          </div>

          {liveRelativeTime && (
            <span className="font-mono text-slate-400">
              Updated {liveRelativeTime}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
