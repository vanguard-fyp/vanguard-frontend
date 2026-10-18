import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import type { CopilotTask } from '../../types';

/* Priority is a soft dot, not a coloured block: light tints of red, orange and
   amber so the hint is there without shouting. */
const PRIORITY_DOT: Record<string, string> = {
  Critical: '#f87171',
  High: '#fdba74',
  Medium: '#fcd34d',
};
export const priorityDot = (p: string) => PRIORITY_DOT[p] ?? '#93c5fd';

interface TaskCardProps {
  task: CopilotTask;
  onAction: (link?: string) => void;
  /** roomier layout for the briefing dialog */
  size?: 'sm' | 'md';
}

/** One task: what it is, how urgent, when. The full description is on hover. */
export const TaskCard: React.FC<TaskCardProps> = ({ task, onAction, size = 'sm' }) => {
  const md = size === 'md';
  return (
    <button
      type="button"
      onClick={() => onAction(task.link)}
      title={task.description}
      className={`group w-full text-left flex items-center gap-3 rounded-xl bg-white border border-slate-200/80 transition-[border-color,box-shadow,transform] duration-200
        hover:border-slate-300 hover:shadow-[0_6px_20px_-12px_rgba(15,23,42,.3)] hover:-translate-y-px cursor-pointer
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${md ? 'px-4 py-3' : 'px-3 py-2.5'}`}
    >
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: priorityDot(task.priority) }} aria-hidden="true" />

      <span className="flex-1 min-w-0">
        <span className={`block font-semibold text-slate-900 truncate ${md ? 'text-sm' : 'text-[13px]'}`}>{task.title}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <span>{task.priority}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <Clock size={11} className="text-slate-400" aria-hidden="true" />
          <span>{task.dueTime || 'Today'}</span>
        </span>
      </span>

      <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all duration-200" aria-label={task.actionLabel || 'Open'} />
    </button>
  );
};
