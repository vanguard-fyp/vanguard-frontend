import { apiClient, API_BASE_URL } from './apiClient';
import type { Page, UserAccount } from '../types';

export const userService = {
  /**
   * List all registered user accounts & officers
   */
  getUsers: async (): Promise<UserAccount[]> => {
    return apiClient.get<UserAccount[]>('/users');
  },

  /** Server-side page (SYSTEM_ADMIN). `exclude_self` leaves the signed-in admin out. */
  getUsersPage: async (params: {
    limit: number;
    offset: number;
    search?: string;
    role?: string;
    exclude_self?: boolean;
  }): Promise<Page<UserAccount>> => {
    return apiClient.get<Page<UserAccount>>('/users', { ...params, paginated: true });
  },

  /**
   * Create a new user account
   */
  createUser: async (user: Partial<UserAccount>): Promise<UserAccount> => {
    return apiClient.post<UserAccount>('/users', user);
  },

  /** Email a fresh invite link to an officer who has not set a password yet. */
  resendInvite: async (id: string): Promise<void> => {
    await apiClient.post<void>(`/users/${id}/resend-invite`);
  },

  /**
   * Update an existing user account
   */
  updateUser: async (id: string, updates: Partial<UserAccount>): Promise<UserAccount> => {
    return apiClient.patch<UserAccount>(`/users/${id}`, updates);
  },

  /**
   * Delete a user account
   */
  deleteUser: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/users/${id}`);
  },

  /**
   * Upload a profile avatar to Supabase storage bucket and return the public URL.
   */
  uploadAvatar: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const baseUrl = API_BASE_URL;
    const token = localStorage.getItem('vanguard_token');
    const res = await fetch(`${baseUrl}/users/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Avatar upload failed');
    }
    const data = await res.json();
    return data.url as string;
  },
};
