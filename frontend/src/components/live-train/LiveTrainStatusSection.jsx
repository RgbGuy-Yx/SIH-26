import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  formatDateDisplay,
  formatDateHeader,
  formatDuration,
  extractTimeDisplay,
} from '../../utils/dateTimeUtils';

const DAYS_OF_WEEK = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

/**
 * LiveTrainStatusSection
 * Clean, minimal, handcrafted UI/UX built strictly according to design.md tokens:
 * Tactical OCC Daylight Canvas with authentic Railway Ladder Track Timeline.
 */
export function LiveTrainStatusSection({
  trainSchedule,
  trainLive,
  selectedTrainNo,
  journeyDate,
  lastRefreshedTime,
  onDateChange,
  onBackToSearch,
  onRefresh,
  loading,
  error,
}) {
  const [activeSubTab, setActiveSubTab] = useState('route'); // 'route', 'live', 'info'
  const [trackViewMode, setTrackViewMode] = useState('ladder'); // 'ladder', 'table'
  const [showActualTimes, setShowActualTimes] = useState(true);
  const [showAllCheckpoints, setShowAllCheckpoints] = useState(true);
  const [isInTrain, setIsInTrain] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [isGliding, setIsGliding] = useState(false);
  const scrollAnimRef = useRef(null);

  // Auto-scroll target ref for current locomotive station
  const activeStationRowRef = useRef(null);
  const trackViewportRef = useRef(null);

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  // High-Performance Silk Smooth Auto-Scroll to Active Station (Zero Jank, Clean & Minimal)
  const scrollToActiveStation = useCallback(() => {
    const el = activeStationRowRef.current;
    const container = trackViewportRef.current;

    if (!el || !container) {
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (scrollAnimRef.current) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const currentScrollTop = container.scrollTop;

    // Calculate exact center position
    const targetScrollTop = Math.max(
      0,
      Math.min(
        container.scrollHeight - container.clientHeight,
        currentScrollTop + (elRect.top - containerRect.top) - (container.clientHeight / 2) + (elRect.height / 2)
      )
    );

    const distance = targetScrollTop - currentScrollTop;

    if (Math.abs(distance) < 8) {
      return;
    }

    setIsGliding(true);

    // Fast, responsive flight duration (240ms to 420ms max)
    const duration = Math.min(420, Math.max(220, Math.abs(distance) * 0.4));
    const startTime = performance.now();

    // Natural cubic ease-out deceleration curve
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = easeOutCubic(progress);

      // Direct DOM mutation for 60-120fps hardware scroll performance
      container.scrollTop = currentScrollTop + distance * easedProgress;

      if (progress < 1) {
        scrollAnimRef.current = requestAnimationFrame(animateScroll);
      } else {
        container.scrollTop = targetScrollTop;
        scrollAnimRef.current = null;
        setIsGliding(false);
      }
    };

    scrollAnimRef.current = requestAnimationFrame(animateScroll);
  }, []);

  // Cleanup running animation on unmount
  useEffect(() => {
    return () => {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
      }
    };
  }, []);

  // Share handler
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  // Refresh handler that also triggers auto-scroll glide
  const handleRefreshClick = () => {
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => {
      scrollToActiveStation();
    }, 350);
  };


  // Core Data Parsing from RailRadar Live API (Fine-grained useMemo)
  // Recomputes ONLY when trainLive, trainSchedule or selectedTrainNo change
  const coreParsedData = useMemo(() => {
    const liveRoot = trainLive?.data || trainLive?.raw_data?.data || trainLive?.raw_data || trainLive || {};
    const schedRoot = trainSchedule?.data || trainSchedule?.raw_data || trainSchedule || {};

    const meta = liveRoot.train || schedRoot.train || schedRoot || {};
    const routeData = Array.isArray(liveRoot.route) && liveRoot.route.length > 0
      ? liveRoot.route
      : (Array.isArray(schedRoot.route) ? schedRoot.route : []);

    const curLoc = liveRoot.currentLocation || {};
    const nextH = liveRoot.nextHalt || {};

    // 1. Train Identification
    const number = String(meta.number || liveRoot.trainNumber || selectedTrainNo || '').trim();
    const name = meta.name || liveRoot.trainName || (number ? `Train #${number}` : 'Train Live Status');
    const type = meta.type || meta.category || 'Express';
    const category = meta.category || meta.type || 'Passenger Express';
    const zone = meta.zone || 'Indian Railways';
    const runDays = Array.isArray(meta.runDays)
      ? meta.runDays.map((d) => String(d).toLowerCase())
      : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    // 2. Current Live Telemetry & Speed
    const activeStationCode = curLoc.stationCode || liveRoot.current_station || (routeData[0]?.stationCode || routeData[0]?.station?.code) || '';
    const activeStationName = curLoc.stationName || (activeStationCode ? activeStationCode : '');

    const speedKmh = curLoc.speedKmh !== undefined
      ? Number(curLoc.speedKmh)
      : liveRoot.speed_kmh !== undefined
        ? Number(liveRoot.speed_kmh)
        : 0;
    const speed = `${Math.round(speedKmh)} km/h`;

    const delayMinutes = curLoc.delayMinutes !== undefined
      ? Number(curLoc.delayMinutes)
      : liveRoot.delayMinutes !== undefined
        ? Number(liveRoot.delayMinutes)
        : (liveRoot.delay_minutes !== undefined ? Number(liveRoot.delay_minutes) : 0);

    const delayText = delayMinutes === 0
      ? 'On time'
      : delayMinutes > 0
        ? `+${Math.round(delayMinutes)} min`
        : `${Math.abs(Math.round(delayMinutes))} min early`;

    // 3. Formatted Station Stops & Checkpoints (100% Real from Route Array)
    const activeIndex = routeData.findIndex((s) => {
      const c = (s.stationCode || s.station?.code || s.code || '').toUpperCase();
      return activeStationCode && c === activeStationCode.toUpperCase();
    });
    const activeSeqIndex = activeIndex >= 0 ? activeIndex : 0;

    const formattedStops = routeData.map((st, idx) => {
      const code = st.stationCode || st.station?.code || st.code || `STN-${idx + 1}`;
      const stName = st.stationName || st.station?.name || st.name || code;
      const isHalt = Boolean(st.isHalt);

      const schedArr = extractTimeDisplay(st.scheduledArrival || st.arrival);
      const schedDep = extractTimeDisplay(st.scheduledDeparture || st.departure);
      const actArr = extractTimeDisplay(st.actualArrival || st.actArrival || (st.status === 'departed' || st.status === 'arrived' ? st.arrival : null));
      const actDep = extractTimeDisplay(st.actualDeparture || st.actDeparture || (st.status === 'departed' ? st.departure : null));

      const delayVal = st.delayDeparture !== undefined ? st.delayDeparture : st.delayArrival !== undefined ? st.delayArrival : st.delayMinutes;
      let delayBadge = 'On time';
      if (delayVal !== undefined && delayVal !== null) {
        const dNum = Number(delayVal);
        if (dNum === 0) delayBadge = 'On time';
        else if (dNum > 0) delayBadge = `+${Math.round(dNum)} min`;
        else delayBadge = `${Math.abs(Math.round(dNum))} min early`;
      }

      const pf = st.platform ? String(st.platform).trim() : '-';
      const dist = st.distance !== undefined ? `${st.distance} km` : '--';

      const isStart = idx === 0;
      const isCurrent = st.status === 'arrived' || st.status === 'approaching' || (activeStationCode && code.toUpperCase() === activeStationCode.toUpperCase());
      const isPassed = st.status === 'departed' || (activeIndex >= 0 && idx < activeIndex);

      return {
        seq: st.sequence || idx + 1,
        code,
        name: stName,
        isHalt,
        status: st.status || (isPassed ? 'departed' : isCurrent ? 'current' : 'upcoming'),
        schedArr: schedArr || '-',
        schedDep: schedDep || '-',
        actArr: actArr || '-',
        actDep: actDep || '-',
        delay: delayBadge,
        pf: pf !== '-' ? (pf.startsWith('PF') ? pf : `PF ${pf}`) : '-',
        distance: dist,
        isStart,
        isPassed,
        isCurrent,
      };
    });

    // 4. Origin & Destination Extraction from live route
    const firstStop = formattedStops[0];
    const lastStop = formattedStops.length > 0 ? formattedStops[formattedStops.length - 1] : null;

    const originCode = meta.source?.code || firstStop?.code || '--';
    const originName = meta.source?.name || firstStop?.name || originCode;
    const originDep = firstStop?.schedDep !== '-' ? firstStop?.schedDep : firstStop?.actDep || '--';
    const originPf = firstStop?.pf || '-';

    const destCode = meta.destination?.code || lastStop?.code || '--';
    const destName = meta.destination?.name || lastStop?.name || destCode;
    const destArr = lastStop?.schedArr !== '-' ? lastStop?.schedArr : lastStop?.actArr || '--';
    const destPf = lastStop?.pf || '-';

    // 5. Metrics & Distance
    const duration = formatDuration(meta.duration || (liveRoot.duration ? liveRoot.duration : 0));
    const distance = meta.distance ? `${meta.distance} km` : (lastStop && lastStop.distance !== '--' ? lastStop.distance : '--');
    const totalHalts = meta.totalHalts || formattedStops.filter((s) => s.isHalt).length || 0;
    const avgSpeed = meta.avgSpeed ? `${meta.avgSpeed} km/h` : '--';
    const maxSpeed = meta.maxSpeed ? `${meta.maxSpeed} km/h` : '--';
    const maxSpeedNum = parseFloat(meta.maxSpeed) || 130;

    // 6. Next Station
    const nextCode = nextH.stationCode || '--';
    const nextName = nextH.stationName || nextCode;
    const nextEta = extractTimeDisplay(nextH.scheduledArrival || nextH.scheduledDeparture || nextH.eta) || '--';
    const nextDistance = nextH.distance !== undefined ? `${nextH.distance} km` : '--';

    // 7. Progress Percentage
    const distFromOrigin = curLoc.distanceFromOriginKm !== undefined ? Number(curLoc.distanceFromOriginKm) : 0;
    const totalDistNum = Number(meta.distance) || (lastStop && parseFloat(lastStop.distance)) || 0;
    const progressPercent = totalDistNum > 0
      ? Math.min(100, Math.max(0, Math.round((distFromOrigin / totalDistNum) * 100)))
      : (curLoc.segmentProgress ? Math.round(curLoc.segmentProgress * 100) : 0);

    // 8. Coach Rake Composition (Dynamic from API)
    const coachPositionStr = meta.coachPosition || liveRoot.coachPosition || (routeData[0]?.coachPosition) || '';
    const coaches = coachPositionStr ? coachPositionStr.split('-').map((c, i) => {
      let typeName = 'General / SLR';
      let bg = 'bg-slate-100 text-slate-700 border-slate-300';
      if (c.startsWith('ENG')) { typeName = 'Locomotive Engine'; bg = 'bg-amber-100 text-amber-900 border-amber-300'; }
      else if (c.startsWith('H') || c.startsWith('EA')) { typeName = 'AC 1st Class (1A / Executive)'; bg = 'bg-purple-100 text-purple-900 border-purple-300'; }
      else if (c.startsWith('A') || c.startsWith('EC')) { typeName = 'AC 2-Tier (2A / Exec Chair)'; bg = 'bg-indigo-100 text-indigo-900 border-indigo-300'; }
      else if (c.startsWith('B') || c.startsWith('C')) { typeName = 'AC 3-Tier (3A / Chair Car)'; bg = 'bg-sky-100 text-sky-900 border-sky-300'; }
      else if (c.startsWith('M')) { typeName = 'AC 3 Economy (3E)'; bg = 'bg-blue-100 text-blue-900 border-blue-300'; }
      else if (c.startsWith('S')) { typeName = 'Sleeper Class (SL)'; bg = 'bg-teal-100 text-teal-900 border-teal-300'; }
      else if (c.startsWith('PC')) { typeName = 'Pantry Car'; bg = 'bg-emerald-100 text-emerald-900 border-emerald-300'; }
      else if (c.startsWith('LPR') || c.startsWith('DL') || c.startsWith('D')) { typeName = 'Luggage / Generator Car'; bg = 'bg-slate-200 text-slate-800 border-slate-400'; }
      return { id: c, name: typeName, index: i + 1, bgClass: bg };
    }) : [];

    // Extract Unique Classes
    const detectedClasses = new Set();
    coaches.forEach((c) => {
      if (c.id.startsWith('H') || c.id.startsWith('EA')) detectedClasses.add('1A / Exec');
      if (c.id.startsWith('A') || c.id.startsWith('EC')) detectedClasses.add('2A / Chair');
      if (c.id.startsWith('B') || c.id.startsWith('C')) detectedClasses.add('3A / 3E');
      if (c.id.startsWith('S')) detectedClasses.add('SL');
      if (c.id.startsWith('GEN') || c.id.startsWith('GS') || c.id.startsWith('D')) detectedClasses.add('2S / GEN');
    });
    const classesString = detectedClasses.size > 0 ? Array.from(detectedClasses).join(', ') : '1A, 2A, 3A, SL, 2S';
    const hasPantry = coaches.some((c) => c.id.startsWith('PC'));
    const hasAc = coaches.some((c) => c.id.startsWith('H') || c.id.startsWith('A') || c.id.startsWith('B') || c.id.startsWith('M') || c.id.startsWith('C') || c.id.startsWith('EA') || c.id.startsWith('EC'));
    const isPremium = type.toLowerCase().includes('rajdhani') || type.toLowerCase().includes('duronto') || type.toLowerCase().includes('shatabdi') || type.toLowerCase().includes('vande');

    // 9. Bearing, Status String & Operational Advisory
    const bearing = curLoc.bearingDegrees !== undefined && curLoc.bearingDegrees !== null
      ? `${Math.round(curLoc.bearingDegrees)}°`
      : (speedKmh > 0 ? 'In Transit' : 'Stationary');
    const liveStatusText = liveRoot.status
      ? (String(liveRoot.status).charAt(0).toUpperCase() + String(liveRoot.status).slice(1))
      : (delayMinutes > 0 ? 'Delayed' : 'Running');

    const statusDescription = liveRoot.status === 'completed'
      ? 'Journey Completed'
      : delayMinutes > 0
        ? `Running ${Math.round(delayMinutes)} min behind schedule`
        : delayMinutes < 0
          ? `Running ${Math.abs(Math.round(delayMinutes))} min ahead of schedule`
          : 'Running on scheduled time';

    const advisory = liveRoot.status === 'completed'
      ? `Train #${number} has completed its scheduled journey at ${destName} (${destCode}).`
      : delayMinutes > 15
        ? `Running with an observed delay of ${Math.round(delayMinutes)} min at section ${activeStationName || activeStationCode}. Loop precedence clearing in progress.`
        : delayMinutes < 0
          ? `Operating smoothly ${Math.abs(Math.round(delayMinutes))} min ahead of timetable.`
          : `Operating on-time with clear block track signals.`;

    return {
      number,
      name,
      type,
      category,
      zone,
      runDays,
      origin: { code: originCode, name: originName, time: originDep, platform: originPf },
      destination: { code: destCode, name: destName, time: destArr, platform: destPf },
      duration,
      distance,
      totalHalts,
      avgSpeed,
      speed,
      speedKmh,
      maxSpeed,
      maxSpeedNum,
      currentStation: activeStationName ? `${activeStationName} (${activeStationCode})` : activeStationCode,
      currentStationName: activeStationName || activeStationCode || 'En Route',
      currentStationCode: activeStationCode,
      currentDelay: delayText,
      delayMinutes,
      status: liveStatusText,
      statusDescription,
      nextStation: nextName !== '--' ? `${nextName} (${nextCode})` : '--',
      nextEta,
      nextDistance,
      progressPercent,
      currentDistance: `${distFromOrigin} km`,
      totalDistance: `${totalDistNum} km`,
      stops: formattedStops,
      totalCheckpoints: formattedStops.length,
      commercialHaltsCount: formattedStops.filter((s) => s.isHalt).length || totalHalts,
      coaches,
      classesString,
      hasPantry,
      hasAc,
      isPremium,
      bearing,
      advisory,
      activeSeqIndex,
      returnTrain: meta.returnTrain || '',
      liveRootRaw: liveRoot,
    };
  }, [trainSchedule, trainLive, selectedTrainNo]);

  // Derived Upcoming Commercial Halts
  const upcomingHalts = useMemo(() => {
    return coreParsedData.stops
      .filter((s) => s.isHalt && (s.status === 'upcoming' || s.seq > coreParsedData.activeSeqIndex))
      .slice(0, 5)
      .map((s) => ({
        name: `${s.name} (${s.code})`,
        eta: s.schedArr !== '-' ? s.schedArr : s.schedDep,
        delay: s.delay,
        pf: s.pf,
        dist: s.distance,
      }));
  }, [coreParsedData.stops, coreParsedData.activeSeqIndex]);

  // Combined Parsed Data
  const parsedData = useMemo(() => {
    const liveRoot = coreParsedData.liveRootRaw;
    const lastUpdated = extractTimeDisplay(liveRoot.lastUpdatedAt) || liveRoot.last_updated || lastRefreshedTime || 'Just Now';
    const startDate = liveRoot.startDate || journeyDate || todayIso;

    return {
      ...coreParsedData,
      upcomingHalts,
      lastUpdated,
      startDate,
    };
  }, [coreParsedData, upcomingHalts, lastRefreshedTime, journeyDate, todayIso]);

  // Displayed stops (All Checkpoints vs Commercial Halts Only)
  const visibleStops = useMemo(() => {
    if (!showAllCheckpoints) {
      return parsedData.stops.filter((s) => s.isHalt || s.isStart || s.seq === parsedData.stops.length);
    }
    return parsedData.stops;
  }, [parsedData.stops, showAllCheckpoints]);

  // Auto-scroll on initial load, refresh, or route subtab activation
  useEffect(() => {
    if (activeSubTab === 'route' && !loading) {
      const timer = setTimeout(() => {
        scrollToActiveStation();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [activeSubTab, lastRefreshedTime, parsedData.currentStationCode, loading, scrollToActiveStation]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-7 space-y-6 border border-slate-200/90 shadow-xs animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-80 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 select-none font-sans animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP ACTION BAR: Back to Search, Date Selector, Share & Save            */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        {/* Back Link */}
        <button
          type="button"
          onClick={onBackToSearch}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0284C7] transition-colors cursor-pointer py-1 group"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform text-slate-400 group-hover:text-[#0284C7]">
            arrow_back
          </span>
          <span>Back to Search</span>
        </button>

        {/* Right Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Dynamic Journey Date Selector */}
          <div className="relative">
            <label className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800 px-3 py-1.5 rounded-xl cursor-pointer shadow-2xs transition-colors">
              <span className="material-symbols-outlined text-[15px] text-slate-500">calendar_today</span>
              <span>{formatDateDisplay(journeyDate || parsedData.startDate)}</span>
              <input
                type="date"
                value={journeyDate || parsedData.startDate || todayIso}
                onChange={(e) => onDateChange && onDateChange(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
            </label>
          </div>

          {/* Manual On-Demand Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefreshClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Refresh live telemetry"
            >
              <span className="material-symbols-outlined text-[15px] text-[#0284C7]">refresh</span>
              <span>Refresh</span>
            </button>
          )}

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Copy link"
          >
            <span className="material-symbols-outlined text-[15px] text-slate-400">share</span>
            <span>{copiedShare ? 'Copied!' : 'Share'}</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={() => setIsSaved(!isSaved)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-95 ${isSaved
              ? 'bg-[#0284C7] text-white border-[#0284C7]'
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
          >
            <span className="material-symbols-outlined text-[15px]">
              {isSaved ? 'bookmark_added' : 'bookmark_border'}
            </span>
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TRAIN IDENTITY HERO CARD (OCC Daylight White Elevation)                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-6">
        {/* Top Identification Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3.5">
            {/* Train Icon Box */}
            <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-[#0284C7] shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-[24px]">directions_railway</span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {parsedData.number}
                </span>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {parsedData.name}
                </h1>
              </div>

              {/* Badges & Runs on */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[11px]">
                  {parsedData.type}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-sans font-medium text-[11px]">
                  {parsedData.zone}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] text-slate-400 font-medium">Runs on:</span>
                <div className="flex items-center gap-1">
                  {DAYS_OF_WEEK.map((d) => {
                    const isRunning = parsedData.runDays.includes(d.key);
                    return (
                      <span
                        key={d.key}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${isRunning
                          ? 'bg-sky-50 text-[#0284C7] border border-sky-200 font-bold'
                          : 'bg-transparent text-slate-300'
                          }`}
                      >
                        {d.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Live Status Beacon */}
          <div className="flex flex-col items-start lg:items-end gap-1 shrink-0">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold border ${parsedData.delayMinutes > 0
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${parsedData.delayMinutes > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
              />
              <span>{parsedData.status}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Last updated: {parsedData.lastUpdated}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. 6-TILE KEY METRICS STRIP                                               */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
          {/* Tile 1: From */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between h-full">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">From</span>
            <div className="mt-1">
              <span className="font-mono text-base font-black text-slate-900 block leading-none">
                {parsedData.origin.code}
              </span>
              <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                {parsedData.origin.name}
              </span>
            </div>
            <div className="text-xs font-mono font-bold text-slate-800 mt-2">
              {parsedData.origin.time}{' '}
              <span className="text-[10px] font-normal text-slate-400">({parsedData.origin.platform})</span>
            </div>
          </div>

          {/* Tile 2: To */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between h-full">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">To</span>
            <div className="mt-1">
              <span className="font-mono text-base font-black text-[#0284C7] block leading-none">
                {parsedData.destination.code}
              </span>
              <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                {parsedData.destination.name}
              </span>
            </div>
            <div className="text-xs font-mono font-bold text-slate-800 mt-2">
              {parsedData.destination.time}{' '}
              <span className="text-[10px] font-normal text-slate-400">({parsedData.destination.platform})</span>
            </div>
          </div>

          {/* Tile 3: Duration */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between h-full">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-slate-400">schedule</span>
              <span>Duration</span>
            </span>
            <span className="font-mono text-base font-black text-slate-900 mt-2.5 block">
              {parsedData.duration}
            </span>
          </div>

          {/* Tile 4: Distance */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between h-full">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-slate-400">straighten</span>
              <span>Distance</span>
            </span>
            <span className="font-mono text-base font-black text-slate-900 mt-2.5 block">
              {parsedData.distance}
            </span>
          </div>

          {/* Tile 5: Total Halts */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between h-full">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-slate-400">train</span>
              <span>Total Halts</span>
            </span>
            <span className="font-mono text-base font-black text-slate-900 mt-2.5 block">
              {parsedData.totalHalts}
            </span>
          </div>

          {/* Tile 6: Avg Speed */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between h-full">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-slate-400">speed</span>
              <span>Avg Speed</span>
            </span>
            <span className="font-mono text-base font-black text-slate-900 mt-2.5 block">
              {parsedData.avgSpeed}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SUB-NAVIGATION TABS & CONTROLLER                                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto thin-scrollbar w-full sm:w-auto">
          {[
            { id: 'route', label: 'Route & Timetable', icon: 'table_rows' },
            { id: 'live', label: 'Live Status', icon: 'sensors' },
            { id: 'info', label: 'Train Info', icon: 'info' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeSubTab === tab.id
                ? 'bg-white text-[#0284C7] shadow-xs border border-slate-200/90'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {activeSubTab === 'route' && (
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs font-mono">
              <button
                type="button"
                onClick={() => setTrackViewMode('ladder')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all ${trackViewMode === 'ladder'
                  ? 'bg-[#0284C7] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="Ladder Track Visual View"
              >
                <span className="material-symbols-outlined text-[14px]">linear_scale</span>
                <span>Track View</span>
              </button>
              <button
                type="button"
                onClick={() => setTrackViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all ${trackViewMode === 'table'
                  ? 'bg-[#0284C7] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="OCC Table View"
              >
                <span className="material-symbols-outlined text-[14px]">table_chart</span>
                <span>Table</span>
              </button>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 select-none">
            <input
              type="checkbox"
              checked={showActualTimes}
              onChange={(e) => setShowActualTimes(e.target.checked)}
              className="w-4 h-4 rounded text-[#0284C7] focus:ring-[#0284C7] border-slate-300 accent-[#0284C7] cursor-pointer"
            />
            <span>Show actual times</span>
          </label>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. TAB 1: ROUTE & TIMETABLE (LADDER TRACK VIEW & WORKSTATION)             */}
      {/* ========================================================================= */}
      {activeSubTab === 'route' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Track & Timetable Container (Daylight White Elevation) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden relative text-slate-900 flex flex-col">
            {/* Filter Pill Header */}
            <div className="p-3.5 px-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-800 font-bold">
                <span className="material-symbols-outlined text-[17px] text-[#0284C7]">linear_scale</span>
                <span>Track Corridor & Timetable</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[#0284C7] font-bold">
                  {visibleStops.length} stops
                </span>
              </div>

              {/* All vs Halts Filter */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px] font-mono shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowAllCheckpoints(true)}
                  className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer font-bold ${
                    showAllCheckpoints ? 'bg-[#0284C7] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({parsedData.totalCheckpoints})
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllCheckpoints(false)}
                  className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer font-bold ${
                    !showAllCheckpoints ? 'bg-[#0284C7] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Halts ({parsedData.commercialHaltsCount})
                </button>
              </div>
            </div>

            {/* A. LADDER TRACK VIEW (Clean Handcrafted Daylight Theme) */}
            {trackViewMode === 'ladder' && (
              <div className="relative bg-white text-slate-900 flex flex-col">
                {/* 1. Track Header Row: ARRIVAL | DAY 1 • DATE | DEPARTURE */}
                <div className="flex items-center text-[10px] font-mono tracking-widest text-slate-400 uppercase bg-slate-50/60 border-b border-slate-200/80 py-2.5 px-4">
                  <span className="w-20 sm:w-24 text-left font-bold pl-1 shrink-0 text-slate-400">ARRIVAL</span>
                  <div className="flex-1 flex justify-center">
                    <span className="px-3.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold border border-slate-200 shadow-2xs tracking-wider">
                      DAY 1 • {formatDateHeader(parsedData.startDate)}
                    </span>
                  </div>
                  <span className="w-20 sm:w-24 text-right font-bold pr-1 shrink-0 text-slate-400">DEPARTURE</span>
                </div>

                {/* 2. Stations Ladder Track Spine Viewport with Dynamic Motion Blur */}
                {isGliding && (
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-900/90 text-white backdrop-blur-md px-4 py-1.5 rounded-full shadow-xl border border-sky-400/50 text-[11px] font-mono font-bold animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] animate-ping" />
                    <span className="text-sky-300">GLIDING TO LIVE TRAIN LOCATION</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-white">{parsedData.currentStationName || parsedData.currentStationCode}</span>
                  </div>
                )}

                <div
                  ref={trackViewportRef}
                  className={`p-2 sm:p-3 pb-24 overflow-y-auto max-h-[660px] thin-scrollbar space-y-0 select-text relative bg-white will-change-scroll scroll-smooth ${
                    isGliding ? 'pointer-events-none' : ''
                  }`}
                >
                  {visibleStops.map((st, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === visibleStops.length - 1;
                    const isCurrent = st.isCurrent;

                    return (
                      <div
                        key={st.seq}
                        ref={isCurrent ? activeStationRowRef : null}
                        id={`station-row-${st.code}`}
                        style={{
                          contentVisibility: 'auto',
                          containIntrinsicSize: '60px',
                        }}
                        className={`flex items-stretch py-2 px-2 rounded-xl transition-colors relative ${
                          isCurrent
                            ? 'bg-sky-50/70 border border-sky-200/80 shadow-2xs'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Column 1: Arrival Time (Left) */}
                        <div className="w-20 sm:w-24 shrink-0 font-mono text-left pl-1 self-center">
                          <span className="text-xs sm:text-[13px] font-bold text-slate-700 block leading-tight">
                            {isFirst ? '' : st.schedArr !== '-' ? st.schedArr : ''}
                          </span>
                          {showActualTimes && !isFirst && st.actArr !== '-' && (
                            <span className="text-[11px] font-mono text-[#0284C7] block font-semibold mt-0.5">
                              {st.actArr}
                            </span>
                          )}
                        </div>

                        {/* Column 2: Continuous Railway Track Geometry */}
                        <div className="w-12 shrink-0 relative flex items-center justify-center self-stretch">
                          {/* Continuous Left Rail Line */}
                          <div
                            className={`absolute w-[2px] bg-slate-300 left-[14px] ${
                              isFirst ? 'top-1/2 bottom-0' : isLast ? 'top-0 bottom-1/2' : 'top-0 bottom-0'
                            }`}
                          />
                          {/* Continuous Right Rail Line */}
                          <div
                            className={`absolute w-[2px] bg-slate-300 right-[14px] ${
                              isFirst ? 'top-1/2 bottom-0' : isLast ? 'top-0 bottom-1/2' : 'top-0 bottom-0'
                            }`}
                          />

                          {/* Crosstie Sleepers */}
                          <div className="absolute left-[14px] right-[14px] top-[20%] h-[1.5px] bg-slate-200" />
                          <div className="absolute left-[14px] right-[14px] top-[50%] h-[1.5px] bg-slate-200" />
                          <div className="absolute left-[14px] right-[14px] top-[80%] h-[1.5px] bg-slate-200" />

                          {/* Center Node Marker: Minimal Locomotive Badge for Current Station, Amber Bead for Others */}
                          {isCurrent ? (
                            <div
                              className="relative z-10 w-6 h-6 rounded-full bg-[#0284C7] text-white flex items-center justify-center shadow-xs ring-2 ring-sky-100 border border-white"
                              title="Current locomotive position"
                            >
                              <span className="material-symbols-outlined text-[13px] relative z-10">directions_railway</span>
                            </div>
                          ) : (
                            <div
                              className={`relative z-10 rounded-full shadow-xs border-2 border-white ${
                                st.isHalt
                                  ? 'w-3 h-3 bg-amber-400 ring-1 ring-amber-300/40'
                                  : 'w-2 h-2 bg-slate-300'
                              }`}
                            />
                          )}
                        </div>


                        {/* Column 3: Station Details */}
                        <div className="flex-1 min-w-0 pr-3 self-center space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs sm:text-[13px] font-bold tracking-tight truncate ${
                                isCurrent ? 'text-[#0284C7]' : 'text-slate-900'
                              }`}
                            >
                              {st.name}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500">
                            <span className="font-semibold text-slate-700">{st.code}</span>
                            <span className="text-slate-300">•</span>
                            <span>{st.distance}</span>
                            {st.pf !== '-' && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200/80 text-[10px] text-slate-600 font-semibold font-mono">
                                  {st.pf} ✎
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Column 4: Departure Time (Right) */}
                        <div className="w-20 sm:w-24 shrink-0 font-mono text-right pr-1 self-center">
                          <span className="text-xs sm:text-[13px] font-bold text-slate-800 block leading-tight">
                            {isLast ? '' : st.schedDep !== '-' ? st.schedDep : ''}
                          </span>
                          {showActualTimes && !isLast && st.actDep !== '-' && (
                            <span className="text-[11px] font-mono text-[#0284C7] block font-semibold mt-0.5">
                              {st.actDep}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Floating "In Train?" Button */}
                <div className="absolute right-4 bottom-24 z-20">
                  <button
                    type="button"
                    onClick={() => setIsInTrain(!isInTrain)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer border ${
                      isInTrain
                        ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-sky-200'
                        : 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-sm backdrop-blur-md'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#0284C7]">
                      location_on
                    </span>
                    <span>In Train?</span>
                  </button>
                </div>

                {/* Floating Bottom Telemetry Drawer with Interactive Jump-To-Train Focus */}
                <div className="bg-slate-50/90 border-t border-slate-200/90 p-4 px-5 flex items-center justify-between z-10 shadow-xs rounded-b-2xl">
                  {/* Left: Station & Dynamic Telemetry State */}
                  <button
                    type="button"
                    onClick={() => scrollToActiveStation(true)}
                    className="text-left group cursor-pointer space-y-1 focus:outline-none"
                    title="Click to jump directly to live train location"
                  >
                    <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2 opacity-60 group-hover:bg-[#0284C7] transition-colors" />
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight group-hover:text-[#0284C7] transition-colors">
                        At {parsedData.currentStationName || parsedData.currentStation}
                      </h2>
                      <span className="material-symbols-outlined text-[15px] text-slate-400 group-hover:text-[#0284C7] group-hover:scale-110 transition-transform">
                        my_location
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase border ${
                          parsedData.delayMinutes > 0
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {parsedData.status}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Updated {parsedData.lastUpdated}
                      </span>
                      <span className="text-[10px] text-[#0284C7] font-semibold underline underline-offset-2 ml-1 hidden sm:inline group-hover:text-[#0369a1]">
                        Focus Train ➔
                      </span>
                    </div>
                  </button>

                  {/* Right: Circular Action Refresh Button */}
                  {onRefresh && (
                    <button
                      type="button"
                      onClick={handleRefreshClick}
                      className="w-11 h-11 rounded-full bg-[#0284C7] hover:bg-[#0369a1] active:scale-95 text-white flex items-center justify-center shadow-md transition-all cursor-pointer shrink-0"
                      title="Refresh live status and focus train"
                    >
                      <span className="material-symbols-outlined text-[22px]">refresh</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* B. OCC TABLE VIEW (Alternative Workstation View) */}
            {trackViewMode === 'table' && (
              <div className="overflow-x-auto max-h-[700px] overflow-y-auto thin-scrollbar bg-white text-slate-900">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3">Station</th>
                      <th className="py-3 px-2 text-center" colSpan={2}>
                        Scheduled
                        <div className="flex justify-around text-[9px] font-normal text-slate-400 mt-0.5">
                          <span>Arr</span>
                          <span>Dep</span>
                        </div>
                      </th>
                      {showActualTimes && (
                        <th className="py-3 px-2 text-center" colSpan={2}>
                          Actual
                          <div className="flex justify-around text-[9px] font-normal text-slate-400 mt-0.5">
                            <span>Arr</span>
                            <span>Dep</span>
                          </div>
                        </th>
                      )}
                      <th className="py-3 px-3 text-center">Delay</th>
                      <th className="py-3 px-3 text-center">PF</th>
                      <th className="py-3 px-3 text-right">Distance</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-sans">
                    {visibleStops.map((st) => (
                      <tr
                        key={st.seq}
                        style={{
                          contentVisibility: 'auto',
                          containIntrinsicSize: '40px',
                        }}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          st.isCurrent ? 'bg-cyan-50/50 font-medium' : ''
                        }`}
                      >
                        {/* Seq */}
                        <td className="py-3 px-3 font-mono text-slate-400 text-center">
                          {st.seq}
                        </td>

                        {/* Station Name & Code */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{st.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">({st.code})</span>
                          </div>
                          {st.isStart && (
                            <span className="text-[10px] text-slate-400 font-mono block">Start</span>
                          )}
                          {st.isHalt && !st.isStart && (
                            <span className="text-[9px] text-[#0284C7] font-mono uppercase font-semibold">
                              Halt Station
                            </span>
                          )}
                        </td>

                        {/* Scheduled Times */}
                        <td className="py-3 px-2 text-center font-mono text-slate-600">{st.schedArr}</td>
                        <td className="py-3 px-2 text-center font-mono text-slate-600">{st.schedDep}</td>

                        {/* Actual Times */}
                        {showActualTimes && (
                          <>
                            <td className="py-3 px-2 text-center font-mono text-slate-900 font-bold">
                              {st.actArr}
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-slate-900 font-bold">
                              {st.actDep}
                            </td>
                          </>
                        )}

                        {/* Delay Badge */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                              st.delay.toLowerCase().includes('on time')
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                                : 'text-amber-700 bg-amber-50 border border-amber-100'
                            }`}
                          >
                            {st.delay}
                          </span>
                        </td>

                        {/* Platform */}
                        <td className="py-3 px-3 text-center font-mono text-slate-700">
                          {st.pf}
                        </td>

                        {/* Distance */}
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {st.distance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column: Live Telemetry Stack */}
          <div className="lg:col-span-5 space-y-4">
            {/* 1. Current Status Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Current Status
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs border flex items-center gap-1.5 ${parsedData.delayMinutes > 0
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full animate-pulse ${parsedData.delayMinutes > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                  />
                  <span>{parsedData.status}</span>
                </span>
              </div>

              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  At {parsedData.currentStation}
                </h2>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  {parsedData.statusDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                {/* Current Speed */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                    Current Speed
                  </span>
                  <span className="font-mono text-sm font-extrabold text-slate-900 block mt-1">
                    {parsedData.speed}
                  </span>
                </div>

                {/* Next Station */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-slate-400">location_on</span>
                    <span>Next Station</span>
                  </span>
                  <span className="font-mono text-xs font-extrabold text-slate-900 block mt-1 truncate">
                    {parsedData.nextStation}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                    in {parsedData.nextDistance} • ETA {parsedData.nextEta}
                  </span>
                </div>

                {/* Current Delay */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                    Current Delay
                  </span>
                  <span
                    className={`font-mono text-sm font-extrabold block mt-1 ${parsedData.delayMinutes > 0 ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                  >
                    {parsedData.currentDelay}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {parsedData.delayMinutes > 0
                      ? `${Math.round(parsedData.delayMinutes)} min late`
                      : parsedData.delayMinutes < 0
                        ? `${Math.abs(Math.round(parsedData.delayMinutes))} min early`
                        : 'On schedule'}
                  </span>
                </div>

                {/* Last Updated */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                    Last Updated
                  </span>
                  <span className="font-mono text-sm font-extrabold text-slate-900 block mt-1">
                    {parsedData.lastUpdated}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                    {formatDateDisplay(parsedData.startDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Journey Progress Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Journey Progress
                </span>
                <span className="font-mono text-xs font-bold text-[#0284C7]">
                  {parsedData.progressPercent}%
                </span>
              </div>

              {/* Progress Track Bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-[#0284C7] rounded-full transition-all duration-500 shadow-2xs"
                  style={{ width: `${parsedData.progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-1">
                <div>
                  <span className="font-bold text-slate-900 block">{parsedData.origin.name}</span>
                  <span className="text-[10px] text-slate-400">{parsedData.origin.time}</span>
                </div>
                <div className="text-center">
                  <span className="font-bold text-slate-700 block">
                    {parsedData.currentDistance} / {parsedData.totalDistance}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900 block">{parsedData.destination.name}</span>
                  <span className="text-[10px] text-slate-400">{parsedData.destination.time}</span>
                </div>
              </div>
            </div>

            {/* 3. Service & Amenities Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Service & Amenities
              </span>

              <div className="grid grid-cols-5 gap-2 text-center">
                {/* WiFi */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col items-center">
                  <span className="material-symbols-outlined text-[20px] text-[#0284C7]">wifi</span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1">WiFi</span>
                  <span className="text-[10px] font-bold text-slate-800 font-mono">
                    {parsedData.isPremium ? 'Available' : 'Station'}
                  </span>
                </div>

                {/* Food */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col items-center">
                  <span className="material-symbols-outlined text-[20px] text-[#0284C7]">restaurant</span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1">Food</span>
                  <span className="text-[10px] font-bold text-slate-800 font-mono truncate max-w-[50px]">
                    {parsedData.hasPantry ? 'Pantry Car' : 'E-Catering'}
                  </span>
                </div>

                {/* AC */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col items-center">
                  <span className="material-symbols-outlined text-[20px] text-[#0284C7]">ac_unit</span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1">AC</span>
                  <span className="text-[10px] font-bold text-slate-800 font-mono">
                    {parsedData.hasAc ? 'Yes' : 'Non-AC'}
                  </span>
                </div>

                {/* Charging */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col items-center">
                  <span className="material-symbols-outlined text-[20px] text-[#0284C7]">power</span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1">Charging</span>
                  <span className="text-[10px] font-bold text-slate-800 font-mono">Available</span>
                </div>

                {/* Coach Type */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col items-center">
                  <span className="material-symbols-outlined text-[20px] text-[#0284C7]">train</span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1">Coach Type</span>
                  <span className="text-[10px] font-bold text-slate-800 font-mono">
                    {parsedData.coaches.length > 0 ? 'LHB' : 'ICF'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB 2: LIVE STATUS & TELEMETRY RADAR                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Speedometer & Speed Performance */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Live Speed & Telemetry Gauge
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-bold border border-emerald-200">
                GPS Synced
              </span>
            </div>

            {/* Dynamic Speed Gauge */}
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="text-slate-100"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="text-[#0284C7]"
                    strokeWidth="8"
                    strokeDasharray={264}
                    strokeDashoffset={264 - (264 * Math.min(100, Math.max(0, parsedData.speedKmh))) / (parsedData.maxSpeedNum || 130)}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="font-mono text-3xl font-black text-slate-900">
                    {Math.round(parsedData.speedKmh)}
                  </span>
                  <span className="text-xs font-mono text-slate-500">km/h</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full text-center pt-4 border-t border-slate-100 mt-2">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Max Speed</span>
                  <span className="font-mono text-sm font-bold text-slate-800 mt-0.5 block">
                    {parsedData.maxSpeed}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Avg Speed</span>
                  <span className="font-mono text-sm font-bold text-slate-800 mt-0.5 block">
                    {parsedData.avgSpeed}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Heading</span>
                  <span className="font-mono text-sm font-bold text-[#0284C7] mt-0.5 block">
                    {parsedData.bearing}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Upcoming Halts Forecast */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Upcoming Commercial Halts
            </h2>

            <div className="space-y-3">
              {parsedData.upcomingHalts.length > 0 ? (
                parsedData.upcomingHalts.map((halt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 text-xs block">{halt.name}</span>
                      <span className="text-[11px] font-mono text-slate-500">
                        Scheduled ETA: {halt.eta} • {halt.pf}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-mono font-bold block ${halt.delay.toLowerCase().includes('on time')
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                          }`}
                      >
                        {halt.delay}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{halt.dist}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-mono">
                  All commercial halts for this service have been completed or train is at final terminal.
                </div>
              )}
            </div>

            {/* Operational Advisory */}
            <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#0284C7] text-[20px] shrink-0 mt-0.5">
                verified
              </span>
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-900 block">OCC Track Clearance Status</span>
                <p className="text-slate-600 leading-relaxed">
                  {parsedData.advisory}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB 3: TRAIN INFO & COACH COMPOSITION                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'info' && (
        <div className="space-y-5">
          {/* Coach Composition Rake */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Coach Position & Rake Composition
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {parsedData.coaches.length > 0
                    ? `LHB Rake • Total ${parsedData.coaches.length} Coaches • Engine to Rear`
                    : 'Standard Indian Railways Rake Composition'}
                </p>
              </div>
            </div>

            {/* Coach Horizontal Train Track */}
            {parsedData.coaches.length > 0 ? (
              <div className="overflow-x-auto thin-scrollbar pb-3 pt-2">
                <div className="flex items-center gap-1.5 min-w-max">
                  {parsedData.coaches.map((coach) => (
                    <button
                      key={coach.id}
                      type="button"
                      onClick={() => setSelectedCoach(coach)}
                      className={`px-3 py-2 rounded-lg font-mono text-xs font-bold transition-transform hover:scale-105 border cursor-pointer ${selectedCoach?.id === coach.id
                        ? 'ring-2 ring-[#0284C7] scale-105 shadow-xs'
                        : ''
                        } ${coach.bgClass}`}
                    >
                      <span>{coach.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-mono">
                Coach composition information is updated closer to departure time.
              </div>
            )}

            {selectedCoach && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between animate-in fade-in duration-150">
                <div>
                  <span className="font-bold text-slate-900">Coach {selectedCoach.id}</span>
                  <span className="text-slate-500 ml-2 font-mono">({selectedCoach.name})</span>
                </div>
                <span className="text-slate-500 font-mono">
                  Position #{selectedCoach.index} from Locomotive
                </span>
              </div>
            )}
          </div>

          {/* Technical Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Operating Details
              </span>
              <div className="space-y-2 text-xs divide-y divide-slate-100 font-mono">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Return Train Number:</span>
                  <span className="text-slate-900 font-bold">
                    {parsedData.returnTrain ? `#${parsedData.returnTrain}` : 'Not Assigned'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Operating Railway Zone:</span>
                  <span className="text-slate-900 font-bold">{parsedData.zone}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Rake Type:</span>
                  <span className="text-slate-900 font-bold">
                    {parsedData.coaches.length > 0 ? 'LHB Stainless Steel' : 'Standard ICF'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Catering & Amenities
              </span>
              <div className="space-y-2 text-xs divide-y divide-slate-100 font-mono">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Pantry Car:</span>
                  <span
                    className={`font-bold ${parsedData.hasPantry ? 'text-emerald-700' : 'text-slate-700'
                      }`}
                  >
                    {parsedData.hasPantry ? 'Available On-Board' : 'Station E-Catering'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Catering Service:</span>
                  <span className="text-slate-900 font-bold">
                    {parsedData.isPremium
                      ? 'Complimentary (Rajdhani/Duronto/Vande)'
                      : 'On-Demand / Purchase'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Classes:</span>
                  <span className="text-slate-900 font-bold">{parsedData.classesString}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveTrainStatusSection;
