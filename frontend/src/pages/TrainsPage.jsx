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
      priorityColor: 'bg-blue-50 text-blue-700 border border-blue-200',
      currentSpeed: '130 km/h',
      status: 'On Time',
      statusColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      delayMinutes: 0,
      nextStation: 'Kanpur Central (CNB)',
      scheduledEta: '15:12 PM',
      predictedEta: '15:12 PM',
      driver: 'Loco Pilot R. Sharma',
    },
    {
      id: '12302',
      name: 'Howrah Rajdhani Express',
      route: 'NDLS ➔ PRYJ ➔ HWH',
      type: 'RAJDHANI',
      priority: 'Tier 1',
      priorityColor: 'bg-blue-50 text-blue-700 border border-blue-200',
      currentSpeed: '110 km/h',
      status: 'On Time',
      statusColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      delayMinutes: 0,
      nextStation: 'Prayagraj Junction (PRYJ)',
      scheduledEta: '16:45 PM',
      predictedEta: '16:47 PM',
      driver: 'Loco Pilot V. Singh',
    },
    {
      id: '12556',
      name: 'Gorakhdham Express',
      route: 'NDLS ➔ LJN ➔ GKP',
      type: 'EXPRESS',
      priority: 'Tier 2',
      priorityColor: 'bg-amber-50 text-amber-700 border border-amber-200',
      currentSpeed: '78 km/h',
      status: 'Delayed (+45m)',
      statusColor: 'bg-red-50 text-red-700 border border-red-200',
      delayMinutes: 45,
      nextStation: 'Lucknow Junction (LJN)',
      scheduledEta: '17:30 PM',
      predictedEta: '18:15 PM',
      driver: 'Loco Pilot A. Kumar',
    },
    {
      id: '04402',
      name: 'Northern Freight Heavy Rake (NBOX)',
      route: 'GZB ➔ TDL ➔ CNB',
      type: 'FREIGHT',
      priority: 'Tier 4',
      priorityColor: 'bg-slate-100 text-slate-700 border border-slate-200',
      currentSpeed: '55 km/h',
      status: 'Held at Loop',
      statusColor: 'bg-amber-50 text-amber-700 border border-amber-200',
      delayMinutes: 20,
      nextStation: 'Tundla Junction (TDL)',
      scheduledEta: '18:00 PM',
      predictedEta: '18:20 PM',
      driver: 'Loco Pilot K. Yadav',
    },
    {
      id: '12004',
      name: 'Lucknow Swarna Shatabdi',
      route: 'NDLS ➔ ALJN ➔ LJN',
      type: 'SHATABDI',
      priority: 'Tier 1',
      priorityColor: 'bg-blue-50 text-blue-700 border border-blue-200',
      currentSpeed: '120 km/h',
      status: 'On Time',
      statusColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      delayMinutes: 0,
      nextStation: 'Aligarh Junction (ALJN)',
      scheduledEta: '14:50 PM',
      predictedEta: '14:50 PM',
      driver: 'Loco Pilot M. Verma',
    },
  ];

  const filteredTrains = trainsData.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.includes(searchTerm) ||
      t.route.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || t.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col w-full p-6 space-y-6 text-slate-800 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-md border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
              DIVISION: NR / NCR
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">Real-Time Telemetry Synced</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Active Rolling Stock & Train Fleet</h1>
          <p className="text-xs text-slate-500">
            Real-time telemetry, GPS tracking, and schedule deviation monitoring across Northern Railway network.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded bg-slate-50 border border-slate-200 text-xs flex items-center gap-2">
            <span className="text-slate-500 font-medium">Fleet Online:</span>
            <span className="font-mono font-bold text-slate-900">48 / 52 Trains</span>
          </div>
          <div className="px-3.5 py-2 rounded bg-slate-50 border border-slate-200 text-xs flex items-center gap-2">
            <span className="text-slate-500 font-medium">On-Time Index:</span>
            <span className="font-mono font-bold text-emerald-600">91.6%</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-md bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Total Active Trains</span>
          <div className="text-2xl font-bold text-slate-900 font-mono">52</div>
          <span className="text-[11px] text-emerald-600 font-medium">↑ 4 added in last hour</span>
        </div>
        <div className="p-4 rounded-md bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">On-Time Trains</span>
          <div className="text-2xl font-bold text-emerald-600 font-mono">44</div>
          <span className="text-[11px] text-slate-500">84.6% High Punctuality</span>
        </div>
        <div className="p-4 rounded-md bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Delayed (&gt;15 mins)</span>
          <div className="text-2xl font-bold text-amber-600 font-mono">5</div>
          <span className="text-[11px] text-slate-500">Fog / Weather Impact</span>
        </div>
        <div className="p-4 rounded-md bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Priority Freight Rakes</span>
          <div className="text-2xl font-bold text-slate-900 font-mono">12</div>
          <span className="text-[11px] text-slate-500">Coal & Container Express</span>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-[10px] text-slate-500 font-bold">
              <tr>
                <th className="py-3 px-4">Train No / Name</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Priority Tier</th>
                <th className="py-3 px-4">Speed</th>
                <th className="py-3 px-4">Next Station</th>
                <th className="py-3 px-4">Sched ETA / ML Forecast</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrains.map((train) => (
                <tr key={train.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{train.id}</span>
                      <span className="text-slate-700 font-medium">{train.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{train.route}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${train.priorityColor}`}>
                      {train.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{train.currentSpeed}</td>
                  <td className="py-3 px-4 text-slate-600">{train.nextStation}</td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-slate-400">Sched: {train.scheduledEta}</span>
                      <span className={train.delayMinutes > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                        ML: {train.predictedEta}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${train.statusColor}`}>
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
