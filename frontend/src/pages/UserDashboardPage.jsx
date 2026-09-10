import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LiveTrainStatusSection } from '../components/live-train/LiveTrainStatusSection';
import { StationAutocompleteInput } from '../components/user-dashboard/StationAutocompleteInput';
import { TrainCard } from '../components/user-dashboard/TrainCard';
import { cleanCode } from '../data/indianStations';
import { formatDateDisplay, formatDuration } from '../utils/dateTimeUtils';

/**
 * Standard Indian Railways Junctions for quick autocomplete & chips
 */
const POPULAR_STATIONS = [
  { code: 'NDLS', name: 'New Delhi', city: 'Delhi', nearby: ['DLI', 'NZM', 'ANVT', 'DEC'] },
  { code: 'HWH', name: 'Howrah', city: 'Kolkata', nearby: ['SDAH', 'KOAA', 'SHM', 'SRC'] },
  { code: 'LJN', name: 'Lucknow Jn', city: 'Lucknow', nearby: ['LKO', 'BNZ', 'ASH'] },
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', nearby: ['CPA', 'GOY'] },
  { code: 'INDB', name: 'Indore Jn', city: 'Indore', nearby: ['LMNR', 'DWX'] },
  { code: 'UJN', name: 'Ujjain Jn', city: 'Ujjain', nearby: ['NAD', 'MKC'] },
  { code: 'BPL', name: 'Bhopal Jn', city: 'Bhopal', nearby: ['RKMP', 'HBJ', 'SHRN'] },
  { code: 'PRYJ', name: 'Prayagraj Jn', city: 'Prayagraj', nearby: ['PRG', 'NYN', 'ACOI'] },
  { code: 'DDU', name: 'Pt. Deen Dayal Upadhyaya', city: 'Mughalsarai', nearby: ['BSB', 'BSBS'] },
  { code: 'CSMT', name: 'Mumbai CSMT', city: 'Mumbai', nearby: ['DR', 'LTT', 'TNA', 'BVI'] },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', nearby: ['BDTS', 'BVI', 'DR'] },
  { code: 'MAS', name: 'Chennai Central', city: 'Chennai', nearby: ['MS', 'TBM', 'PER'] },
  { code: 'SBC', name: 'KSR Bengaluru', city: 'Bengaluru', nearby: ['YPR', 'SMVB', 'BNC'] },
  { code: 'ADI', name: 'Ahmedabad Jn', city: 'Ahmedabad', nearby: ['SBT', 'MAN'] },
  { code: 'SVDK', name: 'Shri Mata Vaishno Devi Katra', city: 'Katra', nearby: ['UHP', 'JAT'] },
  { code: 'JYG', name: 'Jaynagar', city: 'Jaynagar', nearby: ['MBI', 'DBG'] },
  { code: 'PUNE', name: 'Pune Jn', city: 'Pune', nearby: ['SVJR', 'KK'] },
  { code: 'HYB', name: 'Hyderabad Deccan', city: 'Hyderabad', nearby: ['SC', 'KCG'] },
];

const STANDARD_TRAIN_TYPES = [
  { id: 'ALL', label: 'All' },
  { id: 'Rajdhani', label: 'Rajdhani' },
  { id: 'Shatabdi', label: 'Shatabdi' },
  { id: 'Duronto', label: 'Duronto' },
  { id: 'Superfast', label: 'Superfast' },
  { id: 'Express', label: 'Express' },
  { id: 'Passenger', label: 'Passenger' },
  { id: 'Special', label: 'Special' },
];

const DAYS_OF_WEEK = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

function cleanStationCode(str) {
  return cleanCode(str);
}

