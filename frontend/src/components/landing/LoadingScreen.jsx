import React from 'react';

/*
 * LoadingScreen — RailRadar High-Tech Telemetry Initialization Overlay
 * Matches design.md Section 2 & Section 3
 */

export default function LoadingScreen({ progress = 0, ready = false }) {
  const pct = Math.round(progress * 100);

  return (
    <div
      className={`loading-screen ${ready ? 'loading-screen--hidden' : ''}`}
      aria-hidden={ready}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="loading-screen__content">
        {/* Brand Logo */}
        <div className="loading-screen__logo flex items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-sky-400 text-[26px]">directions_railway</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="loading-logo-rail">Rail</span>
            <span className="loading-logo-radar">Radar</span>
            <span className="font-mono text-[10px] bg-slate-800 text-sky-300 px-1.5 py-0.5 rounded border border-slate-700 ml-1">
              OCC
            </span>
          </div>
        </div>

        {/* Loading Subtitle */}
        <p className="loading-screen__status font-mono">
          INITIALIZING 240-FRAME WEBGL TELEMETRY ENGINE...
        </p>

        {/* Progress Bar Track */}
        <div className="loading-screen__bar-track">
          <div
            className="loading-screen__bar-fill"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>

        {/* Percentage Counter */}
        <p className="loading-screen__percent font-mono text-[11px] text-slate-400 mt-3">
          {pct}%
        </p>
      </div>
    </div>
  );
}
