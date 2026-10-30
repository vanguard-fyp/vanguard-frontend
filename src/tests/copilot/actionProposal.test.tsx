import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActionProposalCard, toAnnouncement, toDispatch } from '../../components/copilot/ActionProposalCard';
import type { CopilotProposal } from '../../types';

const mission: Extract<CopilotProposal, { type: 'mission' }> = {
  type: 'mission', incident_id: 'inc-uuid', incident_display_id: 'INC-2026-001', incident_title: 'Flood at Kampung Sireh',
  title: ' Response: Flood ', priority: 'High', objective: ' Evacuate riverside homes ', duration_hours: 6,
  teams: [{ team_id: 'team-uuid', display_id: 'TEAM-BOMBA-001', name: 'BOMBA Kota Bharu', personnel: 12 }],
};
const broadcast: Extract<CopilotProposal, { type: 'announcement' }> = {
  type: 'announcement', title: 'Flood warning', category: 'Emergency Alert', severity: 'High',
  content: 'Move to higher ground now.', target_type: 'District', target_state: 'Kelantan', target_districts: ['Kota Bharu'],
};

const render = (proposal: CopilotProposal, outcome?: { status: 'approved' | 'cancelled'; text: string }) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <ActionProposalCard proposal={proposal} messageId="m1" outcome={outcome} onResolved={vi.fn()} />
    </QueryClientProvider>,
  );

describe('copilot action drafts', () => {
  it('shows a draft as editable and waiting for approval', () => {
    const html = render(broadcast);
    expect(html).toContain('Needs your approval');
    expect(html).toContain('Publish to citizens');
    expect(html).toContain('To: Kota Bharu, Kelantan');
    expect(render(mission)).toContain('Approve &amp; dispatch');
  });

  it('replaces the buttons with what happened once resolved', () => {
    const html = render(mission, { status: 'cancelled', text: 'Draft cancelled. Nothing was done.' });
    expect(html).toContain('Nothing was done');
    expect(html).not.toContain('Approve');
  });

  it('dispatches through the normal approval body, once per draft', () => {
    const req = toDispatch(mission, 'm1');
    expect(req).toMatchObject({ title: 'Response: Flood', objective: 'Evacuate riverside homes', incident_id: 'inc-uuid',
      approval: { confirmed: true }, idempotency_key: 'copilot-m1' });
    expect(req.teams).toEqual([{ team_id: 'team-uuid', personnel: 12, source: 'ai' }]);
  });

  it('publishes only the fields the officer saw', () => {
    expect(toAnnouncement(broadcast)).toEqual({
      title: 'Flood warning', content: 'Move to higher ground now.', category: 'Emergency Alert', severity: 'High',
      target_type: 'District', target_state: 'Kelantan', target_districts: ['Kota Bharu'],
    });
  });
});
