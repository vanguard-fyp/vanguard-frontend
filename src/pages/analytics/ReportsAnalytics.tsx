import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

// Current year in Malaysia time (the browser may be in another timezone).
const CURRENT_YEAR = Number(new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric' }).format(new Date()));
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1].map(String);

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
  const [dateRange, setDateRange] = useState(String(CURRENT_YEAR));
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const { data: summaryData, isLoading: isSummaryLoading } = useAnalyticsSummary({ year: dateRange });
  const { data: monthlyIncidentTrend = [], isLoading: isTrendsLoading } = useMonthlyTrends({ year: dateRange });
  const { data: disasterTypeDistribution = [], isLoading: isTypesLoading } = useDisasterTypeDistribution({ year: dateRange });
  const { data: responseTimeData = [], isLoading: isRespLoading } = useAgencyResponseTimes({ year: dateRange });
  const { data: rawResourceUtilization = [], isLoading: isResLoading } = useResourceUtilization();
  const { data: stateIncidentHeatmap = [] } = useStateHeatmap({ year: dateRange });

  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  const [showAllStates, setShowAllStates] = useState(false);

  const toggleStateExpand = (stateName: string) => {
    setExpandedStates((prev) => ({
      ...prev,
      [stateName]: !prev[stateName],
    }));
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await analyticsService.exportPDF(dateRange);
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await analyticsService.exportExcel(dateRange);
    } catch (err) {
      console.error('Excel Export Error:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const resourceUtilization = rawResourceUtilization.map((r) => ({
    category: r.name,
    used: r.value,
    allocated: r.allocated,
    stock: r.stock,
  }));

  // Every figure comes from the backend; missing data is shown as such, never estimated.
  const totalIncidents = summaryData?.total_incidents ?? 0;
  const resolutionRate = summaryData?.resolution_rate ?? null;
  const totalAffected = summaryData?.total_affected_reported ?? 0;
  const avgResponseTimeMin = summaryData?.avg_response_time_min ?? null;
  const prior = summaryData?.comparison_year ?? String(Number(dateRange) - 1);
  // Only disaster types that occurred in the year get a legend row.
  const occurredTypes = disasterTypeDistribution.filter((d) => d.value > 0);
  const statesWithIncidents = stateIncidentHeatmap.filter((s) => s.count > 0).length;
  // States without incidents add 10+ empty rows; they are hidden unless asked for.
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
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>Year: {y}</option>
            ))}
          </select>

          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isExportingExcel ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isExportingPDF ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>Export Executive PDF</span>
          </button>
        </div>
      </motion.div>

      {/* Summary KPIs */}
      <motion.div variants={itemAnim} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<AlertTriangle size={16} className="text-orange-600" />} label="Total Incidents"
          value={String(totalIncidents)} valueCls="text-slate-900">
          <DeltaPill value={summaryData?.incident_trend_pct} unit="%" goodWhen="down" vs={prior} />
        </StatCard>
        <StatCard icon={<Activity size={16} className="text-emerald-600" />} label="Resolution Rate"
          value={resolutionRate != null ? `${resolutionRate}%` : '—'} valueCls="text-emerald-700">
          <DeltaPill value={summaryData?.resolution_rate_improvement_pct} unit=" pts" goodWhen="up" vs={prior} />
        </StatCard>
        <StatCard icon={<Clock size={16} className="text-blue-600" />} label="Avg Response Time"
          value={avgResponseTimeMin != null ? `${avgResponseTimeMin} min` : '—'} valueCls="text-blue-700">
          <DeltaPill value={summaryData?.response_time_delta_min} unit=" min" goodWhen="down" vs={prior} />
        </StatCard>
        <StatCard icon={<Users size={16} className="text-purple-600" />} label="People Affected"
          value={totalAffected.toLocaleString()} valueCls="text-purple-700">
          <p className="text-[11px] font-medium text-slate-400">Reported, all districts ({dateRange})</p>
        </StatCard>
      </motion.div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Incident Trend */}
        <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
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
        </motion.div>

        {/* Disaster Type Distribution */}
        <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
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
              {occurredTypes.length === 0 && <p className="text-xs text-slate-500">No incidents in {dateRange}.</p>}
              {occurredTypes.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
                  <span className="text-xs font-semibold text-slate-700 flex-1">{d.name}</span>
                  <span className="text-sm font-bold text-slate-900">{d.percent}%</span>
                  {/* <span className="text-[11px] font-semibold text-slate-500 w-12 text-right">{d.percent}%</span> */}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time by Agency */}
        <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
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
              No measurable dispatches ({dateRange}): {responseTimeData.filter((d) => d.avg_mins == null).map((d) => d.agency).join(', ')}
            </p>
          )}
          {responseTimeData.some((d) => (d.excluded ?? 0) > 0) && (
            <p className="text-[11px] text-amber-700 mt-0.5">
              Not counted (assigned before the incident time or more than 7 days after it):{' '}
              {responseTimeData.filter((d) => (d.excluded ?? 0) > 0).map((d) => `${d.agency} ×${d.excluded}`).join(', ')}
            </p>
          )}
        </motion.div>

        {/* Resource Utilization */}
        <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
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
                  <span className={`text-xs font-bold ${
                    res.used > 80 ? 'text-red-600' : res.used > 50 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {res.used}% allocated
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      res.used > 80 ? 'bg-red-500' : res.used > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${res.used}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Historical Incident by State */}
      <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">State Disaster Impact & Performance Summary ({dateRange})</h3>
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
                <tr><td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-400">No incidents in {dateRange}.</td></tr>
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
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          state.severity ? SEVERITY_PILL[state.severity] : 'bg-slate-100 text-slate-500 border border-slate-200'
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
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                      d.severity ? SEVERITY_PILL[d.severity] : 'bg-slate-100 text-slate-500'
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
      </motion.div>
    </motion.div>
  );
};

export default ReportsAnalytics;
