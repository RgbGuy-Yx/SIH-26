import React, { useState } from 'react';

export function AlertsConflictsPage() {
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const alerts = [
    {
      id: 'ALT-1049',
      title: 'Signal Spacing & Headway Conflict',
      section: 'Kanpur Central – Unnao Block Section',
      severity: 'CRITICAL',
      severityColor: 'bg-red-950/80 border-red-500/50 text-red-400',
      time: '2 mins ago',
      details: 'Freight 04402 encroaching on 12401 Vande Bharat headway. Required spacing 2.5 km, current spacing 1.1 km.',
      recommendedAction: 'Hold Freight 04402 at Kanpur Loop line 3 for 8 minutes to clear Vande Bharat precedence.',
      status: 'Action Required',
      priorityTier: 'Tier 1 Precedence'
    },
    {
      id: 'ALT-1045',
      title: 'Dense Fog Operational Delay Spike',
      section: 'Aligarh – Tundla Double Track Corridor',
      severity: 'MAJOR',
      severityColor: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
      time: '12 mins ago',
      details: 'Visibility dropped below 150m. Automatic speed restriction of 60 km/h applied across 4 trains.',
      recommendedAction: 'Enable Fog PASS Devices & dynamic signal audio beacons.',
      status: 'Monitored',
      priorityTier: 'Safety Protocol'
    },
    {
      id: 'ALT-1038',
      title: 'Platform Occupancy Contention',
      section: 'Lucknow Junction (LJN) Platform 4',
      severity: 'MINOR',
      severityColor: 'bg-blue-950/80 border-blue-500/50 text-blue-300',
      time: '28 mins ago',
      details: 'Train 12556 delay overlap with incoming Shatabdi 12004.',
      recommendedAction: 'Reroute Train 12556 to Platform 6 via outer crossover point 4B.',
      status: 'Resolved (Auto)',
      priorityTier: 'Routing Overlap'
    }
  ];

  const filteredAlerts = alerts.filter(
    (a) => filterSeverity === 'ALL' || a.severity === filterSeverity
  );

  return (
    <div className="flex flex-col w-full p-6 space-y-6 text-on-surface">
      {/* Active Alerts Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Active Network Alerts & Safety Conflicts</h1>
            <span className="px-2 py-0.5 rounded-lg bg-surface-container-high text-blue-400 text-xs font-semibold">
              LIVE FEED
            </span>
          </div>
          <p className="text-xs text-slate-400">
            AI-powered interlocking conflict detection, signal spacing warnings, and sectional bottleneck management across operational divisions.
          </p>
        </div>

        {/* Severity Filter Bar */}
        <div className="flex items-center gap-2 text-xs">
          {['ALL', 'CRITICAL', 'MAJOR', 'MINOR'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                filterSeverity === sev
                  ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(46,92,230,0.4)]'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-red-300 font-medium">Critical Conflicts</span>
            <div className="text-2xl font-bold text-red-400 font-mono">1</div>
          </div>
          <span className="material-symbols-outlined text-red-400 text-[32px]">warning</span>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-amber-300 font-medium">Major Warnings</span>
            <div className="text-2xl font-bold text-amber-400 font-mono">4</div>
          </div>
          <span className="material-symbols-outlined text-amber-400 text-[32px]">error</span>
        </div>

        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-blue-300 font-medium">Resolved Today</span>
            <div className="text-2xl font-bold text-blue-400 font-mono">18</div>
          </div>
          <span className="material-symbols-outlined text-blue-400 text-[32px]">task_alt</span>
        </div>
      </div>

      {/* Alert Feed Cards */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className="p-5 rounded-xl bg-surface-container-low border border-slate-800/80 shadow-lg space-y-4"
          >
            {/* Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded border text-xs font-bold ${alert.severityColor}`}>
                  {alert.severity}
                </span>
                <span className="font-mono text-xs text-blue-400 font-bold">{alert.id}</span>
                <h3 className="text-base font-bold text-white tracking-tight">{alert.title}</h3>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="font-mono">{alert.time}</span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                  {alert.priorityTier}
                </span>
              </div>
            </div>

            {/* Section & Description */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <span className="material-symbols-outlined text-primary text-[16px]">location_on</span>
                <span>{alert.section}</span>
              </div>
              <p className="text-slate-400 pl-6 leading-relaxed">{alert.details}</p>
            </div>

            {/* AI Recommendation Box */}
            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2 text-slate-200">
                <span className="material-symbols-outlined text-blue-400 text-[18px] shrink-0 mt-0.5">auto_awesome</span>
                <div>
                  <span className="font-semibold text-blue-300">AI Conflict Engine Recommendation:</span>
                  <p className="text-slate-300 mt-0.5">{alert.recommendedAction}</p>
                </div>
              </div>

              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shrink-0 transition-colors shadow-[0_0_12px_rgba(46,92,230,0.4)]"
              >
                Apply Precedence Override
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlertsConflictsPage;
