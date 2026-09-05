import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { currentUser, login, quickLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeRole, setActiveRole] = useState('control_room');
  const [username, setUsername] = useState('control');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Target path from location state or role default
  const fromPath = location.state?.from?.pathname;

  useEffect(() => {
    if (currentUser) {
      if (fromPath) {
        navigate(fromPath, { replace: true });
      } else if (currentUser.role === 'control_room') {
        navigate('/control-room', { replace: true });
      } else {
        navigate('/user-dashboard', { replace: true });
      }
    }
  }, [currentUser, navigate, fromPath]);

  const handleRoleSwitch = (role) => {
    setActiveRole(role);
    setErrorMsg('');
    if (role === 'control_room') {
      setUsername('control');
      setPassword('admin');
    } else {
      setUsername('user');
      setPassword('user');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      const res = login(activeRole, username, password);
      setLoading(false);
      if (res.success) {
        const redirectPath = fromPath || (activeRole === 'control_room' ? '/control-room' : '/user-dashboard');
        navigate(redirectPath, { replace: true });
      } else {
        setErrorMsg(res.message);
      }
    }, 350);
  };

  const handleQuickDemo = (role) => {
    setErrorMsg('');
    setLoading(true);
    setTimeout(() => {
      const res = quickLogin(role);
      setLoading(false);
      if (res.success) {
        const redirectPath = fromPath || (role === 'control_room' ? '/control-room' : '/user-dashboard');
        navigate(redirectPath, { replace: true });
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col justify-center items-center relative overflow-hidden font-sans p-4">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-slate-700/80 flex items-center justify-center text-primary shadow-[0_0_24px_rgba(46,92,230,0.45)] mb-3">
            <span className="material-symbols-outlined text-[32px]">train</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-wide uppercase">RailRadar Authentication</h1>
          <p className="text-xs text-outline mt-1 font-mono tracking-wider">
            INDIAN RAILWAYS NETWORK INTELLIGENCE PLATFORM
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="bg-surface-container-lowest p-1.5 rounded-xl border border-slate-800 flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => handleRoleSwitch('control_room')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeRole === 'control_room'
                ? 'bg-primary text-on-primary-container shadow-[0_0_12px_rgba(46,92,230,0.35)]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">shield</span>
            <span>Control Room Operator</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch('user')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeRole === 'user'
                ? 'bg-primary text-on-primary-container shadow-[0_0_12px_rgba(46,92,230,0.35)]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span>Passenger Account</span>
          </button>
        </div>

        {/* Card */}
        <div className="bg-surface-container-low/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-5">
          <div className="p-4 rounded-xl bg-surface-container-high/60 border border-slate-800 flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-[24px] shrink-0 mt-0.5">
              {activeRole === 'control_room' ? 'local_police' : 'badge'}
            </span>
            <div className="text-xs">
              <h2 className="font-bold text-on-surface uppercase tracking-tight">
                {activeRole === 'control_room' ? 'Railway Control Room Access' : 'Passenger Access Portal'}
              </h2>
              <p className="text-outline text-[11px] mt-0.5 leading-snug">
                {activeRole === 'control_room'
                  ? 'Real-time train dispatching, AI telemetry pipeline & section conflict engine.'
                  : 'Track trains, live status, platform guides & personal travel notifications.'}
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-error-container/80 border border-error/50 text-on-error-container text-xs flex items-center gap-2 animate-shake">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-outline uppercase tracking-wider mb-1.5">
                {activeRole === 'control_room' ? 'Controller ID / Username' : 'Passenger Username / Email'}
              </label>
              <div className="relative">
                <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-2.5">
                  account_circle
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={activeRole === 'control_room' ? 'control' : 'user'}
                  className="w-full bg-surface-container-lowest border border-slate-700/80 rounded-lg py-2.5 pl-10 pr-4 text-xs font-mono text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-outline uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined text-outline text-[18px] absolute left-3 top-2.5">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-lowest border border-slate-700/80 rounded-lg py-2.5 pl-10 pr-10 text-xs font-mono text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-outline hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-lg bg-primary hover:bg-inverse-primary text-on-primary-container font-semibold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(46,92,230,0.35)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Login as {activeRole === 'control_room' ? 'Controller' : 'Passenger'}</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-outline uppercase font-mono text-[10px] block">Demo Credentials</span>
                <span className="text-on-surface font-mono font-semibold">
                  {activeRole === 'control_room' ? 'control / admin' : 'user / user'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickDemo(activeRole)}
                className="py-2 px-3.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high border border-slate-700 text-xs font-bold text-primary transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>Quick Login</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation shortcut to passenger dashboard */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/user-dashboard')}
            className="text-xs text-outline hover:text-primary transition-colors inline-flex items-center gap-1 font-medium"
          >
            <span>Skip Login and view Passenger Live Tracker</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>

        <p className="text-[11px] font-mono text-center text-outline pt-2">
          Indian Railways Smart Network & Operational Dispatcher Engine • SIH 2026
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
