import React from 'react';
import { RefreshCw, Shield, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  title: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const { user, refreshUser } = useAuth();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUser();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem', margin: 0 }}>
          Role-Based Access Control System
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-emerald">
              <Shield size={13} /> {user.permissions?.length || 0} Permissions
            </span>
            <span className="badge badge-primary">
              <Key size={13} /> {user.role?.name}
            </span>
          </div>
        )}

        <button
          onClick={handleRefresh}
          className="btn btn-secondary"
          title="Sync latest role permissions from server"
          style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
        >
          <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>Sync Session</span>
        </button>
      </div>
    </header>
  );
};

