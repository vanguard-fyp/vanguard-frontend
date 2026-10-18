import React from 'react';
import { Loader2, ShieldCheck, ShieldQuestion, ShieldX, Image as ImageIcon } from 'lucide-react';
import { IN_FLIGHT, useIncidentAssessment } from '../../../hooks';
import type { AssessmentEnvelope, CredibilityBlock, CredibilitySignal } from '../../../types';
import { TONE } from '../shared/Tag';

/**
 * Returns true if the credibility card has content to display (or is actively computing).
 */
export function isCredibilityAvailable(data?: AssessmentEnvelope, isLoading?: boolean): boolean {
  const running = !!data?.current && IN_FLIGHT.includes(data.current.status);
  const assessment = data?.current?.credibility?.status ? data.current : data?.last_usable;
  const cred = assessment?.credibility as Partial<CredibilityBlock> | undefined;
  return Boolean(running || (!isLoading && cred && cred.status === 'ok' && cred.verdict));
}

/**
 * "AI Report Credibility" card for the incident detail page.
 *
 * Shows the advisory "is this report likely real?" check from the latest
 * assessment: verdict + score, the suggested next step, every signal behind it
 * (with its points) and what the AI saw in each photo. Advisory only: it never
 * changes the incident status; the officer decides.
 */
const VERDICT: Record<string, { icon: React.ReactNode; color: string }> = {
  'Likely genuine': { icon: <ShieldCheck size={16} />, color: TONE.teal },
  'Needs verification': { icon: <ShieldQuestion size={16} />, color: TONE.amber },
  'Possibly false': { icon: <ShieldX size={16} />, color: TONE.red },
};

const EFFECT: Record<CredibilitySignal['effect'], string> = {
  supports: TONE.teal,
  weakens: TONE.red,
  neutral: '#cbd5e1',
};

const VISION_TEXT: Record<string, string> = {
  assessed: 'Photos checked by AI',
  no_media: 'No photos attached',
  media_unreachable: 'Photos could not be downloaded for analysis',
  vision_unavailable: 'AI photo check unavailable (all image models busy). Re-run the assessment later.',
};

export const CredibilityCard: React.FC<{ incidentId: string; hideWhenEmpty?: boolean }> = ({ incidentId, hideWhenEmpty }) => {
  const { data, isLoading } = useIncidentAssessment(incidentId);
  const running = !!data?.current && IN_FLIGHT.includes(data.current.status);
  const assessment = data?.current?.credibility?.status ? data.current : data?.last_usable;
  const cred = assessment?.credibility as Partial<CredibilityBlock> | undefined;

  const header = (
    <header className="flex items-center justify-between gap-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 whitespace-nowrap">AI credibility check</h2>
      <span className="text-[11px] text-slate-400 whitespace-nowrap" title="AI advice. An officer makes the decision.">Advice only</span>
    </header>
  );

  // On the detail page the card only appears once there is something to show.
  if (hideWhenEmpty && !isCredibilityAvailable(data, isLoading)) return null;

  if (isLoading || (running && !cred?.verdict)) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-3">
        {header}
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Checking the report…
        </p>
      </div>
    );
  }

  if (!cred || cred.status !== 'ok' || !cred.verdict) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-3">
        {header}
        <p className="text-xs text-slate-500">
          {cred?.status === 'failed'
            ? 'The credibility check could not run for this assessment. Re-run the assessment to try again.'
            : 'Not checked yet. Run or re-run the intelligence assessment to check this report.'}
        </p>
      </div>
    );
  }

  const v = VERDICT[cred.verdict] ?? VERDICT['Needs verification'];
  const score = typeof cred.score === 'number' ? cred.score : null;
  const vision = cred.vision;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-5">
      {header}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ color: v.color, background: `${v.color}14` }}>
          {v.icon}
          {cred.verdict}
        </span>
        {score !== null && (
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-baseline justify-between text-[11px] text-slate-500 mb-1.5">
              <span>Credibility score</span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">{score}<span className="text-xs font-semibold text-slate-400">/100</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${score}%`, background: v.color }} />
            </div>
          </div>
        )}
      </div>

      {cred.suggestion && (
        <p className="text-sm text-slate-700 leading-relaxed max-w-prose">{cred.suggestion}</p>
      )}

      {(cred.signals ?? []).length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Why</p>
          <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50 px-3.5">
            {(cred.signals ?? []).map((s) => (
              <li key={s.key} className="flex items-start gap-3 py-2.5 text-xs">
                <span className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ background: EFFECT[s.effect] }} />
                <span className="flex-1 min-w-0 leading-relaxed text-slate-600">
                  <span className="font-semibold text-slate-900">{s.label}</span>
                  {s.detail && <span className="block">{s.detail}</span>}
                </span>
                <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: s.points === 0 ? '#94a3b8' : EFFECT[s.effect] }}>
                  {s.points > 0 ? `+${s.points}` : s.points}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {vision && vision.status !== 'no_media' && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ImageIcon size={12} /> {VISION_TEXT[vision.status] ?? vision.status}
            {vision.model && <span className="normal-case font-medium tracking-normal">· {vision.model}</span>}
          </p>
          {vision.observations?.map((o, i) => (
            <p key={i} className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Photo {i + 1}:</span> {o}
            </p>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        {cred.note ?? 'AI suggestion only. It never changes the report status; an officer decides.'}
      </p>
    </div>
  );
};

export default CredibilityCard;
