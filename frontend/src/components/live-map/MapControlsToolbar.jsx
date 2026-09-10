import React from 'react';

/**
 * Handcrafted Minimal Floating OCC Command Bar (Top Center Island)
 * Unifies live satellite train telemetry status with layer switches and view toggles
 * in a single, non-overlapping, ultra-clean capsule.
 */
export function MapControlsToolbar({
  liveTrainData = null,
  onCenterLiveTrain = null,
  showLiveFeed = true,
  onToggleLiveFeed,
  showVirtualSim = true,
  onToggleVirtualSim,
  showOverviewCard = true,
  onToggleOverviewCard,
  hasLiveData = false,
}) {
  const isLiveGpsActive = Boolean(
    showLiveFeed &&
    liveTrainData &&
    liveTrainData.lat != null &&
    liveTrainData.lng != null &&
    !isNaN(liveTrainData.lat) &&
    !isNaN(liveTrainData.lng)
  );

  return (
    <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-1 sm:gap-2 p-1 pl-2.5 sm:pl-3 pr-1 rounded-full bg-slate-100/95 backdrop-blur-md border border-slate-200/90 shadow-2xs transition-all">

        {/* SECTION 1: Active Live GPS Train Telemetry Pill */}
        {isLiveGpsActive ? (
          <div className="flex items-center gap-1.5 sm:gap-2 pr-1 min-w-0">
            {/* Pulsing Satellite GPS Indicator */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>

            {/* Train Identification */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono font-bold text-[11px] text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300/80 shrink-0">
                #{liveTrainData.trainNo}
              </span>
              <span
                className="font-semibold text-xs text-slate-800 truncate max-w-[110px] sm:max-w-[160px] md:max-w-[200px]"
                title={liveTrainData.trainName}
              >
                {liveTrainData.trainName}
              </span>
              {liveTrainData.stationName && (
                <span
                  className="text-slate-500 text-[11px] hidden lg:inline truncate max-w-[130px]"
                  title={`Near ${liveTrainData.stationName}`}
                >
                  • {liveTrainData.stationName}
                </span>
              )}
            </div>

            {/* Fly-to-Center Action Button */}
            {onCenterLiveTrain && (
              <button
                type="button"
                onClick={onCenterLiveTrain}
                className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-200/80 hover:bg-slate-300/80 border border-slate-300/70 transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                title="Fly map camera to live train position"
              >
                <span className="material-symbols-outlined text-[13px] text-slate-700">my_location</span>
                <span className="hidden xs:inline">Center</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pr-1 min-w-0">
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            <span className="font-semibold text-xs text-slate-700 truncate max-w-[140px] sm:max-w-none">
              OCC Network
            </span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">• Live Grid</span>
          </div>
        )}

        {/* Vertical Divider */}
        <div className="h-4 w-px bg-slate-200/90 shrink-0 mx-0.5" />

        {/* SECTION 2: Layer & View Control Segmented Switchers */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Live Feed Toggle */}
          <button
            type="button"
            onClick={onToggleLiveFeed}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showLiveFeed
                ? 'bg-slate-200/90 text-slate-800 border border-slate-300/80 shadow-2xs hover:bg-slate-300/80'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 border border-transparent'
            }`}
            title={showLiveFeed ? 'Hide live GPS train layer from map' : 'Show live GPS train layer on map'}
          >
            <span className={`material-symbols-outlined text-[15px] ${showLiveFeed ? 'text-emerald-600' : 'text-slate-400'}`}>
              {showLiveFeed ? 'sensors' : 'sensors_off'}
            </span>
            <span className="hidden sm:inline text-[11px]">Live Feed</span>
            {hasLiveData && (
              <span className={`w-1.5 h-1.5 rounded-full ${showLiveFeed ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            )}
          </button>

          {/* Virtual Sim Toggle */}
          <button
            type="button"
            onClick={onToggleVirtualSim}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showVirtualSim
                ? 'bg-slate-200/90 text-slate-800 border border-slate-300/80 shadow-2xs hover:bg-slate-300/80'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 border border-transparent'
            }`}
            title={showVirtualSim ? 'Hide simulation digital twin layer' : 'Show simulation digital twin layer'}
          >
            <span className={`material-symbols-outlined text-[15px] ${showVirtualSim ? 'text-slate-700' : 'text-slate-400'}`}>
              memory
            </span>
            <span className="hidden sm:inline text-[11px]">Sim Twin</span>
          </button>

          {/* Train Overview Card Toggle */}
          <button
            type="button"
            onClick={onToggleOverviewCard}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showOverviewCard
                ? 'bg-slate-300/90 text-slate-900 border border-slate-400/80 font-bold shadow-2xs hover:bg-slate-400/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
            }`}
            title={showOverviewCard ? 'Hide train overview telemetry panel' : 'Open train overview telemetry panel'}
          >
            <span className="material-symbols-outlined text-[15px]">
              {showOverviewCard ? 'visibility' : 'visibility_off'}
            </span>
            <span className="text-[11px]">Overview</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MapControlsToolbar;
