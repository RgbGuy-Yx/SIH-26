import React from 'react';
import { Link } from 'react-router-dom';

/*
 * HeroOverlay — RailRadar Cinematic 5-Stage Scroll Narrative Layer
 *
 * Implements design.md:
 *  - Bulletproof flex-based centering that never clips horizontally or vertically
 *  - 01 (0–25%): The Locomotive ("KNOW YOUR JOURNEY.")
 *  - 02 (25–45%): The Network Topology ("EVERY JOURNEY IS CONNECTED.")
 *  - 03 (45–65%): Disruption & Headway Cascade ("ONE DISRUPTION CAN RIPPLE...")
 *  - 04 (65–85%): RailRadar AI Intelligence ("RAILRADAR SEES THE CONNECTIONS.")
 *  - 05 (85–100%): Predictive Arrival 18:42 & Dual Action Gateway
 */

function stageOpacity(scroll, fadeIn, holdStart, holdEnd, fadeOut) {
  if (scroll < fadeIn) return 0;
  if (scroll < holdStart) return (scroll - fadeIn) / (holdStart - fadeIn);
  if (scroll <= holdEnd) return 1;
  if (scroll < fadeOut) return 1 - (scroll - holdEnd) / (fadeOut - holdEnd);
  return 0;
}

export default function HeroOverlay({ scrollProgress = 0 }) {
  const s = scrollProgress;

  // 0–25%: Stage 01 — The Locomotive
  const s1Opacity = stageOpacity(s, -0.01, 0, 0.16, 0.23);

  // 25–45%: Stage 02 — The Network Topology
  const s2Opacity = stageOpacity(s, 0.25, 0.29, 0.38, 0.43);

  // 45–65%: Stage 03 — Disruption & Headway Cascade
  const s3Opacity = stageOpacity(s, 0.45, 0.49, 0.58, 0.63);

  // 65–85%: Stage 04 — RailRadar AI Intelligence Stack
  const s4Opacity = stageOpacity(s, 0.65, 0.69, 0.78, 0.83);

  // 85–100%: Stage 05 — Tactical ETA & Departure Gateways
  const s5Opacity = stageOpacity(s, 0.85, 0.89, 0.98, 1.05);

  return (
    <div className="landing-text-layer">
      {/* ============================================================
          Stage 01 (0–25%): The Train — KNOW YOUR JOURNEY
          ============================================================ */}
      {s1Opacity > 0.01 && (
        <div
          className="landing-text-section landing-hero"
          style={{
            opacity: s1Opacity,
            transform: `translateY(${(1 - s1Opacity) * 20}px)`,
          }}
        >
          <div className="landing-hero-inner">
            {/* Live Telemetry Pill */}
            <div className="hero-telemetry-badge">
              <span className="telemetry-beacon"></span>
              <span className="font-mono text-sky-400 font-semibold tracking-wider text-[10px] sm:text-[11px]">
                CORRIDOR SATELLITE TELEMETRY
              </span>
              <span className="text-slate-500 text-[10px]">·</span>
              <span className="font-mono text-slate-300 text-[10px] sm:text-[11px]">
                NDLS → HWH #12301
              </span>
            </div>

            <h1 className="landing-hero-title">
              KNOW YOUR<br />JOURNEY.
            </h1>
            <p className="landing-hero-sub">
              Sub-second predictive intelligence and real-time network telemetry for Indian Railways.
            </p>

            <div className="landing-hero-scroll-hint">
              <div className="scroll-indicator">
                <div className="scroll-dot"></div>
              </div>
              <span className="font-mono text-[10px] sm:text-[11px] tracking-widest text-slate-400 uppercase">
                Scroll to explore network
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          Stage 02 (25–45%): The Network — EVERY JOURNEY IS CONNECTED
          ============================================================ */}
      {s2Opacity > 0.01 && (
        <div
          className="landing-text-section landing-stage-center"
          style={{
            opacity: s2Opacity,
            transform: `translateY(${(1 - s2Opacity) * 16}px)`,
          }}
        >
          <div className="stage-content-card">
            <div className="stage-header-pill stage-pill-azure">
              <span className="material-symbols-outlined text-[13px] sm:text-[14px]">hub</span>
              <span>TOPOLOGICAL MESH</span>
            </div>

            <h2 className="landing-stage-heading">
              EVERY JOURNEY<br />IS CONNECTED.
            </h2>

            <div className="network-stat-chips">
              <span className="stat-chip">
                <strong className="text-white font-mono">7,325+</strong> Stations
              </span>
              <span className="stat-chip-divider">·</span>
              <span className="stat-chip">
                <strong className="text-white font-mono">13,520+</strong> Daily Trains
              </span>
              <span className="stat-chip-divider">·</span>
              <span className="stat-chip">
                <strong className="text-white font-mono">68,000 km</strong> Track
              </span>
            </div>

            <p className="landing-stage-sub">
              One national railway. Millions of interconnected passenger and freight movements.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================
          Stage 03 (45–65%): Disruption — ONE DISRUPTION CAN RIPPLE
          ============================================================ */}
      {s3Opacity > 0.01 && (
        <div
          className="landing-text-section landing-stage-center"
          style={{
            opacity: s3Opacity,
            transform: `translateY(${(1 - s3Opacity) * 16}px)`,
          }}
        >
          <div className="stage-content-card">
            <div className="stage-header-pill stage-pill-amber">
              <span className="material-symbols-outlined text-[13px] sm:text-[14px]">warning</span>
              <span>HEADWAY & INTERLOCKING CONTENTION</span>
            </div>

            <h2 className="landing-stage-heading">
              ONE DISRUPTION<br />
              CAN RIPPLE<br />
              <span className="text-gradient-amber">ACROSS THE NETWORK.</span>
            </h2>

            <div className="disruption-alert-card">
              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0"></span>
                  <span className="font-mono text-[10px] sm:text-[11px] font-bold text-amber-300">
                    SECTION CNB-PRYJ · BLOCK #42
                  </span>
                </div>
                <span className="font-mono text-[10px] text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40">
                  +24m CASCADE RISK
                </span>
              </div>
              <p className="text-[11px] sm:text-[12px] text-slate-300 leading-relaxed m-0">
                Freight rake holding main line causes trailing Rajdhani deceleration. Loop line standby required to prevent corridor deadlock.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          Stage 04 (65–85%): RailRadar AI — DETECT · PREDICT · RESOLVE · REROUTE
          ============================================================ */}
      {s4Opacity > 0.01 && (
        <div
          className="landing-text-section landing-stage-center"
          style={{
            opacity: s4Opacity,
            transform: `translateY(${(1 - s4Opacity) * 16}px)`,
          }}
        >
          <div className="stage-content-card">
            {/* Tactical Workflow Sequence */}
            <div className="sequence-badge-flow">
              <span className="seq-step seq-done">
                <span className="material-symbols-outlined text-[12px] mr-1">sensors</span>
                DETECT
              </span>
              <span className="seq-arrow">&rarr;</span>
              <span className="seq-step seq-done">
                <span className="material-symbols-outlined text-[12px] mr-1">analytics</span>
                PREDICT
              </span>
              <span className="seq-arrow">&rarr;</span>
              <span className="seq-step seq-active">
                <span className="material-symbols-outlined text-[12px] mr-1">tune</span>
                RESOLVE
              </span>
              <span className="seq-arrow">&rarr;</span>
              <span className="seq-step seq-active">
                <span className="material-symbols-outlined text-[12px] mr-1">alt_route</span>
                REROUTE
              </span>
            </div>

            <h2 className="landing-stage-heading">
              RAILRADAR SEES<br />
              <span className="text-gradient-cyan">THE CONNECTIONS.</span>
            </h2>

            <div className="ai-insight-strip">
              <div className="ai-insight-item">
                <span className="text-slate-400 text-[9px] sm:text-[10px] font-mono uppercase">ALGORITHM</span>
                <span className="text-sky-300 text-[11px] sm:text-[12px] font-mono font-semibold">GNN + XGBoost</span>
              </div>
              <div className="ai-insight-divider"></div>
              <div className="ai-insight-item">
                <span className="text-slate-400 text-[9px] sm:text-[10px] font-mono uppercase">PERMUTATIONS</span>
                <span className="text-emerald-300 text-[11px] sm:text-[12px] font-mono font-semibold">10,000+ / sec</span>
              </div>
              <div className="ai-insight-divider"></div>
              <div className="ai-insight-item">
                <span className="text-slate-400 text-[9px] sm:text-[10px] font-mono uppercase">ACTION</span>
                <span className="text-cyan-300 text-[11px] sm:text-[12px] font-mono font-semibold">Loop 2 Precedence</span>
              </div>
            </div>

            <p className="landing-stage-sub uppercase tracking-wider font-mono text-[11px] sm:text-[12px] text-slate-300 mt-2">
              PREDICT. RESOLVE. REROUTE.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================
          Stage 05 (85–100%): Forward — Arrival 18:42 & Dual Gateway
          Adaptive layout that is 100% visible on all viewports
          ============================================================ */}
      {s5Opacity > 0.01 && (
        <div
          className="landing-text-section landing-final-stage"
          style={{
            opacity: s5Opacity,
            transform: `translateY(${(1 - s5Opacity) * 16}px)`,
          }}
        >
          <div className="landing-final-grid">
            {/* Left Column: Heading & Action Buttons */}
            <div className="landing-final-left">
              <div className="stage-header-pill stage-pill-azure mb-1.5 sm:mb-2">
                <span className="material-symbols-outlined text-[13px] sm:text-[14px]">speed</span>
                <span>SUB-MINUTE PREDICTIVE ETA</span>
              </div>

              <h2 className="landing-final-heading">
                KNOW WHEN<br />
                YOU'LL ARRIVE.
              </h2>

              <p className="landing-final-sub">
                <strong className="text-white">UNDERSTAND WHY.</strong><br />
                Move forward with confidence across the Indian Railways network.
              </p>

              {/* Action Buttons */}
              <div className="landing-final-actions">
                <Link
                  to="/login?role=passenger"
                  state={{ mode: 'user' }}
                  className="landing-btn landing-btn-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  <span>EXPLORE PASSENGER PORTAL</span>
                </Link>
                <Link
                  to="/login?role=control_room"
                  state={{ mode: 'control_room' }}
                  className="landing-btn landing-btn-secondary"
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>CONTROL ROOM OCC</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Tactical OCC ETA Card */}
            <div className="landing-final-right">
              <div className="eta-card-tactical">
                {/* Header */}
                <div className="eta-card-tactical__header">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
                    <span className="font-mono text-[10px] sm:text-[12px] font-bold text-white tracking-wide">
                      TRAIN #12301 · RAJDHANI EXP
                    </span>
                  </div>
                  <span className="eta-card-badge-live">LIVE TELEMETRY</span>
                </div>

                {/* Main Arrival Display */}
                <div className="eta-card-tactical__time-row">
                  <div>
                    <span className="text-[8px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                      PREDICTED DESTINATION ARRIVAL
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                        18:42
                      </span>
                      <span className="font-mono text-[10px] sm:text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-1.5 sm:px-2 py-0.5 rounded border border-emerald-800/60">
                        +2m PREDICTED
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                      DESTINATION
                    </span>
                    <span className="font-mono text-[11px] sm:text-sm font-bold text-sky-300">
                      HOWRAH JN (HWH)
                    </span>
                  </div>
                </div>

                {/* 4-Column OCC Metric Strip (design.md Section 5.4) */}
                <div className="grid grid-cols-4 gap-1 p-1 sm:p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-center my-1.5 sm:my-2.5">
                  <div>
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase block">STATUS</span>
                    <span className="text-[9px] sm:text-[11px] font-mono font-bold text-emerald-400">ON TRACK</span>
                  </div>
                  <div className="border-l border-slate-800">
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase block">SPEED</span>
                    <span className="text-[9px] sm:text-[11px] font-mono font-bold text-sky-300">128 km/h</span>
                  </div>
                  <div className="border-l border-slate-800">
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase block">PLATFORM</span>
                    <span className="text-[9px] sm:text-[11px] font-mono font-bold text-cyan-300">PF 09</span>
                  </div>
                  <div className="border-l border-slate-800">
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase block">CONFIDENCE</span>
                    <span className="text-[9px] sm:text-[11px] font-mono font-bold text-emerald-400">99.4%</span>
                  </div>
                </div>

                {/* Multi-Segment Switch Health */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                  <span className="text-[8px] sm:text-[10px] font-mono text-slate-400">SWITCH HEALTH</span>
                  <div className="flex items-center gap-1 font-mono text-[8px] sm:text-[9px] font-bold">
                    <span className="px-1 py-0.5 rounded-[2px] bg-emerald-400/20 text-emerald-300 border border-emerald-500/30">LO: OK</span>
                    <span className="px-1 py-0.5 rounded-[2px] bg-emerald-400/20 text-emerald-300 border border-emerald-500/30">BL: OK</span>
                    <span className="px-1 py-0.5 rounded-[2px] bg-emerald-400/20 text-emerald-300 border border-emerald-500/30">PM: OK</span>
                    <span className="px-1 py-0.5 rounded-[2px] bg-emerald-400/20 text-emerald-300 border border-emerald-500/30">TR: OK</span>
                    <span className="px-1 py-0.5 rounded-[2px] bg-emerald-400/20 text-emerald-300 border border-emerald-500/30">FR: OK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
