import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/*
 * LandingNavbar — RailRadar OCC Transparent Navigation Header
 * Matches design.md Section 2 (Deep Radar tokens), Section 3 (Typography) & Section 5.1
 */

export default function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="landing-nav">
      <div className="landing-nav-inner">
        {/* Brand Logo */}
        <Link to="/" className="landing-nav-logo" aria-label="RailRadar Home">
          <div className="landing-logo-badge">
            <span className="material-symbols-outlined text-[20px] text-sky-400">directions_railway</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="logo-rail">Rail</span>
            <span className="logo-radar">Radar</span>
            <span className="landing-logo-tag">OCC</span>
          </div>
        </Link>

        {/* Live Network Telemetry Status Pill */}
        <div className="landing-nav-status">
          <span className="status-dot"></span>
          <span className="status-text">NETWORK LIVE</span>
          <span className="status-sep">·</span>
          <span className="status-sub">24 FPS HD · SUB-45ms</span>
        </div>

        {/* Desktop Quick Links & CTAs */}
        <div className="landing-nav-actions hidden md:flex items-center gap-3">
          <Link
            to="/login?role=passenger"
            state={{ mode: 'user' }}
            className="nav-action-link"
          >
            <span className="material-symbols-outlined text-[16px] text-cyan-400">person</span>
            <span>Passenger Portal</span>
          </Link>
          <Link
            to="/login?role=control_room"
            state={{ mode: 'control_room' }}
            className="nav-btn-officer"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-400">lock</span>
            <span>Control Room OCC</span>
          </Link>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          className="landing-nav-menu-btn md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span className={`menu-bar ${menuOpen ? 'open' : ''}`}></span>
          <span className={`menu-bar ${menuOpen ? 'open' : ''}`}></span>
        </button>
      </div>

      {/* Mobile Dropdown Panel */}
      {menuOpen && (
        <div className="landing-nav-dropdown md:hidden">
          <div className="px-3 py-2 border-b border-slate-800/80 mb-2">
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>NETWORK ONLINE · 7,325 STATIONS</span>
            </div>
          </div>
          <Link
            to="/login?role=passenger"
            state={{ mode: 'user' }}
            className="landing-nav-link flex items-center gap-2"
            onClick={() => setMenuOpen(false)}
          >
            <span className="material-symbols-outlined text-[18px] text-cyan-400">person</span>
            <span>Passenger Login & Portal</span>
          </Link>
          <div className="pt-2 mt-2 border-t border-slate-800/80">
            <Link
              to="/login?role=control_room"
              state={{ mode: 'control_room' }}
              className="landing-nav-link flex items-center gap-2 text-amber-300 font-semibold"
              onClick={() => setMenuOpen(false)}
            >
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <span>Control Room OCC Login</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
