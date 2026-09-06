import React, { useState, useMemo, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { MapLibreRailwayMap } from '../components/MapLibreRailwayMap';
import {
  MapControlsToolbar,
  StationTimelineSidebar,
  TrainOverviewCard,
} from '../components/live-map';
import { api } from '../services/api';
import { ErrorBoundary } from '../components/ErrorBoundary';

/**
 * LiveMapPage - Orchestrator for Real-Time Railway Map and Telemetry
 * Decomposed into modular components:
 * - MapLibreRailwayMap (WebGL Map Canvas & GPU Layers)
 * - MapControlsToolbar (Top-Right Layer Toggles)
 * - StationTimelineSidebar (Left Collapsible Stops Timeline)
 * - TrainOverviewCard (Right Sidebar with Live Telemetry vs Simulation tabs)
 */
export function LiveMapPage() {
  const {
    topology,
    trains,
    selectedTrainNo,
    selectedTrain,
    selectedTrainDetails,
    setSelectedTrainNo,
    simulationTime,
    wsConnected,
    activeConflicts,
  } = useSimulation();

  const [selectedStation, setSelectedStation] = useState(null);
  const [activeStationCode, setActiveStationCode] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showOverviewCard, setShowOverviewCard] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLiveFeed, setShowLiveFeed] = useState(true);
  const [showVirtualSim, setShowVirtualSim] = useState(true);
  const [overviewTab, setOverviewTab] = useState('live'); // 'live' | 'simulation'

  // Dynamic selected train attributes
  const currentTrain = selectedTrain || selectedTrainDetails || (trains.length > 0 ? trains[0] : null);
  const trainNo = currentTrain?.train_no || selectedTrainNo || 12003;
  const trainName = currentTrain?.train_name || (trainNo ? `Train #${trainNo}` : 'Select a Train');
  const priorityTier = currentTrain?.priority_tier != null ? currentTrain.priority_tier : 3;

  // External live provider status state
  const [liveStatusLoading, setLiveStatusLoading] = useState(false);
  const [liveStatusData, setLiveStatusData] = useState(null);
  const [liveStatusError, setLiveStatusError] = useState(null);
  const [customTrainInput, setCustomTrainInput] = useState(String(trainNo || '12919'));

  // Sync custom train input when active train changes
  useEffect(() => {
    if (trainNo) setCustomTrainInput(String(trainNo));
  }, [trainNo]);

  // Station code -> full name dictionary
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
    if (typeof timeStr !== 'string') {
      try {
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      } catch {
        return '—';
      }
      return String(timeStr);
    }
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
      return typeof timeStr === 'string' ? timeStr : '—';
    }
  };

  const formatIsoOrTime = (str) => {
    if (!str) return '—';
    try {
      if (str.includes('T') || str.includes(' ')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
      return formatHumanTime(str);
    } catch {
      return str;
    }
  };

  const getRelativeTime = (timestampStr) => {
    if (!timestampStr) return null;
    try {
      const ts = new Date(timestampStr).getTime();
      if (isNaN(ts)) return null;
      const diffSec = Math.floor((Date.now() - ts) / 1000);
      if (diffSec < 0 || diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} min ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ${diffMin % 60}m ago`;
      return `${Math.floor(diffHr / 24)}d ago`;
    } catch {
      return null;
    }
  };

  const handleFetchLiveStatus = async (overrideTrainNo = null) => {
    const targetNo = overrideTrainNo || Number(customTrainInput) || trainNo;
    if (!targetNo) return;
    setLiveStatusLoading(true);
    setLiveStatusError(null);
    try {
      const res = await api.getTrainLiveStatus(targetNo);
      if (res?.live_status && res.live_status.success === false) {
        setLiveStatusError(res.live_status.error || `Provider unable to verify live status for train #${targetNo}`);
      } else if (res?.live_status) {
        setLiveStatusData(res);
        setOverviewTab('live');
        setShowLiveFeed(true);
      } else {
        setLiveStatusError(`No telemetry response from live provider for train #${targetNo}`);
      }
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Failed to fetch live train provider status';
      setLiveStatusError(errMsg);
    } finally {
      setLiveStatusLoading(false);
    }
  };

  // Station and Train movement state
  const currentStn = currentTrain?.current_station || '';
  const nextStn = currentTrain?.next_station || '';
  const originStn = currentTrain?.origin_station || '';
  const destStn = currentTrain?.destination_station || '';
  const status = currentTrain?.train_status || 'RUNNING';

  const accumulatedDelay = Math.round(currentTrain?.current_accumulated_delay || 0);
  const mlDelay = Math.round(currentTrain?.ml_predicted_delay || currentTrain?.ml_delay_prediction || 0);
  const conflictDelay = Math.round(currentTrain?.conflict_delay || 0);
  const finalDelay = Math.round(currentTrain?.final_predicted_delay || (accumulatedDelay + mlDelay + conflictDelay));

  const hasActiveConflict = Boolean(
    currentTrain?.has_active_conflict ||
    conflictDelay > 0 ||
    status === 'HOLDING' ||
    (activeConflicts && activeConflicts.some((c) => c.train_no === trainNo))
  );

  const isCompleted = status === 'ARRIVED' || (currentStn && currentStn === destStn);
  const speedKmh = Math.round(currentTrain?.speed || (currentTrain?.telemetry && currentTrain.telemetry.speed) || (isCompleted ? 0 : 75));

  const progressPercent = useMemo(() => {
    if (isCompleted) return 100;
    if (!currentTrain?.route_stations || currentTrain.route_stations.length === 0) return 35;
    const total = currentTrain.route_stations.length;
    const curIdx = currentTrain.route_stations.indexOf(currentStn);
    if (curIdx === -1) return 20;
    return Math.min(95, Math.max(5, Math.round(((curIdx + 1) / total) * 100)));
  }, [currentTrain, currentStn, isCompleted]);

  const scheduledEtaFormatted = formatHumanTime(
    currentTrain?.scheduled_destination_eta || currentTrain?.scheduled_departure_time
  );

  const predictedEtaFormatted = useMemo(() => {
    if (currentTrain?.predicted_destination_eta) {
      return formatHumanTime(currentTrain.predicted_destination_eta);
    }
    const baseTime = currentTrain?.scheduled_destination_eta;
    if (!baseTime) return scheduledEtaFormatted;
    try {
      const d = new Date(baseTime);
      if (!isNaN(d.getTime())) {
        d.setMinutes(d.getMinutes() + finalDelay);
        return formatHumanTime(d.toISOString());
      }
      return scheduledEtaFormatted;
    } catch {
      return scheduledEtaFormatted;
    }
  }, [currentTrain, finalDelay, scheduledEtaFormatted]);

  const lastSyncTime = useMemo(() => {
    return formatHumanTime(simulationTime || new Date().toISOString());
  }, [simulationTime]);

  // Telemetry attributes from Live Provider
  const live = liveStatusData?.live_status;
  const raw = live?.raw_data || {};
  const currLoc = raw.currentLocation || {};
  const currStnObj = currLoc.currentStation || {};
  const nextStnObj = currLoc.nextStation || {};
  const prevStnObj = currLoc.previousStation || {};
  const trainInfo = raw.train || {};

  const liveTrainNo = live?.train_no || customTrainInput || trainNo;
  const liveTrainName = live?.train_name || trainName;
  const liveOverallStatus = live?.status || 'RUNNING';
  const liveDelay = Number(live?.current_delay_minutes || 0);
  const liveRelativeTime = getRelativeTime(live?.last_updated);
  const liveSpeed = currLoc.speedKmh || live?.speed_kmh || speedKmh;
  const liveBearing = currLoc.bearingDegrees || 0;
  const liveIsActualPos = currLoc.isActualPosition ?? true;

  const currStationCode = currLoc.stationCode || currStnObj.code || live?.current_station || currentStn || '';
  const currStationName = currLoc.stationName || currStnObj.name || getStationLabel(currStationCode);
  const nextStationCode = raw.nextHalt?.stationCode || nextStnObj.code || live?.next_station || nextStn || '';
  const nextStationName = raw.nextHalt?.stationName || nextStnObj.name || getStationLabel(nextStationCode);

  let prevStationCode = prevStnObj.code || '';
  let prevStationName = prevStnObj.name || '';
  if (!prevStationCode && Array.isArray(raw.route)) {
    const curIdx = raw.route.findIndex((s) => s.stationCode === currStationCode);
    if (curIdx > 0) {
      prevStationCode = raw.route[curIdx - 1].stationCode || '';
      prevStationName = raw.route[curIdx - 1].stationName || '';
    }
  }

  const isDiverted = Boolean(raw.diverted);
  const divertedRoutes = Array.isArray(raw.divertedRoutes) ? raw.divertedRoutes : [];

  const originCode = trainInfo.source?.code || trainInfo.origin?.code || originStn || '';
  const originName = trainInfo.source?.name || trainInfo.origin?.name || getStationLabel(originCode);
  const destCode = trainInfo.destination?.code || destStn || '';
  const destName = trainInfo.destination?.name || getStationLabel(destCode);

  const liveLat = currLoc.coordinates?.lat != null ? currLoc.coordinates.lat : (currLoc.lat != null ? currLoc.lat : live?.latitude);
  const liveLng = currLoc.coordinates?.lng != null ? currLoc.coordinates.lng : (currLoc.lng != null ? currLoc.lng : live?.longitude);
  const liveLastUpdated = live?.last_updated || new Date().toISOString();

  const updatedTotalDelay = Math.round(liveDelay + mlDelay + conflictDelay);

  const scheduledDestinationEta = useMemo(() => {
    return (
      raw.destinationETA ||
      (Array.isArray(raw.route) && raw.route.length > 0 ? raw.route[raw.route.length - 1].scheduledArrival : null) ||
      live?.expected_arrival_time ||
      currentTrain?.scheduled_destination_eta ||
      null
    );
  }, [raw, live, currentTrain]);

  const updatedEta = useMemo(() => {
    const base = scheduledDestinationEta;
    if (!base) return 'Schedule Synchronized';
    try {
      const d = new Date(base);
      if (!isNaN(d.getTime())) {
        d.setMinutes(d.getMinutes() + updatedTotalDelay);
        return formatHumanTime(d.toISOString());
      }
      return formatHumanTime(base);
    } catch {
      return 'Schedule Synchronized';
    }
  }, [scheduledDestinationEta, updatedTotalDelay]);

  // AI Operational Reasoning Narrative
  const operationalReasoning = useMemo(() => {
    if (!selectedTrain && !trainNo) return 'Awaiting dispatch telemetry...';
    if (isCompleted) {
      return `Journey Terminated: #{trainNo} arrived at ${getStationLabel(destStn)}. All track block reservations cleared.`;
    }
    if (hasActiveConflict) {
      return `Precedence Conflict Hold: Train #${trainNo} held on loop line at ${getStationLabel(currentStn)} for higher priority movement (+${conflictDelay || 8}m headway buffer).`;
    }
    if (status === 'HOLDING') {
      return `Signal Stop: Automated signal interlock hold active outside ${getStationLabel(currentStn)}. Awaiting block section clearance.`;
    }
    if (finalDelay > 15) {
      return `Schedule Congestion (+${finalDelay}m): Corridor speed reduced between ${getStationLabel(currentStn)} and ${getStationLabel(nextStn)} due to dynamic block spacing.`;
    }
    if (finalDelay > 0) {
      return `Minor Variance (+${finalDelay}m): Interlocking switch transit pacing. Projected recovery before ${getStationLabel(nextStn)}.`;
    }
    return `Nominal Cruise: Operating strictly on timetable at nominal line velocity (${speedKmh} km/h). All automated block signals clear.`;
  }, [selectedTrain, trainNo, destStn, isCompleted, hasActiveConflict, status, currentStn, conflictDelay, finalDelay, nextStn, speedKmh]);

  // Live Train Map Object for MapLibre Map (Satellite GPS Real-time Telemetry)
  const liveTrainMapData = useMemo(() => {
    if (!liveStatusData || !live) return null;
    if (liveLat == null || liveLng == null || isNaN(Number(liveLat)) || isNaN(Number(liveLng))) return null;

    let routeCoords = [];
    if (raw.route_geojson?.geometry?.coordinates && Array.isArray(raw.route_geojson.geometry.coordinates)) {
      routeCoords = raw.route_geojson.geometry.coordinates;
    } else if (Array.isArray(raw.route) && raw.route.length > 0) {
      routeCoords = raw.route
        .filter((r) => r.coordinates && r.coordinates.lng != null && r.coordinates.lat != null)
        .map((r) => [Number(r.coordinates.lng), Number(r.coordinates.lat)]);
    } else if (Array.isArray(raw.route_stops) && raw.route_stops.length > 0) {
      routeCoords = raw.route_stops
        .filter((r) => r.lng != null && r.lat != null)
        .map((r) => [Number(r.lng), Number(r.lat)]);
    }

    return {
      trainNo: liveTrainNo,
      trainName: liveTrainName,
      lat: Number(liveLat),
      lng: Number(liveLng),
      speedKmh: Number(liveSpeed) || 0,
      bearing: Number(liveBearing) || 0,
      delayMinutes: Number(liveDelay) || 0,
      status: liveOverallStatus,
      stationName: currStationName,
      isActualPosition: liveIsActualPos,
      routeCoords,
      routeGeoJSON: raw.route_geojson || null,
      routeStops: raw.route_stops || [],
      lastUpdated: liveLastUpdated,
    };
  }, [liveStatusData, live, raw, liveLat, liveLng, liveTrainNo, liveTrainName, liveSpeed, liveBearing, liveDelay, liveOverallStatus, currStationName, liveIsActualPos, liveLastUpdated]);

  // Station Timetable Sequence (Dynamic 4-tier fallback)
  const stationTimetable = useMemo(() => {
    const liveRoute = liveStatusData?.live_status?.raw_data?.route;
    const liveRouteStops = liveStatusData?.live_status?.raw_data?.route_stops;

    if (Array.isArray(liveRoute) && liveRoute.length > 0) {
      return liveRoute.map((stop, idx) => {
        const rawStatus = (stop.status || '').toUpperCase();
        const stopStatus =
          rawStatus === 'DEPARTED' ? 'DEPARTED' :
          rawStatus === 'ARRIVED' || rawStatus === 'AT_STATION' ? 'AT_STATION' :
          rawStatus === 'UPCOMING' ? 'UPCOMING' :
          idx === 0 ? 'DEPARTED' : 'UPCOMING';
        return {
          stop_no: stop.sequence || idx + 1,
          station_code: stop.stationCode,
          station_name: stop.stationName || stationNameMap[stop.stationCode] || stop.stationCode,
          scheduled_arrival: stop.scheduledArrival,
          scheduled_departure: stop.scheduledDeparture,
          predicted_eta: stop.actualArrival || stop.scheduledArrival,
          distance_km: stop.distance,
          platform: stop.platform ? `PF ${stop.platform}` : null,
          status: stopStatus,
          delay_minutes: stop.delayArrival || stop.delayDeparture || 0,
        };
      });
    }

    if (Array.isArray(liveRouteStops) && liveRouteStops.length > 0) {
      return liveRouteStops.map((stop, idx) => ({
        stop_no: stop.sequence || idx + 1,
        station_code: stop.code,
        station_name: stop.name || stationNameMap[stop.code] || stop.code,
        scheduled_arrival: null,
        scheduled_departure: null,
        predicted_eta: null,
        distance_km: null,
        platform: 'PF 1',
        status: idx === 0 ? 'DEPARTED' : 'UPCOMING',
        delay_minutes: 0,
      }));
    }

    if (selectedTrain?.all_stops && selectedTrain.all_stops.length > 0) {
      return selectedTrain.all_stops;
    }

    if (selectedTrainDetails?.all_stops && selectedTrainDetails.all_stops.length > 0) {
      return selectedTrainDetails.all_stops;
    }

    if (currentTrain?.route_stations && currentTrain.route_stations.length > 0) {
      const curIdx = currentTrain.route_stations.indexOf(currentStn);
      return currentTrain.route_stations.map((stnCode, idx) => {
        let stopStatus = 'UPCOMING';
        if (curIdx !== -1) {
          if (idx < curIdx) stopStatus = 'DEPARTED';
          else if (idx === curIdx) stopStatus = status === 'AT_STATION' ? 'AT_STATION' : 'DEPARTED';
          else if (idx === curIdx + 1) stopStatus = 'NEXT_STOP';
        }
        return {
          stop_no: idx + 1,
          station_code: stnCode,
          station_name: stationNameMap[stnCode] || stnCode,
          scheduled_arrival: null,
          scheduled_departure: null,
          predicted_eta: null,
          distance_km: null,
          platform: null,
          status: stopStatus,
          delay_minutes: 0,
        };
      });
    }

    return [];
  }, [liveStatusData, selectedTrain, selectedTrainDetails, currentTrain, currentStn, status, stationNameMap]);

  const nextUpcomingStations = useMemo(() => {
    if (selectedTrain?.upcoming_stops && selectedTrain.upcoming_stops.length > 0) {
      return selectedTrain.upcoming_stops.slice(0, 3);
    }
    const futureStops = stationTimetable.filter(
      (s) => s.status === 'NEXT_STOP' || s.status === 'UPCOMING'
    );
    return futureStops.slice(0, 3);
  }, [selectedTrain, stationTimetable]);

  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stationTimetable;
    const q = searchQuery.toLowerCase();
    return stationTimetable.filter(
      (s) =>
        s.station_code.toLowerCase().includes(q) ||
        (s.station_name && s.station_name.toLowerCase().includes(q))
    );
  }, [stationTimetable, searchQuery]);

  const handleSelectStationOnMap = (stnCode) => {
    setActiveStationCode(stnCode);
    const label = getStationLabel(stnCode);
    setSelectedStation(label);
  };

  // Structured props for child views
  const liveTelemetryProps = {
    liveTrainNo,
    liveTrainName,
    liveOverallStatus,
    liveDelay,
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
    divertedRoutes,
    originCode,
    originName,
    destCode,
    destName,
    totalDistanceKm: trainInfo.distance,
    totalHalts: trainInfo.totalHalts,
    avgSpeedKmh: trainInfo.avgSpeed || trainInfo.averageSpeed,
    maxSpeedKmh: trainInfo.maxSpeed || trainInfo.maximumSpeed,
    trainType: trainInfo.type || trainInfo.trainType || 'Express',
    updatedTotalDelay,
    updatedEta,
    scheduledEta: formatHumanTime(scheduledDestinationEta),
    operationalAnalysis: liveStatusData?.operational_analysis,
    formatHumanTime,
  };

  const virtualSimulationProps = {
    hasActiveConflict,
    conflictDelay,
    currentStn,
    getStationLabel,
    accumulatedDelay,
    finalDelay,
    scheduledEtaFormatted,
    predictedEtaFormatted,
    originStn,
    destStn,
    progressPercent,
    nextUpcomingStations,
    formatIsoOrTime,
    operationalReasoning,
  };

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden bg-[#F4F5F7] select-none">
      {/* 1. Full-Bleed Map Canvas (Spans 100% of the viewport width and height) */}
      <div className="absolute inset-0 w-full h-full">
        <MapLibreRailwayMap
          topology={topology}
          trains={trains}
          selectedTrainNo={selectedTrainNo}
          onSelectTrain={setSelectedTrainNo}
          selectedStation={selectedStation}
          onSelectStation={setSelectedStation}
          liveTrainData={liveTrainMapData}
          showLiveFeed={showLiveFeed}
          showVirtualSim={showVirtualSim}
          onToggleHideLiveFeed={() => setShowLiveFeed((prev) => !prev)}
        />
      </div>

      {/* 2. Top Controls Bar: Layer Toggles for Live Feed, Virtual Sim, and Overview */}
      <MapControlsToolbar
        showLiveFeed={showLiveFeed}
        onToggleLiveFeed={() => setShowLiveFeed((prev) => !prev)}
        showVirtualSim={showVirtualSim}
        onToggleVirtualSim={() => setShowVirtualSim((prev) => !prev)}
        showOverviewCard={showOverviewCard}
        onToggleOverviewCard={() => setShowOverviewCard((prev) => !prev)}
        hasLiveData={Boolean(liveStatusData)}
      />

      {/* 3. Left Side: Floating Station Timetable Inspector */}
      <ErrorBoundary title="Route Stations Inspector">
        <StationTimelineSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          trainNo={trainNo}
          trainName={trainName}
          trains={trains}
          onSelectTrain={(val) => {
            setSelectedTrainNo(val);
            setCustomTrainInput(String(val));
          }}
          setCustomTrainInput={setCustomTrainInput}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredStations={filteredStations}
          totalStops={stationTimetable.length}
          currentStn={currentStn}
          activeStationCode={activeStationCode}
          onSelectStation={handleSelectStationOnMap}
          wsConnected={wsConnected}
          formatHumanTime={formatHumanTime}
        />
      </ErrorBoundary>

      {/* 4. Right Side: Floating Train Overview Card */}
      {showOverviewCard && (
        <ErrorBoundary title="Train Overview Telemetry">
          <TrainOverviewCard
            trainNo={trainNo}
            trainName={trainName}
            priorityTier={priorityTier}
            speedKmh={speedKmh}
            wsConnected={wsConnected}
            lastSyncTime={lastSyncTime}
            customTrainInput={customTrainInput}
            setCustomTrainInput={setCustomTrainInput}
            handleFetchLiveStatus={handleFetchLiveStatus}
            liveStatusLoading={liveStatusLoading}
            liveStatusData={liveStatusData}
            liveStatusError={liveStatusError}
            onDismissError={() => setLiveStatusError(null)}
            onClearLiveData={() => {
              setLiveStatusData(null);
              setLiveStatusError(null);
            }}
            overviewTab={overviewTab}
            setOverviewTab={setOverviewTab}
            showLiveFeed={showLiveFeed}
            onToggleHideLiveFeed={() => setShowLiveFeed((prev) => !prev)}
            showVirtualSim={showVirtualSim}
            onToggleVirtualSim={() => setShowVirtualSim((prev) => !prev)}
            liveTelemetryProps={liveTelemetryProps}
            virtualSimulationProps={virtualSimulationProps}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}

export default LiveMapPage;
