import React, { useState, useEffect, useMemo } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { api } from '../services/api';
import { formatTimeWithAmPm, calculateExpectedTime } from '../utils/dateTimeUtils';

/**
 * Classifies train into category for filtering.
 */
function getTrainType(train) {
  const name = (train.train_name || '').toUpperCase();
  if (name.includes('RAJDHANI') || name.includes('RAJDHNI')) return 'RAJDHANI';
  if (name.includes('SHATABDI')) return 'SHATABDI';
  if (
    name.includes('VANDE BHARAT') ||
    name.includes('GARIBRATH') ||
    name.includes('GARIB RATH') ||
    name.includes('SUPERFAST')
  ) {
    return 'SUPERFAST_EXPRESS';
  }
  if (
    name.includes('FREIGHT') ||
    name.includes('GOODS') ||
    name.includes('NBOX') ||
    name.includes('CONTAINER') ||
    train.priority_tier === 4 ||
    name.includes('MEMU') ||
    name.includes('PASS')
  ) {
    return 'FREIGHT';
  }
  return 'EXPRESS';
}

/**
 * Priority Tier formatting and styling.
 */
function getPriorityInfo(tier) {
  switch (tier) {
    case 1:
      return { label: 'Tier 1', color: 'bg-blue-50 text-blue-700 border border-blue-200' };
    case 2:
      return { label: 'Tier 2', color: 'bg-amber-50 text-amber-700 border border-amber-200' };
    case 3:
      return { label: 'Tier 3', color: 'bg-purple-50 text-purple-700 border border-purple-200' };
    case 4:
    default:
      return { label: 'Tier 4', color: 'bg-slate-100 text-slate-700 border border-slate-200' };
  }
}

/**
 * Derives badge status and styling based on live train telemetry and delay.
 */
