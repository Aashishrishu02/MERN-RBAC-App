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
        background: 'radial-gradient(circle at center, rgba(244, 63, 94, 0.1) 0%, transparent 70%)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '3rem 2rem',
          textAlign: 'center',
          borderColor: 'rgba(244, 63, 94, 0.3)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            marginBottom: '1.5rem',
            boxShadow: '0 8px 30px rgba(244, 63, 94, 0.4)',
          }}
        >
          <ShieldAlert size={36} />
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
          403 Access Denied
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Your current account (<span style={{ color: '#fda4af', fontWeight: 600 }}>{user?.role?.name || 'Unassigned'}</span>) 
          lacks the backend permission required to view or execute actions on this resource.
        </p>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#f43f5e', marginBottom: '0.4rem' }}>
            <Lock size={16} /> Enforced Security Policy
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Permission checks apply dynamically on both frontend route gates and Express API endpoints. 
            If you require access, ask your system <strong>Owner</strong> to grant the necessary permission in <strong>Role Management</strong>.
          </div>
        </div>

        <Link to="/dashboard" className="btn btn-primary" style={{ width: '100%' }}>
          <ArrowLeft size={18} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
};
