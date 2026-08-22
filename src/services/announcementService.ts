import { apiClient } from './apiClient';
import type { PublicAnnouncement } from '../types';

export const announcementService = {
  /**
   * Fetch all broadcast announcements & evacuation orders
   */
  getAnnouncements: async (): Promise<PublicAnnouncement[]> => {
    return apiClient.get<PublicAnnouncement[]>('/announcements');
  },

  /**
   * Publish a new official emergency broadcast
   */
  createAnnouncement: async (announcement: Partial<PublicAnnouncement>): Promise<PublicAnnouncement> => {
    return apiClient.post<PublicAnnouncement>('/announcements', announcement);
  },

  /**
   * Update announcement (e.g. toggle active status or edit details)
   */
  updateAnnouncement: async (id: string, updates: Partial<PublicAnnouncement>): Promise<PublicAnnouncement> => {
    return apiClient.patch<PublicAnnouncement>(`/announcements/${id}`, updates);
  },

  /**
   * Delete an announcement broadcast
   */
  deleteAnnouncement: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/announcements/${id}`);
  },
};
