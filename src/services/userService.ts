import { apiClient } from './apiClient';
import type { UserAccount } from '../types';

export const userService = {
  /**
   * List all registered user accounts & officers
   */
  getUsers: async (): Promise<UserAccount[]> => {
    return apiClient.get<UserAccount[]>('/users');
  },

  /**
   * Create a new user account
   */
  createUser: async (user: Partial<UserAccount>): Promise<UserAccount> => {
    return apiClient.post<UserAccount>('/users', user);
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
};
