import { apiClient } from './apiClient';
import type { ResourceItem, ResourceRequest } from '../types';

export const resourceService = {
  /**
   * Fetch current emergency inventory stock levels
   */
  getInventory: async (): Promise<ResourceItem[]> => {
    return apiClient.get<ResourceItem[]>('/resources/inventory');
  },

  /**
   * Add a new inventory item
   */
  createInventoryItem: async (item: Partial<ResourceItem>): Promise<ResourceItem> => {
    return apiClient.post<ResourceItem>('/resources/inventory', item);
  },

  /**
   * Update an inventory item
   */
  updateInventoryItem: async (id: string, updates: Partial<ResourceItem>): Promise<ResourceItem> => {
    return apiClient.patch<ResourceItem>(`/resources/inventory/${id}`, updates);
  },

  /**
   * Delete an inventory item
   */
  deleteInventoryItem: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/resources/inventory/${id}`);
  },

  /**
   * Retrieve all resource and aid requests
   */
  getRequests: async (): Promise<ResourceRequest[]> => {
    return apiClient.get<ResourceRequest[]>('/resources/requests');
  },

  /**
   * Submit a new resource request
   */
  createRequest: async (requestData: Partial<ResourceRequest>): Promise<ResourceRequest> => {
    return apiClient.post<ResourceRequest>('/resources/requests', requestData);
  },

  /**
   * Approve a pending resource request
   */
  approveRequest: async (requestId: string, approverName?: string): Promise<ResourceRequest> => {
    return apiClient.post<ResourceRequest>(
      `/resources/requests/${requestId}/approve`,
      undefined,
      approverName ? { 'X-Approver-Name': approverName } : undefined
    );
  },

  /**
   * Reject a pending resource request
   */
  rejectRequest: async (requestId: string, approverName?: string): Promise<ResourceRequest> => {
    return apiClient.post<ResourceRequest>(
      `/resources/requests/${requestId}/reject`,
      undefined,
      approverName ? { 'X-Approver-Name': approverName } : undefined
    );
  },

  /**
   * Update status of a resource request (e.g. Dispatched, Delivered)
   */
  updateRequestStatus: async (requestId: string, status: string): Promise<ResourceRequest> => {
    return apiClient.patch<ResourceRequest>(`/resources/requests/${requestId}/status?status=${encodeURIComponent(status)}`);
  },

  /**
   * Delete a resource request
   */
  deleteRequest: async (requestId: string): Promise<void> => {
    return apiClient.delete<void>(`/resources/requests/${requestId}`);
  },
};

