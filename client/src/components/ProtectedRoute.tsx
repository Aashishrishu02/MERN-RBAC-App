import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  permission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permission }) => {
  const { user, token, isLoading, hasPermission } = useAuth();

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

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
