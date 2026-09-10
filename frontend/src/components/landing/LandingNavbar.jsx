import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/*
 * LandingNavbar — RailSense OCC Precision Navigation Header
 * Vercel Web Interface Guidelines compliant: semantic HTML, visible focus, ARIA labels, tabular-nums.
 */

export default function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  return (
    <nav className="landing-nav" aria-label="Main Navigation">
      <div className="landing-nav-inner">
        {/* Brand Logo */}
        <Link to="/" className="landing-nav-logo" aria-label="RailRadar Home">
          <div className="landing-logo-badge" aria-hidden="true">
            <span className="material-symbols-outlined text-[18px] text-sky-400" aria-hidden="true">
              radar
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="logo-rail text-white font-bold">Rail</span>
            <span className="logo-radar text-sky-400 font-extrabold">Radar</span>
            <span className="landing-logo-tag">OCC</span>
          </div>
        </Link>

        {/* Live Network Telemetry Status Pill */}
        <div className="landing-nav-status" role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true"></span>
          <span className="status-text font-mono text-[10px] tracking-wider text-emerald-400">NETWORK ACTIVE</span>
          <span className="status-sep text-slate-600" aria-hidden="true">·</span>
          <span className="status-sub font-mono text-[10px] text-slate-400 tabular-nums">7,325 STATIONS</span>
          <span className="status-sep text-slate-600" aria-hidden="true">·</span>
          <span className="status-sub font-mono text-[10px] text-slate-400 tabular-nums">&lt; 45ms BUS</span>
        </div>

        {/* Desktop Quick Links & CTAs */}
        <div className="landing-nav-actions hidden md:flex items-center gap-2.5">
          <Link
            to="/login?role=passenger"
            state={{ mode: 'user' }}
            className="nav-action-link"
          >
            <span className="material-symbols-outlined text-[15px] text-slate-400" aria-hidden="true">
              person
            </span>
            <span>Passenger Portal</span>
          </Link>
          <Link
            to="/login?role=control_room"
            state={{ mode: 'control_room' }}
            className="nav-btn-officer"
          >
            <span className="material-symbols-outlined text-[15px] text-amber-400" aria-hidden="true">
              lock
            </span>
            <span>Control Room OCC</span>
          </Link>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          className="landing-nav-menu-btn md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
        >
          <span className={`menu-bar ${menuOpen ? 'open' : ''}`} aria-hidden="true"></span>
          <span className={`menu-bar ${menuOpen ? 'open' : ''}`} aria-hidden="true"></span>
        </button>
      </div>

      {/* Mobile Dropdown Panel */}
      {menuOpen && (
        <div className="landing-nav-dropdown md:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          <div className="px-3 py-2 border-b border-white/[0.08] mb-2">
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true"></span>
              <span className="tabular-nums">7,325 STATIONS ONLINE</span>
            </div>
          </div>
          <Link
            to="/login?role=passenger"
            state={{ mode: 'user' }}
            className="landing-nav-link flex items-center gap-2"
            onClick={() => setMenuOpen(false)}
          >
            <span className="material-symbols-outlined text-[18px] text-sky-400" aria-hidden="true">
              person
            </span>
            <span>Passenger Portal</span>
          </Link>
          <div className="pt-2 mt-2 border-t border-white/[0.08]">
            <Link
              to="/login?role=control_room"
              state={{ mode: 'control_room' }}
              className="landing-nav-link flex items-center gap-2 text-amber-300 font-medium"
              onClick={() => setMenuOpen(false)}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                lock
              </span>
              <span>Control Room OCC</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
