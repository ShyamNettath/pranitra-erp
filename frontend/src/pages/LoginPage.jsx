import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import axios from 'axios';

export default function LoginPage() {
  const navigate = useNavigate();
  const { submitCredentials, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [error, setError] = useState('');
  const [branding, setBranding] = useState({ logo_url: null, company_name: null, primary_color: null });

  useEffect(() => {
    axios.get('/api/settings/branding').then(r => {
      setBranding(r.data);
      if (r.data.primary_color) {
        document.documentElement.style.setProperty('--primary-color', r.data.primary_color);
      }
    }).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await submitCredentials(email, password);
      if (data.requiresMfa) {
        navigate('/mfa-verify');
      } else if (data.step === 'complete') {
        if (data.user?.must_reset_password) {
          navigate('/force-reset-password');
        } else {
          const ws = data.workspaces || [];
          if (ws.length === 0) {
            navigate('/workspace');
          } else if (ws.length === 1) {
            const { selectWorkspace } = useAuthStore.getState();
            await selectWorkspace(ws[0].id);
            navigate('/');
          } else {
            navigate('/workspace');
          }
        }
      } else {
        navigate('/otp');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'var(--font)', background: '#FFFFFF' }}>
      {/* Tool name top left */}
      <div style={{ padding: '32px 0 0 48px' }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: '#000000', letterSpacing: -0.5 }}>usaha</span>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
        {/* ── Left panel — branding ── */}
        <div style={{
          width: '45%', display: 'flex',
          flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center',
          padding: '48px', paddingRight: '60px',
        }}>
          {branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt="Company Logo"
              style={{ maxWidth: 280, maxHeight: 220, objectFit: 'contain', marginBottom: 20 }}
            />
          ) : (
            <div style={{
              width: 200, height: 160, border: '2px dashed #D8DDE6', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20, color: '#B0BAC8', fontSize: 13,
            }}>
              Company Logo
            </div>
          )}
          {branding.company_name && (
            <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--navy)', textAlign: 'right' }}>
              {branding.company_name}
            </div>
          )}
        </div>

        {/* ── Right panel — login form ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: '48px',
        }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>Sign in</h2>
            <p style={{ fontSize: 13, color: 'var(--grey-text)', marginBottom: 32 }}>
              Enter your credentials to continue.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  style={{ width: '100%', height: 44, border: '1.5px solid var(--grey-border)', borderRadius: 8, padding: '0 14px', fontFamily: 'var(--font)', fontSize: 14, color: 'var(--navy)', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 6 }}>
                  Password
                </label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ width: '100%', height: 44, border: '1.5px solid var(--grey-border)', borderRadius: 8, padding: '0 14px', fontFamily: 'var(--font)', fontSize: 14, color: 'var(--navy)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--grey-text)' }}>
                  <input type="checkbox" checked={keepSignedIn} onChange={(e) => setKeepSignedIn(e.target.checked)} />
                  Keep me signed in
                </label>
                <span style={{ fontSize: 13, color: 'var(--navy)', cursor: 'pointer', fontWeight: 700 }}>Forgot password?</span>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(232,35,42,0.08)', border: '1px solid rgba(232,35,42,0.2)', borderRadius: 7, marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={isLoading} style={{
                width: '100%', height: 46, background: isLoading ? 'var(--grey-text)' : 'var(--navy)',
                color: 'white', border: 'none', borderRadius: 8, fontFamily: 'var(--font)',
                fontSize: 14, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
              }}>
                {isLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        background: '#1B4D3E', padding: '16px 0',
        textAlign: 'center', fontSize: 13, color: '#E8232A',
        flexShrink: 0,
      }}>
        &copy; NEUK NET-TECH
      </footer>
    </div>
  );
}
