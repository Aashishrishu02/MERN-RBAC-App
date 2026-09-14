import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  MapPin,
  ShieldAlert,
  UserCheck,
  CheckCircle,
  XCircle,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Permission } from '../types';

export const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();

  const allPermissionsList = Object.values(Permission);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar title="Console Dashboard" />

        <div className="main-content">
          {/* Welcome Banner */}
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              marginBottom: '2rem',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(99, 102, 241, 0.15) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span className="badge badge-purple" style={{ fontSize: '0.8rem' }}>
                    <UserCheck size={14} /> Persona: {user?.role?.name}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                  Welcome back, <span className="gradient-text">{user?.name}</span> 👋
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '0.4rem', maxWidth: '650px' }}>
                  FieldOps Access Control system is enforcing fine-grained permissions dynamically stored in database roles.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {hasPermission(Permission.CLOCK_IN_OUT) && (
                  <Link to="/attendance" className="btn btn-primary">
                    <Clock size={16} /> Attendance Clock
                  </Link>
                )}
                {hasPermission(Permission.SAVE_VISIT) && (
                  <Link to="/visits" className="btn btn-success">
                    <MapPin size={16} /> Register Visit
                  </Link>
                )}
                {hasPermission(Permission.MANAGE_ROLES) && (
                  <Link to="/roles" className="btn btn-secondary">
                    <ShieldAlert size={16} /> Manage Roles
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Active Role</span>
                <ShieldCheck size={22} color="#6366f1" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{user?.role?.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>
                Configurable permissions stored in Mongo DB
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Permissions Count</span>
                <Zap size={22} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6ee7b7' }}>
                {user?.permissions?.length || 0} / {allPermissionsList.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>
                Active capabilities enabled for your account
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Session Account</span>
                <UserCheck size={22} color="#8b5cf6" />
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>
                Authenticated via JWT Bearer Token
              </div>
            </div>
          </div>

          {/* Granted Permissions Matrix Card */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Your Active Permission Matrix</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                This live grid displays which backend permissions are granted to your current session.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {allPermissionsList.map((perm) => {
                const isGranted = hasPermission(perm);
                return (
                  <div
                    key={perm}
                    style={{
                      background: isGranted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                      border: `1px solid ${isGranted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    {isGranted ? (
                      <CheckCircle size={20} color="#10b981" />
                    ) : (
                      <XCircle size={20} color="#64748b" />
                    )}
                    <div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: isGranted ? '#6ee7b7' : '#64748b',
                        }}
                      >
                        {perm}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isGranted ? '#a7f3d0' : '#475569' }}>
                        {isGranted ? 'GRANTED & ENFORCED' : 'DENIED / REVOKED'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
