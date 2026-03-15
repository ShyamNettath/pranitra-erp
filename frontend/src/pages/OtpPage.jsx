import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import useAuthStore from '@/store/authStore';

export default function OtpPage() {
  const navigate = useNavigate();
  const { verifyOtp, pendingUserId, isLoading } = useAuthStore();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 min
  const inputs = useRef([]);

  useEffect(() => {
    if (!pendingUserId) navigate('/login');
    inputs.current[0]?.focus();
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  function handleDigit(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function handlePaste(e) {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setDigits(paste.split(''));
      inputs.current[5]?.focus();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length < 6) return setError('Please enter the full 6-digit code.');
    setError('');
    try {
      const data = await verifyOtp(pendingUserId, otp);
      if (data.user?.must_reset_password) {
        navigate('/force-reset-password');
      } else if (data.workspaces.length === 1) {
        const { selectWorkspace } = useAuthStore.getState();
        await selectWorkspace(data.workspaces[0].id);
        navigate('/');
      } else {
        navigate('/workspace');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
  }

  async function handleResend() {
    const api2 = api;
    await api2.post('/auth/resend-otp', { user_id: pendingUserId });
    setResent(true);
    setCountdown(600);
    setDigits(['', '', '', '', '', '']);
    inputs.current[0]?.focus();
  }

  const mins = String(Math.floor(countdown / 60)).padStart(2, '0');
  const secs = String(countdown % 60).padStart(2, '0');

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'var(--font)' }}>
      {/* Left panel */}
      <div style={{ width: '45%', background: 'var(--navy)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 8 }}>PRANITRA PM</div>
        <div style={{ fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 48 }}>INNOVATE. PARTNER. SUCCEED.</div>
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 8 }}>🔒 Why OTP?</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            PRANITRA PM enforces two-factor authentication for all users. This protects sensitive project data, financial information, and resource costing from unauthorised access.
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 8 }}>📧 Check your inbox</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            A 6-digit code has been sent to your registered company email. Check your spam folder if you don't see it within a minute.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'white', padding: '48px' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          {['Credentials', 'OTP Verify', 'Workspace'].map((step, i) => (
            <React.Fragment key={step}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: i === 0 ? 'var(--green)' : i === 1 ? 'var(--navy)' : 'var(--grey-bg)',
                  border: `2px solid ${i === 0 ? 'var(--green)' : i === 1 ? 'var(--navy)' : 'var(--grey-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  color: i <= 1 ? 'white' : 'var(--grey-text)',
                }}>{i === 0 ? '✓' : i + 1}</div>
                <span style={{ fontSize: 12, color: i === 1 ? 'var(--navy)' : 'var(--grey-text)', fontWeight: i === 1 ? 700 : 400 }}>{step}</span>
              </div>
              {i < 2 && <div style={{ width: 24, height: 1, background: i === 0 ? 'var(--green)' : 'var(--grey-border)' }} />}
            </React.Fragment>
          ))}
        </div>

        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>Enter Verification Code</h2>
          <p style={{ fontSize: 13, color: 'var(--grey-text)', marginBottom: 32 }}>
            A 6-digit code has been sent to your registered email address. This code expires in <strong style={{ color: countdown < 60 ? 'var(--red)' : 'var(--navy)' }}>{mins}:{secs}</strong>.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  style={{
                    width: 52, height: 60, textAlign: 'center',
                    fontSize: 24, fontWeight: 700, color: 'var(--navy)',
                    border: `2px solid ${d ? 'var(--navy)' : 'var(--grey-border)'}`,
                    borderRadius: 10, outline: 'none', fontFamily: 'var(--font)',
                    background: d ? 'var(--navy-xlight)' : 'white',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                />
              ))}
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(232,35,42,0.08)', border: '1px solid rgba(232,35,42,0.2)', borderRadius: 7, marginBottom: 16, fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>
                {error}
              </div>
            )}

            {resent && (
              <div style={{ padding: '10px 14px', background: 'rgba(10,122,121,0.08)', border: '1px solid rgba(10,122,121,0.2)', borderRadius: 7, marginBottom: 16, fontSize: 13, color: 'var(--green)', textAlign: 'center' }}>
                ✓ New code sent to your email.
              </div>
            )}

            <button type="submit" disabled={isLoading || digits.join('').length < 6} style={{
              width: '100%', height: 46,
              background: digits.join('').length === 6 ? 'var(--navy)' : 'var(--grey-border)',
              color: 'white', border: 'none', borderRadius: 8,
              fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700,
              cursor: digits.join('').length === 6 ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}>
              {isLoading ? 'Verifying…' : 'Verify & Continue →'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button onClick={handleResend} disabled={countdown > 540} style={{
              background: 'none', border: 'none', fontFamily: 'var(--font)',
              fontSize: 13, color: countdown > 540 ? 'var(--grey-text)' : 'var(--navy)',
              cursor: countdown > 540 ? 'default' : 'pointer', fontWeight: 700,
            }}>
              {countdown > 540 ? `Resend code in ${mins}:${secs}` : 'Resend code'}
            </button>
          </div>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--grey-text)', cursor: 'pointer' }}>
              ← Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
