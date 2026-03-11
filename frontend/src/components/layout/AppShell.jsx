import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';

const NAV = [
  { to: '/',          label: 'Dashboard',  icon: '⊞' },
  { to: '/projects',  label: 'Projects',   icon: '▤' },
  { to: '/tasks',     label: 'Tasks',      icon: '≡' },
  { to: '/gantt',     label: 'Gantt',      icon: '▦' },
  { to: '/reports',   label: 'Reports',    icon: '📈' },
  { to: '/resources', label: 'Resources',  icon: '👥' },
];

export default function AppShell() {
  const { user, workspace, workspaces, selectWorkspace, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isAdmin = user?.roles?.includes('admin');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* ── TOPBAR ─────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--topbar-h)', background: 'var(--navy)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px 0 0', zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
      }}>
        {/* Logo area */}
        <div style={{
          width: 'var(--sidebar-w)', flexShrink: 0,
          display: 'flex', alignItems: 'center', padding: '0 20px',
          borderRight: '1px solid rgba(255,255,255,0.08)', height: '100%',
        }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>PRANITRA PM</span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 2, padding: '0 16px', flex: 1 }}>
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 14px', borderRadius: 6,
              fontFamily: 'var(--font)', fontSize: 13,
              color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
              background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
              fontWeight: isActive ? 700 : 400,
              textDecoration: 'none', whiteSpace: 'nowrap',
            })}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {/* Workspace switcher */}
          <select
            value={workspace?.id || ''}
            onChange={(e) => selectWorkspace(e.target.value).then(() => navigate('/'))}
            style={{
              padding: '6px 12px', background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
              color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font)', fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>

          {/* User */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '5px 10px 5px 6px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
            cursor: 'pointer',
          }} onClick={() => logout().then(() => navigate('/login'))}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--red)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white',
            }}>
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <span style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              {user?.name}
            </span>
          </div>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, marginTop: 'var(--topbar-h)', overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{
          width: sidebarOpen ? 'var(--sidebar-w)' : '52px',
          flexShrink: 0, background: 'white',
          borderRight: '1px solid var(--grey-border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', transition: 'width 0.2s',
        }}>
          {/* Sidebar nav items replicated */}
          <div style={{ padding: '16px 12px', flex: 1 }}>
            {NAV.map(({ to, label, icon }) => (
              <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 7, marginBottom: 1,
                fontFamily: 'var(--font)', fontSize: 13,
                color: isActive ? 'var(--navy)' : 'var(--grey-text)',
                background: isActive ? 'var(--navy-xlight)' : 'transparent',
                fontWeight: isActive ? 700 : 400,
                textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
              })}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                {sidebarOpen && label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 7, marginTop: 16,
                fontFamily: 'var(--font)', fontSize: 13,
                color: isActive ? 'var(--navy)' : 'var(--grey-text)',
                background: isActive ? 'var(--navy-xlight)' : 'transparent',
                fontWeight: isActive ? 700 : 400,
                textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
              })}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>⚙</span>
                {sidebarOpen && 'Admin Panel'}
              </NavLink>
            )}
          </div>

          {/* Collapse toggle */}
          <div style={{
            padding: '12px', borderTop: '1px solid var(--grey-border)',
            display: 'flex', justifyContent: sidebarOpen ? 'flex-end' : 'center',
          }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              width: 28, height: 28, borderRadius: 6,
              border: '1.5px solid var(--grey-border)', background: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--grey-text)',
            }}>
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--grey-bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
