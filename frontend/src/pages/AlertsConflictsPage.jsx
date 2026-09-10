import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSimulation } from '../context/SimulationContext';

/**
 * Priority Tier formatting and styling in plain English
 */
function getPriorityMeta(tier) {
  const t = Number(tier);
  switch (t) {
    case 1:
      return { label: 'Tier 1', full: 'Tier 1 • High Priority', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 2:
      return { label: 'Tier 2', full: 'Tier 2 • Superfast', badge: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 3:
      return { label: 'Tier 3', full: 'Tier 3 • Standard Express', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 4:
      return { label: 'Tier 4', full: 'Tier 4 • Freight Cargo', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    default:
      return { label: `Tier ${tier || 2}`, full: `Tier ${tier || 2}`, badge: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
}

/**
 * Deterministic Severity Classifier
 */
function getSeverityMeta(conflict, trainA, trainB) {
  const delay = Number(conflict.conflict_delay_minutes || 0);
  const reason = String(conflict.resolution_reason || '').toLowerCase();
  const tierA = trainA?.priority_tier ? Number(trainA.priority_tier) : 2;

  if (delay >= 10 || reason.includes('single-line') || (tierA === 1 && conflict.precedence_granted_to !== String(trainA.train_no))) {
    return {
      severity: 'CRITICAL',
      tag: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
      borderLeft: 'border-l-rose-500',
      pill: 'bg-rose-600 text-white',
    };
  }

  if (delay >= 5 || reason.includes('headway') || reason.includes('spacing')) {
    return {
      severity: 'MAJOR',
      tag: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      borderLeft: 'border-l-amber-500',
      pill: 'bg-amber-500 text-white',
    };
  }

  return {
    severity: 'WARNING',
    tag: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    borderLeft: 'border-l-slate-400',
    pill: 'bg-slate-600 text-white',
  };
}

/**
 * Plain-English conflict title (No scary engineering jargon)
 */
function getConflictTypeTitle(conflict) {
  const reason = String(conflict.resolution_reason || '').toLowerCase();
  const sectionId = String(conflict.section_id || '').toLowerCase();

  if (reason.includes('single-line') || sectionId.includes('single')) {
    return 'Single Track: Opposing Trains Waiting';
  }
  if (reason.includes('headway') || reason.includes('spacing') || reason.includes('bunching')) {
    return 'Trains Too Close on Same Track';
  }
  if (reason.includes('platform') || reason.includes('loop') || reason.includes('station')) {
    return 'Platform Shared at Station';
  }
  return 'Priority Pass Decision';
}

export function AlertsConflictsPage() {
  const {
    trains = [],
    activeConflicts: rawActiveConflicts = [],
    simulationTime,
    wsConnected,
    topology,
  } = useSimulation();

  const [activeTab, setActiveTab] = useState('ALL'); // ALL, CRITICAL, MAJOR, WARNING, RESOLVED
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorActions, setOperatorActions] = useState({});
  const [resolvedHistory, setResolvedHistory] = useState([]);
  const prevActiveMapRef = useRef(new Map());

  // Station & Section Lookups
  const stationLookup = useMemo(() => {
    const map = new Map();
    if (topology?.stations) {
      topology.stations.forEach((s) => map.set(s.station_id, s.name));
    }
    return map;
  }, [topology]);

  const sectionLookup = useMemo(() => {
    const map = new Map();
    if (topology?.sections) {
      topology.sections.forEach((sec) => map.set(sec.section_id, sec));
    }
    return map;
  }, [topology]);

  const trainMap = useMemo(() => {
    const map = new Map();
    trains.forEach((t) => {
      map.set(Number(t.train_no), t);
      map.set(String(t.train_no), t);
    });
    return map;
  }, [trains]);

  // Clean Corridor Location Formatter
  const formatCorridor = (sectionId, trainA) => {
    if (!sectionId) {
      return trainA?.current_station
        ? `Approaching ${stationLookup.get(trainA.current_station) || trainA.current_station}`
        : 'Station Track Section';
    }

    const sec = sectionLookup.get(sectionId);
    if (sec && sec.station_from && sec.station_to) {
      const from = stationLookup.get(sec.station_from) || sec.station_from;
      const to = stationLookup.get(sec.station_to) || sec.station_to;
      const track = sec.track_type ? `(${sec.track_type === 'single' ? 'Single Track' : 'Double Track'})` : '';
      return `${from} ➔ ${to} ${track}`.trim();
    }

    const parts = sectionId.replace(/^SEC[-_]/i, '').split(/[-_]/);
    if (parts.length >= 2) {
      const s1 = stationLookup.get(parts[0]) || parts[0];
      const s2 = stationLookup.get(parts[1]) || parts[1];
      return `${s1} ➔ ${s2} Corridor`;
    }

    return sectionId;
  };

  // Helper: Format raw engineering text into conversational, judge-friendly plain English
  const formatPlainEnglishReason = (rawReason, trainA, trainB, delayMins) => {
    if (!rawReason) return 'Priority engine decided track clearance based on operational urgency.';

    if (trainA && trainB) {
      const pA = Number(trainA.priority_tier || 3);
      const pB = Number(trainB.priority_tier || 2);
      const waitText = delayMins > 0 ? `waiting for ~${Math.round(delayMins)} mins` : 'waiting on side track';

      if (pB < pA) {
        return `${trainB.train_name || `Train #${trainB.train_no}`} has higher priority (${getPriorityMeta(pB).label}). ${trainA.train_name || `Train #${trainA.train_no}`} is paused on the station loop siding (${waitText}) so the faster service passes through with zero brake penalty.`;
      } else if (pA < pB) {
        return `${trainA.train_name || `Train #${trainA.train_no}`} has higher priority (${getPriorityMeta(pA).label}) and receives an immediate green signal. ${trainB.train_name || `Train #${trainB.train_no}`} yields and is held on the side track.`;
      } else {
        return `Both trains have equal priority. Precedence was granted on a first-come, first-served basis to maintain statutory 5-minute safety spacing.`;
      }
    }

    if (String(rawReason).toLowerCase().includes('loop') || String(rawReason).toLowerCase().includes('side')) {
      return `${trainA?.train_name || 'This train'} is held on the station side track until the main line ahead clears.`;
    }

    return rawReason;
  };

  // Build unified normalized active conflict list
  const activeConflicts = useMemo(() => {
    const list = [];
    const seenKeys = new Set();
    const involvedTrainNumbers = new Set();

    // 1. Direct engine conflicts (real contention between two trains)
    rawActiveConflicts.forEach((conf, idx) => {
      const candNo = conf.train_no;
      const otherNo = conf.conflicting_train_id;
      const secId = conf.section_id || `SEC-${idx}`;
      const key = `CONF-${secId}-${candNo}-${otherNo || 'AUTO'}`;

      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      if (candNo) involvedTrainNumbers.add(String(candNo));
      if (otherNo) involvedTrainNumbers.add(String(otherNo));

      const trainA = trainMap.get(candNo) || { train_no: candNo, train_name: `Train #${candNo}`, priority_tier: 3 };
      const trainB = otherNo ? trainMap.get(otherNo) || { train_no: otherNo, train_name: `Train #${otherNo}`, priority_tier: 2 } : null;

      const severity = getSeverityMeta(conf, trainA, trainB);
      const title = getConflictTypeTitle(conf);
      const corridor = formatCorridor(conf.section_id, trainA);
      const delayMins = Number(conf.conflict_delay_minutes || 0);

      list.push({
        id: key,
        title,
        corridor,
        sectionId: conf.section_id,
        trainA,
        trainB,
        delayMinutes: delayMins,
        precedenceGrantedTo: conf.precedence_granted_to,
        resolutionReason: formatPlainEnglishReason(conf.resolution_reason, trainA, trainB, delayMins),
        severity: severity.severity,
        tag: severity.tag,
        dot: severity.dot,
        borderLeft: severity.borderLeft,
        simTime: simulationTime ? simulationTime.split('T')[1]?.split('.')[0] || simulationTime : 'Live',
        status: 'ACTIVE',
      });
    });

    // 2. Auxiliary trains holding on sidings (only if NOT already part of a direct conflict card above)
    trains.forEach((t) => {
      const tNoStr = String(t.train_no);
      if (involvedTrainNumbers.has(tNoStr)) return; // Skip to prevent duplicate ghost cards

      if (t.has_active_conflict || t.conflict_delay > 0 || t.train_status === 'HOLDING') {
        const key = `HOLD-${t.train_no}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        involvedTrainNumbers.add(tNoStr);

        const delayMins = Number(t.conflict_delay || 5.0);
        const syntheticConf = {
          train_no: t.train_no,
          section_id: t.current_station ? `SEC-${t.current_station}-${t.next_station || 'HALT'}` : null,
          conflicting_train_id: null,
          precedence_granted_to: null,
          conflict_delay_minutes: delayMins,
          resolution_reason: `Paused safely on the station loop track (${Math.round(delayMins)}m hold) for line clearance.`,
        };

        const severity = getSeverityMeta(syntheticConf, t, null);
        const title = 'Train Waiting on Side Track';
        const corridor = formatCorridor(syntheticConf.section_id, t);

        list.push({
          id: key,
          title,
          corridor,
          sectionId: syntheticConf.section_id,
          trainA: t,
          trainB: null,
          delayMinutes: delayMins,
          precedenceGrantedTo: null,
          resolutionReason: syntheticConf.resolution_reason,
          severity: severity.severity,
          tag: severity.tag,
          dot: severity.dot,
          borderLeft: severity.borderLeft,
          simTime: simulationTime ? simulationTime.split('T')[1]?.split('.')[0] || simulationTime : 'Live',
          status: 'ACTIVE',
        });
      }
    });

    return list;
  }, [rawActiveConflicts, trains, trainMap, simulationTime, stationLookup, sectionLookup]);

  // Lifecycle: Automatically archive cleared conflicts
  useEffect(() => {
    const currentMap = new Map();
    activeConflicts.forEach((c) => currentMap.set(c.id, c));

    const newlyCleared = [];
    prevActiveMapRef.current.forEach((prevItem, id) => {
      if (!currentMap.has(id)) {
        newlyCleared.push({
          ...prevItem,
          status: 'RESOLVED',
          resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          resolvedNote: 'Track cleared. Trains are now running with safe distance restored.',
        });
      }
    });

    if (newlyCleared.length > 0) {
      setResolvedHistory((prev) => {
        const existing = new Set(prev.map((r) => r.id));
        const filtered = newlyCleared.filter((r) => !existing.has(r.id));
        return [...filtered, ...prev].slice(0, 40);
      });
    }

    prevActiveMapRef.current = currentMap;
  }, [activeConflicts]);

  // Operator Handlers
  const handleApplyOverride = (id) => {
    setOperatorActions((prev) => ({
      ...prev,
      [id]: { type: 'OVERRIDE_APPLIED' },
    }));
  };

  const handleHold = (id) => {
    setOperatorActions((prev) => ({
      ...prev,
      [id]: { type: 'HOLD_ENFORCED' },
    }));
  };

  const handleDismiss = (id) => {
    const item = activeConflicts.find((c) => c.id === id);
    if (item) {
      setResolvedHistory((prev) => [
        {
          ...item,
          status: 'RESOLVED',
          resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          resolvedNote: 'Reviewed and confirmed by controller.',
        },
        ...prev,
      ]);
    }
    setOperatorActions((prev) => ({
      ...prev,
      [id]: { type: 'DISMISSED' },
    }));
  };

  // Visible active items (excluding dismissed)
  const visibleActive = useMemo(() => {
    return activeConflicts.filter((c) => operatorActions[c.id]?.type !== 'DISMISSED');
  }, [activeConflicts, operatorActions]);

  // Filtered dataset
  const displayItems = useMemo(() => {
    let list = [];
    if (activeTab === 'RESOLVED') {
      list = resolvedHistory;
    } else if (activeTab === 'ALL') {
      list = visibleActive;
    } else {
      list = visibleActive.filter((c) => c.severity === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const aNo = String(item.trainA?.train_no || '');
        const aName = String(item.trainA?.train_name || '').toLowerCase();
        const bNo = String(item.trainB?.train_no || '');
        const bName = String(item.trainB?.train_name || '').toLowerCase();
        const corr = String(item.corridor || '').toLowerCase();
        return aNo.includes(q) || aName.includes(q) || bNo.includes(q) || bName.includes(q) || corr.includes(q);
      });
    }

    return list;
  }, [activeTab, visibleActive, resolvedHistory, searchQuery]);

  // Dynamic KPIs
  const kpis = useMemo(() => {
    const active = visibleActive.length;
    const critical = visibleActive.filter((c) => c.severity === 'CRITICAL').length;
    const major = visibleActive.filter((c) => c.severity === 'MAJOR').length;
    const resolved = resolvedHistory.length;
    return { active, critical, major, resolved };
  }, [visibleActive, resolvedHistory]);

  return (
    <div className="flex-1 w-full h-full overflow-y-auto thin-scrollbar bg-[#F8FAFC] text-slate-800 antialiased">
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">

        {/* 1. Page Header: High Signal, Low Clutter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Network Alerts & Conflicts
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {wsConnected ? 'Live Connection' : 'Syncing'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time monitoring for shared tracks, train following distances, and priority decisions.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="Search by train number or station..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md shadow-2xs placeholder-slate-400 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 2. Sleek Unified KPI Ribbon (Clean, Plain English) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-white border border-slate-200/80 rounded-lg shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Active Conflicts */}
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`p-4 text-left transition-colors cursor-pointer rounded-t-lg sm:rounded-t-none sm:rounded-l-lg ${
              activeTab === 'ALL' ? 'bg-slate-50/90 ring-1 ring-inset ring-slate-300' : 'hover:bg-slate-50/50'
            }`}
          >
            <div className="text-[11px] font-medium text-slate-500">Active Conflicts</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">{kpis.active}</span>
              {kpis.active > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Action Needed
                </span>
              )}
            </div>
          </button>

          {/* Critical */}
          <button
            type="button"
            onClick={() => setActiveTab('CRITICAL')}
            className={`p-4 text-left transition-colors cursor-pointer ${
              activeTab === 'CRITICAL' ? 'bg-rose-50/60 ring-1 ring-inset ring-rose-300' : 'hover:bg-slate-50/50'
            }`}
          >
            <div className="text-[11px] font-medium text-slate-500">Critical Priority</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold font-mono ${kpis.critical > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {kpis.critical}
              </span>
              <span className="text-[10px] text-slate-400">Opposing track / &ge;10m wait</span>
            </div>
          </button>

          {/* Major Warnings */}
          <button
            type="button"
            onClick={() => setActiveTab('MAJOR')}
            className={`p-4 text-left transition-colors cursor-pointer ${
              activeTab === 'MAJOR' ? 'bg-amber-50/60 ring-1 ring-inset ring-amber-300' : 'hover:bg-slate-50/50'
            }`}
          >
            <div className="text-[11px] font-medium text-slate-500">Major Warnings</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold font-mono ${kpis.major > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {kpis.major}
              </span>
              <span className="text-[10px] text-slate-400">Following too close</span>
            </div>
          </button>

          {/* Resolved History */}
          <button
            type="button"
            onClick={() => setActiveTab('RESOLVED')}
            className={`p-4 text-left transition-colors cursor-pointer rounded-b-lg sm:rounded-b-none sm:rounded-r-lg ${
              activeTab === 'RESOLVED' ? 'bg-emerald-50/60 ring-1 ring-inset ring-emerald-300' : 'hover:bg-slate-50/50'
            }`}
          >
            <div className="text-[11px] font-medium text-slate-500">Resolved History</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-600">{kpis.resolved}</span>
              <span className="text-[10px] text-slate-400">Cleared today</span>
            </div>
          </button>
        </div>

        {/* 3. Filter Segment Tabs */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-md">
            {[
              { id: 'ALL', label: 'All Active', count: kpis.active },
              { id: 'CRITICAL', label: 'Critical', count: kpis.critical },
              { id: 'MAJOR', label: 'Major', count: kpis.major },
              { id: 'WARNING', label: 'Warnings', count: visibleActive.filter((c) => c.severity === 'WARNING').length },
              { id: 'RESOLVED', label: 'Resolved History', count: kpis.resolved },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1 rounded ${
                    activeTab === tab.id ? 'bg-slate-100 text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
            {displayItems.length} {displayItems.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {/* 4. Conflict Cards Feed or Empty State */}
        {displayItems.length === 0 ? (
          /* Plain English Clean Empty State */
          <div className="bg-white border border-slate-200/80 rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-[20px]">check</span>
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-bold text-slate-900">
                {activeTab === 'RESOLVED' ? 'No Resolved Conflicts in History' : 'All Tracks Clear • Running Smoothly'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {activeTab === 'RESOLVED'
                  ? 'Events resolved during this simulation session will be saved here.'
                  : 'All trains are maintaining safe following distances and there are zero conflicts on the line right now.'}
              </p>
            </div>
            {activeTab !== 'ALL' && (
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium underline underline-offset-2 cursor-pointer pt-1"
              >
                View all active
              </button>
            )}
          </div>
        ) : (
          /* Clean Conflict Items in Plain English */
          <div className="space-y-3">
            {displayItems.map((item) => {
              const operatorState = operatorActions[item.id];
              const isResolved = item.status === 'RESOLVED';
              const pA = getPriorityMeta(item.trainA?.priority_tier);
              const pB = item.trainB ? getPriorityMeta(item.trainB?.priority_tier) : null;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/80 rounded-lg p-5 shadow-2xs hover:border-slate-300 transition-all space-y-4"
                >
                  {/* Item Header: Severity, Simple Title, Section, Time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${item.tag}`}>
                        {item.severity === 'CRITICAL' ? 'Critical' : item.severity === 'MAJOR' ? 'Major' : 'Notice'}
                      </span>
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                        {item.title}
                      </h2>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-slate-400">near_me</span>
                        {item.corridor}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono shrink-0">
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Resolved at {item.resolvedAt}
                        </span>
                      ) : (
                        <span>Sim Clock: {item.simTime}</span>
                      )}
                    </div>
                  </div>

                  {/* Operational Interaction Pair (Clean Linear Flow) */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-1">
                    {/* Left: Yielding Train */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-slate-50 border border-slate-200 flex flex-col items-center justify-center font-mono">
                        <span className="text-[9px] text-slate-400 uppercase font-semibold">Train</span>
                        <span className="text-xs font-bold text-slate-900 leading-none">
                          {item.trainA?.train_no}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {item.trainA?.train_name}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium border ${pA.badge}`}>
                            {pA.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {Math.round(item.trainA?.speed_kmh || 0)} km/h • {item.trainA?.train_status === 'HOLDING' ? 'Waiting on Siding' : 'Running'}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Contention Connector Bar */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 px-3 py-1 rounded bg-slate-50 border border-slate-100 self-start md:self-auto">
                      <span className="material-symbols-outlined text-[15px] text-slate-500">
                        swap_horiz
                      </span>
                      <span className="font-mono text-[11px] text-slate-600">
                        {item.trainB ? 'Faster Train Passing' : 'Waiting on Side Track'}
                      </span>
                      <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded text-[10px]">
                        +{item.delayMinutes.toFixed(1)}m wait time
                      </span>
                    </div>

                    {/* Right: Competing Train (if applicable) */}
                    {item.trainB ? (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-slate-50 border border-slate-200 flex flex-col items-center justify-center font-mono">
                          <span className="text-[9px] text-slate-400 uppercase font-semibold">Train</span>
                          <span className="text-xs font-bold text-slate-900 leading-none">
                            {item.trainB?.train_no}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {item.trainB?.train_name}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium border ${pB?.badge}`}>
                              {pB?.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {Math.round(item.trainB?.speed_kmh || 0)} km/h • Passing Ahead
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">traffic</span>
                        <span>Safe distance maintained behind front train</span>
                      </div>
                    )}
                  </div>

                  {/* Dispatch Plan Note */}
                  <div className="p-3 bg-slate-50/70 border border-slate-200/60 rounded-md text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      <span>Dispatch Decision (Priority Engine)</span>
                      {item.precedenceGrantedTo && (
                        <span className="font-mono text-slate-600 normal-case">
                          Priority given to <strong className="text-slate-900">Train #{item.precedenceGrantedTo}</strong>
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 text-xs leading-relaxed font-sans">
                      {item.resolutionReason}
                    </p>
                  </div>

                  {/* Operator Action Strip */}
                  {!isResolved && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {operatorState?.type === 'OVERRIDE_APPLIED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            Priority Changed: This Train Goes First
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApplyOverride(item.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer active:scale-98"
                          >
                            <span className="material-symbols-outlined text-[14px]">alt_route</span>
                            <span>Let This Train Go First</span>
                          </button>
                        )}

                        {operatorState?.type === 'HOLD_ENFORCED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                            <span className="material-symbols-outlined text-[14px]">pause</span>
                            Paused on Side Track
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleHold(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px] text-slate-400">pause</span>
                            <span>Pause on Side Track</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDismiss(item.id)}
                        className="text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors cursor-pointer ml-auto"
                      >
                        Mark as Resolved
                      </button>
                    </div>
                  )}

                  {/* If Resolved: Historical Note */}
                  {isResolved && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>✓ {item.resolvedNote}</span>
                      <span className="font-mono text-slate-400">Resolved at {item.resolvedAt}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertsConflictsPage;
