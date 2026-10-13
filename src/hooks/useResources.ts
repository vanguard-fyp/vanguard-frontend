import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resourceService } from '../services/resourceService';
import type { ResourceItem, ResourceRequest } from '../types';

export const RESOURCE_KEYS = {
  inventory: ['resources', 'inventory'] as const,
  requests: ['resources', 'requests'] as const,
  advisory: ['resources', 'advisory'] as const,
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
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.advisory });
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
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.advisory });
    },
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resourceService.deleteInventoryItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.inventory });
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.advisory });
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
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.advisory });
    },
  });
}

export function useApproveResourceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, warehouseId }: { id: string; approver?: string; approverUserId?: string; warehouseId?: string }) =>
      resourceService.approveRequest(id, { warehouseId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.requests });
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.inventory });
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.advisory });
    },
  });
}

export function useRejectResourceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      approver,
      approverUserId,
      rejectionReason,
    }: {
      id: string;
      approver?: string;
      approverUserId?: string;
      rejectionReason?: string;
    }) => resourceService.rejectRequest(id, { approver, approverUserId, rejectionReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.requests });
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.advisory });
    },
  });
}

export function useUpdateRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      resourceService.updateRequestStatus(id, status),
    onSuccess: (updated) => {
      // Apply the server's answer to the cached lists right away, then refetch.
      qc.setQueryData<ResourceRequest[]>(RESOURCE_KEYS.requests, (old) =>
        old?.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      const isReceipt =
        updated.status === 'Delivered' &&
        (updated.request_type === 'replenishment' || /REPLENISHMENT/i.test(updated.justification ?? ''));
      if (isReceipt) {
        qc.setQueryData<ResourceItem[]>(RESOURCE_KEYS.inventory, (old) =>
          old?.map((i) =>
            i.warehouse_id === updated.warehouse_id && i.resource_type_id === updated.resource_type_id
              ? { ...i, stock_level: i.stock_level + updated.quantity_requested }
              : i
          )
        );
      }
      // "Received" on a replenishment adds depot stock, so stock views refresh too.
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.requests });
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.inventory });
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.advisory });
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useDeleteResourceRequest() {

  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resourceService.deleteRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.requests });
      qc.invalidateQueries({ queryKey: RESOURCE_KEYS.advisory });
    },
  });
}

/** Deterministic stock advisory (+ optional LLM explanation) for all inventory. Advisory only. */
export function useStockAdvisory(warehouseId?: string) {
  return useQuery({
    queryKey: [...RESOURCE_KEYS.advisory, warehouseId ?? 'all'],
    queryFn: () => resourceService.getAIStockAdvisory(warehouseId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** Allocation recommendation for one request. Advisory only; approval is separate. */
export function useRequestRecommendation(requestId: string | null | undefined) {
  return useQuery({
    queryKey: ['resources', 'requests', requestId ?? '', 'recommendation'],
    queryFn: () => resourceService.getAIRequestRecommendation(requestId!),
    enabled: !!requestId,
    // Deterministic plan (no LLM); refreshed when stock or requests change via
    // the mutations' invalidation, not on every tab switch.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/** LLM explanation of a recommendation, fetched only after the officer asks (``enabled``). */
export function useRecommendationExplanation(requestId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['resources', 'requests', requestId ?? '', 'recommendation', 'explain'],
    queryFn: () => resourceService.explainRequestRecommendation(requestId!),
    enabled: !!requestId && enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
