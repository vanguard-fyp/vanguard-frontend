import React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

import type { AgencyFilter, StatusFilter, TeamSortBy } from '../../../../types';

interface TeamListFiltersProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filterAgency: AgencyFilter;
  onAgencyChange: (v: AgencyFilter) => void;
  filterStatus: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  sortBy: TeamSortBy;
  onSortChange: (v: TeamSortBy) => void;
  totalCount: number;
  filteredCount: number;
}

const agencies: AgencyFilter[] = ['All', 'SMART', 'BOMBA', 'APM', 'PDRM', 'ATM'];
const statuses: StatusFilter[] = ['All', 'Available', 'Deployed', 'En Route'];

const agencyAccent: Record<string, string> = {
  SMART: 'border-blue-400 text-blue-800 bg-blue-50',
  BOMBA: 'border-red-400 text-red-800 bg-red-50',
  APM: 'border-emerald-400 text-emerald-800 bg-emerald-50',
  PDRM: 'border-indigo-400 text-indigo-800 bg-indigo-50',
  ATM: 'border-amber-400 text-amber-800 bg-amber-50',
};

export const TeamListFilters: React.FC<TeamListFiltersProps> = ({
  searchQuery, onSearchChange,
  filterAgency, onAgencyChange,
  filterStatus, onStatusChange,
  sortBy, onSortChange,
  totalCount, filteredCount,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
      {/* Row 1: Search + Sort */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by team name or commander..."
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium shrink-0">
          <ArrowUpDown size={12} className="text-slate-400" />
          <span>Sort:</span>
          {(['default', 'personnel', 'status'] as TeamSortBy[]).map((s) => (
            <button
              key={s}
              onClick={() => onSortChange(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${sortBy === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {s === 'default' ? 'Default' : s === 'personnel' ? 'Personnel' : 'Status'}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Agency + Status Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={12} className="text-slate-400" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Agency:</span>
          <div className="flex gap-1">
            {agencies.map((a) => (
              <button
                key={a}
                onClick={() => onAgencyChange(a)}
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold transition-colors cursor-pointer ${filterAgency === a
                    ? a === 'All' ? 'bg-slate-700 text-white border-slate-700' : `${agencyAccent[a]} border-2`
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Status:</span>
          <div className="flex gap-1">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold transition-colors cursor-pointer ${filterStatus === s
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <span className="ml-auto text-[11px] text-slate-400 font-medium shrink-0">
          Showing {filteredCount} of {totalCount} teams
        </span>
      </div>
    </div>
  );
};
