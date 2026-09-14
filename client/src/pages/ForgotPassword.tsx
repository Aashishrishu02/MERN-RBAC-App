import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/api';
import { AuthLayout } from '../components/AuthLayout';

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
    <AuthLayout>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
          Forgot password?
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Enter your email to receive a password reset link
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {message && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <CheckCircle2 size={16} /> {message}
          </div>
          {resetUrl && (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Developer Preview Link:</p>
              <a
                href={resetUrl}
                style={{
                  display: 'block',
                  wordBreak: 'break-all',
                  color: '#4f46e5',
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
            <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="email"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', height: '42px', marginTop: '0.75rem', fontWeight: 600 }}
          disabled={loading}
        >
          <span>{loading ? 'Sending link...' : 'Send reset link'}</span>
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <Link to="/login" style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
};
