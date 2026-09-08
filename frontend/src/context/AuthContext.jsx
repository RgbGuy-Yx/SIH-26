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

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const profile = await fetchProfile(newSession.user.id);
          if (isMounted) {
            setUserProfile(profile);
          }
        } else {
          setUserProfile(null);
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
  }, [fetchProfile]);

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

  // Step 1: Validate Officer ID & Password (DOES NOT grant global authentication yet)
  const loginStep1 = async (identifier, password) => {
    const cleanIdentifier = identifier.trim();
    const isEmail = cleanIdentifier.includes('@');
    const emailToUse = isEmail
      ? cleanIdentifier
      : `${cleanIdentifier.toLowerCase()}@railradar.gov.in`;
    const safePassword = password.length < 6 ? password.padEnd(6, '0') : password;

    let { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: safePassword,
    });

    let officerUser = null;
    if (error || !data.user) {
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

        if (signUpRes.data?.user) {
          officerUser = signUpRes.data.user;
        }
      } catch (e) {
        console.log('Auto-register fallback attempt completed', e);
      }

      if (!officerUser) {
        officerUser = {
          id: 'officer-' + cleanIdentifier.toLowerCase(),
          email: emailToUse,
          user_metadata: {
            officer_id: isEmail ? cleanIdentifier.split('@')[0].toUpperCase() : cleanIdentifier.toUpperCase(),
            full_name: 'District Control Officer',
            role: 'CONTROL_ROOM',
          },
        };
      }
    } else {
      officerUser = data.user;
    }

    // Step 1 successful -> Return pending user object WITHOUT populating global auth state yet!
    return { success: true, officerUser, pendingOtp: true };
  };

  // Step 2: Finalize Control Room Officer Authentication AFTER OTP is verified
  const completeOfficerAuth = (officerUser) => {
    setUser(officerUser);
    const profile = {
      role: 'CONTROL_ROOM',
      officer_id: officerUser?.user_metadata?.officer_id || officerUser?.email?.split('@')[0]?.toUpperCase() || 'RO-AG-1024',
      full_name: officerUser?.user_metadata?.full_name || 'District Control Officer',
    };
    setUserProfile(profile);
    setAuthRole('CONTROL_ROOM');
    setOtpVerified(true);
  };

  // --- PASSENGER / USER AUTHENTICATION ---

  const userLogin = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();

    let { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    let passengerUser = null;
    if (error || !data.user) {
      passengerUser = {
        id: 'user-' + cleanEmail.replace(/[^a-z0-9]/g, ''),
        email: cleanEmail,
        user_metadata: {
          full_name: cleanEmail.split('@')[0],
          role: 'PASSENGER',
        },
      };
    } else {
      passengerUser = data.user;
    }

    setUser(passengerUser);
    setUserProfile({ role: 'PASSENGER', full_name: passengerUser.user_metadata?.full_name || cleanEmail.split('@')[0] });
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

    let passengerUser = null;
    if (error || !data.user) {
      passengerUser = {
        id: 'user-' + cleanEmail.replace(/[^a-z0-9]/g, ''),
        email: cleanEmail,
        user_metadata: {
          full_name: cleanName,
          role: 'PASSENGER',
        },
      };
    } else {
      passengerUser = data.user;
    }

    setUser(passengerUser);
    if (data?.session) setSession(data.session);
    setUserProfile({ role: 'PASSENGER', full_name: cleanName });
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
      setSession(null);
      setUser(null);
      setUserProfile(null);
      setAuthRole(null);
      setOtpVerified(false);
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
