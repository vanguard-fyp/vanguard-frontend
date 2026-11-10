import React, { useState } from 'react';
import { Check, FileText, Loader2, Megaphone, Route, X } from 'lucide-react';
import { useCreateAnnouncement, useDispatchMission } from '../../hooks';
import { incidentService } from '../../services/incidentService';
import type { MissionDispatchRequest } from '../../services/missionService';
import type { CopilotProposal, PublicAnnouncement, SeverityLevel } from '../../types';

type AnnouncementDraft = Extract<CopilotProposal, { type: 'announcement' }>;
type MissionDraft = Extract<CopilotProposal, { type: 'mission' }>;

/** The broadcast exactly as the officer approved it (same body as Public Communication). */
export const toAnnouncement = (d: AnnouncementDraft): Partial<PublicAnnouncement> => ({
  title: d.title.trim(), content: d.content.trim(), category: d.category, severity: d.severity,
  target_type: d.target_type, target_state: d.target_state, target_districts: d.target_districts,
});

/** The dispatch as approved; the message id makes a repeated click return the same mission. */
export const toDispatch = (d: MissionDraft, messageId: string): MissionDispatchRequest => ({
  title: d.title.trim(), incident_id: d.incident_id, priority: d.priority,
  objective: d.objective.trim(), duration_hours: d.duration_hours,
  teams: d.teams.map((t) => ({ team_id: t.team_id, personnel: t.personnel, source: 'ai' as const })),
  approval: { confirmed: true, note: 'Drafted by Vanguard Copilot, approved by the officer.' },
  idempotency_key: `copilot-${messageId}`,
});

const SEVERITIES: SeverityLevel[] = ['Critical', 'High', 'Medium', 'Low'];
const CATEGORIES = ['Emergency Alert', 'Evacuation Order', 'Safety Announcement'] as const;

const HEAD = {
  announcement: { icon: Megaphone, label: 'Draft broadcast', approve: 'Publish to citizens' },
  mission: { icon: Route, label: 'Draft mission', approve: 'Approve & dispatch' },
  sitrep: { icon: FileText, label: 'Situation report', approve: 'Download SITREP' },
} as const;

const field = 'w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-300 focus:ring-4 focus:ring-blue-600/10';
const label = 'block text-[10px] font-semibold text-slate-500 mb-1';

interface Props {
  proposal: CopilotProposal;
  /** Stable per message: re-sending the same approval cannot dispatch twice. */
  messageId: string;
  outcome?: { status: 'approved' | 'cancelled'; text: string };
  onResolved: (outcome: { status: 'approved' | 'cancelled'; text: string }) => void;
}

/**
 * A copilot draft the officer edits, then approves or cancels. Approval calls
 * the normal endpoint (with its own permission check); the copilot itself
 * never publishes or dispatches.
 */
