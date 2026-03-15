import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';

export default function MfaVerifyPage() {
  const navigate = useNavigate();
  const { pendingUserId, verifyTotp, isLoading } = useAuthStore();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  if (!pendingUserId) {
    navigate('/login', { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await verifyTotp(pendingUserId, token);
      if (data.user?.must_reset_password) {
        navigate('/force-reset-password');
      } else {
        navigate('/workspace');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Please try again.');
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'var(--font)' }}>
      {/* Left panel */}
      <div style={{
        width: '45%', background: 'var(--navy)', display: 'flex',
        flexDirection: 'column', justifyContent: 'center', padding: 48,
      }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 8 }}>PRANITRA PM</div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
            INNOVATE. PARTNER. SUCCEED.
          </div>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 16, lineHeight: 1.3 }}>
          Two-Factor Authentication
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          Your account is protected with an authenticator app. Enter the 6-digit code to continue.
        </p>
      </div>

      {/* Right panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'white', padding: 48,
      }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          {['Credentials', 'Authenticator', 'Workspace'].map((step, i) => (
            <React.Fragment key={step}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: i <= 1 ? 'var(--navy)' : 'var(--grey-bg)',
                  border: `2px solid ${i <= 1 ? 'var(--navy)' : 'var(--grey-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  color: i <= 1 ? 'white' : 'var(--grey-text)',
                }}>
                  {i === 0 ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 12, color: i <= 1 ? 'var(--navy)' : 'var(--grey-text)', fontWeight: i === 1 ? 700 : 400 }}>{step}</span>
              </div>
              {i < 2 && <div style={{ width: 24, height: 1, background: 'var(--grey-border)' }} />}
            </React.Fragment>
          ))}
        </div>

        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>Authenticator Verification</h2>
          <p style={{ fontSize: 13, color: 'var(--grey-text)', marginBottom: 32 }}>
            Enter the code from your Authenticator app.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 6 }}>
                6-Digit Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{
                  width: '100%', height: 52, border: '1.5px solid var(--grey-border)', borderRadius: 8,
                  padding: '0 14px', fontFamily: 'var(--font)', fontSize: 28, fontWeight: 700,
                  color: 'var(--navy)', textAlign: 'center', letterSpacing: 12, outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(232,35,42,0.08)', border: '1px solid rgba(232,35,42,0.2)', borderRadius: 7, marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading || token.length !== 6} style={{
              width: '100%', height: 46,
              background: isLoading || token.length !== 6 ? 'var(--grey-text)' : 'var(--navy)',
              color: 'white', border: 'none', borderRadius: 8, fontFamily: 'var(--font)',
              fontSize: 14, fontWeight: 700,
              cursor: isLoading || token.length !== 6 ? 'not-allowed' : 'pointer',
            }}>
              {isLoading ? 'Verifying…' : 'Verify →'}
            </button>
          </form>

          <button onClick={() => { useAuthStore.getState().logout(); navigate('/login'); }} style={{
            display: 'block', margin: '20px auto 0', background: 'none', border: 'none',
            color: 'var(--grey-text)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)',
          }}>
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