function getStatusInfo(train) {
  const status = train.train_status || 'RUNNING';
  const delay = Math.round(train.final_predicted_delay || train.current_accumulated_delay || 0);

  if (status === 'HOLDING' || train.has_active_conflict) {
    return {
      text: delay > 0 ? `Held at Loop (+${delay}m)` : 'Held at Loop',
      color: 'bg-amber-50 text-amber-700 border border-amber-200',
    };
  }
  if (status === 'NOT_STARTED') {
    return {
      text: 'Scheduled',
      color: 'bg-slate-100 text-slate-700 border border-slate-200',
    };
  }
  if (status === 'ARRIVED' || status === 'COMPLETED') {
    return {
      text: 'Completed',
      color: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
  }
  if (status === 'AT_STATION') {
    return {
      text: delay > 15 ? `At Station (+${delay}m)` : 'At Station',
      color: delay > 15 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200',
    };
  }
  if (delay > 15 || status === 'DELAYED') {
    return {
      text: `Delayed (+${delay}m)`,
      color: 'bg-red-50 text-red-700 border border-red-200',
    };
  }
  return {
    text: 'On Time',
    color: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };
}

export function TrainsPage() {
  const { trains: simTrains, wsConnected, topology, selectedTrainNo, setSelectedTrainNo } = useSimulation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [initialTrains, setInitialTrains] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial trains list from backend API
  useEffect(() => {
    let isMounted = true;
    async function fetchTrains() {
      try {
        const data = await api.getTrains();
        if (isMounted && Array.isArray(data)) {
          setInitialTrains(data);
        }
      } catch (err) {
        console.error('Failed to load initial trains list:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchTrains();
    return () => {
      isMounted = false;
    };
  }, []);

  // Map station codes to human-readable station names
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

  // Combine initial trains with real-time WebSocket telemetry updates
  const combinedTrains = useMemo(() => {
    const map = new Map();

    initialTrains.forEach((t) => {
      map.set(Number(t.train_no), { ...t });
    });

    if (Array.isArray(simTrains)) {
      simTrains.forEach((st) => {
        const trainNo = Number(st.train_no);
        const base = map.get(trainNo) || {};
        map.set(trainNo, {
          ...base,
          ...st,
        });
      });
    }

    return Array.from(map.values());
  }, [initialTrains, simTrains]);

  // Format route string (e.g., origin -> intermediate/next -> destination)
  const formatRoute = (train) => {
    if (train.route_stations && train.route_stations.length > 0) {
      const stations = train.route_stations;
      if (stations.length <= 3) {
        return stations.join(' ➔ ');
      }
      return `${stations[0]} ➔ ${train.next_station || stations[Math.floor(stations.length / 2)]} ➔ ${
        stations[stations.length - 1]
      }`;
    }
    if (train.origin_station && train.destination_station) {
      return `${train.origin_station} ➔ ${train.next_station || '...'} ➔ ${train.destination_station}`;
    }
    return 'NR / NCR Corridor';
  };

  const formatHumanTime = (timeStr) => {
    if (!timeStr) return '—';
    return formatTimeWithAmPm(timeStr);
  };

  // Dynamic KPI Metrics calculations
  const totalTrainsCount = combinedTrains.length;

  const activeTrains = combinedTrains.filter(
    (t) => t.train_status !== 'COMPLETED' && t.train_status !== 'ARRIVED' && t.train_status !== 'NOT_STARTED'
  );
  // If simulation is not started yet, consider all active rolling stock in the network
  const activeTrainsCount = activeTrains.length > 0 ? activeTrains.length : totalTrainsCount;

  const onTimeTrains = combinedTrains.filter((t) => {
    const delay = Number(t.final_predicted_delay || t.current_accumulated_delay || 0);
    return delay <= 15 && t.train_status !== 'DELAYED';
  });
  const onTimeCount = onTimeTrains.length;
  const onTimePercentage = totalTrainsCount > 0 ? Math.round((onTimeCount / totalTrainsCount) * 100) : 100;

  const delayedTrains = combinedTrains.filter((t) => {
    const delay = Number(t.final_predicted_delay || t.current_accumulated_delay || 0);
    return delay > 15 || t.train_status === 'DELAYED';
  });
  const delayedCount = delayedTrains.length;

  const freightTrains = combinedTrains.filter((t) => {
    const type = getTrainType(t);
    return type === 'FREIGHT' || t.priority_tier === 4;
  });
  const freightCount = freightTrains.length;

  // Filtered and searched trains list
  const filteredTrains = combinedTrains.filter((t) => {
    const trainNo = String(t.train_no || '');
    const trainName = (t.train_name || '').toLowerCase();
    const route = formatRoute(t).toLowerCase();
    const nextStn = (t.next_station || '').toLowerCase();
    const currStn = (t.current_station || '').toLowerCase();
    const nextStnLabel = getStationLabel(t.next_station).toLowerCase();
    const currStnLabel = getStationLabel(t.current_station).toLowerCase();
    const term = searchTerm.trim().toLowerCase();

    const matchesSearch =
      !term ||
      trainName.includes(term) ||
      trainNo.includes(term) ||
      route.includes(term) ||
      nextStn.includes(term) ||
      currStn.includes(term) ||
      nextStnLabel.includes(term) ||
      currStnLabel.includes(term);

    const type = getTrainType(t);
    const matchesType = selectedType === 'ALL' || type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="flex-1 w-full h-full overflow-y-auto thin-scrollbar">
      <div className="flex flex-col w-full p-6 space-y-6 text-slate-800 max-w-7xl mx-auto">
        {/* Top Header Card */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-md border border-slate-200 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                DIVISION: NR / NCR
              </span>
              <span
                className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}
              />
              <span className="text-xs font-semibold text-emerald-700">
                {wsConnected ? 'Real-Time Telemetry Synced' : 'Syncing Telemetry...'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Active Rolling Stock & Train Fleet</h1>
            <p className="text-xs text-slate-500">
              Real-time telemetry, GPS tracking, and schedule deviation monitoring across Northern Railway network.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded bg-slate-50 border border-slate-200 text-xs flex items-center gap-2">
              <span className="text-slate-500 font-medium">Fleet Online:</span>
              <span className="font-mono font-bold text-slate-900">
                {activeTrainsCount} / {totalTrainsCount} Trains
              </span>
            </div>
            <div className="px-3.5 py-2 rounded bg-slate-50 border border-slate-200 text-xs flex items-center gap-2">
              <span className="text-slate-500 font-medium">On-Time Index:</span>
              <span className="font-mono font-bold text-emerald-600">{onTimePercentage}%</span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-md bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-xs text-slate-500 font-medium">Total Active Trains</span>
            <div className="text-2xl font-bold text-slate-900 font-mono">{activeTrainsCount}</div>
            <span className="text-[11px] text-emerald-600 font-medium">
              {totalTrainsCount > 0 ? `${totalTrainsCount} registered in fleet` : 'Live Fleet Active'}
            </span>
          </div>
          <div className="p-4 rounded-md bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-xs text-slate-500 font-medium">On-Time Trains</span>
            <div className="text-2xl font-bold text-emerald-600 font-mono">{onTimeCount}</div>
            <span className="text-[11px] text-slate-500">{onTimePercentage}% High Punctuality</span>
          </div>
          <div className="p-4 rounded-md bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-xs text-slate-500 font-medium">Delayed (&gt;15 mins)</span>
            <div className="text-2xl font-bold text-amber-600 font-mono">{delayedCount}</div>
            <span className="text-[11px] text-slate-500">
              {delayedCount === 0 ? 'Optimal Operations' : 'Schedule Deviation Monitored'}
            </span>
          </div>
          <div className="p-4 rounded-md bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-xs text-slate-500 font-medium">Priority Freight Rakes</span>
            <div className="text-2xl font-bold text-slate-900 font-mono">{freightCount}</div>
            <span className="text-[11px] text-slate-500">Freight & Goods Logistics</span>
          </div>
        </div>


        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3.5 rounded-md border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search train no, name, route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {['ALL', 'SUPERFAST_EXPRESS', 'RAJDHANI', 'SHATABDI', 'EXPRESS', 'FREIGHT'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  selectedType === type
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Rolling Stock Table */}
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto thin-scrollbar pb-1">
            <table className="w-full min-w-[950px] text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-[10px] text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-4">Train No / Name</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Priority Tier</th>
                  <th className="py-3 px-4">Speed</th>
                  <th className="py-3 px-4">Next Station & Progress</th>
                  <th className="py-3 px-4">Sched ETA / ML Forecast</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && combinedTrains.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-slate-300 border-t-[#0284C7] rounded-full animate-spin" />
                        <span className="text-xs font-medium">Connecting to live train telemetry stream...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTrains.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 text-xs font-medium">
                      No active trains matching search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTrains.map((train) => {
                    const priority = getPriorityInfo(train.priority_tier);
                    const status = getStatusInfo(train);
                    const delayMinutes = Math.round(train.final_predicted_delay || train.current_accumulated_delay || 0);
                    const speed = Math.round(train.speed_kmh || 0);
                    const route = formatRoute(train);
                    const nextStationLabel = getStationLabel(train.next_station || train.current_station);
                    const schedTime = formatHumanTime(train.scheduled_arrival || train.scheduled_departure);
                    const predictedTime = train.predicted_eta
                      ? formatHumanTime(train.predicted_eta)
                      : calculateExpectedTime(train.scheduled_arrival, delayMinutes);
                    const progressPct = Math.round(
                      train.train_status === 'COMPLETED' || train.train_status === 'ARRIVED'
                        ? 100
                        : Math.min(100, Math.max(0, (train.route_progress || 0) * 100))
                    );
                    const isSelected = selectedTrainNo === train.train_no;

                    return (
                      <tr
                        key={train.train_no}
                        onClick={() => {
                          if (setSelectedTrainNo) setSelectedTrainNo(train.train_no);
                        }}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{train.train_no}</span>
                            <span className="text-slate-700 font-medium">{train.train_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{route}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${priority.color}`}>
                            {priority.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{speed} km/h</td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-slate-800">{nextStationLabel}</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#0284C7] rounded-full transition-all duration-500"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{progressPct}%</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div className="flex flex-col">
                            <span className="text-slate-400">Sched: {schedTime}</span>
                            <span
                              className={delayMinutes > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}
                            >
                              ML: {predictedTime}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${status.color}`}
                          >
                            {status.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrainsPage;
