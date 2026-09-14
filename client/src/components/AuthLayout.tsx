import React from 'react';
import { MapPin, Clock, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="auth-split-wrapper">
      {/* Left Dark Brand Panel */}
      <div className="auth-left-panel">
        <div>
          {/* Logo Mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '4rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#1e293b',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <MapPin size={20} />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              FieldOps
            </span>
          </div>

          {/* Headline & Description */}
          <div style={{ maxWidth: '440px' }}>
            <h1
              style={{
                fontSize: '2.25rem',
                fontWeight: 700,
                lineHeight: 1.25,
                color: '#ffffff',
                marginBottom: '1rem',
                letterSpacing: '-0.03em',
              }}
            >
              Manage your field operations with ease
            </h1>
            <p
              style={{
                fontSize: '0.95rem',
                color: '#94a3b8',
                lineHeight: 1.6,
                marginBottom: '3rem',
              }}
            >
              Track attendance, manage field visits, and control team permissions — all in one unified platform.
            </p>

            {/* Feature Benefits List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <Clock size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e2e8f0' }}>
                  Real-time attendance tracking
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <MapPin size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e2e8f0' }}>
                  Field visit management
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <ShieldCheck size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e2e8f0' }}>
                  Role-based access control
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Copyright */}
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3rem' }}>
          © 2026 FieldOps. All rights reserved.
        </div>
      </div>

      {/* Right Light Content Panel */}
      <div className="auth-right-panel">
        <div className="auth-form-card">
          {children}
        </div>
      </div>
    </div>
  );
};
