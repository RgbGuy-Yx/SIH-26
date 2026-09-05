import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function UserLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="bg-[#f9f9ff] text-[#111c2d] font-sans antialiased min-h-screen flex flex-col">
      {/* Stitch Passenger View Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#d8e2ff] border border-blue-200 flex items-center justify-center text-[#00397f] shadow-sm">
                <span className="material-symbols-outlined text-[24px]">train</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-[#00397f] leading-tight tracking-tight uppercase">
                  Indian Railways
                </span>
                <span className="text-[11px] text-[#424752] leading-tight">
                  Safe Journeys. A Connected India.
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              <NavLink
                to="/user-dashboard"
                end
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#0b4fa8] text-white shadow-sm'
                      : 'text-[#424752] hover:text-[#111c2d] hover:bg-[#f0f3ff]'
                  }`
                }
              >
                Check Train
              </NavLink>

              <NavLink
                to="/user-dashboard?tab=live-status"
                className={() =>
                  `px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    location.search.includes('tab=live-status')
                      ? 'bg-[#0b4fa8] text-white shadow-sm'
                      : 'text-[#424752] hover:text-[#111c2d] hover:bg-[#f0f3ff]'
                  }`
                }
              >
                Live Status
              </NavLink>

              <NavLink
                to="/user-dashboard?tab=about"
                className={() =>
                  `px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    location.search.includes('tab=about')
                      ? 'bg-[#0b4fa8] text-white shadow-sm'
                      : 'text-[#424752] hover:text-[#111c2d] hover:bg-[#f0f3ff]'
                  }`
                }
              >
                About
              </NavLink>
            </nav>
          </div>

          {/* Passenger Badge & User Profile */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end px-3 py-1.5 bg-[#f0f3ff] rounded-xl border border-blue-100/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-[#00397f]">Passenger View</span>
              </div>
              <span className="text-[10px] text-[#424752] font-mono">
                Real-time information for your journey
              </span>
            </div>

            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-[#111c2d] hover:text-rose-700 text-xs font-semibold border border-slate-200 transition-all"
                title="Logout"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span className="hidden sm:inline">Logout</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#00397f] hover:bg-[#0b4fa8] text-white text-xs font-semibold transition-all shadow-sm"
                title="Login"
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                <span className="hidden sm:inline">Control Room</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="w-full pt-20 flex-1 bg-[#f9f9ff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-[#737783]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00397f] text-[18px]">verified</span>
            <span className="text-[#111c2d] font-medium">Indian Railways • RailRadar Network Intelligence Platform</span>
          </div>
          <span className="font-mono text-[11px] text-[#00452e] font-semibold">
            Real-time GPS Telemetry & Predictive AI Dispatch Engine
          </span>
        </div>
      </footer>
    </div>
  );
}

export default UserLayout;
