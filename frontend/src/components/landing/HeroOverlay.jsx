import React from 'react';
import { Link } from 'react-router-dom';

/*
 * HeroOverlay — RailSense 5-Stage Scroll Narrative Layer
 * Vercel Web Interface Guidelines: restrained copy, text-wrap: balance, tabular-nums, accessible icons.
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

  // 0–25%: Stage 01 — Overview & Precision Dispatch
  const s1Opacity = stageOpacity(s, -0.01, 0, 0.16, 0.23);

  // 25–45%: Stage 02 — Network Topology
  const s2Opacity = stageOpacity(s, 0.25, 0.29, 0.38, 0.43);

  // 45–65%: Stage 03 — Contention & Delay Dynamics
  const s3Opacity = stageOpacity(s, 0.45, 0.49, 0.58, 0.63);

  // 65–85%: Stage 04 — Siding Arbitration Engine
  const s4Opacity = stageOpacity(s, 0.65, 0.69, 0.78, 0.83);

  // 85–100%: Stage 05 — Precision ETA & Dual Gateways
  const s5Opacity = stageOpacity(s, 0.85, 0.89, 0.98, 1.05);

  return (
    <div className="landing-text-layer">
      {/* ============================================================
          Stage 01 (0–25%): The Train & Network Premise
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
            <div className="hero-telemetry-badge" role="status">
              <span className="telemetry-beacon" aria-hidden="true"></span>
              <span className="font-mono text-sky-400 font-medium tracking-wide text-[10px] sm:text-[11px] uppercase">
                TACTICAL OCC
              </span>
              <span className="text-slate-600 text-[10px]" aria-hidden="true">·</span>
              <span className="font-mono text-slate-300 text-[10px] sm:text-[11px] tabular-nums">
                NDLS → HWH TRUNK CORRIDOR
              </span>
            </div>

            <h1 className="landing-hero-title">
              Line-clear certainty.<br />Real-time network telemetry.
            </h1>
            <p className="landing-hero-sub">
              Sub-minute headway modeling, live axle-counter telemetry, and automated loop siding arbitration across 7,325 stations on Indian Railways.
            </p>

            <div className="landing-hero-scroll-hint" aria-hidden="true">
              <div className="scroll-indicator">
                <div className="scroll-dot"></div>
              </div>
              <span className="font-mono text-[10px] sm:text-[11px] tracking-wider text-slate-400">
                Scroll to trace corridor dispatch
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          Stage 02 (25–45%): Network Interconnection
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
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">hub</span>
              <span>TOPOLOGICAL GRAPH MESH</span>
            </div>

            <h2 className="landing-stage-heading">
              Coupled block sections across 7,325 stations.
            </h2>

            <div className="network-stat-chips tabular-nums">
              <span className="stat-chip">
                <strong className="text-white font-mono">7,325</strong> Stations
              </span>
              <span className="stat-chip-divider" aria-hidden="true">·</span>
              <span className="stat-chip">
                <strong className="text-white font-mono">13,520+</strong> Daily Services
              </span>
              <span className="stat-chip-divider" aria-hidden="true">·</span>
              <span className="stat-chip">
                <strong className="text-white font-mono">&lt; 38ms</strong> Query Bus
              </span>
            </div>

            <p className="landing-stage-sub">
              Delays are structural, not isolated. A 12-minute freight hold on the Kanpur–Prayagraj trunk ripples through three adjacent divisions within 45 minutes.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================
          Stage 03 (45–65%): Cascade Dynamics
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
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">warning</span>
              <span>HEADWAY CONTENTION DETECTED</span>
            </div>

            <h2 className="landing-stage-heading">
              Bottlenecks identified before signals lock.
            </h2>

            <div className="disruption-alert-card" role="alert">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true"></span>
                  <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-amber-200">
                    SECTION CNB–PRYJ · BLOCK SIGNAL #42
                  </span>
                </div>
                <span className="font-mono text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 tabular-nums">
                  +18m CASCADE RISK
                </span>
              </div>
              <p className="text-[11px] sm:text-[12px] text-slate-300 leading-relaxed m-0 font-mono">
                Freight #68716 (42 km/h) occupying single line. Trailing Rajdhani #12301 (128 km/h) closing distance. Siding bypass required at Aligarh Jn.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          Stage 04 (65–85%): RailSense Arbitration Stack
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
            <div className="sequence-badge-flow" aria-label="Resolution pipeline stages">
              <span className="seq-step seq-done font-mono text-[10px]">
                <span className="material-symbols-outlined text-[12px] mr-1" aria-hidden="true">sensors</span>
                01 SENSE
              </span>
              <span className="seq-arrow text-slate-600" aria-hidden="true">&rarr;</span>
              <span className="seq-step seq-done font-mono text-[10px]">
                <span className="material-symbols-outlined text-[12px] mr-1" aria-hidden="true">analytics</span>
                02 PREDICT
              </span>
              <span className="seq-arrow text-slate-600" aria-hidden="true">&rarr;</span>
              <span className="seq-step seq-active font-mono text-[10px]">
                <span className="material-symbols-outlined text-[12px] mr-1" aria-hidden="true">tune</span>
                03 ARBITRATE
              </span>
              <span className="seq-arrow text-slate-600" aria-hidden="true">&rarr;</span>
              <span className="seq-step seq-active font-mono text-[10px]">
                <span className="material-symbols-outlined text-[12px] mr-1" aria-hidden="true">sync_alt</span>
                04 INFORM
              </span>
            </div>

            <h2 className="landing-stage-heading">
              Preemptive loop siding allocation in &lt; 38 ms.
            </h2>

            <div className="ai-insight-strip tabular-nums">
              <div className="ai-insight-item">
                <span className="text-slate-400 text-[9px] sm:text-[10px] font-mono uppercase">SEARCH TIME</span>
                <span className="text-sky-300 text-[11px] sm:text-[12px] font-mono font-semibold">&lt; 38 ms</span>
              </div>
              <div className="ai-insight-divider" aria-hidden="true"></div>
              <div className="ai-insight-item">
                <span className="text-slate-400 text-[9px] sm:text-[10px] font-mono uppercase">ARBITRATION</span>
                <span className="text-slate-200 text-[11px] sm:text-[12px] font-mono font-semibold">Hold Freight Loop 2</span>
              </div>
              <div className="ai-insight-divider" aria-hidden="true"></div>
              <div className="ai-insight-item">
                <span className="text-slate-400 text-[9px] sm:text-[10px] font-mono uppercase">HEADWAY PRESERVED</span>
                <span className="text-emerald-400 text-[11px] sm:text-[12px] font-mono font-semibold">+14 min saved</span>
              </div>
            </div>

            <p className="landing-stage-sub font-mono text-[11px] sm:text-[12px] text-slate-400 mt-3">
              Route conflict resolved topologically before physical switch interlocking locks.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================
          Stage 05 (85–100%): Tactical ETA & Portals
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
              <div className="stage-header-pill stage-pill-azure mb-2">
                <span className="material-symbols-outlined text-[13px]" aria-hidden="true">speed</span>
                <span>SUB-MINUTE PREDICTIVE ETA</span>
              </div>

              <h2 className="landing-final-heading">
                Arrive with certainty.<br />Understand why.
              </h2>

              <p className="landing-final-sub">
                Clear, explainable journey forecasts for passengers and tactical decision support for section controllers.
              </p>

              {/* Action Buttons */}
              <div className="landing-final-actions">
                <Link
                  to="/user-dashboard"
                  className="landing-btn landing-btn-primary"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">person</span>
                  <span>Passenger Portal</span>
                </Link>
                <Link
                  to="/login?role=control_room"
                  state={{ mode: 'control_room' }}
                  className="landing-btn landing-btn-secondary"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">lock</span>
                  <span>Control Room OCC</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Tactical OCC ETA Card */}
            <div className="landing-final-right">
              <div className="eta-card-tactical">
                {/* Header */}
                <div className="eta-card-tactical__header">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true"></span>
                    <span className="font-mono text-[11px] sm:text-[12px] font-semibold text-white tracking-wide">
                      TRAIN #12301 · RAJDHANI EXP
                    </span>
                  </div>
                  <span className="eta-card-badge-live">LIVE TELEMETRY</span>
                </div>

                {/* Main Arrival Display */}
                <div className="eta-card-tactical__time-row">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
                      PREDICTED DESTINATION ARRIVAL
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="font-mono text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight tabular-nums">
                        18:42
                      </span>
                      <span className="font-mono text-[10px] sm:text-xs font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 tabular-nums">
                        +2m PREDICTED
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
                      DESTINATION
                    </span>
                    <span className="font-mono text-[11px] sm:text-sm font-semibold text-sky-300">
                      HOWRAH JN (HWH)
                    </span>
                  </div>
                </div>

                {/* 4-Column OCC Metric Strip */}
                <div className="grid grid-cols-4 gap-1 p-2 rounded-lg bg-black/40 border border-white/[0.06] text-center my-2 tabular-nums">
                  <div>
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase block">STATUS</span>
                    <span className="text-[10px] sm:text-[11px] font-mono font-medium text-emerald-400">ON TRACK</span>
                  </div>
                  <div className="border-l border-white/[0.06]">
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase block">SPEED</span>
                    <span className="text-[10px] sm:text-[11px] font-mono font-medium text-sky-300">128&nbsp;km/h</span>
                  </div>
                  <div className="border-l border-white/[0.06]">
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase block">PLATFORM</span>
                    <span className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-200">PF 09</span>
                  </div>
                  <div className="border-l border-white/[0.06]">
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase block">CONFIDENCE</span>
                    <span className="text-[10px] sm:text-[11px] font-mono font-medium text-emerald-400">99.4%</span>
                  </div>
                </div>

                {/* Multi-Segment Switch Health */}
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <span className="text-[9px] sm:text-[10px] font-mono text-slate-400">SWITCH INTERLOCKING</span>
                  <div className="flex items-center gap-1 font-mono text-[8px] sm:text-[9px]">
                    <span className="px-1.5 py-0.5 rounded-[3px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LO: OK</span>
                    <span className="px-1.5 py-0.5 rounded-[3px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">BL: OK</span>
                    <span className="px-1.5 py-0.5 rounded-[3px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">PM: OK</span>
                    <span className="px-1.5 py-0.5 rounded-[3px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">TR: OK</span>
                    <span className="px-1.5 py-0.5 rounded-[3px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">FR: OK</span>
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
