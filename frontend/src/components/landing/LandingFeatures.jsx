import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/*
 * LandingFeatures — RailRadar Tactical OCC Architecture & Operations Console
 * Strictly follows design.occ.md:
 * - Tactical OCC Daylight Canvas (#F4F6F8)
 * - Crisp white cards with hairline borders (border-slate-200)
 * - High-contrast typography (text-slate-900, Inter + JetBrains Mono)
 * - Minimal, handcrafted operational components (No AI marketing hype)
 */

export default function LandingFeatures() {
  // Staggered Architecture Active Step (01 Sense, 02 Predict, 03 Arbitrate, 04 Inform)
  const [activeArchStep, setActiveArchStep] = useState(0);

  // Interactive Conflict Workbench State
  const [simulationStep, setSimulationStep] = useState(0);
  const [isSimPlaying, setIsSimPlaying] = useState(true);

  // Architecture Pipeline Definition
  const archSteps = [
    {
      num: '01',
      title: 'SENSE',
      tag: 'FIELD SENSORS & TELEMETRY',
      icon: 'sensors',
      badge: '< 45ms BUS',
      headline: 'Ingest raw physical signals from track circuits to locomotive GPS',
      desc: 'Aggregates real-time axle-counter pulses, electronic point machine sensors, locomotive GPS transponders, and relay interlocking states across 7,325+ stations.',
      input: 'Axle counter pulses · GPS satellite telemetry (24 fps) · Relay contacts (LO, BL, PM, TR, FR)',
      output: 'Normalized continuous corridor telemetry stream delivered at < 42ms latency',
      metric: 'Bus Latency: 38ms avg',
    },
    {
      num: '02',
      title: 'PREDICT',
      tag: 'SECTION GRADIENT DYNAMICS',
      icon: 'speed',
      badge: '99.4% R²',
      headline: 'Forecast speed curves across track elevation gradients and headway buffers',
      desc: 'Sectional traction models project locomotive acceleration, braking curves, and trailing headway deficits up to 6 hours ahead of physical movement.',
      input: 'Track gradient profile · Rake tonnage & tractive effort · Historical division dwell records',
      output: 'Sub-minute arrival probability distribution per station halt and block section',
      metric: 'Gradient Accuracy: 99.4% R²',
    },
    {
      num: '03',
      title: 'ARBITRATE',
      tag: 'TOPOLOGICAL GRAPH ENGINE',
      icon: 'alt_route',
      badge: '10K PERM/SEC',
      headline: 'Arbitrate route precedence topologically before track relays lock',
      desc: 'Directed NetworkX graph detects converging block signal bottlenecks and evaluates loop line siding bypasses and rake overtakes across shared tracks.',
      input: 'Topological adjacency matrix · Rake precedence hierarchy · Loop siding lengths',
      output: 'Optimal siding allocation advisory: hold freight on Loop 2, clear main line for express',
      metric: 'Graph Evaluation: < 38ms',
    },
    {
      num: '04',
      title: 'INFORM',
      tag: 'SYNCHRONIZED DUAL GATEWAYS',
      icon: 'sync_alt',
      badge: 'ZERO SPECULATION',
      headline: 'Synchronize section controllers and passengers with zero delay speculation',
      desc: 'Translates graph decisions into actionable dispatch advisories for Section Controllers, while streaming honest delay explanations to passenger journey screens.',
      input: 'Verified graph state · Precedence allocation matrix · Station platform assignments',
      output: 'Tactile OCC dispatch action + Plain-language delay cause (e.g. "Preceding freight held on loop")',
      metric: 'Sync Propagation: < 120ms',
    },
  ];

  // Realistic Indian Railways Simulation Stages (Kanpur–Prayagraj Trunk Corridor)
  const simStages = [
    {
      label: 'Stage 1: Normal Ingestion',
      title: 'Nominal Corridor Headway',
      trainA: 'Train #12301 (Rajdhani Exp): Speed 128 km/h · Delhi–Howrah Trunk · On Time',
      trainB: 'Train #68716 (BOXN Heavy Freight): Speed 45 km/h · Kanpur–Prayagraj Section · On Time',
      status: 'MONITORING',
      statusClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      action: 'Tracking preceding speeds and axle-counter pulses across Block #42.',
    },
    {
      label: 'Stage 2: Speed Loss on Gradient',
      title: 'Headway Deficit Detected',
      trainA: 'Train #12301: Maintaining 128 km/h on clear main approach',
      trainB: 'Train #68716: Speed dropped to 32 km/h on +1.2% uphill gradient (+12m deficit)',
      status: 'HEADWAY DEFICIT',
      statusClass: 'bg-amber-50 text-amber-700 border-amber-200',
      action: 'Model projects trailing express deceleration within 6 km if unaddressed.',
    },
    {
      label: 'Stage 3: Interlocking Contention',
      title: 'Switch Lock Contention Forecast',
      trainA: 'Convergence Point: Aligarh Jn (Switch #14) in 11 minutes',
      trainB: 'Freight rake occupying single-line approach block; Rajdhani closing at 128 km/h',
      status: 'CONTENTION DETECTED',
      statusClass: 'bg-rose-50 text-rose-700 border-rose-200',
      action: 'NetworkX triggers topological permutation search across Aligarh loop tracks.',
    },
    {
      label: 'Stage 4: Loop Siding Allocation',
      title: 'Dynamic Siding Precedence Granted',
      trainA: 'Train #12301: Main Track 1 line clear granted at full speed',
      trainB: 'Train #68716: Diverted to Aligarh Loop Siding 2 for 8m scheduled halt',
      status: 'SIDING ARBITRATED',
      statusClass: 'bg-sky-50 text-sky-700 border-sky-200',
      action: 'Switch #14 point machine aligned to Loop 2. All 5 switch sensors passing: OK.',
    },
    {
      label: 'Stage 5: Corridor Restored',
      title: 'Schedule Preserved (+14m Saved)',
      trainA: 'Train #12301: Arrives Kanpur Jn on time (+2m nominal buffer)',
      trainB: 'Train #68716: Re-enters main line after Rajdhani clearance with zero knock-on delay',
      status: 'NOMINAL SCHEDULE',
      statusClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      action: 'Corridor cascade prevented. Passenger displays updated with exact siding delay reasoning.',
    },
  ];

  // Active trunk monitored trains
  const activeTrains = [
    {
      id: '12301',
      name: 'Howrah Rajdhani',
      route: 'NDLS → HWH',
      speed: '128 km/h',
      block: 'Block #42 (CNB–PRYJ)',
      status: 'Nominal (+2m)',
      statusType: 'nominal',
      track: 'Main Line 1',
    },
    {
      id: '12002',
      name: 'Bhopal Shatabdi',
      route: 'NDLS → RKMP',
      speed: '130 km/h',
      block: 'Block #18 (AGC–GWL)',
      status: 'On Time (0m)',
      statusType: 'nominal',
      track: 'Main Line 2',
    },
    {
      id: '22691',
      name: 'Bengaluru Rajdhani',
      route: 'SBC → NZM',
      speed: '115 km/h',
      block: 'Block #63 (BPL–JHS)',
      status: 'Nominal (+4m)',
      statusType: 'nominal',
      track: 'Main Line 1',
    },
    {
      id: '68716',
      name: 'BOXN Rake (Freight)',
      route: 'CNB → PRYJ',
      speed: '42 km/h',
      block: 'Aligarh Jn Switch #14',
      status: 'Held Siding (+8m)',
      statusType: 'siding',
      track: 'Loop Siding 2',
    },
  ];

  // Simulation step timer
  useEffect(() => {
    if (!isSimPlaying) return;
    const timer = setInterval(() => {
      setSimulationStep((prev) => (prev + 1) % simStages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isSimPlaying, simStages.length]);

  return (
    <div className="occ-daylight-canvas" id="features-section">
      {/* ============================================================
          SECTION 01: SYSTEM PREMISE & OPERATIONAL METRICS STRIP
          ============================================================ */}
      <section className="occ-container pt-16 pb-12 border-b border-slate-200" aria-labelledby="premise-title">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-mono font-medium text-slate-700 uppercase tracking-wide mb-4">
              <span className="w-2 h-2 rounded-full bg-sky-600"></span>
              <span>TACTICAL DISPATCH ENGINE · SPECIFICATION 4.2.0</span>
            </div>
            <h2 id="premise-title" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Engineered for zero cognitive friction at line speed.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              RailRadar continuously synchronizes physical axle counters, electronic point machines, and locomotive GPS feeds into a single directed topological graph. When headway contention emerges, it calculates loop siding bypasses in milliseconds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login?role=control_room"
              state={{ mode: 'control_room' }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-400">lock</span>
              <span>Control Room OCC</span>
            </Link>
            <Link
              to="/login?role=passenger"
              state={{ mode: 'user' }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold tracking-wide transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px] text-sky-600">person</span>
              <span>Passenger Portal</span>
            </Link>
          </div>
        </div>

        {/* 4-Stat Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">Traction Model</span>
              <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">VERIFIED</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">99.4%</div>
            <p className="mt-1.5 text-xs text-slate-500 leading-normal">
              Variance explained by sectional gradient speed curves across locomotive classes.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">Track Network</span>
              <span className="text-[11px] font-mono font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">TOPOLOGY</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">7,325</div>
            <p className="mt-1.5 text-xs text-slate-500 leading-normal">
              Active topological track stations, switch interlockings, and loop sidings mapped.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">Arbitration Bus</span>
              <span className="text-[11px] font-mono font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">REALTIME</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">&lt; 38ms</div>
            <p className="mt-1.5 text-xs text-slate-500 leading-normal">
              Spatial graph query response latency for multi-rake siding bypass computation.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">Monitored Fleet</span>
              <span className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">24/7 LIVE</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">13,520+</div>
            <p className="mt-1.5 text-xs text-slate-500 leading-normal">
              Continuous axle-counter pulses, signal aspects, and GPS satellite positions.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 02: INTERACTIVE HEADWAY & SIDING ARBITRATION WORKBENCH
          ============================================================ */}
      <section className="occ-container py-14 border-b border-slate-200" aria-labelledby="workbench-title">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[11px] font-mono font-semibold text-sky-600 uppercase tracking-wider mb-2">
              01 / TOPOLOGICAL CONFLICT RESOLUTION
            </div>
            <h3 id="workbench-title" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Preemptive Siding Arbitration Workbench
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 max-w-xl">
              Watch the directed graph resolve headway contention in real time. Delays are prevented before locomotives reach physical signal interlocking blocks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSimPlaying(!isSimPlaying)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-mono font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              aria-label={isSimPlaying ? 'Pause interactive simulation' : 'Play interactive simulation'}
            >
              <span className="material-symbols-outlined text-[15px] text-slate-500">
                {isSimPlaying ? 'pause' : 'play_arrow'}
              </span>
              <span>{isSimPlaying ? 'Pause Simulation' : 'Resume Playback'}</span>
            </button>
          </div>
        </div>

        {/* Workbench Visual Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden">
          {/* Top Workbench Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono text-xs font-bold text-slate-900 tracking-wide uppercase">
                KANPUR–PRAYAGRAJ TRUNK · ALIGARH JUNCTION SWITCH #14
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-500">SIGNAL ASPECT:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                LINE CLEAR (DOUBLE GREEN)
              </span>
            </div>
          </div>

          {/* Interactive SVG Track Diagram */}
          <div className="my-6 p-4 rounded-lg bg-slate-50 border border-slate-200/80">
            <svg viewBox="0 0 740 180" className="w-full h-auto select-none" fill="none" aria-hidden="true">
              {/* Background Grid Accent */}
              <defs>
                <pattern id="trackGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" strokeWidth="0.75" />
                </pattern>
              </defs>
              <rect width="740" height="180" fill="url(#trackGrid)" opacity="0.4" rx="6" />

              {/* Main Line Tracks (Double Track Railway) */}
              <line x1="30" y1="70" x2="710" y2="70" stroke="#CBD5E1" strokeWidth="3" />
              <line x1="30" y1="70" x2="710" y2="70" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="8 8" />

              <text x="40" y="56" className="text-[10px] font-mono font-bold fill-slate-500">
                MAIN TRACK 1 (HIGH-SPEED TRUNK)
              </text>

              {/* Siding Loop Track 2 */}
              <path
                d="M 210 70 C 260 135, 480 135, 530 70"
                stroke={simulationStep >= 3 ? '#10B981' : '#94A3B8'}
                strokeWidth={simulationStep >= 3 ? '3' : '1.5'}
                strokeDasharray={simulationStep >= 3 ? 'none' : '5 5'}
              />
              <text x="370" y="152" textAnchor="middle" className="text-[9px] font-mono font-semibold fill-slate-500">
                LOOP SIDING 2 (680m CAPACITY · HELD FOR PRECEDENCE)
              </text>

              {/* Switch Node #14 at Aligarh */}
              <circle
                cx="210"
                cy="70"
                r="7"
                fill="#FFFFFF"
                stroke={simulationStep === 2 ? '#EF4444' : '#0284C7'}
                strokeWidth="3"
              />
              <text x="210" y="44" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-700">
                SWITCH #14 (ALJN)
              </text>

              {/* Block Signals */}
              <g transform="translate(120, 30)">
                <rect x="0" y="0" width="10" height="24" rx="2" fill="#0F172A" />
                <circle cx="5" cy="6" r="3" fill="#10B981" />
                <circle cx="5" cy="18" r="3" fill="#334155" />
                <text x="16" y="16" className="text-[8px] font-mono fill-slate-400">SIG 41</text>
              </g>

              <g transform="translate(430, 30)">
                <rect x="0" y="0" width="10" height="24" rx="2" fill="#0F172A" />
                <circle cx="5" cy="6" r="3" fill={simulationStep === 2 ? '#EF4444' : '#10B981'} />
                <circle cx="5" cy="18" r="3" fill={simulationStep === 2 ? '#334155' : '#334155'} />
                <text x="16" y="16" className="text-[8px] font-mono fill-slate-400">SIG 42</text>
              </g>

              {/* Train A (Rajdhani Express #12301) */}
              <g transform={`translate(${simulationStep === 0 ? 90 : simulationStep === 1 ? 190 : simulationStep === 2 ? 310 : simulationStep === 3 ? 470 : 610}, 70)`}>
                <rect x="-24" y="-12" width="48" height="24" rx="4" fill="#0284C7" stroke="#0369A1" strokeWidth="1.5" />
                <text y="4" textAnchor="middle" className="text-[9px] font-mono font-bold fill-white">
                  #12301
                </text>
                <text y="-16" textAnchor="middle" className="text-[8px] font-mono font-bold fill-sky-800">
                  RAJDHANI (128 km/h)
                </text>
              </g>

              {/* Train B (Heavy Freight #68716) */}
              <g
                transform={
                  simulationStep >= 3
                    ? 'translate(370, 120)'
                    : `translate(${simulationStep === 0 ? 280 : simulationStep === 1 ? 350 : 390}, 70)`
                }
              >
                <rect
                  x="-24"
                  y="-12"
                  width="48"
                  height="24"
                  rx="4"
                  fill={simulationStep >= 3 ? '#047857' : '#475569'}
                  stroke={simulationStep >= 3 ? '#065F46' : '#334155'}
                  strokeWidth="1.5"
                />
                <text y="4" textAnchor="middle" className="text-[9px] font-mono font-bold fill-white">
                  #68716
                </text>
                <text y={simulationStep >= 3 ? 24 : -16} textAnchor="middle" className="text-[8px] font-mono font-semibold fill-slate-700">
                  {simulationStep >= 3 ? 'HELD ON SIDING 2 (8 MIN)' : 'BOXN FREIGHT (42 km/h)'}
                </text>
              </g>
            </svg>
          </div>

          {/* Stepper Buttons (Handcrafted Scrubber) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4" role="tablist" aria-label="Simulation steps">
            {simStages.map((stage, idx) => {
              const isCurrent = simulationStep === idx;
              return (
                <button
                  key={stage.label}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  onClick={() => {
                    setSimulationStep(idx);
                    setIsSimPlaying(false);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    isCurrent
                      ? 'bg-sky-50/80 border-sky-400 text-sky-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="font-bold">STEP 0{idx + 1}</span>
                    {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>}
                  </div>
                  <div className="text-[11px] font-semibold truncate">{stage.title}</div>
                </button>
              );
            })}
          </div>

          {/* Real Operational Telemetry Box */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 mb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">{simStages[simulationStep].label}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">{simStages[simulationStep].title}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${simStages[simulationStep].statusClass}`}>
                {simStages[simulationStep].status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-[11px]">
              <div>
                <span className="text-slate-400 uppercase text-[9px] block">TRAIN A STATUS:</span>
                <span className="text-slate-800 font-medium">{simStages[simulationStep].trainA}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[9px] block">TRAIN B STATUS:</span>
                <span className="text-slate-800 font-medium">{simStages[simulationStep].trainB}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-sky-800 font-medium text-[11px]">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              <span>TACTICAL OCC ACTION: {simStages[simulationStep].action}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 03: TOPOLOGICAL DISPATCH PIPELINE (4 STAGES)
          ============================================================ */}
      <section className="occ-container py-14 border-b border-slate-200" aria-labelledby="pipeline-title">
        <div className="max-w-2xl mb-8">
          <div className="text-[11px] font-mono font-semibold text-sky-600 uppercase tracking-wider mb-2">
            02 / PRODUCTION ARCHITECTURE
          </div>
          <h3 id="pipeline-title" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            The 4-Stage Topological Dispatch Pipeline
          </h3>
          <p className="mt-1.5 text-sm text-slate-600">
            From field relay contacts to passenger mobile screens&nbsp;— how mathematical decisions flow continuously through the RailRadar architecture.
          </p>
        </div>

        {/* 4 Pipeline Selection Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6" role="tablist" aria-label="Pipeline stages">
          {archSteps.map((step, idx) => {
            const isActive = activeArchStep === idx;
            return (
              <button
                key={step.num}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveArchStep(idx)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-white border-sky-500 shadow-sm ring-1 ring-sky-500/20'
                    : 'bg-white/70 border-slate-200 hover:bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-extrabold text-sky-600">{step.num}</span>
                  <span className="material-symbols-outlined text-[18px] text-slate-400">{step.icon}</span>
                </div>
                <h4 className="font-mono font-bold text-sm text-slate-900 mb-1">{step.title}</h4>
                <div className="text-[10px] font-mono text-slate-500">{step.tag}</div>
              </button>
            );
          })}
        </div>

        {/* Active Stage Inspection Card */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                PIPELINE STAGE {archSteps[activeArchStep].num}
              </span>
              <h4 className="text-base font-bold text-slate-900">{archSteps[activeArchStep].headline}</h4>
            </div>
            <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
              ✓ {archSteps[activeArchStep].metric}
            </span>
          </div>

          <p className="my-4 text-sm text-slate-600 leading-relaxed">
            {archSteps[activeArchStep].desc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 font-mono text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                TELEMETRY INPUT STREAM:
              </span>
              <span className="text-slate-800 leading-relaxed block">
                {archSteps[activeArchStep].input}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-sky-50/60 border border-sky-200">
              <span className="text-[9px] font-bold text-sky-600 uppercase tracking-wider block mb-1">
                COMPUTED OPERATIONAL OUTPUT:
              </span>
              <span className="text-sky-900 font-semibold leading-relaxed block">
                {archSteps[activeArchStep].output}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 04: TWO INTERFACES. ONE SYNCHRONIZED GRAPH.
          ============================================================ */}
      <section className="occ-container py-14 border-b border-slate-200" aria-labelledby="portals-title">
        <div className="max-w-2xl mb-8">
          <div className="text-[11px] font-mono font-semibold text-sky-600 uppercase tracking-wider mb-2">
            03 / DUAL OPERATIONAL GATEWAYS
          </div>
          <h3 id="portals-title" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tailored interfaces. One synchronized railway graph.
          </h3>
          <p className="mt-1.5 text-sm text-slate-600">
            Engineered specifically for each user persona — passengers receive transparent arrival clarity, while section controllers gain tactical headway authority.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gateway 1: Passenger Portal */}
          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-50 text-sky-700 border border-sky-200 font-mono text-[10px] font-bold tracking-wider uppercase">
                  FOR PASSENGERS & COMMUTERS
                </span>
                <span className="font-mono text-xs text-slate-400">PUBLIC ACCESS</span>
              </div>

              <h4 className="text-xl font-bold text-slate-900 mb-2">
                Clarity over platform speculation.
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                Know exactly when your train arrives and understand the physical cause behind every delay with zero vague generic announcements.
              </p>

              <div className="space-y-3 mb-6 font-mono text-xs">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-sky-600 font-bold">01</span>
                  <div>
                    <strong className="text-slate-800 font-semibold">Sub-Minute Predicted ETA:</strong> Refined dynamically via locomotive speed gradients.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-sky-600 font-bold">02</span>
                  <div>
                    <strong className="text-slate-800 font-semibold">Transparent Delay Reasons:</strong> Explicit causes like preceding freight hold or loop overtake.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-sky-600 font-bold">03</span>
                  <div>
                    <strong className="text-slate-800 font-semibold">Platform Track Allocation:</strong> Pre-assigned platform track numbers before arrival.
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/login?role=passenger"
              state={{ mode: 'user' }}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold tracking-wide transition-colors"
            >
              <span>Launch Passenger Portal</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          {/* Gateway 2: Control Room OCC */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-mono text-[10px] font-bold tracking-wider uppercase">
                  FOR SECTION CONTROLLERS & OCC
                </span>
                <span className="font-mono text-xs text-slate-400">OPERATOR CLEARANCE</span>
              </div>

              <h4 className="text-xl font-bold text-white mb-2">
                Preemptive headway control console.
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
                Replace frantic phone triage with topological precision. Detect and resolve block signal bottlenecks hours before trains arrive.
              </p>

              <div className="space-y-3 mb-6 font-mono text-xs">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                  <span className="text-amber-400 font-bold">01</span>
                  <div>
                    <strong className="text-slate-200 font-semibold">Sub-38ms Conflict Radar:</strong> Continuous validation of track switches and routes.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                  <span className="text-amber-400 font-bold">02</span>
                  <div>
                    <strong className="text-slate-200 font-semibold">Cascade Propagation Modeling:</strong> Forecast knock-on delays across 3 divisions.
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                  <span className="text-amber-400 font-bold">03</span>
                  <div>
                    <strong className="text-slate-200 font-semibold">Switch Health Monitoring:</strong> Real-time 5-segment status: LO, BL, PM, TR, FR.
                  </div>
                </div>
              </div>
            </div>

            <Link
              to="/login?role=control_room"
              state={{ mode: 'control_room' }}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold tracking-wide transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>Access Control Room OCC</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 05: LIVE NATIONAL TRUNK CORRIDOR FEED
          ============================================================ */}
      <section className="occ-container py-14" aria-labelledby="feed-title">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="text-[11px] font-mono font-semibold text-sky-600 uppercase tracking-wider mb-1">
              04 / VERIFIED OPERATIONAL FEED
            </div>
            <h3 id="feed-title" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Live National Trunk Telemetry
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-xs text-slate-500">LIVE FEED · WEBSOCKET SYNCED</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left font-mono text-xs" aria-label="Live Trunk Telemetry Table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase">
                <th className="py-3 px-4">Train ID & Name</th>
                <th className="py-3 px-4">Trunk Route</th>
                <th className="py-3 px-4">Speed</th>
                <th className="py-3 px-4">Active Block Section</th>
                <th className="py-3 px-4">Assigned Track</th>
                <th className="py-3 px-4 text-right">Precedence Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTrains.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    #{t.id} <span className="font-normal text-slate-600">· {t.name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-semibold">{t.route}</td>
                  <td className="py-3 px-4 text-sky-700 font-bold">{t.speed}</td>
                  <td className="py-3 px-4 text-slate-600">{t.block}</td>
                  <td className="py-3 px-4 text-slate-700">{t.track}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        t.statusType === 'nominal'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================
          SECTION 06: HANDCRAFTED TACTICAL FOOTER
          ============================================================ */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-12 py-12" aria-label="Site Footer">
        <div className="occ-container">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sky-400 text-[18px]">radar</span>
                </div>
                <span className="text-lg font-extrabold text-white">
                  Rail<span className="text-sky-400">Radar</span>
                </span>
                <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                  OCC v4.2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-md">
                Indian Railways Network Intelligence & Tactical Operations Control Center. Real-time topological headway management.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 font-mono text-xs">
              <Link to="/user-dashboard" className="text-slate-400 hover:text-white transition-colors">
                Live Radar Map
              </Link>
              <Link to="/login?role=passenger" state={{ mode: 'user' }} className="text-slate-400 hover:text-white transition-colors">
                Passenger Portal
              </Link>
              <Link to="/login?role=control_room" state={{ mode: 'control_room' }} className="text-slate-400 hover:text-white transition-colors">
                Control Room OCC
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 text-[11px] text-slate-500 font-mono">
            <div>&copy; 2026 RailRadar OCC Systems. Smart India Hackathon 2026.</div>
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>ALL OCC TELEMETRY CHANNELS ACTIVE (7,325 STATIONS)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
