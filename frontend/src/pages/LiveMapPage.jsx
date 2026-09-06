import React, { useState, useMemo } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { MapLibreRailwayMap } from '../components/MapLibreRailwayMap';

export function LiveMapPage() {
  const {
    topology,
    isLoadingTopology,
    trains,
    activeConflicts,
    selectedTrainNo,
    selectedTrain,
    setSelectedTrainNo,
    simulationTime,
    wsConnected,
  } = useSimulation();

  const [selectedStation, setSelectedStation] = useState('Kanpur Central (CNB)');
  const [showFloatingInspector, setShowFloatingInspector] = useState(true);

  // Build station code -> full name dictionary from topology
  const stationNameMap = useMemo(() => {
    const map = {};
    if (topology?.stations) {
      topology.stations.forEach((s) => {
        map[s.station_id] = s.name;
      });
    }
    return map;
  }, [topology]);

  const getStationLabel = (code) => {
    if (!code) return '—';
    const name = stationNameMap[code];
    return name ? `${name} (${code})` : code;
  };

  const formatHumanTime = (timeStr) => {
    if (!timeStr) return '—';
    try {
      if (timeStr.includes('T') || timeStr.includes(' ')) {
        const parts = timeStr.replace('T', ' ').split(' ');
        const timePart = parts[1] || parts[0];
        const [hh, mm] = timePart.split(':');
        const h = parseInt(hh, 10);
        if (isNaN(h)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedH = h % 12 === 0 ? 12 : h % 12;
        return `${formattedH}:${mm} ${ampm}`;
      } else if (timeStr.includes(':')) {
        const [hh, mm] = timeStr.split(':');
        const h = parseInt(hh, 10);
        if (isNaN(h)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedH = h % 12 === 0 ? 12 : h % 12;
        return `${formattedH}:${mm} ${ampm}`;
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  // Selected train dynamic attributes
  const trainNo = selectedTrain?.train_no || (trains.length > 0 ? trains[0].train_no : 12003);
  const trainName = selectedTrain?.train_name || 'Swarna Shatabdi Express';
  const priorityTier = selectedTrain?.priority_tier || 1;
  const currentStn = selectedTrain?.current_station || 'NDLS';
  const nextStn = selectedTrain?.next_station || 'CNB';
  const originStn = selectedTrain?.origin_station;
  const destStn = selectedTrain?.destination_station;
  const status = selectedTrain?.train_status || 'RUNNING';

  // Decoupled delay terms
  const accumulatedDelay = Math.round(selectedTrain?.current_accumulated_delay || 0);
  const mlDelay = Math.round(selectedTrain?.ml_predicted_delay || selectedTrain?.ml_delay_prediction || 0);
  const conflictDelay = Math.round(selectedTrain?.conflict_delay || 0);
  const finalDelay = Math.round(selectedTrain?.final_predicted_delay || (accumulatedDelay + mlDelay + conflictDelay));

  // Upcoming 2-3 stops
  const upcomingStops = selectedTrain?.upcoming_stops || [];

  // Timetable Scheduled ETA vs AI Dynamic Predicted ETA
  const rawSchedEta = selectedTrain?.scheduled_arrival || selectedTrain?.scheduled_arrival_next || (upcomingStops.length > 0 ? upcomingStops[0].scheduled_arrival : null);
  const rawPredEta = selectedTrain?.predicted_eta || selectedTrain?.simulated_arrival || rawSchedEta;
  const formattedSchedEta = formatHumanTime(rawSchedEta);
  const formattedPredEta = formatHumanTime(rawPredEta);

  // Status & Journey Completion
  const isCompleted = status === 'COMPLETED' || status === 'ARRIVED';
  const progressPercent = isCompleted ? 100 : Math.min(100, Math.max(0, Math.round((selectedTrain?.route_progress || 0) * 100)));

  // NetworkX Conflict Detection
  const hasActiveConflict = Boolean(
    selectedTrain?.has_active_conflict ||
    conflictDelay > 0 ||
    status === 'HOLDING' ||
    (activeConflicts && activeConflicts.some((c) => c.train_no === trainNo))
  );

  // Operational speed from dynamic WebSocket stream or priority tier
  const speedKmh = selectedTrain?.speed_kmh !== undefined && selectedTrain?.speed_kmh !== null
    ? Math.round(selectedTrain.speed_kmh)
    : isCompleted || status === 'AT_STATION' || status === 'NOT_STARTED' || status === 'HOLDING'
    ? 0
    : priorityTier === 1
    ? 130
    : priorityTier === 2
    ? 110
    : priorityTier === 3
    ? 80
    : 65;

  // Live Sync Indicator with simulation clock time
  const lastSyncTime = formatHumanTime(simulationTime);

  // Dynamic AI Operational Reasoning directly from backend WebSocket or contextual fallback
  const plainReason = selectedTrain?.ai_reasoning || (
    isCompleted
      ? `Train has reached its final scheduled destination station. Platform clearance and turnaround in progress.`
      : hasActiveConflict || status === 'HOLDING'
      ? `NetworkX conflict engine detected section contention. Train yielded precedence and is held on loop line (+${conflictDelay}m hold).`
      : status === 'AT_STATION'
      ? `Scheduled operational platform halt at ${getStationLabel(currentStn)}. Passenger boarding and scheduled departure on block clearance.`
      : finalDelay > 15
      ? `Carrying ${accumulatedDelay}m accumulated delay plus ${mlDelay}m ML predicted buffer. Dynamic pacing adjustments active.`
      : finalDelay > 0
      ? `Minor pacing variance (+${finalDelay}m). AI models project time recovery before reaching ${getStationLabel(nextStn)}.`
      : `Operating on schedule with clear line signals and nominal cruise velocity (${speedKmh} km/h).`
  );

  // Context-aware status banner
  let statusBanner = {
    title: 'Cruising on Track',
    subtitle: `Signals clear • Nominal velocity ${speedKmh} km/h`,
    badgeClass: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
    icon: 'check_circle',
  };

  if (isCompleted) {
    statusBanner = {
      title: 'Journey Completed',
      subtitle: `Arrived at destination ${getStationLabel(destStn || currentStn)}`,
      badgeClass: 'bg-slate-900/90 border-slate-700 text-slate-300',
      icon: 'task_alt',
    };
  } else if (hasActiveConflict || status === 'HOLDING') {
    statusBanner = {
      title: 'Holding on Loop Line (Conflict)',
      subtitle: `Waiting at ${getStationLabel(currentStn)} for higher-priority overtake`,
      badgeClass: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
      icon: 'pause_circle',
    };
  } else if (status === 'AT_STATION') {
    statusBanner = {
      title: `Station Dwell: ${getStationLabel(currentStn)}`,
      subtitle: 'Passenger boarding & platform stop',
      badgeClass: 'bg-blue-950/70 border-blue-500/40 text-blue-300',
      icon: 'storefront',
    };
  } else if (finalDelay > 15) {
    statusBanner = {
      title: `Delayed (+${finalDelay} mins)`,
      subtitle: `Section congestion / speed buffer active`,
      badgeClass: 'bg-red-950/70 border-red-500/40 text-red-300',
      icon: 'warning',
    };
  } else if (finalDelay > 0) {
    statusBanner = {
      title: `Minor Delay (+${finalDelay} mins)`,
      subtitle: 'Expected to recover time on open line',
      badgeClass: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
      icon: 'info',
    };
  }

  return (
    <div className="flex flex-col w-full p-3 sm:p-5">
      {/* Full View Tactical Railway Viewport Container */}
      <div className="w-full h-[calc(100vh-130px)] min-h-[720px] bg-surface-container-lowest rounded-xl relative overflow-hidden shadow-2xl flex flex-col justify-between border border-slate-800/80">
        <MapLibreRailwayMap
          topology={topology}
          trains={trains}
          selectedTrainNo={selectedTrainNo}
          onSelectTrain={setSelectedTrainNo}
          selectedStation={selectedStation}
          onSelectStation={setSelectedStation}
        />

        {/* Floating Telemetry Inspector HUD Overlay (Clean, Structured, & Minimal) */}
        {!showFloatingInspector ? (
          <button
            type="button"
            onClick={() => setShowFloatingInspector(true)}
            className="absolute top-16 right-4 z-20 px-3.5 py-2 rounded-lg bg-slate-950/90 hover:bg-slate-900 border border-cyan-500/50 text-cyan-300 text-xs font-semibold shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105"
            title="Open Telemetry Inspector Panel"
          >
            <span className="material-symbols-outlined text-[18px] text-cyan-400">train</span>
            <span>Show Train Inspector</span>
          </button>
        ) : (
          <div className="absolute top-16 right-4 z-20 w-88 sm:w-[410px] max-h-[calc(100%-5rem)] overflow-y-auto bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.85)] space-y-3.5 text-xs transition-all">
            {/* 1. Header: Train No, Priority Tier, Live Feed Status */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-600 font-mono text-[11px] font-bold text-white shadow-sm">
                  {trainNo}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    priorityTier === 1
                      ? 'bg-blue-950 border border-blue-600 text-blue-200'
                      : priorityTier === 2
                      ? 'bg-purple-950 border border-purple-600 text-purple-200'
                      : priorityTier === 3
                      ? 'bg-slate-900 border border-slate-700 text-slate-300'
                      : 'bg-amber-950 border border-amber-600 text-amber-200'
                  }`}
                >
                  {priorityTier === 1
                    ? 'Priority Tier 1 (High)'
                    : priorityTier === 2
                    ? 'Priority Tier 2 (Express)'
                    : priorityTier === 3
                    ? 'Priority Tier 3 (Standard)'
                    : 'Priority Tier 4 (Freight)'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-800">
                  <span
                    className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
                  ></span>
                  <span className="text-[10px] font-medium text-slate-300">
                    {wsConnected ? `Live • ${lastSyncTime}` : 'Syncing'}
                  </span>
                </div>
                <button
                  onClick={() => setShowFloatingInspector(false)}
                  className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Minimize Inspector Panel"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>

            {/* 2. Train Name + Origin ➔ Destination */}
            <div>
              <h2 className="text-base font-bold text-white tracking-tight leading-snug">{trainName}</h2>
              {(originStn || destStn) && (
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <span className="truncate max-w-[150px]">{getStationLabel(originStn)}</span>
                  <span className="text-cyan-400 font-bold">➔</span>
                  <span className="truncate max-w-[150px]">{getStationLabel(destStn)}</span>
                </p>
              )}
            </div>

            {/* 3. Operational Conflict Alert (if NetworkX conflict detected) */}
            {hasActiveConflict && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/50 flex items-start gap-2 text-red-200">
                <span className="material-symbols-outlined text-[18px] text-red-400 shrink-0 mt-0.5">
                  warning
                </span>
                <div className="space-y-0.5 flex-1">
                  <div className="font-bold text-[11px] flex items-center justify-between">
                    <span>NetworkX Conflict: Precedence Hold</span>
                    {conflictDelay > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-red-900/80 text-red-200 text-[9px] font-mono">
                        +{conflictDelay}m hold
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-red-300/90 leading-tight">
                    Yielding mainline track clearance on loop line for higher-priority service overtake.
                  </div>
                </div>
              </div>
            )}

            {/* 4. Status Banner */}
            <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${statusBanner.badgeClass}`}>
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">{statusBanner.icon}</span>
              <div className="space-y-0.5">
                <div className="font-bold text-xs">{statusBanner.title}</div>
                <div className="text-[11px] opacity-90">{statusBanner.subtitle}</div>
              </div>
            </div>

            {/* 5. Journey Section Progress Bar */}
            <div className="p-3 rounded-lg bg-surface-container-lowest border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Journey Progress:</span>
                <span className="font-mono text-cyan-400 font-bold">{progressPercent}% Traveled</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span className="truncate max-w-[140px]">{getStationLabel(currentStn)}</span>
                <span className="text-slate-500 font-bold px-1">➔</span>
                <span className="truncate max-w-[140px] text-cyan-300 text-right">
                  {isCompleted ? 'Terminus Reached' : getStationLabel(nextStn)}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* 6. Key Metrics Grid: Scheduled vs Predicted ETA, Current vs Final Delay, Speed */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {/* Scheduled ETA */}
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <span className="text-[9px] text-slate-400 uppercase font-semibold">Scheduled ETA</span>
                <div className="text-sm font-extrabold text-slate-200 font-mono my-0.5">{formattedSchedEta}</div>
                <div className="text-[9px] text-slate-400">Timetable Baseline</div>
              </div>

              {/* Predicted ETA */}
              <div
                className={`p-2 rounded-lg border flex flex-col justify-between ${
                  finalDelay > 15
                    ? 'bg-red-950/30 border-red-500/40'
                    : finalDelay > 0
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-emerald-950/30 border-emerald-500/40'
                }`}
              >
                <span
                  className={`text-[9px] uppercase font-semibold ${
                    finalDelay > 15 ? 'text-red-300' : finalDelay > 0 ? 'text-amber-300' : 'text-emerald-300'
                  }`}
                >
                  Predicted ETA
                </span>
                <div
                  className={`text-sm font-extrabold font-mono my-0.5 ${
                    finalDelay > 15 ? 'text-red-300' : finalDelay > 0 ? 'text-amber-300' : 'text-emerald-300'
                  }`}
                >
                  {formattedPredEta}
                </div>
                <div
                  className={`text-[9px] font-semibold truncate ${
                    finalDelay > 15 ? 'text-red-400' : finalDelay > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {finalDelay > 0 ? `+${finalDelay}m Delay` : 'On Time (0m)'}
                </div>
              </div>

              {/* Speed & Carried Delay */}
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                <span className="text-[9px] text-slate-400 uppercase font-semibold">Speed & Lag</span>
                <div className="flex items-baseline justify-center gap-1 my-0.5">
                  <span className="text-sm font-extrabold text-white font-mono">{speedKmh}</span>
                  <span className="text-[9px] text-slate-400">km/h</span>
                </div>
                <div className="text-[9px] text-slate-300 font-mono">
                  Lag: <span className={accumulatedDelay > 0 ? 'text-amber-400' : 'text-slate-300'}>+{accumulatedDelay}m</span>
                </div>
              </div>
            </div>

            {/* 7. Next 2-3 Upcoming Stations with Predicted ETAs */}
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-blue-400">pin_drop</span>
                  Upcoming Stations
                </span>
                <span>{isCompleted ? 'Finished' : `${upcomingStops.length} stops ahead`}</span>
              </div>

              {isCompleted ? (
                <div className="p-2 rounded bg-slate-950/70 border border-slate-800 text-center text-slate-400 text-[11px]">
                  All scheduled route stations traversed.
                </div>
              ) : upcomingStops.length > 0 ? (
                <div className="space-y-1 pt-0.5">
                  {upcomingStops.slice(0, 3).map((stop, i) => (
                    <div
                      key={stop.station_code || i}
                      className="flex items-center justify-between p-1.5 rounded bg-slate-950/80 border border-slate-800/60 text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-4 h-4 rounded-full bg-blue-950 border border-blue-600 text-blue-300 text-[9px] flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span className="font-medium text-white truncate max-w-[140px]">
                          {getStationLabel(stop.station_code)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-right text-[10px]">
                        {stop.scheduled_arrival && (
                          <span className="text-slate-400 font-mono">
                            Sched: {formatHumanTime(stop.scheduled_arrival)}
                          </span>
                        )}
                        <span className="font-mono font-bold text-cyan-300">
                          ETA: {formatHumanTime(stop.predicted_eta || stop.scheduled_arrival)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between p-1.5 rounded bg-slate-950/80 border border-slate-800/60 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-950 border border-blue-600 text-blue-300 text-[9px] flex items-center justify-center font-bold">
                      1
                    </span>
                    <span className="font-medium text-white">{getStationLabel(nextStn)}</span>
                  </div>
                  <div className="text-right font-mono font-bold text-cyan-300 text-[10px]">
                    ETA: {formattedPredEta}
                  </div>
                </div>
              )}
            </div>

            {/* 8. AI Operational Reasoning */}
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-[11px]">
                <span className="material-symbols-outlined text-blue-400 text-[15px]">auto_awesome</span>
                <span>AI Operational Reasoning</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed pl-1">{plainReason}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveMapPage;
