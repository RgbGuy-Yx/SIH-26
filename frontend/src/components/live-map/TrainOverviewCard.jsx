import React from 'react';
import { LiveTelemetryView } from './LiveTelemetryView';
import { VirtualSimulationView } from './VirtualSimulationView';

/**
 * Floating Right Sidebar: Train Overview Card (Professional Industrial OCC Design)
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
  overviewTab = 'live',
  setOverviewTab,
  showLiveFeed = true,
  onToggleHideLiveFeed,
  showVirtualSim = true,
  onToggleVirtualSim,
  liveTelemetryProps = {},
  virtualSimulationProps = {},
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const tierLabel =
    priorityTier === 1
      ? 'Tier 1 • High Precedence'
      : priorityTier === 2
      ? 'Tier 2 • Superfast'
      : priorityTier === 3
      ? 'Tier 3 • Standard'
      : 'Tier 4 • Freight';

  return (
    <aside
      className={`absolute top-14 right-4 bottom-4 z-20 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out animate-fadeIn ${
        isExpanded
          ? 'w-[720px] lg:w-[800px] xl:w-[860px]'
          : 'w-[450px] sm:w-[490px] lg:w-[530px]'
      }`}
    >
      {/* 1. Industrial Header: Identity & Context */}
      <div className="p-3.5 border-b border-slate-200/80 shrink-0 space-y-2.5 bg-white/80">
        {/* Train Identification Strip */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 truncate">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-slate-900 text-white shrink-0 shadow-2xs">
                #{trainNo}
              </span>
              <h3 className="font-bold text-sm text-slate-900 truncate tracking-tight">
                {trainName}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
              <span>{tierLabel}</span>
              <span>•</span>
              <span className="font-mono text-slate-700">{speedKmh} km/h</span>
            </div>
          </div>

          {/* Sync / Live Badge & Wide Console View Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 border border-slate-200">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-[10px] font-mono font-semibold text-slate-700">
                {wsConnected ? 'SYNCED' : 'OFFLINE'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              title={isExpanded ? 'Collapse to standard view' : 'Expand to wide OCC workstation view'}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isExpanded ? 'close_fullscreen' : 'open_in_full'}
              </span>
            </button>
          </div>
        </div>

        {/* Integrated Train Search & Live Telemetry Action Bar */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="relative flex-1">
            <span className="text-[11px] text-slate-400 absolute left-2.5 top-1.5 font-mono font-bold">#</span>
            <input
              type="text"
              value={customTrainInput}
              onChange={(e) => setCustomTrainInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customTrainInput.trim()) {
                  handleFetchLiveStatus(Number(customTrainInput.trim()));
                }
              }}
              placeholder="Enter Train Number"
              className="w-full pl-6 pr-2 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00A3C4] transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => handleFetchLiveStatus()}
            disabled={liveStatusLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 ${
              liveStatusLoading
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-wait'
                : liveStatusData
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'
            }`}
            title="Fetch real-time satellite telemetry"
          >
            {liveStatusLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[15px]">
                {liveStatusData ? 'sync' : 'sensors'}
              </span>
            )}
            <span>{liveStatusData ? 'Refresh' : 'Fetch Live'}</span>
          </button>
        </div>

        {/* 2-Way Segmented Controller (Linear / iOS Style) */}
        <div className="p-0.5 bg-slate-100 rounded-lg flex items-center border border-slate-200">
          <button
            type="button"
            onClick={() => setOverviewTab('live')}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
              overviewTab === 'live'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                liveStatusData
                  ? showLiveFeed
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            />
            <span>Live Telemetry</span>
            {!showLiveFeed && <span className="text-[9px] text-amber-600 font-normal">(Hidden)</span>}
          </button>

          <button
            type="button"
            onClick={() => setOverviewTab('simulation')}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
              overviewTab === 'simulation'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[13px] text-indigo-600">memory</span>
            <span>Corridor Digital Twin</span>
            {!showVirtualSim && <span className="text-[9px] text-amber-600 font-normal">(Hidden)</span>}
          </button>
        </div>
      </div>

      {/* 2. Structured Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-3.5 space-y-3 text-xs">
        {overviewTab === 'live' ? (
          <LiveTelemetryView
            isExpanded={isExpanded}
            showLiveFeed={showLiveFeed}
            onToggleHideLiveFeed={onToggleHideLiveFeed}
            liveStatusLoading={liveStatusLoading}
            liveStatusError={liveStatusError}
            onDismissError={onDismissError}
            liveStatusData={liveStatusData}
            onFetchLiveStatus={handleFetchLiveStatus}
            onClearLiveData={onClearLiveData}
            customTrainInput={customTrainInput}
            trainNo={trainNo}
            {...liveTelemetryProps}
          />
        ) : (
          <VirtualSimulationView
            isExpanded={isExpanded}
            showVirtualSim={showVirtualSim}
            onToggleVirtualSim={onToggleVirtualSim}
            lastSyncTime={lastSyncTime}
            {...virtualSimulationProps}
          />
        )}
      </div>
    </aside>
  );
}
