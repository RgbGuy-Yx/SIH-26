import React from 'react';

/**
 * SignalsOccView - Streamlined, Razor-Sharp Operational Console
 *
 * Built for Indian Railways Section Controllers:
 * 1. Signal Ahead & Permitted Speed (Instant safety aspect check)
 * 2. Platform Reception at Next Station (Platform #, reservation status)
 * 3. Following Distance (Headway buffer to leading train)
 */
export function SignalsOccView({
  platformAlloc = null,
  conflictRisk = null,
  hasActiveConflict = false,
  conflictDelay = 0,
  currStationCode = '',
  currStationName = '',
  nextStationCode = '',
  nextStationName = '',
  priorityTier = 3,
  trainNo,
  speedKmh = 0,
  maxSpeedKmh = 130,
}) {
  const isHeld = hasActiveConflict || (conflictRisk && conflictRisk.level === 'HIGH');
  const isCaution = speedKmh < 50 || (conflictRisk && conflictRisk.level === 'MODERATE') || conflictDelay > 0;

  // Signal Aspect State
  const signal = isHeld
    ? {
        aspect: 'Red (Danger / Stop)',
        instruction: 'Train is held on loop siding until the faster service passes ahead.',
        color: 'bg-rose-500',
        text: 'text-rose-700',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        limitKmh: 0,
      }
    : isCaution
      ? {
          aspect: 'Yellow (Caution • 45 km/h)',
          instruction: 'Slowing down to maintain safe distance and avoid stopping at the next signal.',
          color: 'bg-amber-500',
          text: 'text-amber-700',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          limitKmh: 45,
        }
      : {
          aspect: 'Green (Clear • Line Speed)',
          instruction: 'Track ahead is completely clear. Cruising at scheduled speed.',
          color: 'bg-emerald-500',
          text: 'text-emerald-700',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          limitKmh: maxSpeedKmh || 130,
        };

  const headwayMins = conflictRisk?.headway_buffer_minutes || conflictDelay || 5.0;

  return (
    <div className="space-y-3 select-none animate-fadeIn text-slate-800">
      {/* 1. SIGNAL AHEAD & PERMITTED SPEED */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#0284C7]">traffic</span>
            Railway Signal Ahead
          </span>
          <span className="text-[10px] font-mono font-bold text-slate-500">
            Next Signal: {nextStationCode || 'Auto Block'}
          </span>
        </div>

        {/* Signal Aspect Banner */}
        <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${signal.bg} ${signal.border}`}>
          <div className="flex items-center gap-2.5">
            <span className={`w-3.5 h-3.5 rounded-full ${signal.color} shrink-0 shadow-xs animate-pulse`} />
            <div>
              <span className={`font-mono text-xs font-bold block ${signal.text}`}>
                {signal.aspect}
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                {signal.instruction}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 pl-2 border-l border-slate-200/60">
            <span className="text-[9px] text-slate-400 uppercase font-mono block">Max Speed</span>
            <span className="font-mono text-sm font-black text-slate-900">{signal.limitKmh} km/h</span>
          </div>
        </div>

        {/* Quick Track Status */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Track Section</span>
            <span className="font-mono font-bold text-slate-800 text-[11px]">
              {isHeld ? 'Holding on Loop Siding' : `In Transit (#${trainNo})`}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Track Ahead</span>
            <span className="font-mono font-bold text-slate-800 text-[11px]">
              {isHeld ? 'Waiting for Line Clearance' : 'Clear for Transit'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. PLATFORM RECEPTION AT NEXT STATION */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#0284C7]">door_front</span>
            Platform at Next Station
          </span>
          <span
            className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase border ${
              platformAlloc?.clearance_status?.includes('OCCUPIED') ||
              platformAlloc?.clearance_status?.includes('CONTENTION')
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : platformAlloc?.clearance_status?.includes('RESERVED')
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {platformAlloc?.clearance_status?.includes('OCCUPIED')
              ? 'Platform Busy'
              : platformAlloc?.clearance_status?.includes('RESERVED')
                ? 'Platform Reserved'
                : 'Platform Clear'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[9px] text-slate-400 block uppercase font-semibold">Assigned Platform</span>
            <span className="font-mono text-lg font-black text-slate-900 block mt-0.5">
              {platformAlloc?.platform || 'PF 1'}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">Ready for Reception</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
            <span className="text-[9px] text-slate-400 block uppercase font-semibold">Approaching Station</span>
            <span className="font-bold text-slate-900 text-xs block truncate">
              {platformAlloc?.station_name || nextStationName || 'Upcoming Station'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block">
              Code: {platformAlloc?.station_code || nextStationCode || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. FOLLOWING DISTANCE (HEADWAY) */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#0284C7]">space_dashboard</span>
            Following Distance & Safe Spacing
          </span>
          <span className="font-mono text-[10px] text-slate-500 font-bold">
            {isHeld ? 'Paused on Siding' : 'Safe Spacing Maintained'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Safety Headway Buffer</span>
            <span className="font-mono text-base font-black text-slate-900 block mt-0.5">
              +{Number(headwayMins).toFixed(1)} mins
            </span>
            <span className="text-[10px] text-slate-500 block">Gap behind front train</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[9px] text-slate-400 uppercase font-semibold block">Priority Tier</span>
            <span className="font-mono text-xs font-bold text-slate-900 block mt-1">
              Tier {priorityTier} • {priorityTier === 1 ? 'High Priority' : priorityTier === 2 ? 'Superfast' : priorityTier === 3 ? 'Express' : 'Freight'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Automated dispatch rule</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignalsOccView;