export const ActionProposalCard: React.FC<Props> = ({ proposal, messageId, outcome, onResolved }) => {
  const [draft, setDraft] = useState<CopilotProposal>(proposal);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publish = useCreateAnnouncement();
  const dispatch = useDispatchMission();
  const busy = publish.isPending || dispatch.isPending;
  const head = HEAD[draft.type];
  const Icon = head.icon;
  const set = (patch: Partial<CopilotProposal>) => setDraft((d) => ({ ...d, ...patch }) as CopilotProposal);

  if (outcome) {
    return (
      <div className={`mt-2 rounded-xl border px-3 py-2 text-[11px] flex items-center gap-1.5 ${
        outcome.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
        {outcome.status === 'approved' ? <Check size={12} /> : <X size={12} />}
        {outcome.text}
      </div>
    );
  }

  const valid =
    draft.type === 'announcement' ? draft.title.trim().length >= 3 && draft.content.trim().length > 0
    : draft.type === 'mission' ? draft.objective.trim().length >= 3 && draft.teams.length > 0 && draft.teams.every((t) => t.personnel >= 1)
    : true;

  const approve = async () => {
    // Publishing and dispatching take a second click; a download does not.
    if (draft.type !== 'sitrep' && !confirming) {
      setConfirming(true);
      return;
    }
    setError(null);
    try {
      if (draft.type === 'sitrep') {
        await incidentService.downloadSitrepPdf(draft.incident_id, draft.incident_display_id);
        onResolved({ status: 'approved', text: `SITREP for ${draft.incident_display_id ?? 'the incident'} downloaded.` });
      } else if (draft.type === 'announcement') {
        const created = await publish.mutateAsync(toAnnouncement(draft));
        onResolved({ status: 'approved', text: `Published ${created.display_id ?? 'the broadcast'} to citizens.` });
      } else {
        const mission = await dispatch.mutateAsync(toDispatch(draft, messageId));
        onResolved({ status: 'approved', text: `Dispatched ${mission.display_id ?? 'the mission'}.` });
      }
    } catch (e) {
      setConfirming(false);
      setError(e instanceof Error ? e.message : 'The action could not be completed.');
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900">
          <Icon size={13} className="text-blue-600" /> {head.label}
        </p>
        <span className="text-[10px] font-semibold text-amber-700">Needs your approval</span>
      </div>
      {draft.incident_display_id && (
        <p className="text-[11px] text-slate-500 truncate">
          {draft.incident_display_id}{draft.incident_title ? ` · ${draft.incident_title}` : ''}
        </p>
      )}

      {draft.type === 'announcement' && (
        <>
          <div>
            <label className={label}>Title</label>
            <input className={field} value={draft.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <label className={label}>Message</label>
            <textarea className={`${field} resize-none`} rows={4} value={draft.content} onChange={(e) => set({ content: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Category" className={field} value={draft.category} onChange={(e) => set({ category: e.target.value as typeof draft.category })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select aria-label="Severity" className={field} value={draft.severity} onChange={(e) => set({ severity: e.target.value as SeverityLevel })}>
              {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-slate-500">
            To: {draft.target_districts.length ? `${draft.target_districts.join(', ')}, ` : ''}{draft.target_state}
          </p>
        </>
      )}

      {draft.type === 'mission' && (
        <>
          <div>
            <label className={label}>Objective</label>
            <textarea className={`${field} resize-none`} rows={3} value={draft.objective} onChange={(e) => set({ objective: e.target.value })} />
          </div>
          <div>
            <label className={label}>Priority</label>
            <select aria-label="Priority" className={field} value={draft.priority} onChange={(e) => set({ priority: e.target.value as SeverityLevel })}>
              {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <p className={label}>Teams · personnel</p>
            <ul className="space-y-1">
              {draft.teams.map((t) => (
                <li key={t.team_id} className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 text-xs text-slate-700" title={[t.name, t.display_id, t.agency].filter(Boolean).join(' · ')}>
                    <span className="block truncate font-medium">{t.name ?? t.display_id ?? 'Team'}</span>
                    {t.name && t.display_id && (
                      <span className="block truncate text-[10px] text-slate-400">{t.display_id}{t.agency ? ` · ${t.agency}` : ''}</span>
                    )}
                  </span>
                  <input type="number" min={1} max={500} aria-label={`Personnel for ${t.name ?? t.display_id}`}
                    className={`${field.replace('w-full ', '')} w-16 shrink-0 tabular-nums`} value={t.personnel}
                    onChange={(e) => set({ teams: draft.teams.map((x) => (x.team_id === t.team_id ? { ...x, personnel: Number(e.target.value) } : x)) })} />
                  {draft.teams.length > 1 && (
                    <button type="button" aria-label={`Remove ${t.name ?? t.display_id}`} className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                      onClick={() => set({ teams: draft.teams.filter((x) => x.team_id !== t.team_id) })}>
                      <X size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {error && <p role="alert" className="text-[11px] text-red-700">{error}</p>}

      <div className="flex gap-2 pt-0.5">
        <button type="button" disabled={busy}
          onClick={() => onResolved({ status: 'cancelled', text: 'Draft cancelled. Nothing was done.' })}
          className="flex-1 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer disabled:opacity-50">
          Cancel
        </button>
        <button type="button" disabled={busy || !valid} onClick={approve}
          className={`flex-1 py-1.5 text-xs font-semibold text-white rounded-lg cursor-pointer disabled:bg-slate-300 disabled:cursor-default flex items-center justify-center gap-1.5 ${
            confirming ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
          {busy && <Loader2 size={12} className="animate-spin" />}
          {confirming ? 'Confirm' : head.approve}
        </button>
      </div>
    </div>
  );
};
