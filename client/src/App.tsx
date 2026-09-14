import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { AttendancePage } from './pages/AttendancePage';
import { VisitsPage } from './pages/VisitsPage';
import { RoleManagementPage } from './pages/RoleManagementPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { Permission } from './types';

const MainLayout: React.FC = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Routes inside App Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              
              <Route element={<ProtectedRoute permission={Permission.READ_SELF_ATTENDANCE} />}>
                <Route path="/attendance" element={<AttendancePage />} />
              </Route>

              <Route element={<ProtectedRoute permission={Permission.READ_SELF_VISIT} />}>
                <Route path="/visits" element={<VisitsPage />} />
              </Route>

              <Route element={<ProtectedRoute permission={Permission.MANAGE_ROLES} />}>
                <Route path="/roles" element={<RoleManagementPage />} />
              </Route>
            </Route>
          </Route>

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
