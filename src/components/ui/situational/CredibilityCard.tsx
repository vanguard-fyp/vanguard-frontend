import React from 'react';
import { Loader2, ShieldCheck, ShieldQuestion, ShieldX, Sparkles, Image as ImageIcon } from 'lucide-react';
import { IN_FLIGHT, useIncidentAssessment } from '../../../hooks';
import type { CredibilityBlock, CredibilitySignal } from '../../../types';

/**
 * "AI Report Credibility" card for the incident detail page.
 *
 * Shows the advisory "is this report likely real?" check from the latest
 * assessment: verdict + score, the suggested next step, every signal behind it
 * (with its points) and what the AI saw in each photo. Advisory only: it never
 * changes the incident status; the officer decides.
 */
const VERDICT: Record<string, { icon: React.ReactNode; badge: string; bar: string }> = {
  'Likely genuine': {
    icon: <ShieldCheck size={16} />,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bar: 'bg-emerald-500',
  },
  'Needs verification': {
    icon: <ShieldQuestion size={16} />,
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    bar: 'bg-amber-500',
  },
  'Possibly false': {
    icon: <ShieldX size={16} />,
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    bar: 'bg-rose-500',
  },
};

const EFFECT: Record<CredibilitySignal['effect'], { dot: string; pts: string }> = {
  supports: { dot: 'bg-emerald-500', pts: 'text-emerald-700' },
  weakens: { dot: 'bg-rose-500', pts: 'text-rose-700' },
  neutral: { dot: 'bg-slate-300', pts: 'text-slate-400' },
};

const VISION_TEXT: Record<string, string> = {
  assessed: 'Photos checked by AI',
  no_media: 'No photos attached',
  media_unreachable: 'Photos could not be downloaded for analysis',
  vision_unavailable: 'AI photo check unavailable (all image models busy). Re-run the assessment later.',
};

export const CredibilityCard: React.FC<{ incidentId: string }> = ({ incidentId }) => {
  const { data, isLoading } = useIncidentAssessment(incidentId);
  const running = !!data?.current && IN_FLIGHT.includes(data.current.status);
  const assessment = data?.current?.credibility?.status ? data.current : data?.last_usable;
  const cred = assessment?.credibility as Partial<CredibilityBlock> | undefined;

  const header = (
    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
      <Sparkles size={16} className="text-indigo-600" /> AI Report Credibility
      <span className="ml-auto text-[10px] font-semibold normal-case tracking-normal text-slate-400">
        Advisory · officer decides
      </span>
    </h2>
  );

  if (isLoading || (running && !cred?.verdict)) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
        {header}
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Checking the report…
        </p>
      </div>
    );
  }

  if (!cred || cred.status !== 'ok' || !cred.verdict) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-3">
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
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
      {header}

      <div className="flex flex-wrap items-center gap-4">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold ${v.badge}`}>
          {v.icon}
          {cred.verdict}
        </span>
        {score !== null && (
          <div className="flex-1 min-w-[160px]">
            <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
              <span>Credibility score</span>
              <span className="font-mono text-slate-700">{score} / 100</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${v.bar}`} style={{ width: `${score}%` }} />
            </div>
          </div>
        )}
      </div>

      {cred.suggestion && (
        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg p-3">
          {cred.suggestion}
        </p>
      )}

      <div className="space-y-1.5">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Why</p>
        <ul className="space-y-1.5">
          {(cred.signals ?? []).map((s) => (
            <li key={s.key} className="flex items-start gap-2 text-xs text-slate-600 leading-snug">
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${EFFECT[s.effect].dot}`} />
              <span className="flex-1">
                <span className="font-semibold text-slate-800">{s.label}.</span> {s.detail}
              </span>
              <span className={`font-mono text-[11px] font-bold shrink-0 ${EFFECT[s.effect].pts}`}>
                {s.points > 0 ? `+${s.points}` : s.points}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {vision && vision.status !== 'no_media' && (
        <div className="pt-3 border-t border-slate-100 space-y-1.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ImageIcon size={12} /> {VISION_TEXT[vision.status] ?? vision.status}
            {vision.model && <span className="normal-case font-medium text-slate-400">· {vision.model}</span>}
          </p>
          {vision.observations?.map((o, i) => (
            <p key={i} className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Photo {i + 1}:</span> {o}
            </p>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-400">
        {cred.note ?? 'AI suggestion only. It never changes the report status; an officer decides.'}
      </p>
    </div>
  );
};

export default CredibilityCard;
