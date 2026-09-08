import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSimulation } from '../context/SimulationContext';

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const {
    simulationTime,
    speedMultiplier,
    isRunning,
    isPaused,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    activeConflicts,
    wsConnected,
  } = useSimulation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('Logout error:', err);
    }
    navigate('/login', { replace: true });
  };

  // Format virtual simulation timestamp
  const formatSimTime = (isoString) => {
    if (!isoString) return '28 Aug, 06:00:00';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return (
        d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        }) +
        ', ' +
        d.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch {
      return isoString;
    }
  };

  const navItems = [
    {
      path: '/control-room',
      label: 'MAP VIEW',
      icon: 'map',
      badge: null,
    },
    {
      path: '/control-room/trains',
      label: 'TRAINS',
      icon: 'directions_railway',
      badge: null,
    },
    {
      path: '/control-room/alerts-and-conflicts',
      label: 'ALERTS & CONFLICTS',
      icon: 'warning',
      badge: activeConflicts && activeConflicts.length > 0 ? String(activeConflicts.length) : null,
    },
    {
      path: '/control-room/settings',
      label: 'SETTINGS',
      icon: 'settings',
      badge: null,
    },
  ];

  return (
    <div className="h-screen overflow-hidden bg-[#F4F6F8] text-slate-800 flex flex-col font-sans antialiased">
      {/* 1. Clean Top Navigation Header (Inspired by Konux reference design) */}
      <header className="shrink-0 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs z-40">
        {/* Left: Brand Mark + Primary Navigation Tabs */}
        <div className="flex items-center gap-6 md:gap-8 h-full">
          {/* Brand Logo */}
          <NavLink to="/control-room" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded bg-[#0284C7] flex items-center justify-center text-white shadow-xs">
              {/* Geometric clean polygon icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-slate-900 tracking-wider uppercase font-sans">
                RailRadar
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                OPS
              </span>
            </div>
          </NavLink>

          {/* Navigation Links (Horizontal minimal tab style) */}
          <nav className="flex items-center h-full gap-1 sm:gap-2">
            {navItems.map((item) => {
              const isActive =
                item.path === '/control-room'
                  ? location.pathname === '/control-room'
                  : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`h-full flex items-center gap-1.5 px-3 border-b-2 text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'border-[#0284C7] text-slate-950 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Right: Simulation Controls & Utility Toolbar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Simulation Clock & Controls */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
              title={wsConnected ? 'WebSocket Live Feed Synced' : 'Syncing Feed'}
            />
            <span className="font-mono text-slate-700 text-[11px]">
              {formatSimTime(simulationTime)}
            </span>
            <span className="font-mono text-[10px] font-bold px-1 rounded bg-slate-200/80 text-slate-700">
              {speedMultiplier}x
            </span>
          </div>

          {/* Mini Simulation Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={!isRunning || isPaused ? resumeSimulation : pauseSimulation}
              className={`p-1.5 rounded border text-xs font-semibold transition-all flex items-center justify-center ${
                !isRunning || isPaused
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={!isRunning || isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            >
              <span className="material-symbols-outlined text-[16px]">
                {!isRunning || isPaused ? 'play_arrow' : 'pause'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => resetSimulation()}
              className="p-1.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs transition-all"
              title="Reset Simulation Clock & Delays"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          {/* Language selector chip (like reference image EN ⌵) */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded cursor-pointer transition-colors">
            <span>EN</span>
            <span className="material-symbols-outlined text-[14px]">expand_more</span>
          </div>

          {/* User Profile Avatar & Logout */}
          <div className="flex items-center gap-2 pl-1">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[11px] font-bold text-slate-900 leading-tight">
                {currentUser?.officerId || 'RO-AG-1024'}
              </span>
              <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">
                {currentUser?.roleLabel || 'Control Officer'}
              </span>
            </div>
            <div
              className="w-7 h-7 rounded-full bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center font-bold text-xs border border-[#0284C7]/20 select-none"
              title={currentUser?.officerId || 'Officer'}
            >
              {currentUser?.avatar || 'CO'}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Logout from Control Room"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace Body */}
      <main className="flex-1 min-h-0 flex flex-col bg-[#F4F6F8] overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
