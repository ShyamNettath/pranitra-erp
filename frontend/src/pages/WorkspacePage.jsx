import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import axios from 'axios';

const WS_COLORS = ['var(--navy)', '#E8232A', '#0A7A79', '#5A2D8A', '#B86A00'];

export default function WorkspacePage() {
  const navigate = useNavigate();
  const { user, workspaces, selectWorkspace, isLoading } = useAuthStore();
  const [selected, setSelected] = useState(null);
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: 'var(--font)', background: '#FFFFFF' }}>
      {/* Tool name top left */}
      <div style={{ padding: '32px 0 0 48px' }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: branding.primary_color || 'var(--primary-color)', letterSpacing: -0.5 }}>usaha</span>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
        {/* Left — branding */}
        <div style={{
          width: '45%', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '48px',
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
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', textAlign: 'center' }}>
              {branding.company_name}
            </div>
          )}
        </div>

        {/* Right — workspace selector */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '48px' }}>
          <div style={{ width: '100%', maxWidth: 460 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>Select Your Workspace</h2>
            <p style={{ fontSize: 13, color: 'var(--grey-text)', marginBottom: 28 }}>
              Welcome back, {user?.name?.split(' ')[0]}. Choose the workspace you want to enter.
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
              {isLoading ? 'Connecting…' : 'Enter Workspace'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        background: '#1A1A2E', padding: '16px 0',
        textAlign: 'center', fontSize: 13, color: '#CCCCCC',
        flexShrink: 0,
      }}>
        &copy; NEUK NET-TECH
      </footer>
    </div>
  );
}
