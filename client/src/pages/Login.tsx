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

  const handleGoogleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      console.log('[Google Auth] Google credential callback fired');

      if (!response.credential) {
        console.error('[Google Auth] No credential in callback response');
        setError('Google Authentication failed: No credential received from Google.');
        return;
      }

      const segments = response.credential.split('.').length;
      const isJwt = segments === 3;
      console.log('[Google Auth] Credential received - isJWT:', isJwt, 'segments:', segments);

      setError('');
      setLoading(true);

      try {
        console.log('[Google Auth] Sending POST /api/auth/google request...');
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
    console.log('[Google Auth] Checking VITE_GOOGLE_CLIENT_ID configured:', Boolean(googleClientId));
    if (!googleClientId) return;

    const scriptId = 'google-gsi-client';
    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        console.log('[Google Auth] GIS script loaded. Initializing google.accounts.id...');
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });

        console.log('[Google Auth] google.accounts.id initialized successfully');

        const btnDiv = document.getElementById('google-btn-container');
        if (btnDiv) {
          btnDiv.innerHTML = '';
          window.google.accounts.id.renderButton(btnDiv, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
          });
          console.log('[Google Auth] Rendered GIS Google button into container');
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

  const handleFallbackGoogleLogin = async () => {
    setError('');

    if (googleClientId && window.google?.accounts?.id) {
      console.log('[Google Auth] Triggering google.accounts.id.prompt()');
      window.google.accounts.id.prompt();
      return;
    }

    if (import.meta.env.DEV) {
      console.log('[Google Auth] Running local DEV mock login fallback');
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
      return;
    }

    setError('Google Client ID (VITE_GOOGLE_CLIENT_ID) is missing in environment variables during build.');
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

      {/* Google Login CTA Container */}
      {googleClientId ? (
        <div id="google-btn-container" style={{ width: '100%', minHeight: '40px', marginBottom: '1rem' }} />
      ) : (
        <button
          type="button"
          onClick={handleFallbackGoogleLogin}
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
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
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
              Field Agent
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
