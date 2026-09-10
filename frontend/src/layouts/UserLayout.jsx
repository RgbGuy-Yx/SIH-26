import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function UserLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('Logout error:', err);
    }
    navigate('/login', { replace: true });
  };

  const isLiveStatusActive = location.search.includes('tab=live-status');
  const isAboutActive = location.search.includes('tab=about');
  const isFindTrainsActive = !isLiveStatusActive && !isAboutActive;

  return (
    <div className="bg-[#F4F6F8] text-slate-800 font-sans antialiased min-h-screen flex flex-col selection:bg-[#0284C7] selection:text-white">
      {/* 1. Clean Top Navigation Header (Full-width edge-to-edge) */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-xs px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="w-full flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-6 lg:gap-8">
            <NavLink to="/user-dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#0284C7] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-slate-900 tracking-wider uppercase font-sans">
                  RailRadar
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-cyan-50 border border-cyan-200 text-[#00A3C4] rounded">
                  PASSENGER
                </span>
              </div>
            </NavLink>

            {/* Navigation Tabs (Find Trains, Live Status, About) */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink
                to="/user-dashboard"
                end
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${isFindTrainsActive
                  ? 'bg-[#0284C7] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">swap_calls</span>
                <span>Find Trains</span>
              </NavLink>

              <NavLink
                to="/user-dashboard?tab=live-status"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${isLiveStatusActive
                  ? 'bg-[#0284C7] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">sensors</span>
                <span>Live Status</span>
              </NavLink>

              <NavLink
                to="/user-dashboard?tab=about"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${isAboutActive
                  ? 'bg-[#0284C7] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span>About</span>
              </NavLink>
            </nav>
          </div>

          {/* Right Header Toolbar: Live Telemetry Indicator */}
          <div className="flex items-center gap-3">
            {/* Live Telemetry Beacon */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono font-bold text-emerald-800">
                GPS Feed Synced
              </span>
            </div>

            {currentUser && (
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Logout"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Workspace Content (Full-Bleed Responsive Grid) */}
      <main className="w-full pt-16 flex-1 bg-[#F4F6F8]">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
          <Outlet />
        </div>
      </main>


    </div>
  );
}

export default UserLayout;

