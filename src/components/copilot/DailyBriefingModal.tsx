import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { CopilotTask } from '../../types';
import { TaskCard } from './TaskCard';
import { CopilotMascot } from './CopilotMascot';

interface DailyBriefingModalProps {
  show: boolean;
  onClose: () => void;
  tasks: CopilotTask[];
  isLoadingTasks: boolean;
  onTaskAction: (link?: string) => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

/** Sidebar navy (SIDEBAR_THEME.bg) so the briefing wears the app's own colour. */
const NAVY = '#1e293b';

/** First screen after sign-in: what needs the officer's attention today. */
export const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({
  show,
  onClose,
  tasks,
  isLoadingTasks,
  onTaskAction,
}) => {
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, onClose]);

  const today = new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long' });
  const counts = ['Critical', 'High', 'Medium']
    .map((p) => ({ p, n: tasks.filter((t) => t.priority === p).length }))
    .filter((c) => c.n > 0);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="briefing"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="briefing-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.32, ease }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-[0_24px_60px_-20px_rgba(15,23,42,.45)] overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex items-start gap-3.5 text-white" style={{ background: NAVY }}>
              <CopilotMascot size={46} tone="light" className="copilot-float shrink-0 -mt-1" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{today}</p>
                <h3 id="briefing-title" className="text-lg font-extrabold text-white tracking-tight mt-0.5">Today's briefing</h3>
                {!isLoadingTasks && tasks.length > 0 && (
                  <p className="mt-1 text-xs text-slate-300">
                    {tasks.length} {tasks.length === 1 ? 'item needs' : 'items need'} you
                    {counts.length > 0 && <span className="text-slate-400"> · {counts.map(({ p, n }) => `${n} ${p.toLowerCase()}`).join(', ')}</span>}
                  </p>
                )}
              </div>
              <button onClick={onClose} aria-label="Close briefing"
                className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Tasks */}
            <div className="px-6 pt-4 pb-2 overflow-y-auto flex-1 min-h-0 bg-slate-50/60">
              {isLoadingTasks ? (
                <div className="space-y-2.5 pb-4" aria-label="Loading today's priorities">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-[62px] rounded-xl bg-slate-200/60 animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-slate-800">Nothing urgent right now</p>
                  <p className="text-xs text-slate-500 mt-1">No pending actions need you. Copilot will flag anything new.</p>
                </div>
              ) : (
                <ul className="space-y-2 pb-4">
                  {tasks.map((task, i) => (
                    <motion.li key={task.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease, delay: 0.08 + i * 0.05 }}
                    >
                      <TaskCard task={task} onAction={onTaskAction} size="md" />
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">Also in Copilot, bottom right.</p>
              <button onClick={onClose}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer">
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
