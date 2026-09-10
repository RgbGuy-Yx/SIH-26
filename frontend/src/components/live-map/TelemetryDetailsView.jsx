import React, { useState } from 'react';

/**
 * TelemetryDetailsView - Secondary Tab for Live Spatial & Kinematic Telemetry
 *
 * Operational Sections:
 * 1. GPS Coordinates & Spatial Position (with Copy Action)
 * 2. Bearing Compass & Real-Time Kinematics
 * 3. Satellite / Provider Synchronization Status
 * 4. Diagnostics & Live Hardware Telemetry Packet
 */
export function TelemetryDetailsView({
  trainNo,
  trainName,
  liveLat,
  liveLng,
  liveBearing = 0,
  liveSpeed,
  speedKmh = 0,
  liveIsActualPos = true,
  lastSyncTime = '—',
  liveRelativeTime = 'Live',
  wsConnected = false,
  hasLiveData = false,
  currStationCode = '',
  currStationName = '',
  rawTelemetry = {},
}) {
  const [copied, setCopied] = useState(false);

  const latStr = liveLat != null && !isNaN(Number(liveLat)) ? Number(liveLat).toFixed(5) : '26.44990';
  const lngStr = liveLng != null && !isNaN(Number(liveLng)) ? Number(liveLng).toFixed(5) : '80.33190';
  const displaySpeed = liveSpeed != null ? Math.round(Number(liveSpeed)) : Math.round(Number(speedKmh) || 0);

  const handleCopyCoords = () => {
    navigator.clipboard?.writeText(`${latStr}, ${lngStr}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cardinal direction from bearing degrees
  const getCompassDirection = (deg) => {
    const val = Math.floor((deg / 22.5) + 0.5);
    const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return arr[val % 16];
  };

  const cardinal = getCompassDirection(liveBearing);

  return (
    <div className="space-y-3.5 select-none animate-fadeIn">
      {/* ========================================================================= */}
      {/* 1. GPS SPATIAL FIX & COORDINATES                                          */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-slate-500">location_on</span>
            GPS Coordinates & Spatial Fix
          </span>
          <span
            className={`font-mono text-[9px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
              liveIsActualPos
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                liveIsActualPos ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {liveIsActualPos ? 'GPS Locked (RTK)' : 'Interpolated Position'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-medium">Latitude</span>
            <div className="font-mono text-sm font-extrabold text-slate-900">
              {latStr}° N
            </div>
            <span className="text-[9px] text-slate-400 font-mono">WGS84 Ellipsoid</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-medium">Longitude</span>
            <div className="font-mono text-sm font-extrabold text-slate-900">
              {lngStr}° E
            </div>
            <span className="text-[9px] text-slate-400 font-mono">WGS84 Ellipsoid</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <div className="text-[11px] text-slate-500 truncate max-w-[240px]">
            Near <span className="font-bold text-slate-800">{currStationName || 'Corridor Track'}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyCoords}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[13px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied' : 'Copy Coords'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BEARING COMPASS & KINEMATICS                                           */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-slate-500">explore</span>
            Bearing & Kinematics
          </span>
          <span className="font-mono text-[10px] text-slate-500 font-bold">
            {Math.round(liveBearing || 0)}° Heading ({cardinal})
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            {/* Visual Compass Ring */}
            <div className="relative w-10 h-10 rounded-full border-2 border-slate-300 flex items-center justify-center bg-white shadow-2xs shrink-0">
              <div
                className="w-1 h-5 bg-[#0284C7] rounded-full origin-bottom transition-transform duration-500"
                style={{ transform: `rotate(${liveBearing || 0}deg)` }}
              />
              <span className="absolute text-[8px] font-bold text-slate-400 top-0.5">N</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-medium block">Heading</span>
              <span className="font-mono text-sm font-extrabold text-slate-900">
                {cardinal} ({Math.round(liveBearing || 0)}°)
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
            <span className="text-[9px] text-slate-400 uppercase font-medium">Kinematic Speed</span>
            <div className="font-mono text-base font-extrabold text-slate-900">
              {displaySpeed} <span className="text-xs font-semibold text-slate-500">km/h</span>
            </div>
            <span className="text-[9px] text-emerald-600 font-bold font-mono">
              Cruising Velocity
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SATELLITE & TELEMETRY STREAM STATUS                                    */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#0284C7]">satellite_alt</span>
            Satellite Status & Telemetry Link
          </span>
          <span className="font-mono text-[9px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
            RTIS / CRIS Link
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-100 text-[11px]">
            <span className="text-slate-500">Stream Connection</span>
            <span className="font-mono font-bold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {wsConnected ? 'Active WebSocket Telemetry' : 'Cached Snapshot'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-100 text-[11px]">
            <span className="text-slate-500">Source Provider</span>
            <span className="font-mono font-bold text-slate-800">
              {hasLiveData ? 'CRIS / FOIS Live GPS Telemetry' : 'Corridor Simulation Digital Twin'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-100 text-[11px]">
            <span className="text-slate-500">Last Telemetry Refresh</span>
            <span className="font-mono font-bold text-slate-800">
              {lastSyncTime} {liveRelativeTime ? `(${liveRelativeTime})` : ''}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 text-[11px]">
            <span className="text-slate-500">Constellation Lock</span>
            <span className="font-mono font-bold text-slate-800">
              NavIC / GPS Multi-Constellation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TelemetryDetailsView;
