import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  permission?: string | string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permission }) => {
  const { user, token, isLoading, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Loading Session...</div>
          <div style={{ fontSize: '0.9rem' }}>Verifying permissions and authentication state</div>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Mandatory password change check for provisioned accounts
  const isChangePasswordRoute = location.pathname === '/change-temporary-password';
  if (user.mustChangePassword) {
    if (!isChangePasswordRoute) {
      return <Navigate to="/change-temporary-password" replace />;
    }
    return <Outlet />;
  }

  if (isChangePasswordRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  if (permission) {
    const requiredPermissions = Array.isArray(permission) ? permission : [permission];
    const hasAnyPermission = requiredPermissions.some((p) => hasPermission(p));
    if (!hasAnyPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};
