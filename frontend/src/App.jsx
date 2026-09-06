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

// Guard for protected Control Room routes
// 1. If auth is loading → show spinner
// 2. If not authenticated in Supabase → redirect to /login
// 3. If Supabase authenticated but OTP not verified → redirect to /login (step 2)
// 4. If both Supabase auth & MSG91 OTP verified → render control room
function ProtectedRoute({ children }) {
  const { currentUser, isOtpVerified, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoading />;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isOtpVerified) {
    return <Navigate to="/login" state={{ from: location, step: 'mobile' }} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* ===== Passenger View (Public, Static) ===== */}
      <Route path="/user-dashboard" element={<UserLayout />}>
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

      {/* Default: redirect root to login page */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
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
