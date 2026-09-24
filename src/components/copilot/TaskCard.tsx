import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { CopilotTask } from '../../types';

interface TaskCardProps {
  task: CopilotTask;
  onAction: (link?: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onAction }) => {
  const isCrit = task.priority === 'Critical';

  return (
    <div
      className={`p-3 rounded-xl bg-white border transition-all hover:shadow-md ${
        isCrit ? 'border-red-200 shadow-xs' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
              isCrit ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {task.priority}
          </span>
          {task.displayId && (
            <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-200">
              {task.displayId}
            </span>
          )}
        </div>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide shrink-0">
          {task.category}
        </span>
      </div>

      <h4 className="text-xs font-bold text-slate-900 leading-snug">{task.title}</h4>
      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{task.description}</p>

      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
        <span className="text-[10px] text-slate-400 font-medium">
          Due: {task.dueTime || 'Today'}
        </span>
        <button
          onClick={() => onAction(task.link)}
          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
        >
          <span>Action Item</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
};
