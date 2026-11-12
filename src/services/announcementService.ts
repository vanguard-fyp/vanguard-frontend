import { apiClient } from './apiClient';
import type { Page, PublicAnnouncement, PushJob } from '../types';

export interface AnnouncementPageParams {
  limit: number;
  offset: number;
  search?: string;
  category?: string;
  severity?: string;
  active?: boolean;
  sort?: 'latest' | 'active';
}

export interface BroadcastDraftInput {
  title: string;
  category: PublicAnnouncement['category'];
  severity: string;
  target_state?: string;
  target_districts?: string[];
}

export interface BroadcastDraft {
  content: string;
  /** llm = written by the AI; template = standard hazard template (AI unavailable) */
  source: 'llm' | 'template';
  reason?: string;
  unsupported_numbers?: string[];
  cached?: boolean;
}

export const announcementService = {
  /** Suggested message content for a broadcast being composed (publishes nothing). */
  draftContent: async (input: BroadcastDraftInput): Promise<BroadcastDraft> => {
    return apiClient.post<BroadcastDraft>('/announcements/draft', input);
  },

  /**
   * Fetch all broadcast announcements & evacuation orders
   */
  getAnnouncements: async (): Promise<PublicAnnouncement[]> => {
    return apiClient.get<PublicAnnouncement[]>('/announcements');
  },

  /** Recent announcement pushes with their delivery counts (newest first). */
  getAnnouncementPushJobs: async (): Promise<PushJob[]> => {
    return apiClient.get<PushJob[]>('/notifications/push-jobs', { kind: 'announcement', limit: 200 });
  },

  /** Server-side page; filters and sort are applied by the backend so totals are exact. */
  getAnnouncementsPage: async (params: AnnouncementPageParams): Promise<Page<PublicAnnouncement>> => {
    return apiClient.get<Page<PublicAnnouncement>>('/announcements', { ...params, paginated: true });
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
