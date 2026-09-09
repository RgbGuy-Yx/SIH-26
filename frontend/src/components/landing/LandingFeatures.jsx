import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/*
 * LandingFeatures — RailSense Editorial & Asymmetric Network Intelligence Showcase
 *
 * Implements the author-directed, card-less, asymmetric narrative:
 *  01 — POST-CINEMATIC: "ETA IS A NETWORK PROBLEM."
 *  02 — PERFORMANCE: Exposed Canvas Metrics (No boxing, hairline dividers)
 *  03 — ASYMMETRIC SPLIT 1: "A DELAY DOESN'T STAY WITH ONE TRAIN." + Live Interactive Conflict Visual
 *  04 — ARCHITECTURE: "SO WE DON'T PREDICT ONE TRAIN AT A TIME." (Staggered Physical Rail Line)
 *  05 — TWO SIDES: PASSENGERS ("Know what's happening") ↔ OPERATIONS ("Know what happens next")
 *  06 — PRODUCT PROOF: "ENOUGH THEORY. SEE THE NETWORK." (OCC Tactical Dispatch Advisory Pod)
 *  07 — FINAL CTA: "THE RAILWAY IS ALWAYS MOVING. NOW YOUR INTELLIGENCE CAN MOVE WITH IT."
 */

export default function LandingFeatures() {
  // Staggered Architecture Active Step
  const [activeArchStep, setActiveArchStep] = useState(0);

  // How It Thinks Simulation Step
  const [simulationStep, setSimulationStep] = useState(0);
  const [isSimPlaying, setIsSimPlaying] = useState(true);

  // Architecture Rail Line Definitions
  const archSteps = [
    {
      num: '01',
      title: 'SENSE',
      tag: 'TELEMETRY INGESTION',
      icon: 'sensors',
      badge: 'SUB-45ms BUS',
      headline: 'Ingest raw physical signals from track to sky',
      desc: 'Real-time axle counter pulses, point machine actuators, locomotive GPS coordinates, schedule timetables, and weather radar feeds across 7,325+ stations.',
      input: 'Axle counter pulses · Loco GPS telemetry · Interlocking relay states',
      output: 'Normalized continuous telemetry stream at 24 updates/sec',
      metric: 'Bus Latency: < 42ms',
    },
    {
      num: '02',
      title: 'PREDICT',
      tag: 'XGBOOST ML ENGINE',
      icon: 'speed',
      badge: '99.4% R²',
      headline: 'Forecast propagation curves across terrain gradients',
      desc: 'Machine learning models project locomotive speed profiles, section gradient loads, and dynamic headway buffers up to 6 hours into the future.',
      input: 'Sectional elevation · Loco tractive curve · Historical dwell data',
      output: 'Sub-minute arrival probability distribution per station halt',
      metric: 'Model Accuracy R²: 99.4%',
    },
    {
      num: '03',
      title: 'RESOLVE',
      tag: 'SPATIAL GRAPH ARBITRATION',
      icon: 'alt_route',
      badge: '10K PERMUTATIONS/SEC',
      headline: 'Arbitrate route precedence before switches lock',
      desc: 'NetworkX spatial topology graph identifies converging block signal bottlenecks and automatically evaluates loop line siding bypasses and rake overtakes.',
      input: 'Topological adjacency matrix · Rake priority hierarchy',
      output: 'Optimized loop siding allocation & headway hold advisory',
      metric: 'Conflict Search Time: < 38ms',
    },
    {
      num: '04',
      title: 'INFORM',
      tag: 'TRACEABLE DISPATCH & PASSENGER SYNC',
      icon: 'sync_alt',
      badge: 'OCC & PASSENGER',
      headline: 'Synchronize controllers and passengers simultaneously',
      desc: 'Synthesizes mathematical graph decisions into human-readable Gemini dispatch reasoning for Section Controllers, while pushing verified ETAs to passenger screens.',
      input: 'Computed dispatch path · Precedence matrix · Verified ETAs',
      output: 'Plain-language OCC advisory + Live passenger ETA broadcast',
      metric: 'Sync Propagation: < 120ms',
    },
  ];

  // Simulation Steps
  const simStages = [
    {
      label: 'Stage 1: Delay Detected',
      trainA: 'Train A (Rajdhani #12301): +14m delay detected at Section Block 3',
      trainB: 'Train B (Freight #68716): On time on Main Line 1 (45 km/h)',
      status: 'MONITORING',
      statusColor: 'text-sky-700 bg-sky-50 border-sky-200',
      action: 'Tracking preceding speeds & block signal occupancy.',
    },
    {
      label: 'Stage 2: Cascade Forecast',
      trainA: 'Train A closing distance at 128 km/h behind slow freight',
      trainB: 'Train B occupying critical junction switch ahead',
      status: 'HEADWAY WARNING',
      statusColor: 'text-amber-800 bg-amber-50 border-amber-200',
      action: 'XGBoost models +28m downstream cascade across 3 divisions.',
    },
    {
      label: 'Stage 3: Conflict Detected',
      trainA: 'Convergence Point: Aligarh Jn (Switch #14) in 12 mins',
      trainB: 'Lock contention predicted on Main Track 1',
      status: 'CONTENTION DETECTED',
      statusColor: 'text-red-800 bg-red-50 border-red-200',
      action: 'NetworkX graph triggers multi-track spatial permutation search.',
    },
    {
      label: 'Stage 4: Siding Bypass Computed',
      trainA: 'Train A granted precedence: Clear Main Line trajectory',
      trainB: 'Train B routed to Siding Loop 2 for 8m scheduled halt',
      status: 'ROUTE OPTIMIZED',
      statusColor: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      action: 'Autonomous loop siding allocation executed. Switch health: OK.',
    },
    {
      label: 'Stage 5: Schedule Preserved',
      trainA: 'Train A arrival preserved at 18:42 (+2m nominal)',
      trainB: 'Train B resumes with zero trailing congestion',
      status: 'ALL RESOLVED',
      statusColor: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      action: '18 minutes of corridor delay avoided. Passengers & OCC notified.',
    },
  ];

  // Autoplay simulation
  useEffect(() => {
    if (!isSimPlaying) return;
    const interval = setInterval(() => {
      setSimulationStep((prev) => (prev + 1) % simStages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isSimPlaying, simStages.length]);

  return (
    <div className="landing-editorial-flow">
      {/* ============================================================
          SECTION 01: POST-CINEMATIC STATEMENT (Card-less & Left-Aligned)
          ============================================================ */}
      <section className="editorial-statement-section">
        <div className="editorial-statement-container">
          <div className="statement-eyebrow">
            <span className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse"></span>
            <span>SYSTEM PREMISE</span>
          </div>

          <h2 className="statement-huge-title">
            ETA IS A<br />
            NETWORK PROBLEM.
          </h2>

          <p className="statement-lead-copy">
            RailSense continuously models how delays propagate through junctions, rake priorities, weather conditions, and shared railway infrastructure.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 02: EXPOSED CANVAS METRICS (Hairline Dividers, No Boxes)
          ============================================================ */}
      <section className="editorial-metrics-section">
        <div className="editorial-metrics-grid">
          {/* Metric 1 */}
          <div className="exposed-metric-cell">
            <span className="exposed-metric-num text-slate-900">99.4%</span>
            <span className="exposed-metric-label">PREDICTION ACCURACY (R²)</span>
            <p className="exposed-metric-desc">
              Variance explained by XGBoost delay gradient models across locomotive classes.
            </p>
          </div>

          {/* Metric 2 */}
          <div className="exposed-metric-cell">
            <span className="exposed-metric-num text-slate-900">7,325+</span>
            <span className="exposed-metric-label">JOURNEYS ANALYZED</span>
            <p className="exposed-metric-desc">
              Active route topologies simulated simultaneously across trunk corridors.
            </p>
          </div>

          {/* Metric 3 */}
          <div className="exposed-metric-cell">
            <span className="exposed-metric-num text-[#0284C7]">&lt; 45ms</span>
            <span className="exposed-metric-label">CONFLICT EVALUATION</span>
            <p className="exposed-metric-desc">
              NetworkX spatial graph headway & interlocking query response time.
            </p>
          </div>

          {/* Metric 4 */}
          <div className="exposed-metric-cell">
            <span className="exposed-metric-num text-slate-900">13,520+</span>
            <span className="exposed-metric-label">NETWORK EVENTS</span>
            <p className="exposed-metric-desc">
              Continuous axle counter pulses, signal transitions, and GPS pings per minute.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 03: ASYMMETRIC SPLIT 1 — A DELAY DOESN'T STAY WITH ONE TRAIN
          Left = Big statement & insight; Right = Interactive conflict simulator
          ============================================================ */}
      <section className="editorial-asym-section">
        <div className="editorial-asym-container">
          {/* Left Column: Bold Narrative & Contrast */}
          <div className="editorial-asym-left">
            <div className="section-index-tag">01 / CASCADE DYNAMICS</div>
            <h2 className="editorial-section-title">
              A DELAY DOESN'T<br />
              STAY WITH ONE TRAIN.
            </h2>
            <p className="editorial-body-copy">
              When a freight rake loses 12 minutes in Kanpur, it doesn't just arrive late. It occupies a switch, forces an express behind it into a holding siding, and ripples across three territorial divisions.
            </p>

            {/* Contrast Block */}
            <div className="editorial-contrast-flow">
              <div className="contrast-row contrast-row--traditional">
                <div className="contrast-marker">TRADITIONAL</div>
                <div className="contrast-text">
                  <strong>Wait for train to lose time</strong> → post-facto delay shift → passenger discovers delay at the platform.
                </div>
              </div>
              <div className="contrast-row contrast-row--railsense">
                <div className="contrast-marker">RAILSENSE</div>
                <div className="contrast-text">
                  <strong>Detect gradient drop at sensor</strong> → predict junction lock in &lt;45ms → allocate siding before contention occurs.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Network Conflict Simulation */}
          <div className="editorial-asym-right">
            <div className="live-sim-panel">
              {/* Simulation Header */}
              <div className="sim-panel-header">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                    INTERACTIVE CONFLICT GRAPH
                  </span>
                </div>
                <button
                  className="sim-play-toggle"
                  onClick={() => setIsSimPlaying(!isSimPlaying)}
                >
                  {isSimPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
              </div>

              {/* Minimal SVG Track Diagram */}
              <div className="sim-svg-wrapper">
                <svg viewBox="0 0 600 170" className="w-full h-auto" fill="none">
                  {/* Main Line */}
                  <line x1="20" y1="60" x2="580" y2="60" stroke="#CBD5E1" strokeWidth="3" />
                  <line x1="20" y1="60" x2="580" y2="60" stroke="#0284C7" strokeWidth="2" strokeDasharray="6 6" />

                  {/* Siding Loop Track */}
                  <path
                    d="M 180 60 C 230 120, 370 120, 420 60"
                    stroke={simulationStep >= 3 ? '#10B981' : '#94A3B8'}
                    strokeWidth={simulationStep >= 3 ? '3' : '2'}
                    strokeDasharray={simulationStep >= 3 ? 'none' : '4 4'}
                  />

                  {/* Junction Switch Node */}
                  <circle cx="300" cy="60" r="8" fill="#FFFFFF" stroke={simulationStep === 2 ? '#EF4444' : '#0284C7'} strokeWidth="3" />
                  <text x="300" y="44" textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-700">
                    SWITCH #14 (ALJN)
                  </text>

                  {/* Train A (Express) Marker */}
                  <g transform={`translate(${simulationStep === 0 ? 100 : simulationStep === 1 ? 200 : simulationStep === 2 ? 260 : simulationStep === 3 ? 380 : 500}, 60)`}>
                    <rect x="-18" y="-10" width="36" height="20" rx="5" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
                    <text y="4" textAnchor="middle" className="text-[9px] font-mono font-bold fill-white">
                      #12301
                    </text>
                  </g>

                  {/* Train B (Freight) Marker */}
                  <g
                    transform={
                      simulationStep >= 3
                        ? 'translate(300, 120)'
                        : `translate(${simulationStep === 0 ? 240 : simulationStep === 1 ? 300 : 340}, 60)`
                    }
                  >
                    <rect
                      x="-18"
                      y="-10"
                      width="36"
                      height="20"
                      rx="5"
                      fill={simulationStep >= 3 ? '#10B981' : '#64748B'}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text y="4" textAnchor="middle" className="text-[9px] font-mono font-bold fill-white">
                      #68716
                    </text>
                    {simulationStep >= 3 && (
                      <text y="24" textAnchor="middle" className="text-[8px] font-mono font-bold fill-emerald-700">
                        LOOP SIDING 2 (HELD 8m)
                      </text>
                    )}
                  </g>
                </svg>
              </div>

              {/* Scrubber Stages */}
              <div className="sim-stepper-rail">
                {simStages.map((stage, idx) => (
                  <button
                    key={stage.label}
                    className={`sim-stepper-btn ${simulationStep === idx ? 'sim-stepper-btn--active' : ''}`}
                    onClick={() => {
                      setSimulationStep(idx);
                      setIsSimPlaying(false);
                    }}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {/* Telemetry Readout */}
              <div className="sim-telemetry-box">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {simStages[simulationStep].label}
                  </span>
                  <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${simStages[simulationStep].statusColor}`}>
                    {simStages[simulationStep].status}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-600 mb-1">
                  {simStages[simulationStep].trainA}
                </div>
                <div className="text-xs font-mono text-slate-600 mb-2">
                  {simStages[simulationStep].trainB}
                </div>
                <div className="pt-2 border-t border-slate-200 text-xs font-mono font-semibold text-[#0284C7]">
                  ↳ {simStages[simulationStep].action}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 04: THE STAGGERED RAIL LINE ARCHITECTURE
          "SO WE DON'T PREDICT ONE TRAIN AT A TIME."
          Physical rail line traveling through the page layout
          ============================================================ */}
      <section className="editorial-arch-section">
        <div className="editorial-arch-container">
          <div className="section-index-tag">02 / ARCHITECTURE</div>
          <h2 className="editorial-section-title">
            SO WE DON'T PREDICT<br />
            ONE TRAIN AT A TIME.
          </h2>
          <p className="editorial-body-copy max-w-[640px]">
            The railway is a single interconnected mathematical graph. RailSense runs continuous 4-stage topological arbitration across every signal block.
          </p>

          {/* Staggered Rail Line Steps (The Designed Structural Layout) */}
          <div className="staggered-rail-pipeline">
            {archSteps.map((step, idx) => {
              const isActive = activeArchStep === idx;
              return (
                <div
                  key={step.num}
                  className={`rail-stage-row rail-stage-${idx} ${isActive ? 'rail-stage--active' : ''}`}
                  onClick={() => setActiveArchStep(idx)}
                >
                  <div className="rail-line-connector">
                    <span className="rail-node-num font-mono">{step.num}</span>
                    <span className="rail-track-spine"></span>
                    <span className="material-symbols-outlined rail-node-icon">{step.icon}</span>
                  </div>

                  <div className="rail-stage-body">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="rail-stage-name font-mono">{step.title}</h3>
                      <span className="rail-stage-tag">{step.tag}</span>
                      <span className="rail-stage-badge">{step.badge}</span>
                    </div>
                    <p className="rail-stage-headline">{step.headline}</p>
                    <p className="rail-stage-desc">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connected Live Telemetry Inspector */}
          <div className="arch-live-inspector">
            <div className="inspector-top">
              <span className="font-mono text-xs font-bold text-[#0284C7] uppercase">
                STAGE {archSteps[activeArchStep].num} TELEMETRY PAYLOAD INSPECTOR
              </span>
              <span className="font-mono text-xs text-emerald-600 font-bold">
                ✓ {archSteps[activeArchStep].metric}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200 font-mono text-xs">
              <div>
                <span className="text-slate-400 font-bold block mb-1 uppercase text-[10px]">
                  INPUT STREAM:
                </span>
                <span className="text-slate-700">
                  {archSteps[activeArchStep].input}
                </span>
              </div>
              <div className="md:border-l md:border-slate-200 md:pl-4">
                <span className="text-slate-400 font-bold block mb-1 uppercase text-[10px]">
                  COMPUTED OUTPUT:
                </span>
                <span className="text-[#0284C7] font-semibold">
                  {archSteps[activeArchStep].output}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 05: TWO USERS. ONE GRAPH. (Passenger ↔ Operations)
          ============================================================ */}
      <section className="editorial-dual-section">
        <div className="editorial-dual-container">
          <div className="section-index-tag">03 / PERSPECTIVE</div>
          <h2 className="editorial-section-title">
            TWO USERS.<br />
            ONE SYSTEM.
          </h2>

          <div className="dual-stark-grid">
            {/* Passenger Side */}
            <div className="dual-stark-col stark-passenger">
              <div className="stark-header">
                <span className="stark-tag text-[#0284C7]">FOR PASSENGERS</span>
                <h3 className="stark-title">Know what's happening.</h3>
                <p className="stark-sub">
                  Clarity replaces platform anxiety. Understand exactly when your train will arrive and why delays occurred.
                </p>
              </div>

              <div className="stark-bullets font-mono text-xs">
                <div className="stark-bullet-item">
                  <span className="bullet-num">01</span>
                  <div>
                    <strong>Sub-Minute Predicted ETA:</strong> Continuously refined via live traction speed gradients.
                  </div>
                </div>
                <div className="stark-bullet-item">
                  <span className="bullet-num">02</span>
                  <div>
                    <strong>Transparent Delay Explanation:</strong> Clear plain-language cause (weather, freight hold, siding).
                  </div>
                </div>
                <div className="stark-bullet-item">
                  <span className="bullet-num">03</span>
                  <div>
                    <strong>Platform & Track Assignment:</strong> Real-time loop siding and platform allocation before arrival.
                  </div>
                </div>
                <div className="stark-bullet-item">
                  <span className="bullet-num">04</span>
                  <div>
                    <strong>99.4% Confidence Score:</strong> Explicit mathematical verification score shown on every journey.
                  </div>
                </div>
              </div>

              <Link
                to="/login?role=passenger"
                state={{ mode: 'user' }}
                className="stark-action-link text-[#0284C7]"
              >
                <span>Enter Passenger Portal</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            {/* Operations Side */}
            <div className="dual-stark-col stark-operations">
              <div className="stark-header">
                <span className="stark-tag text-amber-700">FOR SECTION CONTROLLERS</span>
                <h3 className="stark-title">Know what happens next.</h3>
                <p className="stark-sub">
                  Control replaces reactive triage. Resolve headway bottlenecks 6 hours before they materialize on the tracks.
                </p>
              </div>

              <div className="stark-bullets font-mono text-xs">
                <div className="stark-bullet-item">
                  <span className="bullet-num text-amber-700">01</span>
                  <div>
                    <strong>Sub-45ms Conflict Detection:</strong> Spatial interlocking and track switch contention checks.
                  </div>
                </div>
                <div className="stark-bullet-item">
                  <span className="bullet-num text-amber-700">02</span>
                  <div>
                    <strong>Delay Propagation Modeling:</strong> Forecast multi-division cascade impacts before granting precedence.
                  </div>
                </div>
                <div className="stark-bullet-item">
                  <span className="bullet-num text-amber-700">03</span>
                  <div>
                    <strong>Priority-Aware Siding Resolution:</strong> Autonomous loop line recommendations for Rajdhani / Vande Bharat.
                  </div>
                </div>
                <div className="stark-bullet-item">
                  <span className="bullet-num text-amber-700">04</span>
                  <div>
                    <strong>Explainable AI Advisories:</strong> Fully traceable rationale generated by fine-tuned Gemini reasoning.
                  </div>
                </div>
              </div>

              <Link
                to="/login?role=control_room"
                state={{ mode: 'control_room' }}
                className="stark-action-link text-amber-700"
              >
                <span>Enter OCC Control Room</span>
                <span className="material-symbols-outlined text-[16px]">lock</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 06: PRODUCT PROOF — ENOUGH THEORY. SEE THE NETWORK.
          ============================================================ */}
      <section className="editorial-proof-section">
        <div className="editorial-proof-container">
          <div className="section-index-tag">04 / LIVE OPERATIONAL INTERFACE</div>
          <h2 className="editorial-section-title">
            ENOUGH THEORY.<br />
            SEE THE NETWORK.
          </h2>
          <p className="editorial-body-copy max-w-[620px]">
            From raw axle pulses to explainable dispatch advisories — every decision is traceable, verifiable, and executable in real time.
          </p>

          {/* OCC Dispatch Advisory Pod Proof */}
          <div className="occ-advisory-proof-pod">
            <div className="proof-pod-topbar">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider">
                  OCC DISPATCH ADVISORY CONSOLE · LIVE TRUNK MONITOR
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950/90 px-2.5 py-0.5 rounded border border-emerald-800/60 font-semibold">
                +8m HEADWAY RECOVERED
              </span>
            </div>

            <div className="proof-pod-grid">
              <div className="proof-metric-row">
                <span className="text-slate-400">CORRIDOR SECTOR</span>
                <span className="font-mono text-white font-semibold">NDLS — CNB (Delhi–Kanpur Trunk)</span>
              </div>
              <div className="proof-metric-row">
                <span className="text-slate-400">MONITORED TRAINS</span>
                <span className="font-mono text-white font-semibold">52 Active · 5 Delayed</span>
              </div>
              <div className="proof-metric-row">
                <span className="text-slate-400">DETECTED CONTENTION</span>
                <span className="font-mono text-amber-400 font-semibold">ALJN Jn (Block Signal #14)</span>
              </div>
              <div className="proof-metric-row">
                <span className="text-slate-400">DISPATCH ADVISORY</span>
                <span className="font-mono text-cyan-300 font-bold">Hold #68716 on Siding 2 · Clear #12301</span>
              </div>
            </div>

            <div className="proof-ai-reasoning">
              <span className="font-mono text-[10px] text-emerald-400 font-bold block mb-1">
                AI OPERATIONAL REASONING:
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed font-mono m-0">
                "Freight rake #68716 is holding Main Line 1 at 45 km/h. Routing Rajdhani Express #12301 via Main Track and holding freight on Siding Loop 2 avoids a 14-minute cascade for 3 trailing passenger services."
              </p>
            </div>

            {/* Switch Health Matrix */}
            <div className="proof-switch-matrix">
              <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                <span className="text-slate-400 font-semibold">INTERLOCKING SWITCH HEALTH:</span>
                <span className="text-emerald-400 font-semibold">5/5 PASSING</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[10px] font-bold">
                <div className="p-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LO: OK
                </div>
                <div className="p-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  BL: OK
                </div>
                <div className="p-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PM: OK
                </div>
                <div className="p-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  TR: OK
                </div>
                <div className="p-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FR: OK
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 07: FINAL EDITORIAL CTA
          "THE RAILWAY IS ALWAYS MOVING. NOW YOUR INTELLIGENCE CAN MOVE WITH IT."
          ============================================================ */}
      <section className="editorial-cta-section">
        <div className="editorial-cta-container">
          <div className="statement-eyebrow">
            <span className="w-2 h-2 rounded-full bg-[#0284C7] animate-pulse"></span>
            <span>NEXT-GENERATION DEPLOYMENT</span>
          </div>

          <h2 className="editorial-cta-title">
            THE RAILWAY IS ALWAYS MOVING.<br />
            NOW YOUR INTELLIGENCE<br />
            CAN MOVE WITH IT.
          </h2>

          <p className="editorial-cta-sub">
            Move forward with confidence. Explore real-time predictive journey intelligence across 7,325+ stations.
          </p>

          <div className="editorial-cta-actions">
            <Link to="/user-dashboard" className="cta-btn-primary">
              <span className="material-symbols-outlined text-[18px]">radar</span>
              <span>Explore RailSense</span>
            </Link>
            <Link
              to="/login?role=control_room"
              state={{ mode: 'control_room' }}
              className="cta-btn-secondary"
            >
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <span>Control Room OCC Login</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER (Tactical OCC Daylight)
          ============================================================ */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#0284C7] text-[20px]">directions_railway</span>
              </div>
              <span className="footer-logo">
                Rail<span className="text-[#0284C7]">Sense</span>
              </span>
              <span className="font-mono text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded border border-slate-200">
                OCC v4.2.0
              </span>
            </div>
            <p className="footer-tagline">
              Indian Railways Network Intelligence & Tactical Operations Control Center (OCC).
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-col">
              <span className="footer-col-title">NAVIGATION</span>
              <Link to="/user-dashboard">Live Radar Map</Link>
              <Link to="/login?role=passenger" state={{ mode: 'user' }}>Passenger Portal</Link>
              <Link to="/login?role=control_room" state={{ mode: 'control_room' }}>Section Controller Login</Link>
            </div>
            <div className="footer-col">
              <span className="footer-col-title">OPERATIONS</span>
              <Link to="/user-dashboard">Station Search</Link>
              <Link to="/login?role=control_room" state={{ mode: 'control_room' }}>Conflict Manager</Link>
              <Link to="/login?role=control_room" state={{ mode: 'control_room' }}>Fleet Telemetry</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 RailSense Operations Team. Built for Smart India Hackathon 2026.</p>
          <div className="footer-status-pill">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[10px] font-bold">ALL OCC TELEMETRY SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
