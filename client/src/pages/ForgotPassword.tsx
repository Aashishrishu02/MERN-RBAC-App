import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/api';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const data = await authService.forgotPassword(email);
      setMessage(data.message || 'Reset link generated successfully.');
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              marginBottom: '1rem',
              boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)',
            }}
          >
            <KeyRound size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Forgot Password</h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.4rem' }}>
            Enter your registered email to receive a password reset token/link
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#fda4af',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              color: '#6ee7b7',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              <CheckCircle2 size={18} /> {message}
            </div>
            {resetUrl && (
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>Developer Preview Link:</p>
                <a
                  href={resetUrl}
                  style={{
                    display: 'block',
                    wordBreak: 'break-all',
                    color: '#818cf8',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    fontSize: '0.8rem',
                  }}
                >
                  Click Here to Reset Password
                </a>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="name@fieldops.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            <span>{loading ? 'Generating Link...' : 'Send Reset Link'}</span>
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/login" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
