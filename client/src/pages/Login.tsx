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
      // Passes mock_google_id_token for local development, verified cryptographically on backend
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem' }}>
        {/* Header */}
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
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>FieldOps Access Test</h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.4rem' }}>
            Sign in to access your role-based portal
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

        <form onSubmit={handleLogin}>
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

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#818cf8', textDecoration: 'none' }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            <LogIn size={18} />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="btn btn-secondary"
          style={{ width: '100%', marginBottom: '1.5rem' }}
          disabled={loading}
        >
          <Chrome size={18} color="#ea4335" />
          <span>Sign In with Google</span>
        </button>

        {/* Quick Demo Persona Badges */}
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserCheck size={14} color="#6366f1" /> Quick Demo Persona Logins
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button
              onClick={() => handleQuickLogin('owner@fieldops.com')}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
            >
              <span style={{ fontWeight: 600, color: '#c084fc' }}>👑 Owner Account</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>owner@fieldops.com</span>
            </button>

            <button
              onClick={() => handleQuickLogin('manager@fieldops.com')}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
            >
              <span style={{ fontWeight: 600, color: '#6ee7b7' }}>📊 Manager Account</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>manager@fieldops.com</span>
            </button>

            <button
              onClick={() => handleQuickLogin('employee@fieldops.com')}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
            >
              <span style={{ fontWeight: 600, color: '#93c5fd' }}>🚶 Field Employee Account</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>employee@fieldops.com</span>
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
            Register User
          </Link>
        </div>
      </div>
    </div>
  );
};
