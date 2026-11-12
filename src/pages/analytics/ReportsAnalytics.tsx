import { DataRegion } from '../../components/common/DataRegion';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  FileText,
  Download,
  Clock,
  Activity,
  Users,
  Package,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  ChevronDown,
  ChevronRight,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import {
  useMonthlyTrends,
  useDisasterTypeDistribution,
  useAgencyResponseTimes,
  useResourceUtilization,
  useStateHeatmap,
  useAnalyticsSummary,
} from '../../hooks';
import { analyticsService } from '../../services/analyticsService';
import { SkeletonKPICard } from '../../components/ui/shared/SkeletonLoader';
import { useToast } from '../../context/ToastContext';

const containerAnim = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="text-slate-500 font-medium mb-1">{label}</p>
        {payload.map((p: any, idx: number) => (
          <p key={idx} style={{ color: p.color }} className="font-bold">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Current year and month in Malaysia time (the browser may be in another timezone).
const MYT_PARTS = new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'numeric' })
  .formatToParts(new Date());
const CURRENT_YEAR = Number(MYT_PARTS.find((p) => p.type === 'year')?.value);
const CURRENT_MONTH = Number(MYT_PARTS.find((p) => p.type === 'month')?.value);
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1].map(String);

// Northeast Monsoon seasons run Nov–Mar; "NEM2025" = Nov 2025 to Mar 2026.
// The latest season is the one in progress (Nov–Mar) or the one that just ended.
const LATEST_SEASON = CURRENT_MONTH >= 11 ? CURRENT_YEAR : CURRENT_YEAR - 1;
const SEASON_OPTIONS = [LATEST_SEASON, LATEST_SEASON - 1, LATEST_SEASON - 2].map((y) => `NEM${y}`);

type PeriodMode = 'year' | 'season';

/** "2026" stays as is; "NEM2025" becomes "NEM 2025/26". */
const periodLabel = (period: string): string => {
  const m = /^NEM(\d{4})$/.exec(period);
  return m ? `NEM ${m[1]}/${String(Number(m[1]) + 1).slice(-2)}` : period;
};

type ExportKind = 'sitrep' | 'pdf' | 'excel';

const SEVERITY_PILL: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700 border border-red-200',
  High: 'bg-orange-50 text-orange-700 border border-orange-200',
  Medium: 'bg-amber-50 text-amber-800 border border-amber-200',
  Low: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

/**
 * Year-on-year change line (arrow + coloured text): red when the change is bad,
 * green when good, grey when flat. Says so when there is no prior year to compare.
 */
const DeltaPill: React.FC<{ value: number | null | undefined; unit: string; goodWhen: 'up' | 'down'; vs: string }> = ({
  value, unit, goodWhen, vs,
}) => {
  if (value == null) return <p className="text-[11px] font-medium text-slate-400">No {vs} data to compare</p>;
  const good = value === 0 ? null : (value > 0) === (goodWhen === 'up');
  const cls = good == null ? 'text-slate-500' : good ? 'text-emerald-700' : 'text-red-700';
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <p className={`flex items-center gap-1.5 text-[11px] font-semibold ${cls}`}>
      <Icon size={13} />
      {value > 0 ? '+' : ''}{value}{unit} vs {vs}
    </p>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; valueCls: string; children?: React.ReactNode }> = ({
  icon, label, value, valueCls, children,
}) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
    <div className="flex items-center gap-2 mb-1.5">
      {icon}
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
    </div>
    <p className={`text-2xl font-bold ${valueCls}`}>{value}</p>
    <div className="mt-1.5 min-h-[22px]">{children}</div>
  </div>
);

