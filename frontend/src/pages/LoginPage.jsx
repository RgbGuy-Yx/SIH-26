import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendMsg91Otp, verifyMsg91Otp, openMsg91PrebuiltWidget } from '../lib/msg91';

export function LoginPage() {
  const {
    currentUser,
    login,
    signup,
    resetPassword,
    isOtpVerified,
    setOtpVerified,
    loading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode: 'login' | 'signup'
  const [mode, setMode] = useState('login');

  // Multi-step Auth Flow for Login: 'credentials' (Step 1) | 'mobile' (Step 2) | 'otp' (Step 4)
  const [authStep, setAuthStep] = useState(location.state?.step || 'credentials');

  // Input States
  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Target path from location state
  const fromPath = location.state?.from?.pathname;

  // Redirect to Control Room ONLY if both Supabase Auth & MSG91 OTP are fully verified
  useEffect(() => {
    if (currentUser && isOtpVerified) {
      navigate(fromPath || '/control-room', { replace: true });
    }
  }, [currentUser, isOtpVerified, navigate, fromPath]);

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setAuthStep('credentials');
    setErrorMsg('');
    setSuccessMsg('');
    setOfficerId('');
    setPassword('');
    setFullName('');
    setMobileNumber('');
    setOtp('');
  };

  // STEP 1 — Supabase Credentials Submit (Officer ID + Password)
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(officerId, password);
        if (res.success) {
          // Move to Step 2 (Mobile verification) — DO NOT immediately open /control-room
          setAuthStep('mobile');
          setSuccessMsg('Supabase authentication successful. Please verify your mobile number.');
        } else {
          setErrorMsg(res.message || 'Invalid Officer ID or password.');
        }
      } else {
        // Signup
        const res = await signup(officerId, password, fullName);
        if (res.success) {
          setSuccessMsg(res.message || 'Officer account created successfully! Please sign in.');
          setMode('login');
          setAuthStep('credentials');
          setPassword('');
        } else {
          setErrorMsg(res.message || 'Signup failed. Please try again.');
        }
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 — Launch MSG91 Prebuilt UI Widget Template Modal
  const handleMobileSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile && cleanMobile.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setSuccessMsg('Launching MSG91 Official OTP Verification Template...');

    try {
      openMsg91PrebuiltWidget(
        cleanMobile,
        (data) => {
          // Callback when verified in MSG91 pre-built UI
          setSuccessMsg('OTP verified successfully via MSG91!');
          setOtpVerified(true);
          navigate(fromPath || '/control-room', { replace: true });
        },
        (error) => {
          setErrorMsg(error?.message || 'MSG91 verification encountered an issue. Please try again.');
        }
      );

      // Advance UI state to OTP input step as well
      setAuthStep('otp');
    } catch (err) {
      setErrorMsg('Unable to launch MSG91 OTP Widget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 4 — MSG91 OTP Verification Submit
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!otp.trim()) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyMsg91Otp(otp);
      if (res.success) {
        setSuccessMsg('OTP verified successfully!');
        setOtpVerified(true);
        // Both Supabase Auth & MSG91 OTP Verified → Open /control-room
        navigate(fromPath || '/control-room', { replace: true });
      } else {
        setErrorMsg(res.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setErrorMsg('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP via MSG91
  const handleResendOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await sendMsg91Otp(mobileNumber);
      if (res.success) {
        setSuccessMsg('A new OTP has been sent via MSG91.');
      } else {
        setErrorMsg(res.message || 'Failed to resend OTP.');
      }
    } catch (err) {
      setErrorMsg('Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Return to Mobile step without logging out of Supabase
  const handleChangeNumber = () => {
    setAuthStep('mobile');
    setOtp('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Forgot Password Action
  const handleForgotPassword = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!officerId) {
      setErrorMsg('Please enter your Officer ID above to reset your password.');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(officerId);
      if (res.success) {
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg('Failed to process password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0284C7] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-800 flex flex-col justify-center items-center relative overflow-hidden font-sans p-4">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#0284C7]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-[#0284C7] shadow-lg mb-3">
            <span className="material-symbols-outlined text-[32px]">train</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-wide uppercase">RailRadar Authentication</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono tracking-wider">
            INDIAN RAILWAYS NETWORK INTELLIGENCE PLATFORM
          </p>
        </div>

        {/* Login / Signup Tabs (Only shown on Credentials Step) */}
        {authStep === 'credentials' && (
          <div className="bg-white p-1.5 rounded-xl border border-slate-200 flex items-center gap-1 shadow-sm">
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-[#0284C7] text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">badge</span>
              <span>Officer Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch('signup')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'signup'
                  ? 'bg-[#0284C7] text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Register Officer</span>
            </button>
          </div>
        )}

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg space-y-5">
          {/* Card Header Step Indicator */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#0284C7] text-[24px] shrink-0 mt-0.5">
              {authStep === 'credentials'
                ? mode === 'login'
                  ? 'local_police'
                  : 'badge'
                : authStep === 'mobile'
                ? 'phone_iphone'
                : 'phonelink_lock'}
            </span>
            <div className="text-xs">
              <h2 className="font-bold text-slate-900 uppercase tracking-tight">
                {authStep === 'credentials'
                  ? mode === 'login'
                    ? 'District Officer Login'
                    : 'Register Officer Account'
                  : authStep === 'mobile'
                  ? 'Verify Your Mobile'
                  : 'Verify OTP'}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                {authStep === 'credentials'
                  ? mode === 'login'
                    ? 'Step 1: Sign in with your Officer ID and password.'
                    : 'Create a Control Room Officer account.'
                  : authStep === 'mobile'
                  ? 'Step 2: Enter your mobile number to send SMS OTP via MSG91.'
                  : `Step 3: Enter the 6-digit OTP code sent to +91 ${mobileNumber}.`}
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Officer ID + Password */}
          {authStep === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                    Full Name (Optional)
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3 top-2.5">
                      person
                    </span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Rahul Verma"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                  Officer ID
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3 top-2.5">
                    badge
                  </span>
                  <input
                    type="text"
                    required
                    value={officerId}
                    onChange={(e) => setOfficerId(e.target.value)}
                    placeholder="RO-AG-1024"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] font-medium text-[#0284C7] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3 top-2.5">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="•••••••••••"
                    minLength={6}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-10 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
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
                className="w-full mt-2 py-3 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === 'login' ? 'Authenticating...' : 'Creating Account...'}
                  </span>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Mobile Number Verification Input */}
          {authStep === 'mobile' && (
            <form onSubmit={handleMobileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-mono text-xs font-bold text-slate-500 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    maxLength={10}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-12 pr-4 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Your number will be used only for this MSG91 verification step.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending OTP via MSG91...
                  </span>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <span className="material-symbols-outlined text-[16px]">sms</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 4: MSG91 OTP Verification Screen */}
          {authStep === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3 top-2.5">
                    pin
                  </span>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-center font-mono text-base tracking-[0.4em] font-bold text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying OTP...
                  </span>
                ) : (
                  <>
                    <span>Verify OTP</span>
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                  </>
                )}
              </button>

              <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-[#0284C7] font-semibold hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                  <span>Resend OTP</span>
                </button>

                <button
                  type="button"
                  onClick={handleChangeNumber}
                  disabled={loading}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                  <span>Change Number</span>
                </button>
              </div>
            </form>
          )}

          {/* Mode switch hint */}
          {authStep === 'credentials' && (
            <div className="pt-3 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-500">
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('signup')}
                      className="text-[#0284C7] font-semibold hover:underline"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('login')}
                      className="text-[#0284C7] font-semibold hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Navigation shortcut to passenger dashboard */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/user-dashboard')}
            className="text-xs text-slate-500 hover:text-[#0284C7] transition-colors inline-flex items-center gap-1 font-medium"
          >
            <span>Skip Login and view Passenger Live Tracker</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>

        <p className="text-[11px] font-mono text-center text-slate-400 pt-2">
          Indian Railways Smart Network & Operational Dispatcher Engine • SIH 2026
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
