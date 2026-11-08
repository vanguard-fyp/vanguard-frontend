import { describe, expect, it } from 'vitest';
import { FLOW_STEPS, checkRequisition, nextAction, requestFlow, stepIndex } from '../../utils/resourceFlow';

const req = (over: Record<string, unknown>) => ({ status: 'Approved', justification: '', ...over }) as never;

describe('resource request flows', () => {
  it('classifies by request_type, falling back to the legacy tag', () => {
    expect(requestFlow(req({ request_type: 'replenishment' }))).toBe('replenishment');
    expect(requestFlow(req({ justification: '[DEPOT REPLENISHMENT] restock' }))).toBe('replenishment');
    expect(requestFlow(req({ justification: 'for flood victims' }))).toBe('requisition');
  });

  it('offers the next step with flow-specific wording', () => {
    expect(nextAction(req({ request_type: 'requisition' }))).toEqual({ to: 'Dispatched', label: 'Dispatch from depot' });
    expect(nextAction(req({ request_type: 'replenishment', status: 'Dispatched' }))).toEqual({ to: 'Delivered', label: 'Mark received (adds stock)' });
    expect(nextAction(req({ status: 'Pending Approval' }))).toBeNull();
    expect(nextAction(req({ status: 'Delivered' }))).toBeNull();
  });

  it('says where stock changes in each flow', () => {
    expect(FLOW_STEPS.requisition.find((s) => s.stock)?.status).toBe('Approved');
    expect(FLOW_STEPS.replenishment.find((s) => s.stock)?.status).toBe('Delivered');
    expect(stepIndex(req({ status: 'Dispatched', request_type: 'replenishment' }))).toBe(2);
  });
});

describe('checkRequisition', () => {
  const stock = { stock_after_pending: 100, min_threshold: 30 };

  it('says enough when the request leaves the safety level intact', () => {
    expect(checkRequisition(stock, 70, 'Medium')).toEqual({ status: 'enough', usable: 70, left: 30 });
  });

  it('keeps safety stock away from lower urgencies', () => {
    expect(checkRequisition(stock, 80, 'Medium')).toEqual({ status: 'partial', usable: 70, left: 20 });
  });

  it('lets urgent requests use safety stock, and says so', () => {
    expect(checkRequisition(stock, 80, 'Critical')).toEqual({ status: 'below_safety', usable: 100, left: 20 });
  });

  it('reports nothing free when pending requests already take it all', () => {
    expect(checkRequisition({ stock_after_pending: -5, min_threshold: 30 }, 10, 'High').status).toBe('none');
  });
});
