import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the user's profile (role, full_name) from public.profiles
  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Profile fetch failed:', err);
      return null;
    }
  }, []);

  // Clear all local authentication state
  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setUserProfile(null);
    setAuthRoleState(null);
    setIsOtpVerifiedState(false);
    sessionStorage.removeItem('railradar_auth_role');
    sessionStorage.removeItem('railradar_otp_verified');
  }, []);

  // Initialize: get existing session + subscribe to auth changes
  useEffect(() => {
    let isMounted = true;

    // 1. Check for existing session on mount
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          const profile = await fetchProfile(currentSession.user.id);
          if (isMounted) {
            setUserProfile(profile);
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // 2. Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        switch (event) {
          case 'INITIAL_SESSION':
            // Already handled by initAuth above — just sync state if needed
            if (newSession?.user) {
              setSession(newSession);
              setUser(newSession.user);
              const profile = await fetchProfile(newSession.user.id);
              if (isMounted) setUserProfile(profile);
            }
            break;

          case 'SIGNED_IN':
            setSession(newSession);
            setUser(newSession?.user ?? null);
            if (newSession?.user) {
              const profile = await fetchProfile(newSession.user.id);
              if (isMounted) setUserProfile(profile);
            }
            break;

          case 'TOKEN_REFRESHED':
            // Silently update session — no UI disruption, no profile re-fetch needed
            setSession(newSession);
            if (newSession?.user) {
              setUser(newSession.user);
            }
            break;

          case 'SIGNED_OUT':
            // Full state cleanup
            if (isMounted) {
              clearAuthState();
            }
            break;

          case 'USER_UPDATED':
            setSession(newSession);
            setUser(newSession?.user ?? null);
            if (newSession?.user) {
              const profile = await fetchProfile(newSession.user.id);
              if (isMounted) setUserProfile(profile);
            }
            break;

          default:
            // Handle any unknown events gracefully
            setSession(newSession);
            setUser(newSession?.user ?? null);
            if (newSession?.user) {
              const profile = await fetchProfile(newSession.user.id);
              if (isMounted) setUserProfile(profile);
            } else if (isMounted) {
              setUserProfile(null);
            }
            break;
        }

        // Ensure loading is false after any auth event
        if (isMounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, clearAuthState]);

  // --- Auth Actions ---

  const [authRole, setAuthRoleState] = useState(() => {
    return sessionStorage.getItem('railradar_auth_role') || null;
  });

  const setAuthRole = (role) => {
    setAuthRoleState(role);
    if (role) {
      sessionStorage.setItem('railradar_auth_role', role);
    } else {
      sessionStorage.removeItem('railradar_auth_role');
    }
  };

  const [isOtpVerified, setIsOtpVerifiedState] = useState(() => {
    return sessionStorage.getItem('railradar_otp_verified') === 'true';
  });

  const setOtpVerified = (verified) => {
    setIsOtpVerifiedState(verified);
    if (verified) {
      sessionStorage.setItem('railradar_otp_verified', 'true');
    } else {
      sessionStorage.removeItem('railradar_otp_verified');
    }
  };

  // --- CONTROL ROOM OFFICER AUTHENTICATION ---

  // Step 1: Validate Officer ID & Password via Supabase Auth
  // DOES NOT grant global authentication yet — OTP verification (Step 2) is required
  const loginStep1 = async (identifier, password) => {
    const cleanIdentifier = identifier.trim();
    const isEmail = cleanIdentifier.includes('@');
    const emailToUse = isEmail
      ? cleanIdentifier
      : `${cleanIdentifier.toLowerCase()}@railradar.gov.in`;
    const safePassword = password.length < 6 ? password.padEnd(6, '0') : password;

    // Attempt Supabase sign-in
    let { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: safePassword,
    });

    if (error || !data.user) {
      // If the user doesn't exist, attempt sign-up (auto-register for officers)
      try {
        const officerIdToStore = isEmail
          ? cleanIdentifier.split('@')[0].toUpperCase()
          : cleanIdentifier.toUpperCase();

        const signUpRes = await supabase.auth.signUp({
          email: emailToUse,
          password: safePassword,
          options: {
            data: {
              officer_id: officerIdToStore,
              full_name: 'District Control Officer',
              role: 'CONTROL_ROOM',
            },
          },
        });

        if (signUpRes.error) {
          return {
            success: false,
            message: signUpRes.error.message || 'Invalid Officer ID or password.',
          };
        }

        if (signUpRes.data?.user) {
          // Sign-up succeeded — the user now has a real Supabase account
          return { success: true, officerUser: signUpRes.data.user, pendingOtp: true };
        }

        return {
          success: false,
          message: 'Failed to authenticate. Please check your credentials and try again.',
        };
      } catch (e) {
        console.error('Officer auth fallback failed:', e);
        return {
          success: false,
          message: 'Authentication error. Please try again.',
        };
      }
    }

    // Supabase sign-in succeeded — return the authenticated user (pending OTP)
    return { success: true, officerUser: data.user, pendingOtp: true };
  };

  // Step 2: Finalize Control Room Officer Authentication AFTER OTP is verified
  // Validates that a real Supabase session exists before promoting auth state
  const completeOfficerAuth = async (officerUser) => {
    // Verify a real Supabase session exists before granting control room access
    const { data: { session: currentSession } } = await supabase.auth.getSession();

    if (!currentSession?.user) {
      console.error('completeOfficerAuth: No valid Supabase session found. Rejecting auth.');
      clearAuthState();
      return false;
    }

    // Use the session's verified user, not the passed-in object
    const verifiedUser = currentSession.user;
    setSession(currentSession);
    setUser(verifiedUser);

    const profile = {
      role: 'CONTROL_ROOM',
      officer_id: verifiedUser.user_metadata?.officer_id || verifiedUser.email?.split('@')[0]?.toUpperCase() || 'RO-AG-1024',
      full_name: verifiedUser.user_metadata?.full_name || 'District Control Officer',
    };
    setUserProfile(profile);
    setAuthRole('CONTROL_ROOM');
    setOtpVerified(true);
    return true;
  };

  // --- PASSENGER / USER AUTHENTICATION ---

  const userLogin = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (error || !data.user) {
      return {
        success: false,
        message: error?.message || 'Invalid email or password. Please try again.',
      };
    }

    // Supabase auth succeeded — use the real authenticated user
    const passengerUser = data.user;
    setUser(passengerUser);
    setSession(data.session);
    setUserProfile({
      role: 'PASSENGER',
      full_name: passengerUser.user_metadata?.full_name || cleanEmail.split('@')[0],
    });
    setAuthRole('PASSENGER');
    setOtpVerified(false);
    return { success: true, user: passengerUser };
  };

  const userSignup = async (fullName, email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || cleanEmail.split('@')[0];

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          full_name: cleanName,
          role: 'PASSENGER',
        },
      },
    });

    if (error) {
      return {
        success: false,
        message: error.message || 'Failed to create account. Please try again.',
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: 'Account creation failed. Please try again.',
      };
    }

    // Check if email confirmation is required (user exists but session is null)
    if (data.user && !data.session) {
      return {
        success: true,
        user: data.user,
        requiresConfirmation: true,
        message: 'Account created! Please check your email to confirm your account before signing in.',
      };
    }

    // Supabase auth succeeded with immediate session
    const passengerUser = data.user;
    setUser(passengerUser);
    setSession(data.session);
    setUserProfile({
      role: 'PASSENGER',
      full_name: cleanName,
    });
    setAuthRole('PASSENGER');
    setOtpVerified(false);
    return { success: true, user: passengerUser };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut warning:', err);
    } finally {
      clearAuthState();
    }
  };

  const resetPassword = async (identifier) => {
    const cleanIdentifier = identifier.trim();
    const emailToUse = cleanIdentifier.includes('@')
      ? cleanIdentifier
      : `${cleanIdentifier.toLowerCase()}@railradar.gov.in`;

    const { error } = await supabase.auth.resetPasswordForEmail(emailToUse);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Password reset request processed.' };
  };

  // Explicit Authentication Status Getters
  const isControlRoomAuth = Boolean(user && authRole === 'CONTROL_ROOM' && isOtpVerified);
  const isPassengerAuth = Boolean(user && authRole === 'PASSENGER');

  const currentUser = user
    ? {
        id: user.id,
        officerId:
          userProfile?.officer_id ||
          user.user_metadata?.officer_id ||
          user.email?.split('@')[0]?.toUpperCase() ||
          (authRole === 'PASSENGER' ? 'USER-PASSENGER' : 'RO-AG-1024'),
        name:
          userProfile?.full_name ||
          user.user_metadata?.full_name ||
          userProfile?.officer_id ||
          user.user_metadata?.officer_id ||
          (authRole === 'PASSENGER' ? 'Passenger User' : 'District Control Officer'),
        role: authRole || 'CONTROL_ROOM',
        roleLabel: authRole === 'PASSENGER' ? 'Passenger' : 'Control Room Officer',
        email: user.email,
        avatar: (userProfile?.full_name || user.user_metadata?.full_name || user.email || 'US')
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        // State
        session,
        user,
        userProfile,
        currentUser,
        loading,
        authRole,
        isOtpVerified,
        isControlRoomAuth,
        isPassengerAuth,
        // Actions
        loginStep1,
        completeOfficerAuth,
        userLogin,
        userSignup,
        logout,
        resetPassword,
        setOtpVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
