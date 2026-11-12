/**
 * useAnnouncements — TanStack Query hooks for public announcements
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementService } from '../services/announcementService';
import type { PublicAnnouncement } from '../types';

export const ANNOUNCEMENT_KEYS = {
  all: ['announcements'] as const,
};

export function useAnnouncements() {
  return useQuery({
    queryKey: ANNOUNCEMENT_KEYS.all,
    queryFn: () => announcementService.getAnnouncements(),
    staleTime: 10_000,
    // Other officers' publishes and edits appear without a reload.
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

/** Delivery counts for announcement pushes. Optional: the page works without them. */
export function useAnnouncementPushJobs() {
  return useQuery({
    queryKey: [...ANNOUNCEMENT_KEYS.all, 'push-jobs'] as const,
    queryFn: () => announcementService.getAnnouncementPushJobs(),
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: false,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PublicAnnouncement>) => announcementService.createAnnouncement(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.all });
    },
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PublicAnnouncement> }) =>
      announcementService.updateAnnouncement(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.all });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => announcementService.deleteAnnouncement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.all });
    },
  });
}
