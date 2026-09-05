import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '../services/resourceService';
import type { ResourceItem, ResourceRequest } from '../types';

export const RESOURCE_KEYS = {
  inventory: ['resources', 'inventory'] as const,
  requests: ['resources', 'requests'] as const,
};

export function useInventory() {
  return useQuery({
    queryKey: RESOURCE_KEYS.inventory,
    queryFn: () => resourceService.getInventory(),
    staleTime: 60_000,
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ResourceItem>) => resourceService.createInventoryItem(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.inventory });
    },
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ResourceItem> }) =>
      resourceService.updateInventoryItem(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.inventory });
    },
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resourceService.deleteInventoryItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.inventory });
    },
  });
}

export function useResourceRequests() {
  return useQuery({
    queryKey: RESOURCE_KEYS.requests,
    queryFn: () => resourceService.getRequests(),
    staleTime: 30_000,
  });
}

export function useCreateResourceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ResourceRequest>) => resourceService.createRequest(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.requests });
    },
  });
}

export function useApproveResourceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approver }: { id: string; approver?: string }) =>
      resourceService.approveRequest(id, approver),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.requests });
    },
  });
}

export function useRejectResourceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approver }: { id: string; approver?: string }) =>
      resourceService.rejectRequest(id, approver),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.requests });
    },
  });
}

export function useUpdateRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      resourceService.updateRequestStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.requests });
    },
  });
}

export function useDeleteResourceRequest() {

  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resourceService.deleteRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.requests });
    },
  });
}
