import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import api from '@/services/api';

const ALL_NAV = [
  { key: 'dashboard',  to: '/',          label: 'Dashboard',  icon: '⊞' },
  { key: 'projects',   to: '/projects',  label: 'Projects',   icon: '▤' },
  { key: 'tasks',      to: '/tasks',     label: 'Tasks',      icon: '≡' },
  { key: 'gantt',      to: '/gantt',     label: 'Gantt',      icon: '▦' },
  { key: 'reports',    to: '/reports',   label: 'Reports',    icon: '📈' },
  { key: 'resources',  to: '/resources', label: 'Resources',  icon: '👥' },
  { key: 'hr-employees', to: '/hr-employees', label: 'Associates', icon: '👤' },
];

export default function AppShell() {
  const { user, workspace, workspaces, selectWorkspace, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isAdminOrSuper = user?.roles?.some(r => r === 'admin' || r === 'super_user');
  const isSuperUser = user?.roles?.includes('super_user');
  const isItWorkspace = workspace?.slug === 'it';
  const enabledModules = workspace?.modules;
  const NAV = ALL_NAV.filter(item => item.key === 'dashboard' || !enabledModules || enabledModules.includes(item.key));
  const adminLabel = (isSuperUser || isItWorkspace) ? 'Admin Panel' : 'Settings';

  const location = useLocation();
  const isEngineering = workspace?.slug === 'engineering';
  const [projectsExpanded, setProjectsExpanded] = useState(location.pathname.startsWith('/projects') || location.pathname.startsWith('/tasks') || location.pathname.startsWith('/gantt'));

  // User dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
    setPwLoading(true);
    try {
      await api.put('/users/me/password', { current_password: pwForm.current, new_password: pwForm.newPw });
      setPwSuccess(true);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPwForm({ current: '', newPw: '', confirm: '' });
        setPwSuccess(false);
        logout().then(() => navigate('/login'));
      }, 2000);
    } catch (err) {
      setPwError(err.response?.data?.error || 'Password change failed.');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* ── TOPBAR ─────────────────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--topbar-h)', background: '#1B4D3E',
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
          <span style={{ color: 'white', fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>usaha</span>
        </div>

        {/* Spacer — no nav items in topbar */}
        <div style={{ flex: 1 }} />

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {/* Workspace switcher */}
          {workspaces.length >= 1 && (
            <select
              value={workspace?.id || ''}
              onChange={(e) => selectWorkspace(e.target.value).then(() => navigate('/'))}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
              title="Switch workspace"
              style={{
                padding: '6px 12px', background: 'rgba(255,255,255,0.08)',
                border: '1px solid white', borderRadius: 6,
                color: 'white', fontFamily: 'var(--font)', fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} style={{ background: '#1B4D3E', color: 'white' }}>{ws.name}</option>
              ))}
            </select>
          )}

          {/* User dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '5px 10px 5px 6px',
              background: dropdownOpen ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
              border: '1px solid white', borderRadius: 8,
              cursor: 'pointer',
            }} onClick={() => setDropdownOpen(!dropdownOpen)} title="Account menu">
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--red)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white',
              }}>
                {user?.name?.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'white' }}>
                {user?.name}
              </span>
            </div>

            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                width: 240, background: 'white', borderRadius: 10,
                border: '1px solid var(--grey-border)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                overflow: 'hidden', zIndex: 200,
              }}>
                {/* User info */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--grey-border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--grey-text)' }}>{user?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--grey-text)', marginTop: 2 }}>{user?.email}</div>
                </div>

                {/* Menu items */}
                <div style={{ padding: '6px 0' }}>
                  <button
                    onClick={() => { setDropdownOpen(false); setShowPasswordModal(true); }}
                    title="Change your password"
                    style={{
                      width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                      fontFamily: 'var(--font)', fontSize: 13, color: 'var(--navy)',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--grey-bg)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    Change Password
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); logout().then(() => navigate('/login')); }}
                    title="Sign out of your account"
                    style={{
                      width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                      fontFamily: 'var(--font)', fontSize: 13, color: 'var(--red)', fontWeight: 700,
                      cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--grey-bg)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
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
          <div style={{ padding: '16px 12px', flex: 1 }}>
            {NAV.map(({ to, label, icon, key }) => {
              const isProjectsParent = key === 'projects' && isEngineering;
              const projectSubItems = [
                { to: '/projects', label: 'Overview' },
                { to: '/tasks', label: 'Tasks' },
                { to: '/gantt', label: 'Gantt' },
              ];
              const projectsActive = location.pathname.startsWith('/projects') || location.pathname.startsWith('/tasks') || location.pathname.startsWith('/gantt');

              if (isProjectsParent) {
                // Skip tasks and gantt from main nav — they are sub-items
                return (
                  <div key={to}>
                    <div
                      onClick={() => setProjectsExpanded(!projectsExpanded)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 10px', borderRadius: 7, marginBottom: 1,
                        fontFamily: 'var(--font)', fontSize: 13,
                        color: projectsActive ? 'var(--navy)' : 'var(--grey-text)',
                        background: projectsActive && !projectsExpanded ? 'var(--navy-xlight)' : 'transparent',
                        fontWeight: projectsActive ? 700 : 400,
                        cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', userSelect: 'none',
                      }}
                    >
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                      {sidebarOpen && <>
                        <span style={{ flex: 1 }}>{label}</span>
                        <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: projectsExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                      </>}
                    </div>
                    {projectsExpanded && sidebarOpen && (
                      <div style={{ marginLeft: 24 }}>
                        {projectSubItems.map(sub => (
                          <NavLink key={sub.to} to={sub.to} end={sub.to === '/projects'} style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '7px 10px', borderRadius: 6, marginBottom: 1,
                            fontFamily: 'var(--font)', fontSize: 12,
                            color: isActive ? 'var(--navy)' : 'var(--grey-text)',
                            background: isActive ? 'var(--navy-xlight)' : 'transparent',
                            fontWeight: isActive ? 700 : 400,
                            textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
                          })}>
                            {sub.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // For engineering workspace, skip tasks and gantt from main nav (they are sub-items of Projects)
              if (isEngineering && (key === 'tasks' || key === 'gantt')) return null;

              return (
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
              );
            })}

            {/* Admin Panel — visible to admin / super_user in any workspace */}
            {isAdminOrSuper && (
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
                {sidebarOpen && adminLabel}
              </NavLink>
            )}

            {/* Settings — visible to non-admin users */}
            {!isAdminOrSuper && (
              <NavLink to="/settings" style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 7, marginTop: 16,
                fontFamily: 'var(--font)', fontSize: 13,
                color: isActive ? 'var(--navy)' : 'var(--grey-text)',
                background: isActive ? 'var(--navy-xlight)' : 'transparent',
                fontWeight: isActive ? 700 : 400,
                textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
              })}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>⚙</span>
                {sidebarOpen && 'Settings'}
              </NavLink>
            )}
          </div>

          {/* Collapse toggle */}
          <div style={{
            padding: '12px', borderTop: '1px solid var(--grey-border)',
            display: 'flex', justifyContent: sidebarOpen ? 'flex-end' : 'center',
          }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'} style={{
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
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--grey-bg)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <Outlet />
          </div>
          {/* Persistent footer */}
          <footer style={{
            height: 32, flexShrink: 0, background: '#1B4D3E',
            display: 'flex', alignItems: 'center', paddingLeft: 32,
            fontSize: 12, color: '#1B4D3E',
          }}>
            &copy; NEUK NET-TECH
          </footer>
        </main>
      </div>

      {/* ── Change Password Modal ──────────────────────── */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
        }} onClick={() => { setShowPasswordModal(false); setPwError(''); setPwSuccess(false); setPwForm({ current: '', newPw: '', confirm: '' }); }}>
          <div style={{
            background: 'white', borderRadius: 12, padding: 28, width: 400,
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', marginBottom: 20 }}>Change Password</h3>

            {pwSuccess ? (
              <div style={{ padding: '16px 20px', background: 'rgba(10,122,121,0.08)', border: '1px solid rgba(10,122,121,0.2)', borderRadius: 8, fontSize: 14, fontWeight: 700, color: 'var(--green)', textAlign: 'center' }}>
                Password changed successfully. Signing out…
              </div>
            ) : (
              <form onSubmit={handleChangePassword}>
                {[
                  { key: 'current', label: 'Current Password', placeholder: 'Enter current password' },
                  { key: 'newPw', label: 'New Password', placeholder: 'Minimum 8 characters' },
                  { key: 'confirm', label: 'Confirm New Password', placeholder: 'Re-enter new password' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--grey-text)', marginBottom: 6 }}>{label}</label>
                    <input
                      type="password" required value={pwForm[key]}
                      onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                      placeholder={placeholder}
                      style={{ width: '100%', height: 40, border: '1.5px solid var(--grey-border)', borderRadius: 7, padding: '0 12px', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--navy)', outline: 'none' }}
                    />
                  </div>
                ))}

                {pwError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(232,35,42,0.08)', border: '1px solid rgba(232,35,42,0.2)', borderRadius: 7, marginBottom: 14, fontSize: 13, color: 'var(--red)' }}>
                    {pwError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setShowPasswordModal(false); setPwError(''); setPwForm({ current: '', newPw: '', confirm: '' }); }} style={{ padding: '8px 16px', background: 'white', border: '1.5px solid var(--grey-border)', borderRadius: 7, fontFamily: 'var(--font)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={pwLoading} style={{ padding: '8px 16px', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: 7, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, cursor: pwLoading ? 'not-allowed' : 'pointer' }}>
                    {pwLoading ? 'Saving…' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
