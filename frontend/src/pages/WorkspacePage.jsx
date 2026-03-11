import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';

const WS_COLORS = ['#003264', '#E8232A', '#0A7A79', '#5A2D8A', '#B86A00'];

export default function WorkspacePage() {
  const navigate = useNavigate();
  const { user, workspaces, selectWorkspace, isLoading } = useAuthStore();
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  async function handleContinue() {
    if (!selected) return;
    setError('');
    try {
      await selectWorkspace(selected);
      navigate('/');
    } catch {
      setError('Failed to connect to workspace. Please try again.');
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'var(--font)' }}>
      {/* Left */}
      <div style={{ width: '45%', background: 'var(--navy)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 8 }}>PRANITRA PM</div>
        <div style={{ fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 48 }}>INNOVATE. PARTNER. SUCCEED.</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 12 }}>Welcome back, {user?.name?.split(' ')[0]}!</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 32 }}>
          Your account has access to {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}. Each workspace is fully isolated with its own projects, members, and data.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 20 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            You can switch between workspaces at any time using the workspace switcher in the top navigation bar.
          </p>
        </div>
      </div>

      {/* Right */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'white', padding: '48px' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
          {['Credentials', 'OTP Verify', 'Workspace'].map((step, i) => (
            <React.Fragment key={step}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: i < 2 ? 'var(--green)' : 'var(--navy)',
                  border: `2px solid ${i < 2 ? 'var(--green)' : 'var(--navy)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'white',
                }}>{i < 2 ? '✓' : '3'}</div>
                <span style={{ fontSize: 12, color: i === 2 ? 'var(--navy)' : 'var(--grey-text)', fontWeight: i === 2 ? 700 : 400 }}>{step}</span>
              </div>
              {i < 2 && <div style={{ width: 24, height: 1, background: 'var(--green)' }} />}
            </React.Fragment>
          ))}
        </div>

        <div style={{ width: '100%', maxWidth: 460 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>Select Your Workspace</h2>
          <p style={{ fontSize: 13, color: 'var(--grey-text)', marginBottom: 28 }}>
            Choose the workspace you want to enter. You can switch workspaces anytime.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {workspaces.map((ws, idx) => (
              <div
                key={ws.id}
                onClick={() => setSelected(ws.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 18px', border: `2px solid ${selected === ws.id ? 'var(--navy)' : 'var(--grey-border)'}`,
                  borderRadius: 10, cursor: 'pointer',
                  background: selected === ws.id ? 'var(--navy-xlight)' : 'white',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: ws.color || WS_COLORS[idx % WS_COLORS.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0,
                }}>
                  {ws.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', marginBottom: 2 }}>{ws.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-text)' }}>{ws.slug}</div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: `2px solid ${selected === ws.id ? 'var(--navy)' : 'var(--grey-border)'}`,
                  background: selected === ws.id ? 'var(--navy)' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {selected === ws.id && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(232,35,42,0.08)', border: '1px solid rgba(232,35,42,0.2)', borderRadius: 7, marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={!selected || isLoading}
            style={{
              width: '100%', height: 46,
              background: selected ? 'var(--navy)' : 'var(--grey-border)',
              color: 'white', border: 'none', borderRadius: 8,
              fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700,
              cursor: selected ? 'pointer' : 'not-allowed', transition: 'background 0.2s',
            }}
          >
            {isLoading ? 'Connecting…' : 'Enter Workspace →'}
          </button>
        </div>
      </div>
    </div>
  );
}
