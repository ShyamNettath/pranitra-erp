import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import api from '@/services/api';

export default function ForceResetPasswordPage() {
  const navigate = useNavigate();
  const { user, loadMe } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      await loadMe();
      navigate('/workspace');
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed.');
    } finally {
      setLoading(false);
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
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8, letterSpacing: -0.5 }}>usaha</div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
            INNOVATE. PARTNER. SUCCEED.
          </div>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'white', marginBottom: 16, lineHeight: 1.3 }}>
          Password Reset Required
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          Your administrator has required you to change your password before continuing. Please set a new secure password.
        </p>
      </div>

      {/* Right panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        background: 'white', padding: 48,
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>Change Your Password</h2>
          <p style={{ fontSize: 13, color: 'var(--grey-text)', marginBottom: 32 }}>
            Welcome, {user?.name}. Please set a new password to continue.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 6 }}>
                Current Password
              </label>
              <input
                type="password" required value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your temporary password"
                style={{ width: '100%', height: 44, border: '1.5px solid var(--grey-border)', borderRadius: 8, padding: '0 14px', fontFamily: 'var(--font)', fontSize: 14, color: 'var(--navy)', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 6 }}>
                New Password
              </label>
              <input
                type="password" required value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                style={{ width: '100%', height: 44, border: '1.5px solid var(--grey-border)', borderRadius: 8, padding: '0 14px', fontFamily: 'var(--font)', fontSize: 14, color: 'var(--navy)', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 6 }}>
                Confirm New Password
              </label>
              <input
                type="password" required value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                style={{ width: '100%', height: 44, border: '1.5px solid var(--grey-border)', borderRadius: 8, padding: '0 14px', fontFamily: 'var(--font)', fontSize: 14, color: 'var(--navy)', outline: 'none' }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(232,35,42,0.08)', border: '1px solid rgba(232,35,42,0.2)', borderRadius: 7, marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', height: 46, background: loading ? 'var(--grey-text)' : 'var(--navy)',
              color: 'white', border: 'none', borderRadius: 8, fontFamily: 'var(--font)',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Changing Password…' : 'Set New Password →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
