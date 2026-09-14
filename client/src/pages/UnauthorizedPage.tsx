import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'var(--bg-canvas)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          border: '1px solid rgba(244, 63, 94, 0.3)',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f43f5e',
            marginBottom: '1.25rem',
          }}
        >
          <ShieldAlert size={28} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', margin: 0 }}>
          403 Access Denied
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          Your current account (<span style={{ color: '#fda4af', fontWeight: 600 }}>{user?.role?.name || 'Unassigned'}</span>) 
          lacks the backend permission required to view or execute actions on this resource.
        </p>

        <div
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#f43f5e', marginBottom: '0.3rem' }}>
            <Lock size={14} /> Enforced Security Policy
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Permission checks apply dynamically on both frontend route gates and Express API endpoints. 
            If you require access, ask your system <strong>Owner</strong> to grant the permission in <strong>Role Management</strong>.
          </div>
        </div>

        <Link to="/dashboard" className="btn btn-primary" style={{ width: '100%' }}>
          <ArrowLeft size={16} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

