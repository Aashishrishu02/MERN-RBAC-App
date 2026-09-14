import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authService } from '../services/api';
import { AuthLayout } from '../components/AuthLayout';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Password reset token is missing from URL query parameter.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await authService.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Token may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
          Reset your password
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Set a new secure password for your account
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {success ? (
        <div className="alert alert-success" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem' }}>
          <CheckCircle2 size={32} style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#047857' }}>Password Reset Successful!</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>Redirecting to sign in screen...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: '42px', marginTop: '0.75rem', fontWeight: 600 }}
            disabled={loading || !token}
          >
            <span>{loading ? 'Updating password...' : 'Reset password'}</span>
          </button>
        </form>
      )}

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <Link to="/login" style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
};
