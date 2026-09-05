/**
 * SkeletonLoader.tsx — Vanguard EDMS
 * Reusable shimmer skeleton components for all loading states.
 * Tailored for clean light mode aesthetic.
 */
import React from 'react';

// ─── Base shimmer animation ─────────────────────────────────────────────────

const shimmer = `
  relative overflow-hidden before:absolute before:inset-0
  before:-translate-x-full before:animate-[shimmer_1.5s_infinite]
  before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent
`;

// ─── Page-level thin progress bar (for isFetching) ─────────────────────────

export const PageLoadBar: React.FC = () => (
  <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-slate-100">
    <div
      className="h-full bg-blue-600 animate-[pageload_1.8s_ease-in-out_infinite]"
      style={{ width: '60%' }}
    />
    <style>{`
      @keyframes shimmer {
        100% { transform: translateX(100%); }
      }
      @keyframes pageload {
        0%   { margin-left: 0%; width: 0%; }
        50%  { margin-left: 20%; width: 60%; }
        100% { margin-left: 100%; width: 10%; }
      }
    `}</style>
  </div>
);

// ─── SkeletonCard — for incident/team/resource cards ───────────────────────

interface SkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3, showAvatar = false }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
    <div className="flex items-center gap-3">
      {showAvatar && (
        <div className={`w-10 h-10 rounded-full bg-slate-200 ${shimmer}`} />
      )}
      <div className="flex-1 space-y-2">
        <div className={`h-4 w-3/4 rounded bg-slate-200 ${shimmer}`} />
        <div className={`h-3 w-1/2 rounded bg-slate-100 ${shimmer}`} />
      </div>
      <div className={`h-5 w-16 rounded-full bg-slate-200 ${shimmer}`} />
    </div>
    {Array.from({ length: lines - 1 }).map((_, i) => (
      <div
        key={i}
        className={`h-3 rounded bg-slate-100 ${shimmer}`}
        style={{ width: `${85 - i * 15}%` }}
      />
    ))}
  </div>
);

// ─── SkeletonTable — for tabular data ──────────────────────────────────────

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({ rows = 5, cols = 4 }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
    {/* Header */}
    <div className="flex gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className={`h-3 flex-1 rounded bg-slate-200 ${shimmer}`} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, ri) => (
      <div
        key={ri}
        className={`flex gap-4 px-4 py-3.5 border-b border-slate-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
      >
        {Array.from({ length: cols }).map((_, ci) => (
          <div
            key={ci}
            className={`h-3 flex-1 rounded bg-slate-200/80 ${shimmer}`}
            style={{ maxWidth: ci === 0 ? '140px' : undefined }}
          />
        ))}
      </div>
    ))}
  </div>
);

// ─── SkeletonChart — for chart areas ───────────────────────────────────────

interface SkeletonChartProps {
  height?: number;
}

export const SkeletonChart: React.FC<SkeletonChartProps> = ({ height = 200 }) => (
  <div
    className={`bg-white border border-slate-200 rounded-xl p-4 shadow-xs ${shimmer}`}
    style={{ height }}
  >
    <div className="h-4 w-40 rounded bg-slate-200 mb-4" />
    {/* Bar placeholders */}
    <div className="flex items-end gap-3 h-[calc(100%-2rem)]">
      {[65, 45, 80, 55, 70, 40, 85, 60].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-slate-200"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  </div>
);

// ─── SkeletonMap — for map canvas areas ────────────────────────────────────

export const SkeletonMap: React.FC = () => (
  <div className={`relative bg-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-xs ${shimmer}`} style={{ height: '100%', minHeight: 300 }}>
    {/* Grid pattern overlay */}
    <div className="absolute inset-0 opacity-20"
      style={{
        backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    />
    {/* Mock map pins */}
    {[[30, 40], [55, 60], [70, 25], [45, 75]].map(([x, y], i) => (
      <div
        key={i}
        className="absolute w-4 h-4 rounded-full bg-blue-400 border-2 border-white shadow-xs"
        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
      />
    ))}
    <div className="absolute bottom-4 left-4 space-y-2">
      <div className="h-3 w-24 rounded bg-slate-300" />
      <div className="h-3 w-16 rounded bg-slate-200" />
    </div>
  </div>
);

// ─── SkeletonKPICard — for dashboard KPI tiles ─────────────────────────────

export const SkeletonKPICard: React.FC = () => (
  <div className={`bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs ${shimmer}`}>
    <div className="flex items-center justify-between">
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="h-8 w-8 rounded-lg bg-slate-100" />
    </div>
    <div className="h-8 w-20 rounded bg-slate-300" />
    <div className="h-2 w-full rounded-full bg-slate-100" />
    <div className="h-3 w-32 rounded bg-slate-100" />
  </div>
);

// ─── SkeletonList — generic list items ─────────────────────────────────────

interface SkeletonListProps {
  count?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ count = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} lines={2} showAvatar={i % 2 === 0} />
    ))}
  </div>
);
