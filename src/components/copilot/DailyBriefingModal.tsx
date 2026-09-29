import React from 'react';
import { motion } from 'framer-motion';
import { X, ShieldAlert, CheckCircle2, RefreshCw, Clock, ArrowUpRight } from 'lucide-react';
import type { CopilotTask } from '../../types';

interface DailyBriefingModalProps {
  show: boolean;
  onClose: () => void;
  tasks: CopilotTask[];
  isLoadingTasks: boolean;
  userName: string;
  userRole: string;
  onTaskAction: (link?: string) => void;
}

export const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({
  show,
  onClose,
  tasks,
  isLoadingTasks,
  userName,
  userRole,
  onTaskAction,
}) => {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Daily Operational Briefing</h3>
              <p className="text-[10px] text-slate-400">
                Welcome back, {userName} ({userRole}) · Today&apos;s High-Priority Response Queue
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Task Items */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
            <span className="font-semibold">
              {tasks.length} Actionable Items Identified by AI Sentinel
            </span>
            <span className="text-blue-600 font-bold flex items-center gap-1">
              <Clock size={12} /> Response Deadlines Active
            </span>
          </div>

          <div className="space-y-3">
            {isLoadingTasks ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-600" />
                <span>Loading real-time situational priorities...</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">All Operations Clear!</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  No urgent pending actions require your intervention.
                </p>
              </div>
            ) : (
              tasks.map((task) => {
                const isCrit = task.priority === 'Critical';
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCrit
                        ? 'bg-red-50/40 border-red-200'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isCrit ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                          }`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          {task.category}
                        </span>
                        {task.display_id && (
                          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {task.display_id}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{task.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 sm:pl-3 sm:border-l sm:border-slate-100">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Clock size={12} className="text-blue-600" />
                        {task.dueTime || 'Within 1 hour'}
                      </span>
                      <button
                        onClick={() => onTaskAction(task.link)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <span>Take Action</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
            <span className="text-slate-400 text-[11px]">
              You can reopen this briefing anytime from the AI Copilot button.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Proceed to Dashboard
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
