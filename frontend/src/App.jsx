import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import '@/styles/globals.css';

import useAuthStore from '@/store/authStore';
import LoginPage       from '@/pages/LoginPage';
import OtpPage         from '@/pages/OtpPage';
import WorkspacePage   from '@/pages/WorkspacePage';
import DashboardPage   from '@/pages/DashboardPage';
import ProjectsPage    from '@/pages/ProjectsPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import TasksPage       from '@/pages/TasksPage';
import GanttPage       from '@/pages/GanttPage';
import ReportsPage     from '@/pages/ReportsPage';
import ResourcesPage   from '@/pages/ResourcesPage';
import AdminPage       from '@/pages/AdminPage';
import MfaSetupPage    from '@/pages/MfaSetupPage';
import MfaVerifyPage   from '@/pages/MfaVerifyPage';
import ForceResetPasswordPage from '@/pages/ForceResetPasswordPage';
import SettingsPage    from '@/pages/SettingsPage';
import AppShell        from '@/components/layout/AppShell';

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

function RequireAuth({ children }) {
  const { user, accessToken } = useAuthStore();
  if (!accessToken || !user) return <Navigate to="/login" replace />;
  return children;
}

function RequirePasswordReset({ children }) {
  const { user } = useAuthStore();
  if (user?.must_reset_password) return <Navigate to="/force-reset-password" replace />;
  return children;
}

function RequireWorkspace({ children }) {
  const { workspace } = useAuthStore();
  if (!workspace) return <Navigate to="/workspace" replace />;
  return children;
}

export default function App() {
  const { accessToken, loadMe, user } = useAuthStore();

  useEffect(() => {
    if (accessToken && !user) loadMe();
  }, [accessToken]);

  // Fetch branding and apply primary color globally
  useEffect(() => {
    axios.get('/api/settings/branding').then(r => {
      if (r.data.primary_color) {
        document.documentElement.style.setProperty('--primary-color', r.data.primary_color);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onBlur = (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
      if (t.type === 'email' || t.type === 'url') return;
      const value = t.value;
      if (typeof value === 'string' && value.trim().length > 0) {
        t.value = value.toUpperCase();
      }
    };
    document.addEventListener('blur', onBlur, true);
    return () => document.removeEventListener('blur', onBlur, true);
  }, []);

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          {/* Auth flow */}
          <Route path="/login"     element={<LoginPage />} />
          <Route path="/otp"       element={<OtpPage />} />
          <Route path="/mfa-verify" element={<MfaVerifyPage />} />
          <Route path="/force-reset-password" element={<RequireAuth><ForceResetPasswordPage /></RequireAuth>} />
          <Route path="/workspace" element={<RequireAuth><RequirePasswordReset><WorkspacePage /></RequirePasswordReset></RequireAuth>} />

          {/* App — requires auth + workspace */}
          <Route path="/" element={
            <RequireAuth>
              <RequirePasswordReset>
                <RequireWorkspace>
                  <AppShell />
                </RequireWorkspace>
              </RequirePasswordReset>
            </RequireAuth>
          }>
            <Route index                         element={<DashboardPage />} />
            <Route path="projects"               element={<ProjectsPage />} />
            <Route path="projects/:id"           element={<ProjectDetailPage />} />
            <Route path="tasks"                  element={<TasksPage />} />
            <Route path="gantt"                  element={<GanttPage />} />
            <Route path="reports"                element={<ReportsPage />} />
            <Route path="resources"              element={<ResourcesPage />} />
            <Route path="admin"                  element={<AdminPage />} />
            <Route path="settings"               element={<SettingsPage />} />
            <Route path="mfa-setup"              element={<MfaSetupPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
