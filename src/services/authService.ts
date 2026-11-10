import { apiClient } from './apiClient';
import type { UserRole } from '../types';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  agency: string;
  role: UserRole;
  status: string;
  lastActive?: string;
  permissions?: string[];
  avatar_url?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  user: UserProfile;
  permissions?: string[];
}

// Roles allowed to access the web Command Centre.
// Citizens and bots authenticate through the mobile app only.
export const WEB_ADMIN_ROLES: ReadonlySet<UserRole> = new Set([
  'NADMA Lead Officer',
  'Disaster Management Officer',
]);

export const authService = {
  /**
   * Authenticate with email & password via the FastAPI backend.
   * The backend calls supabase.auth.sign_in_with_password(), verifies the
   * role, and returns a signed JWT pair + user profile.
   */
  login: async (email: string, password: string): Promise<TokenResponse> => {
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

  /** An invited officer sets their password with the token from the invite link. */
  setPassword: async (accessToken: string, password: string): Promise<{ email: string }> => {
    return apiClient.post<{ email: string }>('/auth/set-password', { access_token: accessToken, password });
  },

  /**
   * Exchange the active refresh token for a fresh access + refresh token pair.
   */
  refreshToken: async (): Promise<TokenResponse> => {
    const refreshToken = localStorage.getItem('vanguard_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available. Please sign in again.');
    }
    const res = await apiClient.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
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
   * Fetch current authenticated user profile from the backend.
   */
  getCurrentUser: async (): Promise<UserProfile> => {
    return apiClient.get<UserProfile>('/auth/me');
  },

  /**
   * Sign out — clears local storage.
   * Token invalidation is stateless (JWT); this is a client-side clear.
   */
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout — always clear local state.
    } finally {
      localStorage.removeItem('vanguard_token');
      localStorage.removeItem('vanguard_refresh_token');
      localStorage.removeItem('vanguard_user');
    }
  },

  /** Retrieve the active access token from storage. */
  getToken: (): string | null => localStorage.getItem('vanguard_token'),

  /** Retrieve the active refresh token from storage. */
  getRefreshToken: (): string | null => localStorage.getItem('vanguard_refresh_token'),

  /** Retrieve the stored user profile from storage. */
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
