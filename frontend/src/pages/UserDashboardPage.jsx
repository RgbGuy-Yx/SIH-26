import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function UserDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL query params or state
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState('check-train');
  const [trainQuery, setTrainQuery] = useState('12003');
  const [selectedTrain, setSelectedTrain] = useState({
    no: '12003',
    name: 'Swarna Shatabdi Express',
    origin: 'New Delhi (NDLS)',
    destination: 'Lucknow Charbagh (LJN)',
    status: 'In Transit',
    currentDelay: '+8 min',
    predictedDelay: '+18 min',
    expectedArrival: '16:38',
    scheduledArrival: '16:20',
    currentLocation: 'Etawah Jn (ETW)',
    speed: '98 km/h • Line clear',
    railway: 'Northern Railway',
    lastRefreshed: 'Just Now',
    aiExplanation:
      'Section pacing bottleneck at Tundla Junction due to preceding freight movement. AI model predicts recovery of 4 mins on the high-speed Kanpur-Lucknow corridor.'
  });

  useEffect(() => {
    if (tabParam === 'live-status') {
      setActiveTab('live-status');
    } else if (tabParam === 'about') {
      setActiveTab('about');
    } else {
      setActiveTab('check-train');
    }
  }, [tabParam]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    if (tabName === 'check-train') {
      navigate('/user-dashboard');
    } else {
      navigate(`/user-dashboard?tab=${tabName}`);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (trainQuery.includes('12301') || trainQuery.toLowerCase().includes('rajdhani')) {
      setSelectedTrain({
        no: '12301',
        name: 'Howrah Rajdhani Express',
        origin: 'Howrah Jn (HWH)',
        destination: 'New Delhi (NDLS)',
        status: 'In Transit',
        currentDelay: '+4 min',
        predictedDelay: '+10 min',
        expectedArrival: '10:05',
        scheduledArrival: '09:55',
        currentLocation: 'Kanpur Central (CNB)',
        speed: '125 km/h • Track Green',
        railway: 'Eastern Railway',
        lastRefreshed: 'Just Now',
        aiExplanation:
          'High priority clearance granted on Grand Chord line. Minimal variance detected at Kanpur interlock.'
      });
    } else if (trainQuery.includes('12561') || trainQuery.toLowerCase().includes('swatantrata')) {
      setSelectedTrain({
        no: '12561',
        name: 'Swatantrata Senani Express',
        origin: 'Jaynagar (JYG)',
        destination: 'New Delhi (NDLS)',
        status: 'In Transit',
        currentDelay: '+24 min',
        predictedDelay: '+35 min',
        expectedArrival: '13:15',
        scheduledArrival: '12:40',
        currentLocation: 'Aligarh Jn (ALJN)',
        speed: '72 km/h • Caution Order',
        railway: 'East Central Railway',
        lastRefreshed: 'Just Now',
        aiExplanation:
          'Fog speed restriction of 75 km/h active between Tundla and Aligarh. Section control regulating headway.'
      });
    } else {
      setSelectedTrain({
        no: '12003',
        name: 'Swarna Shatabdi Express',
        origin: 'New Delhi (NDLS)',
        destination: 'Lucknow Charbagh (LJN)',
        status: 'In Transit',
        currentDelay: '+8 min',
        predictedDelay: '+18 min',
        expectedArrival: '16:38',
        scheduledArrival: '16:20',
        currentLocation: 'Etawah Jn (ETW)',
        speed: '98 km/h • Line clear',
        railway: 'Northern Railway',
        lastRefreshed: 'Just Now',
        aiExplanation:
          'Section pacing bottleneck at Tundla Junction due to preceding freight movement. AI model predicts recovery of 4 mins on the high-speed Kanpur-Lucknow corridor.'
      });
    }
  };

  return (
    <div className="space-y-6 text-[#111c2d]">
      {/* Stitch Secondary Top Nav Pill Bar */}
      <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
        <button
          type="button"
          onClick={() => handleTabChange('check-train')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'check-train'
              ? 'bg-[#00397f] text-white shadow-md'
              : 'text-[#424752] hover:bg-[#f0f3ff] hover:text-[#111c2d]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          <span>Check Your Train</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('live-status')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'live-status'
              ? 'bg-[#00397f] text-white shadow-md'
              : 'text-[#424752] hover:bg-[#f0f3ff] hover:text-[#111c2d]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">directions_railway</span>
          <span>Live Train Status (12003)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('about')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'about'
              ? 'bg-[#00397f] text-white shadow-md'
              : 'text-[#424752] hover:bg-[#f0f3ff] hover:text-[#111c2d]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">info</span>
          <span>About RailRadar</span>
        </button>
      </div>

      {/* ========================================================== */}
      {/* SCREEN 1: CHECK YOUR TRAIN (PASSENGER VIEW) */}
      {/* ========================================================== */}
      {activeTab === 'check-train' && (
        <div className="space-y-6">
          {/* Hero Banner */}
          <section className="relative overflow-hidden bg-[#f0f3ff] border border-blue-100 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="absolute -right-12 -top-12 w-96 h-96 bg-[#d8e2ff]/50 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute right-1/4 -bottom-16 w-64 h-64 bg-[#85f8c4]/30 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 bg-white border border-blue-100/80 px-3 py-1 rounded-full shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="text-[11px] font-mono font-bold text-[#424752] uppercase tracking-wider">
                  Live Passenger Telemetry & AI ETA
                </span>
              </div>

              <h1 className="text-3xl font-bold text-[#111c2d] tracking-tight">Check Your Train</h1>
              <p className="text-xs sm:text-sm text-[#424752] max-w-xl">
                Get verified GPS status, network-predicted arrival times, platform guides, and straightforward delay context.
              </p>

              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-white border border-slate-200 p-2 rounded-xl shadow-md">
                  <div className="flex items-center gap-3 px-3 py-1 flex-1">
                    <span className="material-symbols-outlined text-[#00397f] text-[24px]">train</span>
                    <input
                      type="text"
                      value={trainQuery}
                      onChange={(e) => setTrainQuery(e.target.value)}
                      placeholder="Enter Train Number (e.g. 12003, 12301) or Name..."
                      className="w-full bg-transparent text-xs sm:text-sm font-mono text-[#111c2d] placeholder:text-[#737783] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#00397f] hover:bg-[#0b4fa8] text-white font-semibold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">near_me</span>
                    <span>Track Train</span>
                  </button>
                </div>

                {/* Quick Chips */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#424752] pt-1">
                  <span className="font-mono text-[11px] text-[#737783]">Quick search:</span>
                  {[
                    { no: '12003', label: '12003 Swarna Shatabdi' },
                    { no: '12301', label: '12301 Howrah Rajdhani' },
                    { no: '12561', label: '12561 Swatantrata S. Exp' }
                  ].map((chip) => (
                    <button
                      key={chip.no}
                      type="button"
                      onClick={() => {
                        setTrainQuery(chip.no);
                        handleSearchSubmit({ preventDefault: () => { } });
                      }}
                      className="px-3 py-1 rounded-full bg-white border border-slate-200 text-[#111c2d] text-xs font-mono hover:bg-[#d8e2ff] hover:border-[#00397f]/40 transition-colors shadow-sm"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </form>
            </div>
          </section>

          {/* Active Train Status Card */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
            {/* Header Row */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#d8e2ff] border border-blue-200 text-[#00397f] flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[28px]">directions_railway</span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-lg text-[#111c2d]">#{selectedTrain.no}</span>
                    <h2 className="text-base font-bold text-[#00397f]">{selectedTrain.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#85f8c4]/40 border border-emerald-300 text-[#005137] text-xs font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      {selectedTrain.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#424752] mt-1 flex items-center gap-1.5">
                    <span className="font-semibold text-[#111c2d]">{selectedTrain.origin}</span>
                    <span className="material-symbols-outlined text-[14px] text-[#737783]">arrow_forward</span>
                    <span className="font-semibold text-[#111c2d]">{selectedTrain.destination}</span>
                    <span className="text-slate-300">•</span>
                    <span>{selectedTrain.railway}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedTrain((prev) => ({
                      ...prev,
                      lastRefreshed: 'Just Now'
                    }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#f0f3ff] border border-blue-100 text-xs text-[#111c2d] hover:bg-[#e7eeff] transition-all flex items-center gap-2 font-mono"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#00397f]">sync</span>
                  <span>Refreshed: <strong>{selectedTrain.lastRefreshed}</strong></span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#f0f3ff] border border-blue-100 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-[#737783] uppercase tracking-wider">Current Delay</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-[#ba1a1a]">{selectedTrain.currentDelay}</span>
                  <span className="text-[10px] text-[#737783]">from schedule</span>
                </div>
                <span className="text-[11px] text-[#424752] block">Live signal pacing</span>
              </div>

              <div className="bg-[#f0f3ff] border border-blue-100 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-[#737783] uppercase tracking-wider">Predicted Delay</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-[#ba1a1a]">{selectedTrain.predictedDelay}</span>
                  <span className="text-[10px] text-[#737783]">at dest.</span>
                </div>
                <span className="text-[11px] text-[#005f41] font-semibold block">AI section modeling</span>
              </div>

              <div className="bg-[#f0f3ff] border border-blue-100 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-[#737783] uppercase tracking-wider">Expected Arrival</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-mono text-[#00397f]">{selectedTrain.expectedArrival}</span>
                  <span className="text-[10px] text-[#737783]">IST</span>
                </div>
                <span className="text-[11px] text-[#737783] block">Sched: {selectedTrain.scheduledArrival}</span>
              </div>

              <div className="bg-[#f0f3ff] border border-blue-100 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-mono text-[#737783] uppercase tracking-wider">Current Location</span>
                <div className="text-sm font-bold text-[#111c2d] truncate mt-1">{selectedTrain.currentLocation}</div>
                <span className="text-[11px] text-[#424752] block truncate">{selectedTrain.speed}</span>
              </div>
            </div>

            {/* Journey Timeline */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[#111c2d]">Journey Progress</h3>
                <div className="flex items-center gap-4 text-xs font-mono text-[#737783]">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#00397f]"></span> Passed</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Current</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Upcoming</span>
                </div>
              </div>

              <div className="relative pl-6 space-y-3">
                <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-blue-100"></div>

                {/* Stop 1 */}
                <div className="relative flex items-center justify-between bg-[#f0f3ff]/60 border border-blue-100 p-3 rounded-xl">
                  <span className="absolute -left-[19px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#00397f] ring-4 ring-white"></span>
                  <div>
                    <span className="font-bold text-xs text-[#111c2d]">New Delhi (NDLS)</span>
                    <span className="text-[11px] text-[#424752] block">Platform 2 • Dep 06:10</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-700 font-mono">On Time</span>
                    <span className="text-[10px] text-[#737783] block">Departed</span>
                  </div>
                </div>

                {/* Stop 2 */}
                <div className="relative flex items-center justify-between bg-[#f0f3ff]/60 border border-blue-100 p-3 rounded-xl">
                  <span className="absolute -left-[19px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#00397f] ring-4 ring-white"></span>
                  <div>
                    <span className="font-bold text-xs text-[#111c2d]">Aligarh Jn (ALJN)</span>
                    <span className="text-[11px] text-[#424752] block">Platform 3 • Arr 07:35</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-600 font-mono">+2 min</span>
                    <span className="text-[10px] text-[#737783] block">Departed</span>
                  </div>
                </div>

                {/* Stop 3 - Current */}
                <div className="relative flex items-center justify-between bg-[#e7eeff] border border-[#00397f]/40 p-3 rounded-xl shadow-sm">
                  <span className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 animate-pulse ring-4 ring-blue-200"></span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#111c2d] font-mono">{selectedTrain.currentLocation}</span>
                      <span className="bg-[#00397f] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">Current Stop</span>
                    </div>
                    <span className="text-[11px] text-[#424752] block">Platform 2 • Dep Sched 10:02</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#ba1a1a] font-mono">{selectedTrain.currentDelay} late</span>
                    <span className="text-[10px] text-emerald-700 font-medium block">Halted (2m of 3m)</span>
                  </div>
                </div>

                {/* Stop 4 */}
                <div className="relative flex items-center justify-between bg-[#f0f3ff]/40 border border-slate-200 p-3 rounded-xl opacity-75">
                  <span className="absolute -left-[19px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-white"></span>
                  <div>
                    <span className="font-bold text-xs text-[#111c2d]">Kanpur Central (CNB)</span>
                    <span className="text-[11px] text-[#424752] block">Platform 1 • Est. 12:28 (Sched 12:15)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#ba1a1a] font-mono">+13 min</span>
                    <span className="text-[10px] text-[#737783] block">Upcoming (142 km)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Delay Explanation Box */}
            <div className="p-4 rounded-xl bg-[#f0f3ff] border border-blue-100 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#00397f] text-[22px] shrink-0 mt-0.5">lightbulb</span>
              <div className="text-xs">
                <span className="font-bold text-[#111c2d] uppercase tracking-wider font-mono">AI Delay Context:</span>
                <p className="text-[#424752] mt-1 leading-relaxed">{selectedTrain.aiExplanation}</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================== */}
      {/* SCREEN 2: LIVE TRAIN STATUS (12003 SWARNA SHATABDI) */}
      {/* ========================================================== */}
      {activeTab === 'live-status' && (
        <div className="space-y-6">
          {/* Top Summary Banner */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#d8e2ff] border border-blue-200 text-[#00397f] flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[32px]">directions_transit</span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-2xl font-bold text-[#111c2d]">12003</span>
                    <h1 className="text-xl font-bold text-[#111c2d]">Swarna Shatabdi Express</h1>
                    <span className="px-3 py-1 rounded-full bg-[#85f8c4]/40 border border-emerald-300 text-[#005137] text-xs font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      Running
                    </span>
                  </div>
                  <p className="text-xs text-[#424752] mt-1 flex items-center gap-2">
                    <span className="font-bold text-[#111c2d]">New Delhi (NDLS)</span>
                    <span className="material-symbols-outlined text-[14px] text-[#737783]">arrow_forward</span>
                    <span className="font-bold text-[#111c2d]">Lucknow (LJN)</span>
                    <span className="text-slate-300">•</span>
                    <span>Northern Railway</span>
                  </p>
                </div>
              </div>

              {/* Metric Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                <div className="bg-[#f0f3ff] border border-blue-100 rounded-xl p-3">
                  <span className="text-[10px] font-mono text-[#737783] uppercase">Current Delay</span>
                  <div className="text-lg font-bold font-mono text-[#ba1a1a] mt-0.5">+8 min</div>
                  <span className="text-[10px] text-[#424752]">As per live station report</span>
                </div>

                <div className="bg-[#f0f3ff] border border-blue-100 rounded-xl p-3">
                  <span className="text-[10px] font-mono text-[#737783] uppercase">Predicted Delay</span>
                  <div className="text-lg font-bold font-mono text-[#ba1a1a] mt-0.5">+20 min</div>
                  <span className="text-[10px] text-[#424752]">At destination terminal</span>
                </div>

                <div className="bg-[#f0f3ff] border border-blue-100 rounded-xl p-3">
                  <span className="text-[10px] font-mono text-[#00397f] uppercase font-semibold">Expected Arrival (LJN)</span>
                  <div className="text-lg font-bold font-mono text-[#00397f] mt-0.5">16:39</div>
                  <span className="text-[10px] text-[#737783]">Sched: 16:19 (+20m)</span>
                </div>
              </div>
            </div>

            {/* Horizontal Route Progression */}
            <div className="pt-4 border-t border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#00397f] font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">timeline</span> Route Progression
                </span>
                <span className="text-[#737783]">Current Stop: Lucknow Jn (Stop 6 of 10)</span>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="min-w-[620px] flex items-center justify-between relative py-4 px-2">
                  {/* Track line */}
                  <div className="absolute left-4 right-4 h-1.5 bg-slate-200 rounded-full z-0 top-1/2 -translate-y-1/2"></div>
                  <div className="absolute left-4 w-[54%] h-1.5 bg-[#00397f] rounded-full z-0 top-1/2 -translate-y-1/2"></div>

                  {[
                    { code: 'NDLS', time: '06:00', passed: true },
                    { code: 'GZB', time: '06:27', passed: true },
                    { code: 'ALJN', time: '07:25', passed: true },
                    { code: 'TDL', time: '08:18', passed: true },
                    { code: 'ETW', time: '10:13', passed: true },
                    { code: 'LJN', time: '13:28', current: true },
                    { code: 'ON', time: '14:10', upcoming: true }
                  ].map((st) => (
                    <div key={st.code} className="relative z-10 flex flex-col items-center">
                      {st.current ? (
                        <div className="relative flex items-center justify-center">
                          <span className="absolute w-7 h-7 rounded-full bg-[#00397f]/20 animate-ping"></span>
                          <div className="w-6 h-6 rounded-full bg-[#00397f] text-white flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-[14px]">train</span>
                          </div>
                        </div>
                      ) : st.passed ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-[#00397f] ring-2 ring-white"></div>
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-slate-300 ring-2 ring-white"></div>
                      )}
                      <span className={`text-xs font-mono font-bold mt-1.5 ${st.current ? 'text-[#00397f]' : 'text-[#111c2d]'}`}>
                        {st.code}
                      </span>
                      <span className="text-[10px] font-mono text-[#737783]">{st.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================== */}
      {/* SCREEN 3: ABOUT RAILRADAR (PASSENGER VIEW) */}
      {/* ========================================================== */}
      {activeTab === 'about' && (
        <div className="space-y-8">
          {/* Header Banner */}
          <div className="text-center max-w-3xl mx-auto space-y-3 py-4">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#d8e2ff] border border-blue-200 text-[#00397f] text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-[#00397f] animate-pulse"></span>
              <span>Passenger-First Rail Intelligence</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#111c2d] tracking-tight">About RailRadar</h1>
            <p className="text-xs sm:text-sm text-[#424752] leading-relaxed">
              Intelligent, calm, and trustworthy journey updates for millions of Indian Railways passengers every day.
            </p>
          </div>

          {/* Primary Narrative Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 text-[#00397f] font-mono text-xs font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Why We Built RailRadar</span>
                </div>
                <p className="text-xs sm:text-sm text-[#111c2d] leading-relaxed">
                  RailRadar is designed from the ground up for passengers and their families. While traditional trackers only show where a train was hours ago, RailRadar pairs real-time track telemetry with predictive forecasting to answer the four questions that matter most:
                </p>

                {/* 4 Core Questions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {[
                    '1. Where is my train?',
                    '2. How late is it?',
                    '3. When will it actually arrive?',
                    '4. Why is it delayed?'
                  ].map((q, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-[#f0f3ff] border border-blue-100 rounded-xl">
                      <span className="w-6 h-6 rounded-full bg-[#00397f] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-[#111c2d]">{q.substring(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphic Card */}
              <div className="w-full lg:w-80 shrink-0 p-6 bg-[#f0f3ff] border border-blue-100 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#d8e2ff] border border-blue-200 flex items-center justify-center text-[#00397f]">
                  <span className="material-symbols-outlined text-[36px]">sensors</span>
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-bold text-[#111c2d] block">Sub-second Latency GPS</span>
                  <span className="text-[#424752] text-[11px] block">Trackside transponders + AI section engine</span>
                  <span className="font-mono text-emerald-700 font-bold block pt-1">95 km/h Nominal Velocity</span>
                </div>
              </div>
            </div>
          </div>

          {/* Three Pillars */}
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <span className="text-xs font-mono uppercase text-[#005f41] font-semibold">The Architecture of Clarity</span>
              <h2 className="text-xl font-bold text-[#111c2d]">Three Pillars of Passenger Confidence</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pillar 1 */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d8e2ff] text-[#00397f] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">train</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#f0f3ff] text-[#00397f] font-bold">Pillar 01</span>
                  <h3 className="text-base font-bold text-[#111c2d]">Live Train Status</h3>
                  <p className="text-xs text-[#424752] leading-relaxed">
                    Direct GPS tracking and signal block verification across every major junction in India, updated continuously.
                  </p>
                </div>
                <span className="text-[11px] text-emerald-700 font-mono font-medium">Auto-refreshed via trackside transponders</span>
              </div>

              {/* Pillar 2 */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d8e2ff] text-[#00397f] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">insights</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#f0f3ff] text-[#00397f] font-bold">Pillar 02</span>
                  <h3 className="text-base font-bold text-[#111c2d]">Predictive ETA</h3>
                  <p className="text-xs text-[#424752] leading-relaxed">
                    Network-aware arrival forecasting that accounts for single-line crossovers, congestion, and sectional headway.
                  </p>
                </div>
                <span className="text-[11px] text-[#00397f] font-mono font-medium">Constantly recalculates stopover delays</span>
              </div>

              {/* Pillar 3 */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-sm">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d8e2ff] text-[#00397f] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">forum</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#f0f3ff] text-[#00397f] font-bold">Pillar 03</span>
                  <h3 className="text-base font-bold text-[#111c2d]">Human Delay Explanations</h3>
                  <p className="text-xs text-[#424752] leading-relaxed">
                    Plain-English summaries of weather slowdowns, track caution orders, or platform occupancy—without technical jargon.
                  </p>
                </div>
                <span className="text-[11px] text-amber-700 font-mono font-medium">Replaces raw train controller acronyms</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboardPage;
