import React from 'react';
import { Search, SlidersHorizontal, Radio } from 'lucide-react';

import type {
  CommunicationCategoryFilter,
  CommunicationStatusFilter,
} from '../../../types';
import { categories, severities } from '../../../constants';

interface CommunicationFiltersProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  categoryFilter: CommunicationCategoryFilter;
  onCategoryChange: (v: CommunicationCategoryFilter) => void;
  severityFilter: string;
  onSeverityChange: (v: string) => void;
  statusFilter: CommunicationStatusFilter;
  onStatusChange: (v: CommunicationStatusFilter) => void;
  totalCount: number;
  filteredCount: number;
}

export const CommunicationFilters: React.FC<CommunicationFiltersProps> = ({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  severityFilter,
  onSeverityChange,
  statusFilter,
  onStatusChange,
  totalCount,
  filteredCount,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
      {/* Row 1: Search bar + Live / Retracted */}
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search public communications by title, content, or location..."
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium shrink-0" role="group" aria-label="Broadcast status">
          <Radio size={12} className="text-slate-400" />
          <span>Status:</span>
          {([
            { id: 'All' as const, label: 'All' },
            { id: 'Active' as const, label: 'Live' },
            { id: 'Retracted' as const, label: 'Retracted' },
          ]).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={statusFilter === id}
              onClick={() => onStatusChange(id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                statusFilter === id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Category and Severity filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <SlidersHorizontal size={12} className="text-slate-400 shrink-0" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Type:</span>
          <div className="flex gap-1 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold cursor-pointer transition-all ${
                  categoryFilter === cat
                    ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Severity:</span>
          <div className="flex gap-1">
            {severities.map((sev) => (
              <button
                key={sev}
                onClick={() => onSeverityChange(sev)}
                className={`px-2 py-0.5 rounded-full border text-[10px] font-bold cursor-pointer transition-all ${
                  severityFilter === sev
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <span className="ml-auto text-[11px] text-slate-400 font-medium shrink-0">
          Showing {filteredCount} of {totalCount} broadcasts
        </span>
      </div>
    </div>
  );
};
