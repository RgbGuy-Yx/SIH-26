import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SimulationProvider } from './context/SimulationContext';
import DashboardLayout from './layouts/DashboardLayout';
import UserLayout from './layouts/UserLayout';
import LiveMapPage from './pages/LiveMapPage';
import TrainsPage from './pages/TrainsPage';
import AlertsConflictsPage from './pages/AlertsConflictsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { UserDashboardPage } from './pages/UserDashboardPage';

// Full-screen loading spinner shown while Supabase session is being resolved
function AuthLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F6F8]">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0284C7] rounded-full animate-spin mb-4" />
      <p className="text-sm text-slate-500 font-medium">Verifying session...</p>
    </div>
  );
}

// Guard for guest-only public routes (e.g., /login)
// 1. If auth is loading → show spinner
// 2. If authenticated as PASSENGER → redirect to /user-dashboard
// 3. If authenticated as CONTROL_ROOM & OTP verified → redirect to /control-room
// 4. Otherwise → render guest page (e.g. LoginPage)
function PublicRoute({ children }) {
  const { isControlRoomAuth, isPassengerAuth, loading } = useAuth();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname;

  if (loading) {
    return <AuthLoading />;
  }

  if (isPassengerAuth) {
    return <Navigate to={fromPath || '/user-dashboard'} replace />;
  }

  if (isControlRoomAuth) {
    return <Navigate to={fromPath || '/control-room'} replace />;
  }

  return children;
}

// Guard for protected Control Room routes
// Requires: isControlRoomAuth === true (Officer ID + Password AND Mobile OTP verified)
// If PASSENGER attempts access → block and redirect to /login
function ProtectedRoute({ children }) {
  const { isControlRoomAuth, isPassengerAuth, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoading />;
  }

  if (isControlRoomAuth) {
    return children;
  }

  if (isPassengerAuth) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/login" state={{ from: location }} replace />;
}

// Guard for Passenger View
// If CONTROL_ROOM Officer attempts to access passenger view → redirect to /control-room
function PassengerRouteGuard({ children }) {
  const { isControlRoomAuth, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (isControlRoomAuth) {
    return <Navigate to="/control-room" replace />;
  }

  return children;
}

// Intelligent Root Redirect Component
function RootRedirect() {
  const { isControlRoomAuth, isPassengerAuth, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (isControlRoomAuth) {
    return <Navigate to="/control-room" replace />;
  }

  if (isPassengerAuth) {
    return <Navigate to="/user-dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Login Route (Guarded: Authenticated users redirected to dashboard) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* ===== Passenger View (Guarded for Passengers/Guests) ===== */}
      <Route
        path="/user-dashboard"
        element={
          <PassengerRouteGuard>
            <UserLayout />
          </PassengerRouteGuard>
        }
      >
        <Route index element={<UserDashboardPage />} />
      </Route>

      {/* Railway Control Room Protected Layout & Routes */}
      <Route
        path="/control-room"
        element={
          <ProtectedRoute>
            <SimulationProvider>
              <DashboardLayout />
            </SimulationProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<LiveMapPage />} />
        <Route path="trains" element={<TrainsPage />} />
        <Route path="alerts-and-conflicts" element={<AlertsConflictsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Smart Root Redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
