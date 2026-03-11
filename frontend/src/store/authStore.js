import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  user:          null,
  workspace:     null,
  workspaces:    [],
  accessToken:   localStorage.getItem('pranitra_access_token'),
  isLoading:     false,
  loginStep:     'credentials',  // credentials | otp | workspace
  pendingUserId: null,

  // Step 1 — submit email + password, get OTP
  submitCredentials: async (email, password) => {
    set({ isLoading: true });
    const { data } = await api.post('/auth/login', { email, password });
    set({ loginStep: 'otp', pendingUserId: data.user_id, isLoading: false });
    return data;
  },

  // Step 2 — verify OTP, get workspaces list
  verifyOtp: async (userId, otp) => {
    set({ isLoading: true });
    const { data } = await api.post('/auth/verify-otp', { user_id: userId, otp });
    localStorage.setItem('pranitra_access_token', data.access_token);
    set({
      user:          data.user,
      workspaces:    data.workspaces,
      accessToken:   data.access_token,
      loginStep:     data.workspaces.length === 1 ? 'workspace_auto' : 'workspace',
      isLoading:     false,
    });
    return data;
  },

  // Step 3 — select workspace, get workspace-scoped token
  selectWorkspace: async (workspaceId) => {
    set({ isLoading: true });
    const { data } = await api.post('/auth/select-workspace', { workspace_id: workspaceId });
    localStorage.setItem('pranitra_access_token', data.access_token);
    localStorage.setItem('pranitra_refresh_token', data.refresh_token);
    set({ workspace: data.workspace, accessToken: data.access_token, loginStep: 'done', isLoading: false });
    return data;
  },

  // Load current user from token
  loadMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, workspaces: data.workspaces });
    } catch { get().logout(); }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('pranitra_refresh_token');
    try { await api.post('/auth/logout', { refresh_token: refreshToken }); } catch {}
    localStorage.removeItem('pranitra_access_token');
    localStorage.removeItem('pranitra_refresh_token');
    set({ user: null, workspace: null, accessToken: null, loginStep: 'credentials' });
  },
}));

export default useAuthStore;
