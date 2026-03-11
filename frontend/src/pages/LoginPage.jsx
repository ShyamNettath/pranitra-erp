import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { submitCredentials, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await submitCredentials(email, password);
      navigate('/otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'var(--font)' }}>
      {/* ── Left panel ── */}
      <div style={{
        width: '45%', background: 'var(--navy)', display: 'flex',
        flexDirection: 'column', justifyContent: 'center', padding: '48px',
      }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 8 }}>
            PRANITRA PM
          </div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
            INNOVATE. PARTNER. SUCCEED.
          </div>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 16, lineHeight: 1.3 }}>
          Enterprise Project Management for Engineering Teams
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 40, lineHeight: 1.6 }}>
          Plan, track, and deliver complex engineering projects with full Design, Simulation, Planning, and Layout category support.
        </p>

        {[
          'Multi-workspace isolation',
          'Design → Simulation → Planning → Layout',
          'Director approval workflow',
          'Real-time Gantt & time tracking',
        ].map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(232,35,42,0.2)', border: '1px solid var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'var(--red)', fontSize: 10 }}>✓</span>
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{f}</span>
          </div>
        ))}
      </div>

      {/* ── Right panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'white', padding: '48px',
      }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          {['Credentials', 'OTP Verify', 'Workspace'].map((step, i) => (
            <React.Fragment key={step}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: i === 0 ? 'var(--navy)' : 'var(--grey-bg)',
                  border: `2px solid ${i === 0 ? 'var(--navy)' : 'var(--grey-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  color: i === 0 ? 'white' : 'var(--grey-text)',
                }}>{i + 1}</div>
                <span style={{ fontSize: 12, color: i === 0 ? 'var(--navy)' : 'var(--grey-text)', fontWeight: i === 0 ? 700 : 400 }}>{step}</span>
              </div>
              {i < 2 && <div style={{ width: 24, height: 1, background: 'var(--grey-border)' }} />}
            </React.Fragment>
          ))}
        </div>

        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>Sign in to PRANITRA PM</h2>
          <p style={{ fontSize: 13, color: 'var(--grey-text)', marginBottom: 32 }}>
            Enter your credentials to continue. An OTP will be sent to your email.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@pranitra.com"
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
              {isLoading ? 'Sending OTP…' : 'Continue to OTP Verification →'}
            </button>
          </form>

          <p style={{ marginTop: 24, fontSize: 12, color: 'var(--grey-text)', textAlign: 'center', lineHeight: 1.5 }}>
            🔒 Secure login with mandatory Email OTP verification.
            All sessions are encrypted and audited.
          </p>
        </div>
      </div>
    </div>
  );
}
