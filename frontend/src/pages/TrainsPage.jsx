import React, { useState } from 'react';

export function TrainsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  const trainsData = [
    {
      id: '12401',
      name: 'Vande Bharat Express',
      route: 'NDLS ➔ CNB ➔ BSB',
      type: 'SUPERFAST_EXPRESS',
      priority: 'Tier 1',
      priorityColor: 'bg-blue-900/60 text-blue-200 border-blue-700/50',
      currentSpeed: '130 km/h',
      status: 'On Time',
      statusColor: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400',
      delayMinutes: 0,
      nextStation: 'Kanpur Central (CNB)',
      scheduledEta: '15:12 PM',
      predictedEta: '15:12 PM',
      driver: 'Loco Pilot R. Sharma'
    },
    {
      id: '12302',
      name: 'Howrah Rajdhani Express',
      route: 'NDLS ➔ PRYJ ➔ HWH',
      type: 'RAJDHANI',
      priority: 'Tier 1',
      priorityColor: 'bg-blue-900/60 text-blue-200 border-blue-700/50',
      currentSpeed: '110 km/h',
      status: 'On Time',
      statusColor: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400',
      delayMinutes: 0,
      nextStation: 'Prayagraj Junction (PRYJ)',
      scheduledEta: '16:45 PM',
      predictedEta: '16:47 PM',
      driver: 'Loco Pilot V. Singh'
    },
    {
      id: '12556',
      name: 'Gorakhdham Express',
      route: 'NDLS ➔ LJN ➔ GKP',
      type: 'EXPRESS',
      priority: 'Tier 2',
      priorityColor: 'bg-amber-900/60 text-amber-200 border-amber-700/50',
      currentSpeed: '78 km/h',
      status: 'Delayed (+45m)',
      statusColor: 'bg-red-950/60 border-red-500/40 text-red-400',
      delayMinutes: 45,
      nextStation: 'Lucknow Junction (LJN)',
      scheduledEta: '17:30 PM',
      predictedEta: '18:15 PM',
      driver: 'Loco Pilot A. Kumar'
    },
    {
      id: '04402',
      name: 'Northern Freight Heavy Rake (NBOX)',
      route: 'GZB ➔ TDL ➔ CNB',
      type: 'FREIGHT',
      priority: 'Tier 4',
      priorityColor: 'bg-slate-800 text-slate-300 border-slate-700',
      currentSpeed: '55 km/h',
      status: 'Held at Loop',
      statusColor: 'bg-amber-950/60 border-amber-500/40 text-amber-300',
      delayMinutes: 20,
      nextStation: 'Tundla Junction (TDL)',
      scheduledEta: '18:00 PM',
      predictedEta: '18:20 PM',
      driver: 'Loco Pilot K. Yadav'
    },
    {
      id: '12004',
      name: 'Lucknow Swarna Shatabdi',
      route: 'NDLS ➔ ALJN ➔ LJN',
      type: 'SHATABDI',
      priority: 'Tier 1',
      priorityColor: 'bg-blue-900/60 text-blue-200 border-blue-700/50',
      currentSpeed: '120 km/h',
      status: 'On Time',
      statusColor: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400',
      delayMinutes: 0,
      nextStation: 'Aligarh Junction (ALJN)',
      scheduledEta: '14:50 PM',
      predictedEta: '14:50 PM',
      driver: 'Loco Pilot M. Verma'
    }
  ];

  const filteredTrains = trainsData.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.id.includes(searchTerm) ||
                          t.route.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || t.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col w-full p-6 space-y-6 text-on-surface">
      {/* Top Hero Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-low p-6 rounded-xl border border-slate-800/60 shadow-sm">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-primary-container text-on-primary-container text-[11px] font-semibold uppercase tracking-wider">
              Active Division: NR / NCR
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
            <span className="text-xs font-semibold text-blue-300">Real-Time Telemetry Synced</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Active Rolling Stock & Train Fleet</h1>
          <p className="text-xs text-slate-400">
            Real-time telemetry, GPS tracking, and schedule deviation monitoring across Northern Railway zone.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-center gap-3">
            <span className="text-slate-400 font-medium">Fleet Online:</span>
            <span className="font-mono font-bold text-white text-sm">48 / 52 Trains</span>
          </div>
          <div className="px-4 py-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-center gap-3">
            <span className="text-slate-400 font-medium">On-Time Index:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">91.6%</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-slate-800/80 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Total Active Trains</span>
          <div className="text-2xl font-bold text-white font-mono">52</div>
          <span className="text-[11px] text-emerald-400">↑ 4 added in last hour</span>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-slate-800/80 space-y-1">
          <span className="text-xs text-slate-400 font-medium">On-Time Trains</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">44</div>
          <span className="text-[11px] text-emerald-400">84.6% High Punctuality</span>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-slate-800/80 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Delayed (&gt;15 mins)</span>
          <div className="text-2xl font-bold text-red-400 font-mono">5</div>
          <span className="text-[11px] text-red-400">Fog / Weather Impact</span>
        </div>
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-slate-800/80 space-y-1">
          <span className="text-xs text-slate-400 font-medium">Priority Freight Rakes</span>
          <div className="text-2xl font-bold text-blue-400 font-mono">12</div>
          <span className="text-[11px] text-blue-300">Coal & Container Express</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-low p-4 rounded-xl border border-slate-800/60">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search train no, name, route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {['ALL', 'SUPERFAST_EXPRESS', 'RAJDHANI', 'SHATABDI', 'EXPRESS', 'FREIGHT'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                selectedType === type
                  ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(46,92,230,0.4)]'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Rolling Stock Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-surface-container-low border-b border-slate-800 uppercase tracking-wider text-[11px] text-slate-400 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Train No / Name</th>
                <th className="py-3.5 px-4">Route</th>
                <th className="py-3.5 px-4">Priority Tier</th>
                <th className="py-3.5 px-4">Speed</th>
                <th className="py-3.5 px-4">Next Station</th>
                <th className="py-3.5 px-4">Sched ETA / ML Forecast</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredTrains.map((train) => (
                <tr key={train.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">{train.id}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({train.type})</span>
                      </div>
                      <span className="text-slate-300 font-semibold text-xs mt-0.5">{train.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">{train.route}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded border text-[11px] font-semibold ${train.priorityColor}`}>
                      {train.priority}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-white">{train.currentSpeed}</td>
                  <td className="py-4 px-4 text-slate-300">{train.nextStation}</td>
                  <td className="py-4 px-4 font-mono">
                    <div className="flex flex-col text-[11px]">
                      <span className="text-slate-400">Sched: {train.scheduledEta}</span>
                      <span className={train.delayMinutes > 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                        ML Pred: {train.predictedEta}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-block px-3 py-1 rounded-full border text-[11px] font-bold ${train.statusColor}`}>
                      {train.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TrainsPage;
