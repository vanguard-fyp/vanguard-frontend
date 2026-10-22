import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  UserCheck,
  Send,
  EyeOff,
  CheckCircle2,
  MapPin,
  Clock,
  Bell,
} from 'lucide-react';
import { DisasterBadge } from '../dashboard/DisasterBadge';
import { formatDateTime } from '../../../utils/dateFormatter';

import type { PublicAnnouncement } from '../../../types';
import { categoryBadgeStyle } from '../../../constants';

interface CommunicationCardProps {
  announcement: PublicAnnouncement;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Push this announcement to citizens' phones again, as an update. */
  onResend?: (id: string) => void;
  isResending?: boolean;
}

export const CommunicationCard: React.FC<CommunicationCardProps> = ({
  announcement,
  isExpanded,
  onToggleExpand,
  onToggleActive,
  onDelete,
  onResend,
  isResending = false,
}) => {

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
        isExpanded
          ? 'border-blue-300 shadow-md ring-1 ring-blue-500/20'
          : 'border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-2xs'
      }`}
    >
      {/* Summary Row — Always visible */}
      <div
        onClick={onToggleExpand}
        className="px-5 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex-1 min-w-0 space-y-0.5">
          {/* Dim ID + timestamp row above title */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <span className='text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex gap-1 items-center'><Bell size={10} className="shrink-0" />{announcement.display_id || `ANN-${announcement.id.slice(0, 8).toUpperCase()}`}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock size={10} className="shrink-0" />
              {formatDateTime(announcement.issued_at ?? '')}
            </span>
          </div>

          {/* Title — prominent */}
          <h4 className="text-sm font-bold text-slate-900 truncate">{announcement.title}</h4>

          {/* Category + Severity badges only — no location/time (shown in details) */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                categoryBadgeStyle[announcement.category] || 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {announcement.category}
            </span>
            <DisasterBadge type="severity" value={announcement.severity} className="shrink-0" />
          </div>
        </div>

        {/* Right rail: Live/Retracted status pill + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border hidden sm:flex items-center gap-1.5 ${
              announcement.active
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                announcement.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            {announcement.active ? 'Live' : 'Retracted'}
          </span>
          <div className="text-slate-400">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded Details Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-slate-50/80 border-t border-slate-100 px-5 py-4 space-y-4"
          >
            {/* Full Content Body */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Official Broadcast Text</p>
              <p className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                {announcement.content}
              </p>
            </div>

            {/* Target Audience & Issuing Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white border border-slate-200 rounded-xl p-3 text-xs shadow-2xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Target State</p>
                <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                  <MapPin size={12} className="text-blue-500" />
                  {announcement.target_state}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Affected Districts</p>
                <p className="font-bold text-slate-800 mt-0.5">{announcement.target_districts.join(', ')}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Issuing Authority</p>
                <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                  <UserCheck size={12} className="text-emerald-600" />
                  {announcement.issued_by ?? 'EOC Authority'}
                </p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-end flex-wrap gap-3 pt-1">
              <div className="flex items-center gap-2">
                {announcement.active ? (
                  // Active → Retract goes through confirmation modal
                  <button
                    onClick={() => onDelete?.(announcement.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-2xs border bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 cursor-pointer"
                  >
                    <EyeOff size={13} />
                    Retract Announcement
                  </button>
                ) : (
                  // Inactive → Reactivate directly (no confirmation needed)
                  <button
                    onClick={() => onToggleActive(announcement.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-2xs border bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 cursor-pointer"
                  >
                    <CheckCircle2 size={13} />
                    Reactivate Announcement
                  </button>
                )}
                {announcement.active && onResend && (
                  <button
                    onClick={() => onResend(announcement.id)}
                    disabled={isResending}
                    title="Send it to citizens' phones in the target area again, marked as an update"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Send size={13} />
                    {isResending ? 'Sending…' : 'Resend to Phones'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