export function UserDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Search parameters
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');
  const urlFrom = searchParams.get('from');
  const urlTo = searchParams.get('to');
  const urlDate = searchParams.get('date');
  const urlTrain = searchParams.get('train');

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Search Form State
  const [fromStation, setFromStation] = useState(urlFrom || 'NDLS');
  const [toStation, setToStation] = useState(urlTo || 'HWH');
  const [journeyDate, setJourneyDate] = useState(urlDate || todayIso);
  const [showOnlySelectedDate, setShowOnlySelectedDate] = useState(false);
  const [selectedType, setSelectedType] = useState('ALL');
  const [sortBy, setSortBy] = useState('departure_asc');

  // Find Trains API State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [betweenData, setBetweenData] = useState(null);

  // Live Train Section State
  const [selectedTrainNo, setSelectedTrainNo] = useState(urlTrain || '12274');
  const [trainSchedule, setTrainSchedule] = useState(null);
  const [trainLive, setTrainLive] = useState(null);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainError, setTrainError] = useState(null);
  const [lastRefreshedTime, setLastRefreshedTime] = useState('Just Now');

  // Active Tab
  const activeTab = useMemo(() => {
    if (tabParam === 'live-status') return 'live-status';
    if (tabParam === 'about') return 'about';
    return 'find-trains';
  }, [tabParam]);

  // Sync selected train from URL
  useEffect(() => {
    if (urlTrain) {
      setSelectedTrainNo(urlTrain);
    }
  }, [urlTrain]);


  const getStationDisplayName = (code) => {
    if (!code) return '';
    const found = POPULAR_STATIONS.find(
      (s) => s.code.toUpperCase() === code.toUpperCase()
    );
    return found ? found.name : code;
  };

  /**
   * Search Trains Between Stations (Corridor)
   */
  const searchTrainsBetween = useCallback(async (fromInput, toInput, dateIso = null) => {
    const cleanFrom = cleanStationCode(fromInput);
    const cleanTo = cleanStationCode(toInput);

    if (!cleanFrom || !cleanTo) {
      setError('Please specify both Origin (From) and Destination (To) stations.');
      return;
    }

    if (cleanFrom === cleanTo) {
      setError('Source and Destination stations cannot be identical.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getTrainsBetween(cleanFrom, cleanTo, dateIso);
      if (response && response.success) {
        setBetweenData(response.data);
      } else {
        setError(response?.error || `No train data found between ${cleanFrom} and ${cleanTo}.`);
      }
    } catch (err) {
      console.error('Error searching trains:', err);
      const detail =
        err.response?.data?.detail ||
        (err.response?.status === 404
          ? `No direct trains operating between ${cleanFrom} and ${cleanTo}.`
          : 'Unable to communicate with the RailRadar corridor service.');
      setError(detail);
      setBetweenData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load Live Status and Static Schedule for Selected Train
   * Static Schedule is cached with a 1-hour in-memory TTL in api.getTrainSchedule and only live telemetry is refreshed.
   */
  const loadSingleTrainLive = useCallback(async (trainNo, dateIso, isRefresh = false) => {
    if (!trainNo) return;
    setTrainLoading(true);
    setTrainError(null);

    try {
      // If doing a live refresh and schedule already exists, only request fresh live telemetry
      const shouldFetchSchedule = !isRefresh || !trainSchedule;

      const promises = [
        api.getTrainLive(trainNo, dateIso),
      ];
      if (shouldFetchSchedule) {
        promises.push(api.getTrainSchedule(trainNo));
      }

      const results = await Promise.allSettled(promises);
      const liveRes = results[0];
      const schedRes = shouldFetchSchedule ? results[1] : null;

      let sched = null;
      let live = null;

      if (liveRes.status === 'fulfilled' && liveRes.value) {
        live = liveRes.value.data || liveRes.value;
      }
      if (schedRes && schedRes.status === 'fulfilled' && schedRes.value) {
        sched = schedRes.value.data || schedRes.value;
      }

      if (!sched && !live && !trainSchedule) {
        setTrainError(`Telemetry for train #${trainNo} is currently unavailable.`);
      } else {
        if (sched) setTrainSchedule(sched);
        if (live) setTrainLive(live);
        setLastRefreshedTime(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
      }
    } catch (err) {
      console.error('Error loading single train live:', err);
      setTrainError('Failed to retrieve live train telemetry.');
    } finally {
      setTrainLoading(false);
    }
  }, [trainSchedule]);

  // Fetch corridor trains on mount if on find-trains tab
  useEffect(() => {
    if (activeTab === 'find-trains') {
      searchTrainsBetween(fromStation, toStation, journeyDate);
    }
  }, [activeTab, searchTrainsBetween]);

  // Fetch live train data whenever live-status tab is active or selected train changes
  useEffect(() => {
    if (activeTab === 'live-status') {
      loadSingleTrainLive(selectedTrainNo, journeyDate);
    }
  }, [activeTab, selectedTrainNo, journeyDate, loadSingleTrainLive]);

  // Handle Find Trains form submit
  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    searchTrainsBetween(fromStation, toStation, journeyDate);
    navigate(
      `/user-dashboard?from=${encodeURIComponent(cleanStationCode(fromStation))}&to=${encodeURIComponent(
        cleanStationCode(toStation)
      )}&date=${journeyDate}`,
      { replace: true }
    );
  };

  // Swap Stations
  const handleSwapStations = () => {
    const prevFrom = fromStation;
    const prevTo = toStation;
    setFromStation(prevTo);
    setToStation(prevFrom);
    searchTrainsBetween(prevTo, prevFrom, journeyDate);
    navigate(
      `/user-dashboard?from=${encodeURIComponent(cleanStationCode(prevTo))}&to=${encodeURIComponent(
        cleanStationCode(prevFrom)
      )}&date=${journeyDate}`,
      { replace: true }
    );
  };

  /**
   * Navigate to Live Status Section when a Train Card is Clicked
   */
  const handleSelectTrainCard = useCallback((trainNo) => {
    setSelectedTrainNo(trainNo);
    navigate(
      `/user-dashboard?tab=live-status&train=${encodeURIComponent(trainNo)}&date=${journeyDate}&from=${encodeURIComponent(
        cleanStationCode(fromStation)
      )}&to=${encodeURIComponent(cleanStationCode(toStation))}`,
      { replace: true }
    );
  }, [journeyDate, fromStation, toStation, navigate]);

  // Return to Search
  const handleBackToSearch = () => {
    navigate(
      `/user-dashboard?tab=find-trains&from=${encodeURIComponent(
        cleanStationCode(fromStation)
      )}&to=${encodeURIComponent(cleanStationCode(toStation))}&date=${journeyDate}`,
      { replace: true }
    );
  };

  // Share handler
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const selectedDayOfWeek = useMemo(() => {
    if (!journeyDate) return null;
    try {
      const d = new Date(journeyDate + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().substring(0, 3);
    } catch {
      return null;
    }
  }, [journeyDate]);

  // Filtered & Sorted Find Trains List
  const processedTrains = useMemo(() => {
    let list = betweenData?.trains || [];

    if (selectedType !== 'ALL') {
      list = list.filter((t) => {
        const typeStr = (t.train?.type || '').toLowerCase();
        return typeStr.includes(selectedType.toLowerCase());
      });
    }

    if (showOnlySelectedDate && selectedDayOfWeek) {
      list = list.filter((t) => {
        const runDays = Array.isArray(t.train?.runDays)
          ? t.train.runDays.map((d) => d.toLowerCase())
          : [];
        return runDays.includes(selectedDayOfWeek);
      });
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'departure_asc') {
        const depA = a.from?.departure || '99:99';
        const depB = b.from?.departure || '99:99';
        return depA.localeCompare(depB);
      }
      if (sortBy === 'departure_desc') {
        const depA = a.from?.departure || '00:00';
        const depB = b.from?.departure || '00:00';
        return depB.localeCompare(depA);
      }
      if (sortBy === 'arrival_asc') {
        const arrA = a.to?.arrival || '99:99';
        const arrB = b.to?.arrival || '99:99';
        return arrA.localeCompare(arrB);
      }
      if (sortBy === 'duration_asc') {
        return (Number(a.duration) || 0) - (Number(b.duration) || 0);
      }
      return 0;
    });
  }, [betweenData, selectedType, showOnlySelectedDate, selectedDayOfWeek, sortBy]);

  const originName = betweenData?.from?.name || getStationDisplayName(fromStation) || fromStation;
  const destName = betweenData?.to?.name || getStationDisplayName(toStation) || toStation;
  const originCode = betweenData?.from?.code || cleanStationCode(fromStation) || 'NDLS';
  const destCode = betweenData?.to?.code || cleanStationCode(toStation) || 'HWH';

  return (
    <div className="space-y-6 text-slate-800">
      {/* ========================================================================= */}
      {/* SECTION 1: FIND TRAINS CORRIDOR SEARCH (Default View)                     */}
      {/* ========================================================================= */}
      {activeTab === 'find-trains' && (
        <div className="space-y-6">
          {/* Handcrafted Search Console */}
          <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#0284C7] flex items-center justify-center shrink-0 border border-slate-200/60">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Find Trains
                </h1>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Search trains between two stations
                </p>
              </div>
            </div>

            {/* Horizontal Input Bar */}
            <form onSubmit={handleSearchSubmit} className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                {/* 1. From Station Box */}
                <div className="lg:col-span-4">
                  <StationAutocompleteInput
                    label="From Station"
                    value={fromStation}
                    onChange={setFromStation}
                    placeholder="New Delhi"
                    badgeColor="blue"
                    defaultCode="NDLS"
                  />
                </div>

                {/* Swap Button */}
                <div className="lg:col-span-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleSwapStations}
                    className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-[#0284C7] shadow-2xs flex items-center justify-center transition-transform active:rotate-180 cursor-pointer"
                    title="Swap Origin and Destination"
                  >
                    <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                  </button>
                </div>

                {/* 2. To Station Box */}
                <div className="lg:col-span-4">
                  <StationAutocompleteInput
                    label="To Station"
                    value={toStation}
                    onChange={setToStation}
                    placeholder="Howrah"
                    badgeColor="cyan"
                    defaultCode="HWH"
                  />
                </div>


                {/* 3. Journey Date Box */}
                <div className="lg:col-span-3">
                  <div className="bg-slate-50/80 hover:bg-slate-50 focus-within:bg-white border border-slate-200 focus-within:border-[#0284C7] rounded-xl px-3.5 py-2.5 transition-all shadow-2xs">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Journey Date
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-slate-500 shrink-0">
                        calendar_today
                      </span>
                      <input
                        type="date"
                        value={journeyDate}
                        onChange={(e) => setJourneyDate(e.target.value)}
                        className="w-full bg-transparent text-xs sm:text-sm font-mono font-bold text-slate-800 focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters & Action Row */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-500 mr-1.5 font-sans">
                    Train Type:
                  </span>
                  {STANDARD_TRAIN_TYPES.map((type) => {
                    const isSelected = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedType(type.id)}
                        className={`px-3 py-1 rounded-full text-xs transition-all font-medium ${isSelected
                          ? 'bg-[#0284C7] text-white font-bold shadow-2xs'
                          : 'bg-slate-100/80 hover:bg-slate-200 text-slate-700'
                          }`}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={showOnlySelectedDate}
                      onChange={(e) => setShowOnlySelectedDate(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0284C7] focus:ring-[#0284C7] border-slate-300 accent-[#0284C7] cursor-pointer"
                    />
                    <span>Show only trains running on selected date</span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369a1] active:scale-[0.98] text-white text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {loading ? 'progress_activity' : 'search'}
                    </span>
                    <span>{loading ? 'Searching...' : 'Search Trains'}</span>
                  </button>
                </div>
              </div>
            </form>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-800">
                <span className="material-symbols-outlined text-rose-600 text-[18px]">error</span>
                <span className="flex-1 font-medium">{error}</span>
                <button
                  type="button"
                  onClick={() => searchTrainsBetween(fromStation, toStation, journeyDate)}
                  className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[11px]"
                >
                  Retry
                </button>
              </div>
            )}
          </section>

          {/* Results Header & Sorting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
              {loading ? (
                <span className="text-slate-400">Searching trains...</span>
              ) : (
                <span>
                  {processedTrains.length} Trains found between {originName} ({originCode}) and {destName} ({destCode})
                </span>
              )}
            </h2>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-slate-500 font-medium">Sort by:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono font-bold py-1.5 pl-3 pr-8 rounded-xl focus:outline-none focus:border-[#0284C7] cursor-pointer shadow-2xs"
                >
                  <option value="departure_asc">Departure (Earliest)</option>
                  <option value="departure_desc">Departure (Latest)</option>
                  <option value="arrival_asc">Arrival (Earliest)</option>
                  <option value="duration_asc">Duration (Fastest)</option>
                </select>
                <span className="material-symbols-outlined text-slate-400 text-[16px] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  unfold_more
                </span>
              </div>
            </div>
          </div>

          {/* Loading Skeletons */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse flex items-center justify-between gap-4">
                  <div className="w-16 h-10 bg-slate-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                  </div>
                  <div className="w-48 h-8 bg-slate-200 rounded" />
                  <div className="w-24 h-9 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          )}

          {/* Handcrafted Horizontal Train Cards List */}
          {!loading && processedTrains.length > 0 && (
            <div className="space-y-3">
              {processedTrains.map((item, idx) => (
                <TrainCard
                  key={item?.train?.number || idx}
                  item={item}
                  originCode={originCode}
                  originName={originName}
                  destCode={destCode}
                  destName={destName}
                  onSelectTrain={handleSelectTrainCard}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: LIVE TRAIN / STATUS VIEW (Matching Reference Image)            */}
      {/* ========================================================================= */}
      {activeTab === 'live-status' && (
        <LiveTrainStatusSection
          trainSchedule={trainSchedule}
          trainLive={trainLive}
          selectedTrainNo={selectedTrainNo}
          journeyDate={journeyDate}
          lastRefreshedTime={lastRefreshedTime}
          onDateChange={setJourneyDate}
          onBackToSearch={handleBackToSearch}
          onRefresh={() => loadSingleTrainLive(selectedTrainNo, journeyDate, true)}
          loading={trainLoading}
          error={trainError}
        />
      )}

      {/* ========================================================== */}
      {/* SECTION 3: ABOUT RAILRADAR                                 */}
      {/* ========================================================== */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <div className="text-center max-w-3xl mx-auto space-y-2 py-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#00A3C4] text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-[#00A3C4] animate-pulse" />
              <span>Passenger-First Rail Intelligence</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">About RailRadar</h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
              Real-time track telemetry, verified satellite positioning, and passenger-friendly delay information across Indian Railways.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 text-[#0284C7] font-mono text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Why RailRadar Was Built</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  Traditional tracking systems update erratically and communicate in cryptic controller shorthand. RailRadar bridges the gap between official block signal telemetry and passenger peace of mind.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {[
                    '1. Where is my train right now?',
                    '2. Exactly how late is it running?',
                    '3. When will it actually arrive?',
                    '4. What caused the delay?',
                  ].map((q, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="w-6 h-6 rounded-full bg-[#0284C7] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{q.substring(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full lg:w-80 shrink-0 p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-[#00A3C4]">
                  <span className="material-symbols-outlined text-[32px]">satellite_alt</span>
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">Sub-Second Satellite Telemetry</span>
                  <span className="text-slate-500 text-[11px] block">Live transponders & RailRadar V1 API</span>
                  <span className="font-mono text-emerald-600 font-bold block pt-1">Live Track Monitored</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboardPage;
