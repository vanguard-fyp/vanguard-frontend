import React from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface PaginationBarProps {
  pageIndex: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (pageIndex: number) => void;
  isFetching?: boolean;
  label?: string;
}

/** Shows the backend-reported total and moves one server page at a time. */
export const PaginationBar: React.FC<PaginationBarProps> = ({
  pageIndex, pageCount, total, pageSize, onPageChange, isFetching, label = 'records',
}) => {
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-2 text-xs text-slate-600">
      <span className="flex items-center gap-1.5">
        {isFetching && <Loader2 size={12} className="animate-spin text-slate-400" />}
        {total === 0 ? `No ${label}` : `${from}–${to} of ${total.toLocaleString()} ${label}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={pageIndex <= 0}
          onClick={() => onPageChange(pageIndex - 1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="px-2 font-semibold tabular-nums">
          Page {Math.min(pageIndex + 1, pageCount)} / {pageCount}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => onPageChange(pageIndex + 1)}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
