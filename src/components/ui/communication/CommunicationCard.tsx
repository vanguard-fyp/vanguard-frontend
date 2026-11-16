import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Send, EyeOff, CheckCircle2, Smartphone, Siren, DoorOpen, Megaphone, BellRing, BellOff, type LucideIcon } from 'lucide-react';
import { formatDateTime } from '../../../utils/dateFormatter';
import { Tag, SEVERITY_TONE } from '../shared/Tag';

import type { PublicAnnouncement, PushJob } from '../../../types';

const PUSH_STATUS_LABEL: Record<string, string> = {
  queued: 'Queued',
  dispatched: 'With push worker',
  dispatch_failed: 'Could not reach worker',
  sending: 'Sending',
  sent: 'Delivered',
  partial: 'Partly delivered',
  failed: 'Failed',
  no_recipients: 'No phones in area',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const pushReachText = (job: PushJob): string => {
  if (job.recipients == null) return PUSH_STATUS_LABEL[job.status] ?? job.status;
  const ok = job.success_count ?? 0;
  const failed = job.failure_count ?? 0;
  return `${ok.toLocaleString()} of ${job.recipients.toLocaleString()} phones${failed ? ` · ${failed.toLocaleString()} failed` : ''}`;
};

/** Short reach for the closed row: "1,240 phones" or "App only". */
const reachShort = (jobs?: PushJob[]): string | null => {
  if (jobs === undefined) return null;
  if (jobs.length === 0) return 'App only';
  const ok = jobs.reduce((n, j) => n + (j.success_count ?? 0), 0);
  return ok > 0 ? `${ok.toLocaleString()} phones` : PUSH_STATUS_LABEL[jobs[0].status] ?? jobs[0].status;
};

/** "Selangor" or "Within 5 km": where it applies, as short as possible for the closed row. */
const areaShort = (a: PublicAnnouncement): string =>
  a.target_type === 'Radius' && a.radius_km ? `Within ${a.radius_km} km` : a.target_state || (a.target_districts ?? [])[0] || 'Whole country';

/** Each kind of announcement has its own colour and symbol, so the board reads at a glance. */
const CATEGORY_LOOK: Record<string, { Icon: LucideIcon; color: string; wash: string; label: string }> = {
  'Emergency Alert': { Icon: Siren, color: '#dc2626', wash: '#fef2f2', label: 'Emergency alert' },
  'Evacuation Order': { Icon: DoorOpen, color: '#ea580c', wash: '#fff7ed', label: 'Evacuation order' },
  'Safety Announcement': { Icon: Megaphone, color: '#2563eb', wash: '#eff6ff', label: 'Safety announcement' },
};
const lookOf = (category: string) => CATEGORY_LOOK[category] ?? { Icon: BellRing, color: '#475569', wash: '#f8fafc', label: category };

/** Clock time in Malaysia time, e.g. "14:20". */
export const timeMYT = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kuala_Lumpur' }) : '--:--';

interface CommunicationCardProps {
  announcement: PublicAnnouncement;
  /** Push sends for this announcement, newest first. Undefined when counts are unavailable. */
  pushJobs?: PushJob[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Push this announcement to citizens' phones again, as an update. */
  onResend?: (id: string) => void;
  isResending?: boolean;
  /** Last entry of its day: the rail stops at the dot. */
  isLast?: boolean;
}

/**
 * One broadcast as an entry on the communication timeline: the time on the
 * left, a broadcast node on the rail in the announcement's colour, and a short card.
 * Opening it tells the rest: the message, who issued it, where it reached.
 */
export const CommunicationCard: React.FC<CommunicationCardProps> = ({
  announcement,
  pushJobs,
  isExpanded,
  onToggleExpand,
  onToggleActive,
  onDelete,
  onResend,
  isResending = false,
  isLast = false,
}) => {
  const a = announcement;
  const tone = SEVERITY_TONE[a.severity] ?? 'slate';
  const look = lookOf(a.category);
  const color = look.color;
  const Icon = a.active ? look.Icon : BellOff;
  const reach = reachShort(pushJobs);
  const [showSends, setShowSends] = React.useState(false);

  return (
    <motion.li
      className="grid grid-cols-[52px_40px_minmax(0,1fr)] gap-x-2"
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Time */}
      <time dateTime={a.issued_at} title={formatDateTime(a.issued_at ?? '')} className="pt-[18px] text-right text-[13px] font-bold tabular-nums text-slate-700">
        {timeMYT(a.issued_at)}
      </time>

      {/* Rail and broadcast node: the node rings out while the announcement is live */}
      <div className="relative flex justify-center" aria-hidden="true">
        <span className={`absolute top-0 w-[2px] bg-slate-300 ${isLast ? 'h-7' : 'bottom-0'}`} />
        <span className="relative mt-2.5 w-9 h-9 flex items-center justify-center">
          {a.active && (
            <>
              <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.12, animationDuration: '2.2s' }} />
              <span className="absolute -inset-1 rounded-full border" style={{ borderColor: `${color}40` }} />
            </>
          )}
          <span
            className="relative w-9 h-9 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm"
            style={a.active ? { background: look.wash, color, boxShadow: `inset 0 0 0 1.5px ${color}55` } : { background: '#f1f5f9', color: '#94a3b8' }}
          >
            <Icon size={16} strokeWidth={2.2} />
          </span>
        </span>
      </div>

      {/* Entry */}
      <div className="pb-3 min-w-0">
        <div
          className={`relative bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
            isExpanded ? 'border-slate-300 shadow-md' : 'border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <span className="absolute left-0 inset-y-0 w-1" style={{ background: a.active ? color : '#cbd5e1' }} aria-hidden="true" />
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            className="w-full pl-5 pr-4 py-3 flex items-center gap-3 text-left cursor-pointer"
          >
            <span className="flex-1 min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wide" style={{ color: a.active ? color : '#94a3b8' }}>{look.label}</span>
              <span className={`block text-sm font-semibold truncate ${a.active ? 'text-slate-900' : 'text-slate-500 line-through decoration-slate-300'}`}>{a.title}</span>
              <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 min-w-0">
                <Tag tone={tone}>{a.severity}</Tag>
                <span className="truncate">{areaShort(a)}{reach ? ` · ${reach}` : ''}</span>
              </span>
            </span>
            {!a.active && <Tag variant="outline" tone="slate">Retracted</Tag>}
            <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-slate-100 pl-5 pr-4 py-4 space-y-3" style={{ background: look.wash }}>
                  {/* 1. What citizens were told: the thing to read */}
                  <blockquote className="relative pl-4 pr-3 py-2.5 bg-white rounded-lg border border-slate-200/70 text-[13px] text-slate-900 leading-relaxed whitespace-pre-wrap">
                    <span className="absolute left-0 inset-y-0 w-[3px] rounded-full" style={{ background: color }} aria-hidden="true" />
                    {a.content}
                  </blockquote>

                  {/* 2. The facts not already on the row, in one grey line */}
                  <p className="text-xs text-slate-500">
                    {a.category} · issued by {a.issued_by ?? 'EOC Authority'}
                    {(a.target_districts ?? []).length > 0 && <> · {(a.target_districts ?? []).join(', ')}</>}
                    {a.expires_at && <> · until {formatDateTime(a.expires_at)}</>}
                  </p>

                  {/* 3. Phone delivery: the latest send; earlier ones on request */}
                  {pushJobs !== undefined && (
                    <div className="text-xs">
                      {pushJobs.length === 0 ? (
                        <p className="flex items-center gap-1.5 text-slate-500"><Smartphone size={12} /> Shown in the app only, not pushed to phones.</p>
                      ) : (
                        <>
                          <p className="flex items-center gap-1.5 text-slate-700">
                            <Smartphone size={12} className="text-slate-400" />
                            <span>{pushJobs.length > 1 ? 'Latest send' : 'Sent'} {timeMYT(pushJobs[0].created_at)}</span>
                            <span className="text-slate-300">·</span>
                            <span className="font-semibold text-slate-900">{pushReachText(pushJobs[0])}</span>
                            {pushJobs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setShowSends((v) => !v)}
                                aria-expanded={showSends}
                                className="ml-1 text-blue-700 hover:underline cursor-pointer"
                              >
                                {showSends ? 'Hide earlier' : `${pushJobs.length - 1} earlier`}
                              </button>
                            )}
                          </p>
                          {showSends && (
                            <ol className="mt-1.5 ml-[18px] space-y-0.5 text-slate-500">
                              {pushJobs.slice(1).map((job, i) => (
                                <li key={job.id}>
                                  {i === pushJobs.length - 2 ? 'First send' : 'Resend'} {formatDateTime(job.created_at)} · {pushReachText(job)}
                                </li>
                              ))}
                            </ol>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-400">{a.display_id || `ANN-${a.id.slice(0, 8).toUpperCase()}`}</span>
                    <div className="flex items-center gap-1">
                      {a.active ? (
                        <button
                          onClick={() => onDelete?.(a.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-amber-800 hover:bg-amber-50 cursor-pointer"
                        >
                          <EyeOff size={12} /> Retract
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleActive(a.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                        >
                          <CheckCircle2 size={12} /> Reactivate
                        </button>
                      )}
                      {a.active && onResend && (
                        <button
                          onClick={() => onResend(a.id)}
                          disabled={isResending}
                          title="Send it to citizens' phones in the target area again, marked as an update"
                          className="inline-flex items-center gap-1.5 ml-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Send size={12} />
                          {isResending ? 'Sending…' : 'Resend to phones'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.li>
  );
};
