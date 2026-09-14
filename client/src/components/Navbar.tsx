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
        padding: '1.25rem 2rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{title}</h1>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
          Role-Based Access Control Console
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="badge badge-emerald">
              <Shield size={14} /> Active Permissions ({user.permissions?.length || 0})
            </span>
            <span className="badge badge-primary">
              <Key size={14} /> {user.role?.name}
            </span>
          </div>
        )}

        <button
          onClick={handleRefresh}
          className="btn btn-secondary"
          title="Sync latest role permissions from server"
          style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
        >
          <RefreshCw size={15} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>Sync Session</span>
        </button>
      </div>
    </header>
  );
};
