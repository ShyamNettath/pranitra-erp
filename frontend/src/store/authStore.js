import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  user:          null,
  workspace:     null,
  workspaces:    [],
  accessToken:   localStorage.getItem('pranitra_access_token'),
  isLoading:     false,
  loginStep:     'credentials',
  pendingUserId: null,

  // Step 1 — submit email + password
  submitCredentials: async (email, password) => {
    set({ isLoading: true });
    const { data } = await api.post('/auth/login', { email, password });

    // If OTP is disabled — server returns step: 'complete' with tokens directly
    if (data.step === 'complete') {
  	localStorage.setItem('pranitra_access_token', data.access_token);
  	localStorage.setItem('pranitra_refresh_token', data.refresh_token);
  	set({
   	 user:        data.user,
    	 workspaces:  data.workspaces || [],
    	 accessToken: data.access_token,
    	 loginStep:   'workspace',
     isLoading:   false,
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
    localStorage.setItem('pranitra_access_token', data.access_token);
    localStorage.setItem('pranitra_refresh_token', data.refresh_token);
    set({
      user:        data.user,
      workspaces:  data.workspaces || [],
      accessToken: data.access_token,
      loginStep:   'workspace',
      isLoading:   false,
    });
    return data;
  },

  // Step 2b — verify OTP
  verifyOtp: async (userId, otp) => {
    set({ isLoading: true });
    const { data } = await api.post('/auth/verify-otp', { user_id: userId, otp });
    localStorage.setItem('pranitra_access_token', data.access_token);
    localStorage.setItem('pranitra_refresh_token', data.refresh_token);
    set({
      user:        data.user,
      workspaces:  data.user?.workspaces || [],
      accessToken: data.access_token,
      loginStep:   'workspace',
      isLoading:   false,
    });
    return data;
  },

  // Step 3 — select workspace
  selectWorkspace: async (workspaceId) => {
    set({ isLoading: true });
    const { data } = await api.post('/auth/select-workspace', { workspace_id: workspaceId });
    localStorage.setItem('pranitra_access_token', data.access_token || localStorage.getItem('pranitra_access_token'));
    localStorage.setItem('pranitra_refresh_token', data.refresh_token || localStorage.getItem('pranitra_refresh_token'));
    set({ workspace: data.workspace, loginStep: 'done', isLoading: false });
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