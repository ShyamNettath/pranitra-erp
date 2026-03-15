import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export default function MfaSetupPage() {
  const navigate = useNavigate();
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  async function handleSetup() {
    setSetupLoading(true);
    setError('');
    try {
      const { data } = await api.post('/totp/setup');
      setQrCodeUrl(data.qrCodeDataUrl);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate QR code');
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/totp/verify-setup', { token });
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 28, maxWidth: 520, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--grey-text)', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>
        ← Back
      </button>

      <div style={{ background: 'white', border: '1px solid var(--grey-border)', borderRadius: 10, padding: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>Set Up Authenticator App</h2>
        <p style={{ fontSize: 13, color: 'var(--grey-text)', marginBottom: 24, lineHeight: 1.5 }}>
          Add an extra layer of security to your account using Microsoft Authenticator or Google Authenticator.
        </p>

        {success ? (
          <div style={{ padding: '16px 20px', background: 'rgba(10,122,121,0.08)', border: '1px solid rgba(10,122,121,0.2)', borderRadius: 8, fontSize: 14, fontWeight: 700, color: 'var(--green)', textAlign: 'center' }}>
            MFA enabled successfully. Redirecting to dashboard…
          </div>
        ) : !qrCodeUrl ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--grey-text)', marginBottom: 20 }}>
              Click the button below to generate a QR code for your authenticator app.
            </p>
            <button onClick={handleSetup} disabled={setupLoading} style={{
              padding: '10px 24px', background: 'var(--navy)', color: 'white', border: 'none',
              borderRadius: 8, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700,
              cursor: setupLoading ? 'not-allowed' : 'pointer',
            }}>
              {setupLoading ? 'Generating…' : 'Generate QR Code'}
            </button>
          </div>
        ) : (
          <div>
            {/* Step 1: QR Code */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 10 }}>
                Step 1 — Scan this QR code
              </div>
              <p style={{ fontSize: 13, color: 'var(--grey-text)', marginBottom: 16, lineHeight: 1.5 }}>
                Open Microsoft Authenticator or Google Authenticator on your phone and scan the QR code below.
              </p>
              <div style={{ textAlign: 'center', padding: 16, background: 'var(--grey-bg)', borderRadius: 8 }}>
                <img src={qrCodeUrl} alt="TOTP QR Code" style={{ width: 200, height: 200 }} />
              </div>
            </div>

            {/* Step 2: Verify */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 10 }}>
                Step 2 — Enter the 6-digit code
              </div>
              <p style={{ fontSize: 13, color: 'var(--grey-text)', marginBottom: 12 }}>
                Enter the code shown in your authenticator app to verify setup.
              </p>
              <form onSubmit={handleVerify} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={{
                    width: 140, height: 44, border: '1.5px solid var(--grey-border)', borderRadius: 8,
                    padding: '0 14px', fontFamily: 'var(--font)', fontSize: 20, fontWeight: 700,
                    color: 'var(--navy)', textAlign: 'center', letterSpacing: 8, outline: 'none',
                  }}
                />
                <button type="submit" disabled={loading || token.length !== 6} style={{
                  height: 44, padding: '0 20px',
                  background: loading || token.length !== 6 ? 'var(--grey-text)' : 'var(--navy)',
                  color: 'white', border: 'none', borderRadius: 8, fontFamily: 'var(--font)',
                  fontSize: 14, fontWeight: 700, cursor: loading || token.length !== 6 ? 'not-allowed' : 'pointer',
                }}>
                  {loading ? 'Verifying…' : 'Confirm'}
                </button>
              </form>
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(232,35,42,0.08)', border: '1px solid rgba(232,35,42,0.2)', borderRadius: 7, fontSize: 13, color: 'var(--red)' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
