import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendMsg91Otp, verifyMsg91Otp, openMsg91PrebuiltWidget } from '../lib/msg91';

export function LoginPage() {
  const {
    loginStep1,
    completeOfficerAuth,
    userLogin,
    userSignup,
    resetPassword,
    loading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode Selection: 'control_room' (Default) | 'user' (Passenger)
  const searchParams = new URLSearchParams(location.search);
  const initialMode =
    location.state?.mode ||
    (searchParams.get('role') === 'passenger' || searchParams.get('mode') === 'user' ? 'user' : 'control_room');
  const [authMode, setAuthMode] = useState(initialMode);

  // User Sub-mode: 'login' | 'signup'
  const [userSubMode, setUserSubMode] = useState('login');

  // Multi-step Auth Flow for Control Room Login: 'credentials' (Step 1) | 'mobile' (Step 2) | 'otp' (Step 3)
  const [authStep, setAuthStep] = useState(location.state?.step || 'credentials');

  // Control Room Inputs
  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingOfficerUser, setPendingOfficerUser] = useState(null);

  // User Inputs
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userConfirmPassword, setUserConfirmPassword] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Target path from location state
  const fromPath = location.state?.from?.pathname;

  // --- CONTROL ROOM HANDLERS ---

  // STEP 1 — Supabase Credentials Submit (Officer ID + Password)
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await loginStep1(officerId, password);
      if (res.success) {
        setPendingOfficerUser(res.officerUser);
        setAuthStep('mobile');
        setSuccessMsg('Officer credentials verified. Please enter your mobile number for OTP verification.');
      } else {
        setErrorMsg(res.message || 'Invalid Officer ID or password.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 — Submit Mobile Number & Launch MSG91 Prebuilt UI OTP Widget
  const handleMobileSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile && cleanMobile.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setSuccessMsg('Launching MSG91 Prebuilt OTP Widget...');

    try {
      await openMsg91PrebuiltWidget(
        cleanMobile,
        (data) => {
          setSuccessMsg('OTP verified successfully!');
          completeOfficerAuth(pendingOfficerUser);
          navigate(fromPath || '/control-room', { replace: true });
        },
        (error) => {
          console.warn('MSG91 Widget Error:', error);
          setErrorMsg(error?.message || 'MSG91 Widget returned an error. Enter OTP code below.');
          setAuthStep('otp');
        }
      );
      setAuthStep('otp');
    } catch (err) {
      setErrorMsg('Unable to launch MSG91 OTP Widget. Please enter OTP code below.');
      setAuthStep('otp');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3 — MSG91 OTP Verification Submit
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
        completeOfficerAuth(pendingOfficerUser);
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

  // Return to Mobile step
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

  // --- USER / PASSENGER HANDLERS ---

  const handleUserLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!userEmail.trim() || !userPassword) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await userLogin(userEmail, userPassword);
      if (res.success) {
        setSuccessMsg('Sign in successful! Directing to passenger portal...');
        navigate(fromPath || '/user-dashboard', { replace: true });
      } else {
        setErrorMsg(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMsg('Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!userFullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!userEmail.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (userPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (userPassword !== userConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await userSignup(userFullName, userEmail, userPassword);
      if (res.success) {
        setSuccessMsg('Account created successfully! Directing to passenger portal...');
        navigate(fromPath || '/user-dashboard', { replace: true });
      } else {
        setErrorMsg(res.message || 'Failed to create account.');
      }
    } catch (err) {
      setErrorMsg('Account creation failed. Please try again.');
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

      <div className="w-full max-w-xl z-10 space-y-5">
        {/* Brand Header with Segmented Mode Switcher */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0284C7]/10 border border-[#0284C7]/20 flex items-center justify-center text-[#0284C7] shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[26px]">train</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-wide uppercase">RailRadar Authentication</h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider">
                INDIAN RAILWAYS NETWORK PLATFORM
              </p>
            </div>
          </div>

          {/* Mode Switcher Toggle (CONTROL ROOM | USER) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0 select-none">
            <button
              type="button"
              onClick={() => {
                setAuthMode('control_room');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${authMode === 'control_room'
                  ? 'bg-white text-[#0284C7] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              CONTROL ROOM
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('user');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${authMode === 'user'
                  ? 'bg-white text-[#0284C7] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              USER
            </button>
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg space-y-5">
          {/* ============================================================ */}
          {/* MODE 1: CONTROL ROOM OFFICER AUTHENTICATION (EXACT & UNCHANGED) */}
          {/* ============================================================ */}
          {authMode === 'control_room' && (
            <>
              {/* Card Header Step Indicator */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#0284C7] text-[24px] shrink-0 mt-0.5">
                  {authStep === 'credentials'
                    ? 'local_police'
                    : authStep === 'mobile'
                      ? 'phone_iphone'
                      : 'phonelink_lock'}
                </span>
                <div className="text-xs">
                  <h2 className="font-bold text-slate-900 uppercase tracking-tight">
                    {authStep === 'credentials'
                      ? 'District Officer Login'
                      : authStep === 'mobile'
                        ? 'Verify Your Mobile'
                        : 'Verify OTP'}
                  </h2>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                    {authStep === 'credentials'
                      ? 'Step 1: Sign in with your Officer ID and password.'
                      : authStep === 'mobile'
                        ? 'Step 2: Enter your mobile number to receive a 6-digit OTP.'
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
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[11px] font-medium text-[#0284C7] hover:underline"
                      >
                        Forgot Password?
                      </button>
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
                        Authenticating...
                      </span>
                    ) : (
                      <>
                        <span>Sign In</span>
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
                      We will send a 6-digit OTP code to verify your mobile number.
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending OTP...
                        </span>
                      ) : (
                        <>
                          <span>GET OTP</span>
                          <span className="material-symbols-outlined text-[16px]">send</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: OTP Verification Screen */}
              {authStep === 'otp' && (
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                        6-Digit OTP Code
                      </label>
                    </div>
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
                    <p className="text-[10px] text-slate-400 mt-1 font-mono text-center">
                      Tip: Enter SMS OTP code or prototype key (123456)
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying OTP...
                      </span>
                    ) : (
                      <>
                        <span>Verify OTP & Access Control Room</span>
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className="text-[#0284C7] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      <span>Resend OTP</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleChangeNumber}
                      disabled={loading}
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      <span>Change Number</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* ============================================================ */}
          {/* MODE 2: USER / PASSENGER AUTHENTICATION (LOGIN & SIGNUP) */}
          {/* ============================================================ */}
          {authMode === 'user' && (
            <>
              {/* Header Indicator */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#0284C7] text-[24px] shrink-0 mt-0.5">
                  {userSubMode === 'login' ? 'person' : 'person_add'}
                </span>
                <div className="text-xs">
                  <h2 className="font-bold text-slate-900 uppercase tracking-tight">
                    {userSubMode === 'login' ? 'RAILRADAR USER LOGIN' : 'CREATE USER ACCOUNT'}
                  </h2>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                    {userSubMode === 'login'
                      ? 'Sign in with your email and password to access live tracking and passenger features.'
                      : 'Create a new RailRadar passenger account to start tracking live trains and routes.'}
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

              {/* USER LOGIN FORM */}
              {userSubMode === 'login' && (
                <form onSubmit={handleUserLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3 top-2.5">
                        alternate_email
                      </span>
                      <input
                        type="email"
                        required
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="passenger@example.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3 top-2.5">
                        lock
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder="•••••••••••"
                        minLength={6}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-10 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all"
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
                    className="w-full mt-2 py-3 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing In...
                      </span>
                    ) : (
                      <>
                        <span>SIGN IN</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
                    <span>Don't have an account? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUserSubMode('signup');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-[#0284C7] font-semibold hover:underline cursor-pointer"
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              )}

              {/* USER SIGNUP FORM */}
              {userSubMode === 'signup' && (
                <form onSubmit={handleUserSignupSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3 top-2.5">
                        person
                      </span>
                      <input
                        type="text"
                        required
                        value={userFullName}
                        onChange={(e) => setUserFullName(e.target.value)}
                        placeholder="Rahul Sharma"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3 top-2.5">
                        alternate_email
                      </span>
                      <input
                        type="email"
                        required
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="passenger@example.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3 top-2.5">
                          lock
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          placeholder="•••••••••••"
                          minLength={6}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined text-slate-400 text-[18px] absolute left-3 top-2.5">
                          lock_reset
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={userConfirmPassword}
                          onChange={(e) => setUserConfirmPassword(e.target.value)}
                          placeholder="•••••••••••"
                          minLength={6}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Account...
                      </span>
                    ) : (
                      <>
                        <span>CREATE ACCOUNT</span>
                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
                    <span>Already have an account? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setUserSubMode('login');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-[#0284C7] font-semibold hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Navigation shortcut to passenger dashboard */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/user-dashboard')}
            className="text-xs text-slate-500 hover:text-[#0284C7] transition-colors inline-flex items-center gap-1 font-medium cursor-pointer"
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

