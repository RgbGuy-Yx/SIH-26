import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import UserLayout from './layouts/UserLayout';
import LiveMapPage from './pages/LiveMapPage';
import TrainsPage from './pages/TrainsPage';
import AlertsConflictsPage from './pages/AlertsConflictsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { UserDashboardPage } from './pages/UserDashboardPage';

// Guard for protected Control Room routes
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<LiveMapPage />} />
        <Route path="trains" element={<TrainsPage />} />
        <Route path="alerts-and-conflicts" element={<AlertsConflictsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Default: redirect root to passenger dashboard */}
      <Route path="/" element={<Navigate to="/user-dashboard" replace />} />

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/user-dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
