import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    {
      path: '/control-room',
      label: 'Live Map',
      icon: 'radar',
      badge: null
    },
    {
      path: '/control-room/trains',
      label: 'Trains',
      icon: 'directions_railway',
      badge: null
    },
    {
      path: '/control-room/alerts-and-conflicts',
      label: 'Alerts & Conflicts',
      icon: 'warning',
      badge: '7',
      badgeColor: 'bg-error-container text-on-error-container'
    },
    {
      path: '/control-room/settings',
      label: 'Settings',
      icon: 'settings',
      badge: null
    }
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans antialiased">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.4)] border-r border-slate-800/60">
        <div className="flex flex-col">
          {/* Logo & Ops Node */}
          <div className="h-16 px-4 flex items-center gap-3 bg-surface-container-lowest border-b border-slate-800/40">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow-[0_0_12px_rgba(46,92,230,0.35)]">
              <span className="material-symbols-outlined text-[20px]">train</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-on-surface tracking-tight uppercase">RailRadar</span>
              <span className="text-[11px] font-mono text-outline tracking-wider uppercase">
                {currentUser?.badge || 'Ops Node 01'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 p-3 mt-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${isActive
                      ? 'bg-primary-container text-on-primary-container font-semibold shadow-[0_0_12px_rgba(46,92,230,0.35)]'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${item.badgeColor || 'bg-blue-900 text-blue-200'}`}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Brand Badge */}
        <div className="p-3 m-3 rounded-lg bg-surface-container-low border border-slate-800/60">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0">shield</span>
            <p className="text-xs text-outline leading-tight">
              Indian Railways — Control Room Ops Operations Active.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pl-64 flex-1 flex flex-col">
        {/* Top Header Bar */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-low/95 backdrop-blur-xl z-40 px-6 flex items-center justify-between border-b border-slate-800/60 shadow-[0_1px_8px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">tram</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-on-surface uppercase tracking-tight">Indian Railways</span>
                <span className="px-2 py-0.5 rounded-lg bg-secondary-container text-on-secondary-container text-[11px] uppercase tracking-wider font-semibold">
                  Control Room Mode
                </span>
              </div>
              <span className="text-xs text-outline">Tactical Rail Control Operations Center</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Simulation Time Clock */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-slate-800 text-xs font-mono text-on-surface">
              <span className="material-symbols-outlined text-primary text-[18px]">schedule</span>
              <span>12 Dec 2024, 14:32:10</span>
              <span className="text-[11px] font-mono text-tertiary px-1.5 py-0.5 rounded bg-surface-container-high">(4x speed)</span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-bright transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">pause</span>
                <span>Pause</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error-container text-on-error-container text-xs font-semibold hover:bg-error transition-all shadow-[0_0_10px_rgba(229,72,77,0.3)]"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>Reset</span>
              </button>
            </div>

            {/* Controller Profile & Logout */}
            <div className="pl-3 border-l border-slate-800 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center text-xs border border-blue-500/40">
                  {currentUser?.avatar || 'CTL'}
                </div>
                <div className="hidden lg:flex flex-col text-xs">
                  <span className="font-semibold text-on-surface">{currentUser?.name || 'Controller'}</span>
                  <span className="text-[10px] text-outline font-mono">{currentUser?.id || 'CTL-8041'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-error-container text-on-surface hover:text-on-error-container text-xs font-medium border border-slate-800 transition-all"
                title="Logout from Control Room"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Route Page Body */}
        <main className="pt-16 flex-1 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
