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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar title="Console Dashboard" />

        <div className="main-content">
          {/* Welcome Banner */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem 2rem',
              marginBottom: '1.75rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                    <UserCheck size={13} /> Persona: {user?.role?.name}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Welcome back, <span>{user?.name}</span> 👋
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem', maxWidth: '650px', margin: 0 }}>
                  FieldOps Access Control system is enforcing fine-grained permissions dynamically stored in database roles.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem' }}>
                {hasPermission(Permission.CLOCK_IN_OUT) && (
                  <Link to="/attendance" className="btn btn-primary">
                    <Clock size={15} /> Attendance Clock
                  </Link>
                )}
                {hasPermission(Permission.SAVE_VISIT) && (
                  <Link to="/visits" className="btn btn-success">
                    <MapPin size={15} /> Register Visit
                  </Link>
                )}
                {hasPermission(Permission.MANAGE_ROLES) && (
                  <Link to="/roles" className="btn btn-secondary">
                    <ShieldAlert size={15} /> Manage Roles
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div className="glass-panel" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Role</span>
                <ShieldCheck size={20} color="#818cf8" />
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.role?.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Dynamic permissions stored in MongoDB
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Granted Capabilities</span>
                <Zap size={20} color="#34d399" />
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#34d399' }}>
                {user?.permissions?.length || 0} / {allPermissionsList.length} Enabled
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Active capabilities in your current session
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Session Account</span>
                <UserCheck size={20} color="#c084fc" />
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Authenticated via JWT Bearer Token
              </div>
            </div>
          </div>

          {/* Granted Permissions Matrix Card */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Session Permission Matrix</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '0.25rem', margin: 0 }}>
                This live grid displays backend permissions currently granted to your active session.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
              {allPermissionsList.map((perm) => {
                const isGranted = hasPermission(perm);
                return (
                  <div
                    key={perm}
                    style={{
                      background: isGranted ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-canvas)',
                      border: `1px solid ${isGranted ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      padding: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                    }}
                  >
                    {isGranted ? (
                      <CheckCircle size={18} color="#34d399" />
                    ) : (
                      <XCircle size={18} color="var(--text-muted)" />
                    )}
                    <div>
                      <div
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          color: isGranted ? '#6ee7b7' : 'var(--text-muted)',
                        }}
                      >
                        {perm}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: isGranted ? '#34d399' : 'var(--text-muted)', marginTop: '0.1rem' }}>
                        {isGranted ? 'GRANTED' : 'DENIED'}
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

