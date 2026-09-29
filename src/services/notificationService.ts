/**
 * notificationService.ts
 * Client-side service for fetching and managing system notifications from the backend.
 */
import { apiClient } from './apiClient';
import type { SystemNotification } from '../types';

export const notificationService = {
  /**
   * Fetch all notifications, optionally filtered to unread only.
   */
  async list(unreadOnly = false): Promise<SystemNotification[]> {
    const params = unreadOnly ? '?unread_only=true' : '';
    const res = await apiClient.get<SystemNotification[]>(`/notifications${params}`);
    return res || [];
  },

  /**
   * Mark a single notification as read.
   */
  async markRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`, { is_read: true });
  },

  /**
   * Mark all notifications as read.
   */
  async markAllRead(): Promise<void> {
    await apiClient.post('/notifications/read-all', {});
  },
};
