import React, { useState } from 'react';

export function AlertsConflictsPage() {
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const alerts = [
    {
      id: 'ALT-1049',
      title: 'Signal Spacing & Headway Conflict',
      section: 'Kanpur Central – Unnao Block Section',
      severity: 'CRITICAL',
      severityColor: 'bg-red-50 text-red-700 border border-red-200',
      time: '2 mins ago',
      details:
        'Freight 04402 encroaching on 12401 Vande Bharat headway. Required spacing 2.5 km, current spacing 1.1 km.',
      recommendedAction:
        'Hold Freight 04402 at Kanpur Loop line 3 for 8 minutes to clear Vande Bharat precedence.',
      status: 'Action Required',
      priorityTier: 'Tier 1 Precedence',
    },
    {
      id: 'ALT-1045',
      title: 'Dense Fog Operational Delay Spike',
      section: 'Aligarh – Tundla Double Track Corridor',
      severity: 'MAJOR',
      severityColor: 'bg-amber-50 text-amber-700 border border-amber-200',
      time: '12 mins ago',
      details:
        'Visibility dropped below 150m. Automatic speed restriction of 60 km/h applied across 4 trains.',
      recommendedAction: 'Enable Fog PASS Devices & dynamic signal audio beacons.',
      status: 'Monitored',
      priorityTier: 'Safety Protocol',
    },
    {
      id: 'ALT-1038',
      title: 'Platform Occupancy Contention',
      section: 'Lucknow Junction (LJN) Platform 4',
      severity: 'MINOR',
      severityColor: 'bg-slate-100 text-slate-700 border border-slate-200',
      time: '28 mins ago',
      details: 'Train 12556 delay overlap with incoming Shatabdi 12004.',
      recommendedAction: 'Reroute Train 12556 to Platform 6 via outer crossover point 4B.',
      status: 'Resolved (Auto)',
      priorityTier: 'Routing Overlap',
    },
  ];

  const filteredAlerts = alerts.filter(
    (a) => filterSeverity === 'ALL' || a.severity === filterSeverity
  );

  return (
    <div className="flex flex-col w-full p-6 space-y-6 text-slate-800 max-w-7xl mx-auto">
      {/* Active Alerts Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-md border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Active Network Alerts & Safety Conflicts</h1>
            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-bold font-mono">
              LIVE FEED
            </span>
          </div>
          <p className="text-xs text-slate-500">
            AI-powered interlocking conflict detection, signal spacing warnings, and sectional bottleneck management.
          </p>
        </div>

        {/* Severity Filter Bar */}
        <div className="flex items-center gap-1.5 text-xs">
          {['ALL', 'CRITICAL', 'MAJOR', 'MINOR'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1 rounded text-[11px] font-semibold transition-all ${
                filterSeverity === sev
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-md bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-slate-500 font-medium">Critical Conflicts</span>
            <div className="text-2xl font-bold text-red-600 font-mono">1</div>
          </div>
          <span className="material-symbols-outlined text-red-500 text-[28px]">warning</span>
        </div>

        <div className="p-4 rounded-md bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-slate-500 font-medium">Major Warnings</span>
            <div className="text-2xl font-bold text-amber-600 font-mono">4</div>
          </div>
          <span className="material-symbols-outlined text-amber-500 text-[28px]">error</span>
        </div>

        <div className="p-4 rounded-md bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-slate-500 font-medium">Resolved Today</span>
            <div className="text-2xl font-bold text-emerald-600 font-mono">18</div>
          </div>
          <span className="material-symbols-outlined text-emerald-500 text-[28px]">task_alt</span>
        </div>
      </div>

      {/* Alert Feed Cards */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className="p-4 rounded-md bg-white border border-slate-200 shadow-xs space-y-3"
          >
            {/* Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${alert.severityColor}`}>
                  {alert.severity}
                </span>
                <span className="font-mono text-xs text-slate-500 font-bold">{alert.id}</span>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">{alert.title}</h3>
              </div>

              <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
                <span className="font-mono">{alert.time}</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                  {alert.priorityTier}
                </span>
              </div>
            </div>

            {/* Section & Description */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <span className="material-symbols-outlined text-[#0284C7] text-[16px]">location_on</span>
                <span>{alert.section}</span>
              </div>
              <p className="text-slate-600 pl-5 leading-relaxed">{alert.details}</p>
            </div>

            {/* AI Recommendation Box */}
            <div className="p-3 rounded bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2 text-slate-700">
                <span className="material-symbols-outlined text-[#0284C7] text-[18px] shrink-0 mt-0.5">
                  auto_awesome
                </span>
                <div>
                  <span className="font-bold text-slate-900">AI Conflict Recommendation:</span>
                  <p className="text-slate-600 mt-0.5">{alert.recommendedAction}</p>
                </div>
              </div>

              <button
                type="button"
                className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold shrink-0 transition-colors text-xs"
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
