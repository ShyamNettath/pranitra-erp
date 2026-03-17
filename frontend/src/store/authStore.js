import { create } from 'zustand';
import api from '../services/api';

const _token = sessionStorage.getItem('pranitra_access_token');

const useAuthStore = create((set, get) => ({
  user:            null,
  workspace:       null,
  workspaces:      [],
  accessToken:     _token,
  isInitializing:  !!_token,   // true if token exists on load — wait for loadMe before redirecting
  isLoading:       false,
  loginStep:       'credentials',
  pendingUserId:   null,

  // Step 1 — submit email + password
  submitCredentials: async (email, password) => {
    set({ isLoading: true });
    const { data } = await api.post('/auth/login', { email, password });

    if (data.step === 'complete') {
      sessionStorage.setItem('pranitra_access_token', data.access_token);
      sessionStorage.setItem('pranitra_refresh_token', data.refresh_token);
      set({
        user:           data.user,
        workspaces:     data.workspaces || [],
        accessToken:    data.access_token,
        loginStep:      'workspace',
        isLoading:      false,
        isInitializing: false,
      });
      return data;
    }

    // MFA (TOTP) required
    if (data.requiresMfa) {
      set({ loginStep: 'mfa', pendingUserId: data.userId, isLoading: false });
      return data;
    }

    // OTP is enabled — go to OTP step
    set({ loginStep: 'otp', pendingUserId: data.user_id, isLoading: false });
    return data;
  },

  // Step 2a — verify TOTP (Authenticator app)
  verifyTotp: async (userId, token) => {
    set({ isLoading: true });
    const { data } = await api.post('/totp/verify', { userId, token });
    sessionStorage.setItem('pranitra_access_token', data.access_token);
    sessionStorage.setItem('pranitra_refresh_token', data.refresh_token);
    set({
      user:           data.user,
      workspaces:     data.workspaces || [],
      accessToken:    data.access_token,
      loginStep:      'workspace',
      isLoading:      false,
      isInitializing: false,
    });
    return data;
  },

  // Step 2b — verify OTP
  verifyOtp: async (userId, otp) => {
    set({ isLoading: true });
    const { data } = await api.post('/auth/verify-otp', { user_id: userId, otp });
    sessionStorage.setItem('pranitra_access_token', data.access_token);
    sessionStorage.setItem('pranitra_refresh_token', data.refresh_token);
    set({
      user:           data.user,
      workspaces:     data.workspaces || [],
      accessToken:    data.access_token,
      loginStep:      'workspace',
      isLoading:      false,
      isInitializing: false,
    });
    return data;
  },

  // Step 3 — select workspace
  selectWorkspace: async (workspaceId) => {
    set({ isLoading: true });
    const { data } = await api.post('/auth/select-workspace', { workspace_id: workspaceId });
    sessionStorage.setItem('pranitra_access_token', data.access_token || sessionStorage.getItem('pranitra_access_token'));
    sessionStorage.setItem('pranitra_refresh_token', data.refresh_token || sessionStorage.getItem('pranitra_refresh_token'));
    if (data.workspace) sessionStorage.setItem('pranitra_selected_workspace', JSON.stringify(data.workspace));
    set({ workspace: data.workspace, loginStep: 'done', isLoading: false });
    return data;
  },

  // Load current user from token (called on app mount when token exists but user is null)
  loadMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      const savedWs = sessionStorage.getItem('pranitra_selected_workspace');
      const workspace = savedWs ? JSON.parse(savedWs) : null;
      set({ user: data, workspaces: data.workspaces, workspace, isInitializing: false });
    } catch {
      get().logout();
    }
  },

  logout: async () => {
    const refreshToken = sessionStorage.getItem('pranitra_refresh_token');
    try { await api.post('/auth/logout', { refresh_token: refreshToken }); } catch {}
    sessionStorage.removeItem('pranitra_access_token');
    sessionStorage.removeItem('pranitra_refresh_token');
    sessionStorage.removeItem('pranitra_selected_workspace');
    set({ user: null, workspace: null, accessToken: null, loginStep: 'credentials', isInitializing: false });
  },
}));

export default useAuthStore;
