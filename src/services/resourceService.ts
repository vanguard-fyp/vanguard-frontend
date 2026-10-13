import { apiClient } from './apiClient';
import type { Page, ResourceItem, ResourceRequest } from '../types';

export interface LlmExplanation {
  /** not_requested: the AI is only asked when the officer clicks "Explain with AI" */
  status: 'ok' | 'flagged' | 'failed' | 'unavailable' | 'not_requested';
  cached?: boolean;
  reason?: string;
  overview?: string;
  priorities?: string[];
  caveats?: string[];
  rationale?: string;
  considerations?: string[];
  unsupported_numbers?: string[];
  model?: string;
}

export interface StockAdvisoryItem {
  inventory_id: string;
  resource_type_id: string;
  warehouse_id: string;
  item_name: string | null;
  unit: string | null;
  warehouse_name: string | null;
  stock_level: number;
  min_threshold: number;
  pending_demand: number;
  stock_after_pending: number;
  shortfall: number;
  surplus: number;
  risk: 'critical' | 'high' | 'elevated' | 'normal';
  data_updated_at: string | null;
  data_stale: boolean;
  transfer_options: { warehouse_id: string; warehouse_name: string | null; spare_quantity: number }[];
  reorder_quantity: number;
}

export interface StockAdvisory {
  generated_at: string;
  method: string;
  summary: { items: number; critical: number; high: number; elevated: number; with_surplus: number; stale_records: number; pending_requests: number };
  items: StockAdvisoryItem[];
  explanation: LlmExplanation;
  advisory_only: true;
}

export interface RequestRecommendation {
  request_id: string;
  display_id?: string;
  status: string;
  decision: 'approve_full' | 'approve_partial' | 'cannot_fulfil' | 'insufficient_data' | 'choose_depot';
  recommended_quantity: number;
  requested_quantity: number;
  available_quantity: number | null;
  stock_after_recommendation: number | null;
  below_threshold_after: boolean | null;
  fulfilment_percent: number | null;
  confidence: number | null;
  confidence_note: string;
  constraints: string[];
  alternatives: { warehouse_id: string; warehouse_name: string | null; spare_quantity: number; stock_level?: number; covers_request?: boolean }[];
  /** backend allocation plan: one action sentence and the facts behind it */
  action?: string;
  reasons?: string[];
  split?: { warehouse_id: string; warehouse_name: string | null; quantity: number }[];
  restock_quantity?: number;
  requests_ahead?: { display_id: string; quantity: number; urgency: string }[];
  agent_rationale: string | null;
  explanation: LlmExplanation;
  advisory_only: true;
  note: string;
  generated_at: string;
}

export const resourceService = {
  /**
   * Fetch current emergency inventory stock levels
   */
  getInventory: async (): Promise<ResourceItem[]> => {
    return apiClient.get<ResourceItem[]>('/resources/inventory');
  },

  getInventoryPage: async (params: {
    limit: number;
    offset: number;
    warehouse_id?: string;
    status?: string;
    search?: string;
    category?: string;
  }): Promise<Page<ResourceItem>> => {
    return apiClient.get<Page<ResourceItem>>('/resources/inventory', { ...params, paginated: true });
  },

  /** AI Inventory Analytics (backend: deterministic findings + optional LLM explanation). */
  getAIStockAdvisory: async (warehouseId?: string): Promise<StockAdvisory> => {
    return apiClient.get<StockAdvisory>('/resources/inventory/advisory', warehouseId ? { warehouse_id: warehouseId } : undefined);
  },

  /** AI allocation recommendation for one request (advisory; approval is separate). */
  getAIRequestRecommendation: async (requestId: string): Promise<RequestRecommendation> => {
    return apiClient.get<RequestRecommendation>(`/resources/requests/${requestId}/recommendation`);
  },

  /** LLM wording of a recommendation; officer-triggered and cached server-side. */
  explainRequestRecommendation: async (requestId: string): Promise<LlmExplanation> => {
    return apiClient.post<LlmExplanation>(`/resources/requests/${requestId}/recommendation/explain`, {});
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

  /** Server-side page of requests; `exclude_status` lists everything except one status. */
  getRequestsPage: async (params: {
    limit: number;
    offset: number;
    status?: string;
    exclude_status?: string;
    resource_type_id?: string;
  }): Promise<Page<ResourceRequest>> => {
    return apiClient.get<Page<ResourceRequest>>('/resources/requests', { ...params, paginated: true });
  },

  /**
   * Submit a new resource request
   */
  createRequest: async (requestData: Partial<ResourceRequest>): Promise<ResourceRequest> => {
    return apiClient.post<ResourceRequest>('/resources/requests', requestData);
  },

  /**
   * Approve (commit) a pending request. The approver is the signed-in officer —
   * the backend takes it from the token, so no approver identity is sent.
   * Stock is re-validated and deducted at this moment on the server.
   * ``warehouseId`` is the depot to supply from, for a request created without one.
   */
  approveRequest: async (requestId: string, payload?: { warehouseId?: string }): Promise<ResourceRequest> => {
    return apiClient.post<ResourceRequest>(
      `/resources/requests/${requestId}/approve`,
      payload?.warehouseId ? { warehouse_id: payload.warehouseId } : {}
    );
  },

  /**
   * Reject a pending resource request (approver taken from the token).
   */
  rejectRequest: async (
    requestId: string,
    payload?: { approver?: string; approverUserId?: string; rejectionReason?: string }
  ): Promise<ResourceRequest> => {
    return apiClient.post<ResourceRequest>(`/resources/requests/${requestId}/reject`, {
      rejection_reason: payload?.rejectionReason,
    });
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

