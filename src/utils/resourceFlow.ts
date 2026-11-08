import type { ResourceRequest } from '../types';

export type RequestFlow = 'requisition' | 'replenishment';

/** requisition = depot -> one incident; replenishment = supplier -> depot. */
export function requestFlow(req: Pick<ResourceRequest, 'request_type' | 'justification'>): RequestFlow {
  if (req.request_type) return req.request_type;
  // Requests created before request_type existed carried a justification tag.
  return /REPLENISHMENT/i.test(req.justification ?? '') ? 'replenishment' : 'requisition';
}

export interface FlowStep {
  status: 'Pending Approval' | 'Approved' | 'Dispatched' | 'Delivered';
  label: string;
  /** what happens to depot stock at this step */
  stock?: string;
}

export const FLOW_STEPS: Record<RequestFlow, FlowStep[]> = {
  requisition: [
    { status: 'Pending Approval', label: 'Requested' },
    { status: 'Approved', label: 'Approved', stock: 'stock reserved at depot' },
    { status: 'Dispatched', label: 'Left depot' },
    { status: 'Delivered', label: 'Delivered to incident' },
  ],
  replenishment: [
    { status: 'Pending Approval', label: 'Requested' },
    { status: 'Approved', label: 'Order placed' },
    { status: 'Dispatched', label: 'In transit' },
    { status: 'Delivered', label: 'Received at depot', stock: 'stock added' },
  ],
};

/** Next action an officer can take, or null when the flow is finished / not approved yet. */
export function nextAction(req: Pick<ResourceRequest, 'status' | 'request_type' | 'justification'>): { to: 'Dispatched' | 'Delivered'; label: string } | null {
  const flow = requestFlow(req);
  if (req.status === 'Approved') return { to: 'Dispatched', label: flow === 'replenishment' ? 'Mark in transit' : 'Dispatch from depot' };
  if (req.status === 'Dispatched') return { to: 'Delivered', label: flow === 'replenishment' ? 'Mark received (adds stock)' : 'Mark delivered' };
  return null;
}

export function stepIndex(req: Pick<ResourceRequest, 'status' | 'request_type' | 'justification'>): number {
  return FLOW_STEPS[requestFlow(req)].findIndex((s) => s.status === req.status);
}

/** Urgencies allowed to draw on a depot's safety stock (same rule as the backend's allocation plan). */
const MAY_USE_SAFETY_STOCK = ['Critical', 'High'];

export interface RequisitionCheck {
  status: 'enough' | 'below_safety' | 'partial' | 'none';
  /** what this request can take without touching stock promised elsewhere */
  usable: number;
  /** stock left after pending requests and this one */
  left: number;
}

/**
 * Check a requisition being written against one depot's stock, before it exists.
 * The approver sees the backend's full allocation plan once it is submitted.
 */
export function checkRequisition(
  advisory: { stock_after_pending: number; min_threshold: number },
  quantity: number,
  urgency: string,
): RequisitionCheck {
  const after = advisory.stock_after_pending;
  const min = advisory.min_threshold;
  const usable = Math.max(0, MAY_USE_SAFETY_STOCK.includes(urgency) ? after : after - min);
  const left = after - quantity;
  if (quantity > usable) return { status: usable > 0 ? 'partial' : 'none', usable, left };
  return { status: left < min ? 'below_safety' : 'enough', usable, left };
}
