import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn, Lock, Mail, UserCheck, Chrome } from 'lucide-react';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authService.login(email, password);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError('');
    setLoading(true);

    try {
      const data = await authService.login(demoEmail, 'Password123!');
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const data = await authService.googleLogin('mock_google_id_token');
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google Auth failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg-canvas)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2.25rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              marginBottom: '0.85rem',
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>FieldOps Console</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Sign in to access your RBAC workspace
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="name@fieldops.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#818cf8', textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            <LogIn size={16} />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div style={{ margin: '1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="btn btn-secondary"
          style={{ width: '100%', marginBottom: '1.25rem' }}
          disabled={loading}
        >
          <Chrome size={16} color="#ea4335" />
          <span>Sign In with Google</span>
        </button>

        {/* Quick Demo Persona Badges */}
        <div style={{ background: 'var(--bg-canvas)', borderRadius: '8px', padding: '0.85rem', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <UserCheck size={13} color="#818cf8" /> Quick Demo Personas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <button
              onClick={() => handleQuickLogin('owner@fieldops.com')}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
            >
              <span style={{ fontWeight: 600, color: '#c084fc' }}>👑 Owner</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>owner@fieldops.com</span>
            </button>

            <button
              onClick={() => handleQuickLogin('manager@fieldops.com')}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
            >
              <span style={{ fontWeight: 600, color: '#34d399' }}>📊 Manager</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>manager@fieldops.com</span>
            </button>

            <button
              onClick={() => handleQuickLogin('employee@fieldops.com')}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
            >
              <span style={{ fontWeight: 600, color: '#60a5fa' }}>🚶 Field Employee</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>employee@fieldops.com</span>
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
            Register User
          </Link>
        </div>
      </div>
    </div>
  );
};

