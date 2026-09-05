import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Radio,
  UserCheck,
  Clock,
  Send,
  EyeOff,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { DisasterBadge } from '../dashboard/DisasterBadge';
import { formatDateTime } from '../../../utils/dateFormatter';

import type { PublicAnnouncement } from '../../../types';
import { channelIcons, categoryIcons, categoryBadgeStyle } from '../../../constants';

interface CommunicationCardProps {
  announcement: PublicAnnouncement;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const CommunicationCard: React.FC<CommunicationCardProps> = ({
  announcement,
  isExpanded,
  onToggleExpand,
  onToggleActive,
  onDelete,
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
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
            {categoryIcons[announcement.category] || <Radio size={16} className="text-slate-500" />}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {announcement.displayId || (announcement.id.startsWith('ann-') ? announcement.id.split('-').slice(0, 3).join('-').toUpperCase() : announcement.id.length > 15 ? `ANN-${announcement.id.slice(0, 8).toUpperCase()}` : announcement.id)}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  categoryBadgeStyle[announcement.category] || 'bg-slate-100 text-slate-700'
                }`}
              >
                {announcement.category}
              </span>
              <DisasterBadge type="severity" value={announcement.severity} />

              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ml-auto sm:ml-0 flex items-center gap-1 ${
                  announcement.active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    announcement.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                {announcement.active ? 'Active Notice' : 'Archived / Retracted'}
              </span>
            </div>

            <h4 className="text-sm font-bold text-slate-900 truncate">{announcement.title}</h4>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin size={11} className="text-slate-400" />
                {announcement.targetState} ({announcement.targetDistricts.join(', ')})
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={11} className="text-slate-400" />
                {formatDateTime(announcement.timestamp)}
              </span>
              <span>·</span>
              <span>Issued by: {announcement.issuedBy}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold text-blue-600 hover:text-blue-700 underline hidden sm:inline">
            {isExpanded ? 'Hide Details' : 'View Broadcast Details'}
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
                  {announcement.targetState}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Affected Districts</p>
                <p className="font-bold text-slate-800 mt-0.5">{announcement.targetDistricts.join(', ')}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Issuing Authority</p>
                <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                  <UserCheck size={12} className="text-emerald-600" />
                  {announcement.issuedBy}
                </p>
              </div>
            </div>

            {/* Channels & Actions Bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Active Distribution Channels</p>
                <div className="flex flex-wrap gap-1.5">
                  {announcement.channels.map((ch) => (
                    <span
                      key={ch}
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-white text-slate-700 rounded-lg border border-slate-200 shadow-2xs"
                    >
                      {channelIcons[ch]}
                      {ch}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleActive(announcement.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-2xs border ${
                    announcement.active
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {announcement.active ? <EyeOff size={13} /> : <CheckCircle2 size={13} />}
                  {announcement.active ? 'Retract Announcement' : 'Reactivate Announcement'}
                </button>

                {onDelete && (
                  <button
                    onClick={() => onDelete(announcement.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                )}
                <button
                  onClick={() => alert(`Resending broadcast for ${announcement.title} across active channels.`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  <Send size={13} />
                  Resend Broadcast
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
