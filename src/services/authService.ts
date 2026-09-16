import { apiClient } from './apiClient';
import type { UserRole } from '../types';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  agency: string;
  role: UserRole;
  status: string;
  lastActive?: string;
  permissions?: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  user: UserProfile;
  permissions?: string[];
}

export const authService = {
  /**
   * Authenticate with email & password
   */
  login: async (email: string, password: string = 'password'): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/auth/login', { email, password });
    if (res.access_token) {
      localStorage.setItem('vanguard_token', res.access_token);
      if (res.refresh_token) {
        localStorage.setItem('vanguard_refresh_token', res.refresh_token);
      }
      localStorage.setItem('vanguard_user', JSON.stringify(res.user));
    }
    return res;
  },

  /**
   * Exchange active refresh token for a fresh access token
   */
  refreshToken: async (): Promise<TokenResponse> => {
    const refreshToken = localStorage.getItem('vanguard_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const res = await apiClient.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken });
    if (res.access_token) {
      localStorage.setItem('vanguard_token', res.access_token);
      if (res.refresh_token) {
        localStorage.setItem('vanguard_refresh_token', res.refresh_token);
      }
      localStorage.setItem('vanguard_user', JSON.stringify(res.user));
    }
    return res;
  },

  /**
   * Acquire a signed demo JWT token for quick role switching
   */
  getDemoToken: async (role: UserRole = 'NADMA Lead Officer'): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>(`/auth/demo-token?role=${encodeURIComponent(role)}`);
    if (res.access_token) {
      localStorage.setItem('vanguard_token', res.access_token);
      if (res.refresh_token) {
        localStorage.setItem('vanguard_refresh_token', res.refresh_token);
      }
      localStorage.setItem('vanguard_user', JSON.stringify(res.user));
    }
    return res;
  },

  /**
   * Fetch current authenticated user profile
   */
  getCurrentUser: async (): Promise<UserProfile> => {
    return apiClient.get<UserProfile>('/auth/me');
  },

  /**
   * Clear active auth session
   */
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore network logout errors
    } finally {
      localStorage.removeItem('vanguard_token');
      localStorage.removeItem('vanguard_refresh_token');
      localStorage.removeItem('vanguard_user');
    }
  },

  /**
   * Retrieve active session token
   */
  getToken: (): string | null => {
    return localStorage.getItem('vanguard_token');
  },

  /**
   * Retrieve active refresh token
   */
  getRefreshToken: (): string | null => {
    return localStorage.getItem('vanguard_refresh_token');
  },

  /**
   * Retrieve stored user from localStorage
   */
  getStoredUser: (): UserProfile | null => {
    const data = localStorage.getItem('vanguard_user');
    if (!data) return null;
    try {
      return JSON.parse(data) as UserProfile;
    } catch {
      return null;
    }
  },
};
