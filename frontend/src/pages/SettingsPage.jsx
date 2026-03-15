import React from 'react';
import useAuthStore from '@/store/authStore';

export default function SettingsPage() {
  const { workspace } = useAuthStore();

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', marginBottom: 3 }}>Settings</h1>
      <p style={{ fontSize: 13, color: 'var(--grey-text)', marginBottom: 24 }}>{workspace?.name} workspace settings</p>

      <div style={{ background: 'white', border: '1px solid var(--grey-border)', borderRadius: 10, padding: 32, textAlign: 'center', color: 'var(--grey-text)', fontSize: 14 }}>
        Workspace settings will be available here in a future update.
      </div>
    </div>
  );
}
