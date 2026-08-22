import React from 'react';
import { ChevronRight } from 'lucide-react';

interface PipelineConnectorProps {
  fromLabel: string;
  toLabel: string;
  count?: number;
}

export const PipelineConnector: React.FC<PipelineConnectorProps> = ({ fromLabel, toLabel, count }) => {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-300" />
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-xs shrink-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{fromLabel}</span>
        <ChevronRight size={12} className="text-blue-500" />
        {count !== undefined && (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{count}</span>
        )}
        <ChevronRight size={12} className="text-blue-500" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{toLabel}</span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-300" />
    </div>
  );
};
