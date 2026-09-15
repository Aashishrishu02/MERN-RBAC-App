import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';

declare global {
  interface Window {
    google?: any;
  }
}

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isDev = import.meta.env.DEV;

  const handleGoogleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      console.log('[Google Auth] Google credential callback fired');

      if (!response.credential) {
        console.error('[Google Auth] No credential in callback response');
        setError('Google Authentication failed: No credential received from Google.');
        return;
      }

      setError('');
      setLoading(true);

      try {
        console.log('[Google Auth] Sending POST /api/auth/google with real ID token');
        const data = await authService.googleLogin(response.credential);
        console.log('[Google Auth] Google auth API success');
        login(data.token, data.user);
        navigate('/dashboard');
      } catch (err: any) {
        console.error('[Google Auth] Google auth API failed:', err.response?.data?.message || err.message);
        setError(err.response?.data?.message || 'Google Auth failed.');
      } finally {
        setLoading(false);
      }
    },
    [login, navigate]
  );

  useEffect(() => {
    if (!googleClientId) {
      console.warn('[Google Auth] VITE_GOOGLE_CLIENT_ID is not configured');
      return;
    }

    const scriptId = 'google-gsi-client';
    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        console.log('[Google Auth] Initializing GIS google.accounts.id...');
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });

        const btnDiv = document.getElementById('google-btn-container');
        if (btnDiv) {
          btnDiv.innerHTML = '';
          window.google.accounts.id.renderButton(btnDiv, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
          });
          console.log('[Google Auth] GIS Google button rendered');
        }
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    } else {
      initGoogle();
    }
  }, [googleClientId, handleGoogleCredentialResponse]);

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

  const handleDevMockGoogleLogin = async () => {
    if (!isDev) {
      setError('Google Sign-In is unavailable. VITE_GOOGLE_CLIENT_ID environment variable is not configured.');
      return;
    }

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
    <AuthLayout>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
          Sign in to your account
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}>
            Create one
          </Link>
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* Google Login CTA */}
      {googleClientId ? (
        <div id="google-btn-container" style={{ width: '100%', minHeight: '40px', marginBottom: '1rem' }} />
      ) : isDev ? (
        <button
          type="button"
          onClick={handleDevMockGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            height: '42px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#0f172a',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            marginBottom: '1rem',
          }}
        >
          <span>Continue with Google (Local Dev Mock)</span>
        </button>
      ) : (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            color: '#b45309',
            fontSize: '0.8rem',
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          Google Sign-In requires VITE_GOOGLE_CLIENT_ID environment variable.
        </div>
      )}

      {/* Divider */}
      <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>or continue with email</span>
        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
      </div>

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label">Email address</label>
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

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label className="form-label" style={{ margin: 0 }}>Password</label>
            <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#64748b', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
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

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', height: '42px', marginTop: '0.5rem', fontWeight: 600 }}
          disabled={loading}
        >
          <LogIn size={16} />
          <span>{loading ? 'Authenticating...' : 'Sign in'}</span>
        </button>
      </form>

      {/* Quick Demo Login Section */}
      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.85rem' }}>
          Quick demo login
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
          {/* Owner Persona */}
          <button
            type="button"
            onClick={() => handleQuickLogin('owner@fieldops.com')}
            disabled={loading}
            style={{
              background: '#faf5ff',
              border: '1px solid #e9d5ff',
              borderRadius: '8px',
              padding: '0.75rem 0.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b21a8', marginBottom: '0.2rem' }}>
              Owner
            </div>
            <div style={{ fontSize: '0.7rem', color: '#9333ea' }}>
              Click to fill
            </div>
          </button>

          {/* Manager Persona */}
          <button
            type="button"
            onClick={() => handleQuickLogin('manager@fieldops.com')}
            disabled={loading}
            style={{
              background: '#eef2ff',
              border: '1px solid #c7d2fe',
              borderRadius: '8px',
              padding: '0.75rem 0.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', marginBottom: '0.2rem' }}>
              Manager
            </div>
            <div style={{ fontSize: '0.7rem', color: '#4f46e5' }}>
              Click to fill
            </div>
          </button>

          {/* Field Agent Persona */}
          <button
            type="button"
            onClick={() => handleQuickLogin('employee@fieldops.com')}
            disabled={loading}
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              padding: '0.75rem 0.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', marginBottom: '0.2rem' }}>
              Field Employee
            </div>
            <div style={{ fontSize: '0.7rem', color: '#059669' }}>
              Click to fill
            </div>
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};
