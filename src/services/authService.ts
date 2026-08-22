import { apiClient } from './apiClient';
import type { UserRole } from '../types';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    name: string;
    email: string;
    agency: string;
    role: UserRole;
    status: string;
    lastActive?: string;
  };
}

export const authService = {
  /**
   * Authenticate with email & password
   */
  login: async (email: string, password: string = 'password'): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/auth/login', { email, password });
    if (res.access_token) {
      localStorage.setItem('vanguard_token', res.access_token);
      localStorage.setItem('vanguard_user', JSON.stringify(res.user));
    }
    return res;
  },

  /**
   * Acquire a signed demo JWT token for quick role switching
   */
  getDemoToken: async (role: UserRole): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>(`/auth/demo-token?role=${encodeURIComponent(role)}`);
    if (res.access_token) {
      localStorage.setItem('vanguard_token', res.access_token);
      localStorage.setItem('vanguard_user', JSON.stringify(res.user));
    }
    return res;
  },

  /**
   * Fetch current authenticated user profile
   */
  getCurrentUser: async () => {
    return apiClient.get<any>('/auth/me');
  },

  /**
   * Clear active auth session
   */
  logout: () => {
    localStorage.removeItem('vanguard_token');
    localStorage.removeItem('vanguard_user');
  },

  /**
   * Retrieve active session token
   */
  getToken: (): string | null => {
    return localStorage.getItem('vanguard_token');
  },
};
