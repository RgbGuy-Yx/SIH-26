import React, { useState, useMemo } from 'react';
import { PrimaryOverviewView } from './PrimaryOverviewView';
import { SignalsOccView } from './SignalsOccView';
import { TimetableDetailsView } from './TimetableDetailsView';
import { TelemetryDetailsView } from './TelemetryDetailsView';

/**
 * Floating Right Sidebar: Train Overview Card (Refined Railway Control-Room Console)
 *
 * Scannable Hierarchy (3–5 seconds scan time):
 * 1. Header: Train Identity (Locomotive #, Name, Tier) + Status Pill (LIVE/STALE/OFFLINE) + Quick Fetch
 * 2. Segmented OCC Mode Control: Overview (Default) | Signals & OCC | Timetable & Details | Telemetry
 * 3. Structured Viewport: Clean, noise-free layout tailored for railway dispatch controllers
 */
export function TrainOverviewCard({
  trainNo,
  trainName,
  priorityTier = 3,
  speedKmh = 0,
  wsConnected = false,
  lastSyncTime = '—',
  customTrainInput,
  setCustomTrainInput,
  handleFetchLiveStatus,
  liveStatusLoading = false,
  liveStatusData = null,
  liveStatusError = null,
  onDismissError,
  onClearLiveData,
  overviewTab = 'overview',
  setOverviewTab,
  showLiveFeed = true,
  onToggleHideLiveFeed,
  showVirtualSim = true,
  onToggleVirtualSim,
  stationTimetable = [],
  activeConflicts = [],
  liveTelemetryProps = {},
  virtualSimulationProps = {},
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalTab, setInternalTab] = useState(overviewTab || 'overview');

  const activeTab = overviewTab || internalTab;
  const setActiveTab = setOverviewTab || setInternalTab;

  const tierLabel =
    priorityTier === 1
      ? 'Tier 1 • High Priority'
      : priorityTier === 2
        ? 'Tier 2 • Superfast'
        : priorityTier === 3
          ? 'Tier 3 • Express'
          : 'Tier 4 • Freight';

  // Live / Stale / Offline status evaluation
  const connectionState = useMemo(() => {
    if (liveStatusData) {
      const lastUpdated = liveStatusData?.live_status?.last_updated;
      if (lastUpdated) {
        const diffMinutes = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60);
        if (diffMinutes > 15) {
          return {
            status: 'STALE',
            label: 'STALE',
            color: 'bg-amber-50 text-amber-700 border-amber-200',
            dot: 'bg-amber-500',
          };
        }
      }
      return {
        status: 'LIVE',
        label: 'LIVE',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500 animate-pulse',
      };
    }
    if (wsConnected) {
      return {
        status: 'LIVE',
        label: 'LIVE',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500 animate-pulse',
      };
    }
    return {
      status: 'OFFLINE',
      label: 'OFFLINE',
      color: 'bg-slate-100 text-slate-600 border-slate-200',
      dot: 'bg-slate-400',
    };
  }, [wsConnected, liveStatusData]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'signals', label: 'Signals & OCC', icon: 'traffic' },
    { id: 'timetable', label: 'Timetable & Details', icon: 'schedule' },
    { id: 'telemetry', label: 'Telemetry', icon: 'satellite_alt' },
  ];

  // Consolidated operational data
  const rawData = liveStatusData?.live_status?.raw_data || {};
  const operationalAnalysis = liveTelemetryProps?.operationalAnalysis || liveStatusData?.operational_analysis;
  const conflictRisk = operationalAnalysis?.conflict_risk;
  const platformAlloc = operationalAnalysis?.platform_allocation;
  const dispatchAdvisory = operationalAnalysis?.dispatch_advisory;

  const isDiverted = Boolean(rawData.diverted || liveTelemetryProps?.isDiverted);
  const divertedRoutes = Array.isArray(rawData.divertedRoutes)
    ? rawData.divertedRoutes
    : liveTelemetryProps?.divertedRoutes || [];

  return (
    <aside
      className={`absolute top-14 right-4 bottom-4 z-20 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out select-none ${
        isExpanded
          ? 'w-[720px] lg:w-[800px] xl:w-[860px]'
          : 'w-[440px] sm:w-[480px] lg:w-[500px]'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. OCC HEADER: Train Identity, Status Pill, and Compact Search            */}
      {/* ========================================================================= */}
      <div className="p-3 border-b border-slate-200/80 shrink-0 space-y-2.5 bg-white/90">
        {/* Train Identification Strip */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 truncate">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white shrink-0 tracking-tight">
                #{liveTelemetryProps?.liveTrainNo || trainNo}
              </span>
              <h3 className="font-bold text-sm text-slate-900 truncate tracking-tight">
                {liveTelemetryProps?.liveTrainName || trainName}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span>{tierLabel}</span>
              <span>•</span>
              <span className="font-mono text-slate-700 font-bold">
                {liveTelemetryProps?.liveSpeed != null
                  ? `${Math.round(liveTelemetryProps.liveSpeed)} km/h`
                  : `${speedKmh} km/h`}
              </span>
            </div>
          </div>

          {/* Connection Pill & Console Expand Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-mono font-bold text-[10px] ${connectionState.color}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${connectionState.dot}`} />
              <span>{connectionState.label}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              title={isExpanded ? 'Collapse workstation view' : 'Expand workstation view'}
            >
              <span className="material-symbols-outlined text-[14px]">
                {isExpanded ? 'close_fullscreen' : 'open_in_full'}
              </span>
            </button>
          </div>
        </div>

        {/* Compact Train Search / Telemetry Fetch Strip */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <span className="text-[11px] text-slate-400 absolute left-2 top-1.5 font-mono font-bold">#</span>
            <input
              type="text"
              value={customTrainInput}
              onChange={(e) => setCustomTrainInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customTrainInput?.trim()) {
                  handleFetchLiveStatus(Number(customTrainInput.trim()));
                }
              }}
              placeholder="Search train no. (e.g. 12003)"
              className="w-full pl-5 pr-2 py-1 text-[11px] font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => handleFetchLiveStatus()}
            disabled={liveStatusLoading}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
              liveStatusLoading
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-wait'
                : liveStatusData
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-98'
            }`}
            title="Fetch real-time satellite telemetry"
          >
            {liveStatusLoading ? (
              <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[14px]">
                {liveStatusData ? 'sync' : 'sensors'}
              </span>
            )}
            <span>{liveStatusData ? 'Refresh' : 'Fetch'}</span>
          </button>
        </div>

        {/* Operational Segmented Tab Switcher */}
        <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80 gap-0.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 px-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200/80'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[14px] ${
                    isActive ? 'text-[#0284C7]' : 'text-slate-400'
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STRUCTURED SCROLLABLE CONTENT BODY                                      */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-3 space-y-3 text-xs">
        {/* Provider Error Notice */}
        {liveStatusError && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start justify-between gap-2 shadow-2xs">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[15px] text-rose-600 mt-0.5 shrink-0">
                error
              </span>
              <span className="leading-tight text-[11px]">{liveStatusError}</span>
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

        {/* Carrier Diversion Alert (Shown ONLY when applicable) */}
        {isDiverted && (
          <div className="p-2.5 rounded-xl bg-amber-50/90 border-l-4 border-amber-500 border-y border-r border-amber-200 text-amber-900 text-xs space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px]">
              <span className="material-symbols-outlined text-[15px] text-amber-600">alt_route</span>
              <span>Route Diverted by Carrier</span>
            </div>
            <p className="text-[10px] text-amber-700 leading-snug">
              {divertedRoutes.length > 0
                ? `Operating on alternate track segment between ${divertedRoutes[0]?.startStation || 'En Route'} and ${divertedRoutes[0]?.endStation || 'Downstream'}.`
                : 'Operating along designated chord diversion line.'}
            </p>
          </div>
        )}

        {/* TAB 1: PRIMARY OVERVIEW */}
        {activeTab === 'overview' && (
          <PrimaryOverviewView
            trainNo={liveTelemetryProps?.liveTrainNo || trainNo}
            trainName={liveTelemetryProps?.liveTrainName || trainName}
            priorityTier={priorityTier}
            speedKmh={speedKmh}
            liveSpeed={liveTelemetryProps?.liveSpeed}
            liveBearing={liveTelemetryProps?.liveBearing}
            liveOverallStatus={liveTelemetryProps?.liveOverallStatus}
            delayMinutes={liveTelemetryProps?.liveDelay || 0}
            currStationCode={liveTelemetryProps?.currStationCode || virtualSimulationProps?.currentStn}
            currStationName={liveTelemetryProps?.currStationName || virtualSimulationProps?.getStationLabel?.(virtualSimulationProps?.currentStn)}
            nextStationCode={liveTelemetryProps?.nextStationCode || virtualSimulationProps?.nextStn}
            nextStationName={liveTelemetryProps?.nextStationName || virtualSimulationProps?.getStationLabel?.(virtualSimulationProps?.nextStn)}
            nextStationEta={liveTelemetryProps?.nextHaltEta || virtualSimulationProps?.nextStationEtaFormatted}
            nextStationScheduled={liveTelemetryProps?.nextHaltScheduled || virtualSimulationProps?.nextStationScheduledFormatted}
            destCode={liveTelemetryProps?.destCode || virtualSimulationProps?.destStn}
            destName={liveTelemetryProps?.destName || virtualSimulationProps?.getStationLabel?.(virtualSimulationProps?.destStn)}
            destEta={liveTelemetryProps?.updatedEta || virtualSimulationProps?.predictedEtaFormatted}
            destScheduled={liveTelemetryProps?.scheduledEta || virtualSimulationProps?.scheduledEtaFormatted}
            prevStationCode={liveTelemetryProps?.prevStationCode}
            prevStationName={liveTelemetryProps?.prevStationName}
            originCode={liveTelemetryProps?.originCode || virtualSimulationProps?.originStn}
            originName={liveTelemetryProps?.originName || virtualSimulationProps?.getStationLabel?.(virtualSimulationProps?.originStn)}
            progressPercent={virtualSimulationProps?.progressPercent || 35}
            hasActiveConflict={virtualSimulationProps?.hasActiveConflict}
            conflictRisk={conflictRisk}
            conflictDelay={virtualSimulationProps?.conflictDelay}
            activeConflicts={activeConflicts}
            dispatchAdvisory={dispatchAdvisory}
            operationalReasoning={virtualSimulationProps?.operationalReasoning}
            liveMlPrediction={liveTelemetryProps?.liveMlPrediction}
            finalDelay={virtualSimulationProps?.finalDelay}
            accumulatedDelay={virtualSimulationProps?.accumulatedDelay}
            formatHumanTime={liveTelemetryProps?.formatHumanTime}
          />
        )}

        {/* TAB 2: SIGNALS & OCC */}
        {activeTab === 'signals' && (
          <SignalsOccView
            platformAlloc={platformAlloc}
            conflictRisk={conflictRisk}
            dispatchAdvisory={dispatchAdvisory}
            hasActiveConflict={virtualSimulationProps?.hasActiveConflict}
            activeConflicts={activeConflicts}
            conflictDelay={virtualSimulationProps?.conflictDelay}
            currStationCode={liveTelemetryProps?.currStationCode || virtualSimulationProps?.currentStn}
            currStationName={liveTelemetryProps?.currStationName || virtualSimulationProps?.getStationLabel?.(virtualSimulationProps?.currentStn)}
            nextStationCode={liveTelemetryProps?.nextStationCode || virtualSimulationProps?.nextStn}
            nextStationName={liveTelemetryProps?.nextStationName || virtualSimulationProps?.getStationLabel?.(virtualSimulationProps?.nextStn)}
            priorityTier={priorityTier}
            trainNo={liveTelemetryProps?.liveTrainNo || trainNo}
            speedKmh={liveTelemetryProps?.liveSpeed != null ? liveTelemetryProps.liveSpeed : speedKmh}
            maxSpeedKmh={liveTelemetryProps?.maxSpeedKmh || 130}
            operationalReasoning={virtualSimulationProps?.operationalReasoning}
          />
        )}

        {/* TAB 3: TIMETABLE & DETAILS */}
        {activeTab === 'timetable' && (
          <TimetableDetailsView
            trainNo={liveTelemetryProps?.liveTrainNo || trainNo}
            trainName={liveTelemetryProps?.liveTrainName || trainName}
            trainType={liveTelemetryProps?.trainType || 'Express'}
            originCode={liveTelemetryProps?.originCode || virtualSimulationProps?.originStn}
            originName={liveTelemetryProps?.originName || virtualSimulationProps?.getStationLabel?.(virtualSimulationProps?.originStn)}
            destCode={liveTelemetryProps?.destCode || virtualSimulationProps?.destStn}
            destName={liveTelemetryProps?.destName || virtualSimulationProps?.getStationLabel?.(virtualSimulationProps?.destStn)}
            totalDistanceKm={liveTelemetryProps?.totalDistanceKm}
            totalHalts={liveTelemetryProps?.totalHalts}
            avgSpeedKmh={liveTelemetryProps?.avgSpeedKmh}
            maxSpeedKmh={liveTelemetryProps?.maxSpeedKmh}
            stationTimetable={stationTimetable}
            currentStn={liveTelemetryProps?.currStationCode || virtualSimulationProps?.currentStn}
            nextStn={liveTelemetryProps?.nextStationCode || virtualSimulationProps?.nextStn}
            formatHumanTime={liveTelemetryProps?.formatHumanTime}
            calculateExpectedTime={virtualSimulationProps?.calculateExpectedTime}
            totalDelay={virtualSimulationProps?.finalDelay || liveTelemetryProps?.liveDelay || 0}
          />
        )}

        {/* TAB 4: TELEMETRY */}
        {activeTab === 'telemetry' && (
          <TelemetryDetailsView
            trainNo={liveTelemetryProps?.liveTrainNo || trainNo}
            trainName={liveTelemetryProps?.liveTrainName || trainName}
            liveLat={rawData.currentLocation?.coordinates?.lat || liveStatusData?.live_status?.latitude}
            liveLng={rawData.currentLocation?.coordinates?.lng || liveStatusData?.live_status?.longitude}
            liveBearing={liveTelemetryProps?.liveBearing}
            liveSpeed={liveTelemetryProps?.liveSpeed}
            speedKmh={speedKmh}
            liveIsActualPos={liveTelemetryProps?.liveIsActualPos}
            lastSyncTime={lastSyncTime}
            liveRelativeTime={liveTelemetryProps?.liveRelativeTime}
            wsConnected={wsConnected}
            hasLiveData={Boolean(liveStatusData)}
            currStationCode={liveTelemetryProps?.currStationCode || virtualSimulationProps?.currentStn}
            currStationName={liveTelemetryProps?.currStationName || virtualSimulationProps?.getStationLabel?.(virtualSimulationProps?.currentStn)}
            rawTelemetry={rawData}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. CALM OCC STATUS & LAYER CONTROLS BAR                                    */}
      {/* ========================================================================= */}
      <div className="p-2.5 border-t border-slate-200/80 bg-white/90 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center gap-1.5">
          {onToggleHideLiveFeed && (
            <button
              type="button"
              onClick={onToggleHideLiveFeed}
              className={`px-2 py-0.5 rounded border font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                showLiveFeed
                  ? 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                  : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'
              }`}
              title={showLiveFeed ? 'Hide live GPS route' : 'Show live GPS route'}
            >
              <span className="material-symbols-outlined text-[13px]">
                {showLiveFeed ? 'visibility' : 'visibility_off'}
              </span>
              <span>{showLiveFeed ? 'Live Route ON' : 'Live Route OFF'}</span>
            </button>
          )}

          {onClearLiveData && liveStatusData && (
            <button
              type="button"
              onClick={onClearLiveData}
              className="px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all font-medium cursor-pointer"
              title="Clear live telemetry session"
            >
              Clear
            </button>
          )}
        </div>

        <span className="font-mono text-[10px] text-slate-400">
          Sync: {lastSyncTime}
        </span>
      </div>
    </aside>
  );
}

export default TrainOverviewCard;