const ReportsAnalytics: React.FC = () => {
  const [periodMode, setPeriodMode] = useState<PeriodMode>('year');
  const [dateRange, setDateRange] = useState(String(CURRENT_YEAR));
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const periodText = periodLabel(dateRange);

  const switchMode = (mode: PeriodMode) => {
    setPeriodMode(mode);
    setDateRange(mode === 'year' ? YEAR_OPTIONS[0] : SEASON_OPTIONS[0]);
  };

  // Close the export menu on an outside click or Escape.
  useEffect(() => {
    if (!exportMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExportMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [exportMenuOpen]);

  const summaryQuery = useAnalyticsSummary({ year: dateRange });
  const { data: summaryData, isLoading: isSummaryLoading } = summaryQuery;
  const trendsQuery = useMonthlyTrends({ year: dateRange });
  const { data: monthlyIncidentTrend = [], isLoading: isTrendsLoading } = trendsQuery;
  const typesQuery = useDisasterTypeDistribution({ year: dateRange });
  const { data: disasterTypeDistribution = [], isLoading: isTypesLoading } = typesQuery;
  const responseTimesQuery = useAgencyResponseTimes({ year: dateRange });
  const { data: responseTimeData = [], isLoading: isRespLoading } = responseTimesQuery;
  const utilizationQuery = useResourceUtilization();
  const { data: rawResourceUtilization = [], isLoading: isResLoading } = utilizationQuery;
  const heatmapQuery = useStateHeatmap({ year: dateRange });
  const { data: stateIncidentHeatmap = [] } = heatmapQuery;

  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  const [showAllStates, setShowAllStates] = useState(false);

  const toggleStateExpand = (stateName: string) => {
    setExpandedStates((prev) => ({
      ...prev,
      [stateName]: !prev[stateName],
    }));
  };

  const runExport = async (kind: ExportKind) => {
    setExportMenuOpen(false);
    setExporting(kind);
    try {
      if (kind === 'sitrep') await analyticsService.exportNationalSitrep();
      else if (kind === 'pdf') await analyticsService.exportPDF(dateRange);
      else await analyticsService.exportExcel(dateRange);
    } catch (err) {
      toast.error('Export failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setExporting(null);
    }
  };

  type ExportItem = { kind: ExportKind; icon: React.ElementType; color: string; label: string; hint: string; format: string };
  const exportGroups: { title: string; items: ExportItem[] }[] = [
    {
      title: 'Live situation',
      items: [
        { kind: 'sitrep', icon: FileText, color: '#e11d48', label: 'National SITREP', hint: 'Active incidents, relief centres and warnings as at now', format: 'PDF' },
      ],
    },
    {
      title: `Analytics · ${periodText}`,
      items: [
        { kind: 'pdf', icon: BarChart3, color: '#2563eb', label: 'Executive report', hint: 'Charts and tables for the selected period', format: 'PDF' },
        { kind: 'excel', icon: FileSpreadsheet, color: '#059669', label: 'Excel workbook', hint: 'All figures, one sheet per section', format: 'XLSX' },
      ],
    },
  ];

  const resourceUtilization = rawResourceUtilization.map((r) => ({
    category: r.name,
    used: r.value,
    allocated: r.allocated,
    stock: r.stock,
  }));

  const totalIncidents = summaryData?.total_incidents ?? 0;
  const resolutionRate = summaryData?.resolution_rate ?? null;
  const totalAffected = summaryData?.total_affected_reported ?? 0;
  const avgResponseTimeMin = summaryData?.avg_response_time_min ?? null;
  const prior = summaryData?.comparison_label ?? summaryData?.comparison_year ?? 'the previous period';
  // Only disaster types that occurred in the period get a legend row.
  const occurredTypes = disasterTypeDistribution.filter((d) => d.value > 0);
  const statesWithIncidents = stateIncidentHeatmap.filter((s) => s.count > 0).length;
  const visibleStates = showAllStates
    ? stateIncidentHeatmap
    : [...stateIncidentHeatmap].filter((s) => s.count > 0).sort((a, b) => b.count - a.count);

  const isLoading = isSummaryLoading || isTrendsLoading || isTypesLoading || isRespLoading || isResLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
        <SkeletonKPICard />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerAnim}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemAnim} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reports & Analytics</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div role="tablist" aria-label="Report period type" className="flex items-center bg-slate-100 rounded-lg p-0.5">
            {([['year', 'Year'], ['season', 'Monsoon season']] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={periodMode === mode}
                onClick={() => periodMode !== mode && switchMode(mode)}
                title={mode === 'season' ? 'Northeast Monsoon season, November to March' : undefined}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${periodMode === mode ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            aria-label={periodMode === 'year' ? 'Year' : 'Monsoon season'}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
          >
            {(periodMode === 'year' ? YEAR_OPTIONS : SEASON_OPTIONS).map((p) => (
              <option key={p} value={p}>{periodLabel(p)}</option>
            ))}
          </select>

          <div ref={exportMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((v) => !v)}
              disabled={exporting !== null}
              aria-haspopup="menu"
              aria-expanded={exportMenuOpen}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>{exporting === 'sitrep' ? 'Preparing SITREP…' : exporting ? 'Exporting…' : 'Export'}</span>
              {!exporting && <ChevronDown size={13} />}
            </button>
            <AnimatePresence>
              {exportMenuOpen && (
                <motion.div
                  role="menu"
                  aria-label="Export reports"
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  style={{ transformOrigin: 'top right' }}
                  className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-[0_12px_32px_-8px_rgba(15,23,42,0.25)] z-30 overflow-hidden"
                >
                  {exportGroups.map((group, gi) => (
                    <div key={group.title} className={gi > 0 ? 'border-t border-slate-100' : ''}>
                      <p className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.title}</p>
                      <div className="px-1.5 pb-1.5">
                        {group.items.map(({ kind, icon: Icon, color, label, hint, format }) => (
                          <button
                            key={kind}
                            type="button"
                            role="menuitem"
                            onClick={() => runExport(kind)}
                            className="group w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none cursor-pointer"
                          >
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}14`, color }}>
                              <Icon size={15} />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-xs font-semibold text-slate-800">{label}</span>
                              <span className="block text-[11px] text-slate-500 leading-snug">{hint}</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 shrink-0 group-hover:text-slate-600">
                              {format}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Summary KPIs */}
      <motion.div variants={itemAnim} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DataRegion queries={[summaryQuery]} label="Total Incidents"><StatCard icon={<AlertTriangle size={16} className="text-orange-600" />} label="Total Incidents"
          value={String(totalIncidents)} valueCls="text-slate-900">
          <DeltaPill value={summaryData?.incident_trend_pct} unit="%" goodWhen="down" vs={prior} />
        </StatCard></DataRegion>
        <DataRegion queries={[summaryQuery]} label="Resolution Rate"><StatCard icon={<Activity size={16} className="text-emerald-600" />} label="Resolution Rate"
          value={resolutionRate != null ? `${resolutionRate}%` : '—'} valueCls="text-emerald-700">
          <DeltaPill value={summaryData?.resolution_rate_improvement_pct} unit=" pts" goodWhen="up" vs={prior} />
        </StatCard></DataRegion>
        <DataRegion queries={[summaryQuery]} label="Avg Response Time"><StatCard icon={<Clock size={16} className="text-blue-600" />} label="Avg Response Time"
          value={avgResponseTimeMin != null ? `${avgResponseTimeMin} min` : '—'} valueCls="text-blue-700">
          <DeltaPill value={summaryData?.response_time_delta_min} unit=" min" goodWhen="down" vs={prior} />
        </StatCard></DataRegion>
        <DataRegion queries={[summaryQuery]} label="People Affected"><StatCard icon={<Users size={16} className="text-purple-600" />} label="People Affected"
          value={totalAffected.toLocaleString()} valueCls="text-purple-700">
          <p className="text-[11px] font-medium text-slate-400">Reported, all districts ({periodText})</p>
        </StatCard></DataRegion>
      </motion.div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataRegion queries={[trendsQuery]} label="Monthly Incident & Resolution Trend"><motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Monthly Incident & Resolution Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyIncidentTrend}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#475569', fontWeight: 600 }} />
              <Area type="monotone" dataKey="incidents" name="Incidents Reported" stroke="#ea580c" fill="url(#incGrad)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#16a34a" fill="url(#resGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div></DataRegion>

        {/* Disaster Type Distribution */}
        <DataRegion queries={[typesQuery]} label="Disaster Type Breakdown"><motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Disaster Type Breakdown (%)</h3>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-48 h-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occurredTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {occurredTypes.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1">
              {occurredTypes.length === 0 && <p className="text-xs text-slate-500">No incidents in {periodText}.</p>}
              {occurredTypes.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
                  <span className="text-xs font-semibold text-slate-700 flex-1">{d.name}</span>
                  <span className="text-sm font-bold text-slate-900">{d.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div></DataRegion>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time by Agency */}
        <DataRegion queries={[responseTimesQuery]} label="Avg Response Time by Agency"><motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Avg Response Time by Agency (min)</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={responseTimeData.map((d) => ({ agency: d.agency, avgMins: d.avg_mins, samples: d.samples }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="agency" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgMins" name="Avg Minutes" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
          {responseTimeData.some((d) => d.avg_mins == null) && (
            <p className="text-[11px] text-slate-400 mt-1">
              No measurable dispatches ({periodText}): {responseTimeData.filter((d) => d.avg_mins == null).map((d) => d.agency).join(', ')}
            </p>
          )}
          {responseTimeData.some((d) => (d.excluded ?? 0) > 0) && (
            <p className="text-[11px] text-amber-700 mt-0.5">
              Not counted (assigned before the incident time or more than 7 days after it):{' '}
              {responseTimeData.filter((d) => (d.excluded ?? 0) > 0).map((d) => `${d.agency} ×${d.excluded}`).join(', ')}
            </p>
          )}
        </motion.div></DataRegion>

        {/* Resource Utilization */}
        <DataRegion queries={[utilizationQuery]} label="Resource Utilization Rate"><motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Resource Utilization Rate (%)</h3>

          </div>
          {resourceUtilization.length === 0 && <p className="text-xs text-slate-500">No stock or approved requisitions recorded.</p>}
          <div className="space-y-4">
            {resourceUtilization.map((res) => (
              <div key={res.category}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-800">{res.category}</span>
                  <span className={`text-xs font-bold ${res.used > 80 ? 'text-red-600' : res.used > 50 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                    {res.used}% allocated
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${res.used > 80 ? 'bg-red-500' : res.used > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    style={{ width: `${res.used}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div></DataRegion>
      </div>

      {/* Historical Incident by State */}
      <DataRegion queries={[heatmapQuery]} label="State Disaster Impact & Performance Summary"><motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">State Disaster Impact & Performance Summary ({periodText})</h3>
          </div>
          {stateIncidentHeatmap.length > statesWithIncidents && (
            <button
              type="button"
              onClick={() => setShowAllStates((v) => !v)}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white border border-slate-200 px-2.5 py-1 rounded-md cursor-pointer"
            >
              {showAllStates
                ? `Only states with incidents (${statesWithIncidents})`
                : `Show all ${stateIncidentHeatmap.length} states`}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['State / Territory', 'Incidents', 'Highest Severity', 'Resolved', 'Avg Time to Resolve', 'Affected (reported)', 'Districts'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statesWithIncidents === 0 && !showAllStates && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-400">No incidents in {periodText}.</td></tr>
              )}
              {visibleStates.map((state) => {
                const hasIncidents = state.count > 0;
                const isExpanded = !!expandedStates[state.state];
                const districts = state.districts || [];
                const respRate = state.resolved_pct != null ? `${state.resolved_pct}%` : '—';
                const avgRes = state.avg_resolution_hours != null ? `${state.avg_resolution_hours} h` : hasIncidents ? 'none resolved' : '—';
                const popAffected = state.affected_population.toLocaleString();
                return (
                  <React.Fragment key={state.state}>
                    <tr
                      onClick={() => districts.length > 0 && toggleStateExpand(state.state)}
                      className={`transition-colors ${districts.length > 0 ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/60'}`}
                    >
                      <td className="px-4 py-3 text-xs font-bold text-slate-900 flex items-center gap-2">
                        {districts.length > 0 ? (
                          <span className="text-slate-400 hover:text-slate-700 transition-colors">
                            {isExpanded ? <ChevronDown size={14} className="text-blue-600" /> : <ChevronRight size={14} />}
                          </span>
                        ) : (
                          <span className="w-3.5" />
                        )}
                        {state.state}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">
                        <span className={`px-2 py-0.5 rounded font-mono ${hasIncidents ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200' : 'text-slate-500'}`}>
                          {state.count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${state.severity ? SEVERITY_PILL[state.severity] : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                          {state.severity ?? (hasIncidents ? 'Not set' : '—')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-emerald-700">{respRate}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700">{avgRes}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800">{popAffected}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-500">
                        {districts.length > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStateExpand(state.state);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer"
                          >
                            <Layers size={11} /> {districts.length} {districts.length === 1 ? 'district' : 'districts'} {isExpanded ? '▲' : '▼'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">No reports</span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable District Frequency Breakdown */}
                    {isExpanded && districts.length > 0 && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={7} className="px-6 py-3 border-y border-slate-200">
                          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <Layers size={13} className="text-blue-600" />
                                {state.state} · District Incident Breakdown & Frequency
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {districts.map((d) => (
                                <div
                                  key={d.district}
                                  className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-200 text-xs"
                                >
                                  <div>
                                    <p className="font-bold text-slate-800">{d.district}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {d.affected_population.toLocaleString()} affected (reported)
                                    </p>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-1">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                      {d.count} {d.count === 1 ? 'incident' : 'incidents'}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${d.severity ? SEVERITY_PILL[d.severity] : 'bg-slate-100 text-slate-500'
                                      }`}>
                                      {d.severity ?? 'Not set'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div></DataRegion>
    </motion.div>
  );
};

export default ReportsAnalytics;
