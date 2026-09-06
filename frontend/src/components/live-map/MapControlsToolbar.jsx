import React from 'react';

/**
 * Top-Right floating toolbar for toggling map layers and overview card
 */
export function MapControlsToolbar({
  showLiveFeed,
  onToggleLiveFeed,
  showVirtualSim,
  onToggleVirtualSim,
  showOverviewCard,
  onToggleOverviewCard,
  hasLiveData,
}) {
  return (
    <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
      {/* Toggle Live Feed */}
      <button
        type="button"
        onClick={onToggleLiveFeed}
        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all ${
          showLiveFeed
            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
            : 'bg-white/95 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'
        }`}
        title={showLiveFeed ? 'Click to hide Live Feed from map' : 'Click to show Live Feed on map'}
      >
        <span className="material-symbols-outlined text-[16px]">
          {showLiveFeed ? 'sensors' : 'sensors_off'}
        </span>
        <span>{showLiveFeed ? 'Live Feed' : 'Live Feed (Hidden)'}</span>
        {hasLiveData && (
          <span className={`w-1.5 h-1.5 rounded-full ${showLiveFeed ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
        )}
      </button>

      {/* Toggle Virtual Simulation */}
      <button
        type="button"
        onClick={onToggleVirtualSim}
        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all ${
          showVirtualSim
            ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
            : 'bg-white/95 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'
        }`}
        title={showVirtualSim ? 'Click to hide Virtual Simulation from map' : 'Click to show Virtual Simulation on map'}
      >
        <span className="material-symbols-outlined text-[16px]">
          {showVirtualSim ? 'memory' : 'memory'}
        </span>
        <span>{showVirtualSim ? 'Virtual Sim' : 'Virtual Sim (Hidden)'}</span>
      </button>

      {/* Train Overview Card Toggle */}
      <button
        type="button"
        onClick={onToggleOverviewCard}
        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-md backdrop-blur-md flex items-center gap-1.5 transition-all ${
          showOverviewCard
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white'
        }`}
        title={showOverviewCard ? 'Hide Train Overview Card' : 'Show Train Overview Card'}
      >
        <span className="material-symbols-outlined text-[16px]">
          {showOverviewCard ? 'visibility' : 'visibility_off'}
        </span>
        <span>Train Overview</span>
      </button>
    </div>
  );
}
