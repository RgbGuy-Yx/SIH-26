import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const DEMO_CREDENTIALS = {
  control_room: {
    username: 'control',
    password: 'admin',
    user: {
      id: 'CTL-8041',
      name: 'Rajesh Kumar',
      role: 'control_room',
      roleLabel: 'Senior Chief Controller',
      station: 'NDLS Central Control',
      avatar: 'RK',
      badge: 'Ops Room 01'
    }
  },
  user: {
    username: 'user',
    password: 'user',
    user: {
      id: 'USR-9021',
      name: 'Rahul Verma',
      role: 'user',
      roleLabel: 'Passenger / Commuter',
      pnr: '8492018492',
      frequentRoute: 'New Delhi (NDLS) ➔ Lucknow (LJN)',
      avatar: 'RV',
      badge: 'Gold Member'
    }
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('railradar_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (err) {
      console.error('Failed to parse auth state:', err);
      return null;
    }
  });

  const login = (role, usernameInput, passwordInput) => {
    const creds = DEMO_CREDENTIALS[role] || DEMO_CREDENTIALS.control_room;
    const inputUser = (usernameInput || '').trim().toLowerCase();
    const inputPass = (passwordInput || '').trim();

    if (!inputUser || !inputPass) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    // Match control room or passenger credentials
    if (role === 'control_room') {
      if (
        (inputUser === 'control' || inputUser === 'admin' || inputUser === 'controller') &&
        (inputPass === 'admin' || inputPass === 'control' || inputPass === '1234')
      ) {
        const user = DEMO_CREDENTIALS.control_room.user;
        setCurrentUser(user);
        localStorage.setItem('railradar_user', JSON.stringify(user));
        return { success: true, user };
      }
      return { success: false, message: 'Invalid credentials for Control Room. Demo: control / admin' };
    } else {
      if (
        (inputUser === 'user' || inputUser === 'passenger' || inputUser === 'rahul') &&
        (inputPass === 'user' || inputPass === 'passenger' || inputPass === '1234')
      ) {
        const user = DEMO_CREDENTIALS.user.user;
        setCurrentUser(user);
        localStorage.setItem('railradar_user', JSON.stringify(user));
        return { success: true, user };
      }
      return { success: false, message: 'Invalid credentials for Passenger login. Demo: user / user' };
    }
  };

  const quickLogin = (role = 'control_room') => {
    const creds = DEMO_CREDENTIALS[role] || DEMO_CREDENTIALS.control_room;
    setCurrentUser(creds.user);
    localStorage.setItem('railradar_user', JSON.stringify(creds.user));
    return { success: true, user: creds.user };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('railradar_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, quickLogin, logout }}>
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
