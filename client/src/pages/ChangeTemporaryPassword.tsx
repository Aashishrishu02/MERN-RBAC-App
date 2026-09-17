import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';

export const ChangeTemporaryPassword: React.FC = () => {
  const { user, login } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      setError('Current temporary password is required.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from your temporary password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await authService.changeTemporaryPassword(currentPassword, newPassword);
      setSuccess(true);
      login(res.token, res.user);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password. Please verify your temporary password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          <ShieldAlert size={14} /> Password Change Required
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
          Set Your Permanent Password
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Welcome <strong>{user?.name || user?.email}</strong>! Your account was provisioned with a temporary password. You must create a new permanent password to access FieldOps.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {success ? (
        <div className="alert alert-success" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem' }}>
          <CheckCircle2 size={32} style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#047857' }}>Password Set Successfully!</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>Redirecting to your dashboard...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Current Temporary Password</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Enter temporary password sent to your email"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
          </div>

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
            disabled={loading}
          >
            <span>{loading ? 'Updating Password...' : 'Save New Password & Continue'}</span>
          </button>
        </form>
      )}
    </AuthLayout>
  );
};
