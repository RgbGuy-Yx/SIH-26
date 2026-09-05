import React, { useState } from 'react';

export function LiveMapPage() {
  const [selectedStation, setSelectedStation] = useState('Kanpur Central (CNB)');
  const [selectedTrain, setSelectedTrain] = useState('12401 — Vande Bharat Express');

  return (
    <div className="flex flex-col w-full p-6 gap-6">
      {/* Top Grid: Interactive Tactical Railway Map + Train Telemetry Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
        {/* Radar Tactical Rail Viewport (Left / Center) */}
        <div className="xl:col-span-8 bg-surface-container-lowest rounded-xl relative overflow-hidden shadow-2xl min-h-[580px] flex flex-col justify-between border border-slate-800/60">
          {/* Vector Topographical Radar Canvas (SVG) */}
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#060c18] via-[#040914] to-[#02050c]">
            <svg
              className="w-full h-full object-cover"
              viewBox="0 0 1000 640"
              preserveAspectRatio="xMidYMid slice"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="corridor-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#2e5ce6" floodOpacity="0.8" />
                </filter>
                <filter id="branch-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#8e90a0" floodOpacity="0.5" />
                </filter>
                <radialGradient id="radarField" cx="50%" cy="50%" r="65%">
                  <stop offset="0%" stopColor="#152032" stopOpacity="0.35" />
                  <stop offset="60%" stopColor="#081326" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#030e20" stopOpacity="0.95" />
                </radialGradient>
                <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f2a3d" strokeWidth="0.5" strokeOpacity="0.45" />
                </pattern>
              </defs>

              {/* Grid & Vignette */}
              <rect width="1000" height="640" fill="url(#gridPattern)" />
              <rect width="1000" height="640" fill="url(#radarField)" />

              {/* State Boundaries & Labels */}
              <path
                d="M120,40 Q250,90 380,80 T680,110 T890,220 L960,340 Q760,420 540,430 T220,380 Z"
                fill="none"
                stroke="#152032"
                strokeWidth="1.5"
                strokeDasharray="3,3"
                opacity="0.65"
              />
              <text x="510" y="180" fill="#8e90a0" fontSize="18" fontWeight="700" letterSpacing="0.45em" opacity="0.22">
                UTTAR PRADESH
              </text>
              <text x="730" y="300" fill="#8e90a0" fontSize="17" fontWeight="700" letterSpacing="0.45em" opacity="0.22">
                BIHAR
              </text>

              {/* Main Trunk Corridor Line */}
              <path
                id="trunk-line"
                d="M 170,110 L 220,135 L 300,210 L 350,260 L 405,325 L 460,370 L 610,430 L 760,455"
                fill="none"
                stroke="#2e5ce6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#corridor-glow)"
              />
              <path
                d="M 170,110 L 220,135 L 300,210 L 350,260 L 405,325 L 460,370 L 610,430 L 760,455"
                fill="none"
                stroke="#b7c4ff"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Lucknow Branch Line */}
              <path
                id="lucknow-branch"
                d="M 350,260 Q 480,270 560,285 L 615,345 L 760,455"
                fill="none"
                stroke="#8e90a0"
                strokeWidth="2"
                strokeDasharray="6,5"
                filter="url(#branch-glow)"
              />
              <path
                d="M 460,370 L 560,285"
                fill="none"
                stroke="#8e90a0"
                strokeWidth="1.8"
                strokeDasharray="4,4"
                opacity="0.8"
              />

              {/* Station Nodes */}
              <g className="cursor-pointer" onClick={() => setSelectedStation('New Delhi (NDLS)')}>
                <circle cx="170" cy="110" r="10" fill="#030e20" stroke="#b7c4ff" strokeWidth="2.5" />
                <circle cx="170" cy="110" r="4.5" fill="#2e5ce6" />
                <text x="145" y="92" fill="#d8e3fc" fontSize="14" fontWeight="700">New Delhi</text>
              </g>

              <g className="cursor-pointer" onClick={() => setSelectedStation('Ghaziabad (GZB)')}>
                <circle cx="220" cy="135" r="4" fill="#030e20" stroke="#d8e3fc" strokeWidth="2" />
                <text x="232" y="130" fill="#c4c5d7" fontSize="11">Ghaziabad</text>
              </g>

              <g className="cursor-pointer" onClick={() => setSelectedStation('Aligarh (ALJN)')}>
                <circle cx="300" cy="210" r="4.5" fill="#030e20" stroke="#d8e3fc" strokeWidth="2" />
                <text x="245" y="215" fill="#c4c5d7" fontSize="11">Aligarh</text>
              </g>

              <g className="cursor-pointer" onClick={() => setSelectedStation('Tundla (TDL)')}>
                <circle cx="350" cy="260" r="5" fill="#030e20" stroke="#b7c4ff" strokeWidth="2" />
                <text x="360" y="255" fill="#d8e3fc" fontSize="12" fontWeight="600">Tundla</text>
              </g>

              <g className="cursor-pointer" onClick={() => setSelectedStation('Kanpur Central (CNB)')}>
                <circle cx="460" cy="370" r="7" fill="#030e20" stroke="#2e5ce6" strokeWidth="3" />
                <circle cx="460" cy="370" r="3.5" fill="#2e5ce6" />
                <text x="474" y="375" fill="#d8e3fc" fontSize="13" fontWeight="700">Kanpur Central</text>
              </g>

              <g className="cursor-pointer" onClick={() => setSelectedStation('Lucknow (LJN)')}>
                <circle cx="560" cy="285" r="6" fill="#030e20" stroke="#b7c4ff" strokeWidth="2.5" />
                <text x="572" y="290" fill="#d8e3fc" fontSize="13" fontWeight="600">Lucknow</text>
              </g>

              <g className="cursor-pointer" onClick={() => setSelectedStation('Prayagraj (PRYJ)')}>
                <circle cx="610" cy="430" r="5.5" fill="#030e20" stroke="#b7c4ff" strokeWidth="2" />
                <text x="622" y="435" fill="#d8e3fc" fontSize="12" fontWeight="600">Prayagraj</text>
              </g>

              <g className="cursor-pointer" onClick={() => setSelectedStation('Varanasi (BSB)')}>
                <circle cx="760" cy="455" r="7.5" fill="#030e20" stroke="#b7c4ff" strokeWidth="2.5" />
                <circle cx="760" cy="455" r="3" fill="#b7c4ff" />
                <text x="775" y="460" fill="#d8e3fc" fontSize="13" fontWeight="700">Varanasi</text>
              </g>

              {/* Animated Train Position Markers */}
              <g transform="translate(425, 345)" className="cursor-pointer" onClick={() => setSelectedTrain('12401 — Vande Bharat Express')}>
                <circle cx="0" cy="0" r="14" fill="#2e5ce6" fillOpacity="0.2" className="animate-ping" />
                <rect x="-8" y="-8" width="16" height="16" rx="4" fill="#2e5ce6" stroke="#ffffff" strokeWidth="1.5" />
                <text x="12" y="4" fill="#2e5ce6" fontSize="10" fontWeight="700" className="font-mono">12401 VB (130 km/h)</text>
              </g>

              <g transform="translate(325, 235)" className="cursor-pointer" onClick={() => setSelectedTrain('12302 — Howrah Rajdhani')}>
                <rect x="-7" y="-7" width="14" height="14" rx="3" fill="#2a5ee3" stroke="#dce1ff" strokeWidth="1.5" />
                <text x="10" y="4" fill="#b5c4ff" fontSize="10" fontWeight="600" className="font-mono">12302 RJ (110 km/h)</text>
              </g>

              <g transform="translate(520, 278)" className="cursor-pointer" onClick={() => setSelectedTrain('12556 — Gorakhdham Express')}>
                <rect x="-6" y="-6" width="12" height="12" rx="3" fill="#93000a" stroke="#ffb4ab" strokeWidth="1.5" />
                <text x="10" y="4" fill="#ffb4ab" fontSize="10" fontWeight="600" className="font-mono">12556 (+45m Delay)</text>
              </g>
            </svg>
          </div>

          {/* Viewport Overlay Bar */}
          <div className="relative z-10 p-4 flex items-center justify-between bg-gradient-to-b from-slate-950/90 to-transparent">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-semibold text-white uppercase tracking-wider">Live Section Topology: NDLS – BSB Corridor</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800">Zone: Northern / North Central</span>
              <span className="px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800">Density: 84% Capacity</span>
            </div>
          </div>

          {/* Bottom Map Legend */}
          <div className="relative z-10 p-4 bg-gradient-to-t from-slate-950/95 to-transparent flex flex-wrap items-center justify-between text-xs text-slate-300 border-t border-slate-800/40">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded bg-blue-500"></span>
                <span>Main Trunk Line</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded bg-slate-400 border-dashed"></span>
                <span>Loop / Branch Line</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-blue-600"></span>
                <span>Active Train</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-red-600"></span>
                <span>Delayed Train</span>
              </div>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">Selected: {selectedStation}</span>
          </div>
        </div>

        {/* Right Inspector Panel: Train Telemetry Inspector */}
        <div className="xl:col-span-4 bg-surface-container-low rounded-xl p-5 border border-slate-800/60 flex flex-col space-y-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">monitor_heart</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-tight">Train Telemetry Inspector</h2>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              Live Feed
            </span>
          </div>

          {/* Active Train Selected Header */}
          <div className="p-4 rounded-lg bg-surface-container-lowest border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-blue-400">12401 / VB-EXPRESS</span>
              <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 text-[11px] font-semibold">
                Priority Tier 1
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Vande Bharat Express</h3>
            <p className="text-xs text-slate-400">New Delhi (NDLS) ➔ Kanpur Central (CNB) ➔ Varanasi (BSB)</p>
          </div>

          {/* Real-Time Speed & Position Telemetry */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current Speed</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-white font-mono">130</span>
                <span className="text-xs text-slate-400">km/h</span>
              </div>
              <span className="text-[10px] text-emerald-400">Optimal MPS Achieved</span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Forecast ETA</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-emerald-400 font-mono">15:12</span>
                <span className="text-xs text-slate-400">PM</span>
              </div>
              <span className="text-[10px] text-emerald-400">On-Time (±0 min)</span>
            </div>
          </div>

          {/* Section Congestion & ML Prediction */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Section Load (Kanpur - Prayagraj)</span>
              <span className="font-mono text-amber-400 font-bold">78% High</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '78%' }}></div>
            </div>
          </div>

          {/* Machine Learning Feature Schema Preview */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-blue-400 text-[16px]">psychology</span>
              <span>XGBoost ML Feature Vector</span>
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1">
              <div>is_foggy: <span className="text-white font-semibold">0 (Clear)</span></div>
              <div>accumulated_delay: <span className="text-emerald-400 font-semibold">0m</span></div>
              <div>priority_tier: <span className="text-white font-semibold">1</span></div>
              <div>wind_speed: <span className="text-white font-semibold">12 km/h</span></div>
            </div>
          </div>

          {/* Station Quick Selector List */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Track Nodes</span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {['New Delhi (NDLS)', 'Ghaziabad (GZB)', 'Aligarh (ALJN)', 'Tundla (TDL)', 'Kanpur Central (CNB)', 'Lucknow (LJN)', 'Prayagraj (PRYJ)', 'Varanasi (BSB)'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStation(st)}
                  className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                    selectedStation === st
                      ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300 font-semibold'
                      : 'bg-slate-950/40 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <span>{st}</span>
                  <span className="text-[10px] text-slate-500">Node Ready</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveMapPage;
