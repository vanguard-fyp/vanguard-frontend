import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  FileText,
  Download,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Package,
  AlertTriangle,
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
} from '../../hooks';

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

const ReportsAnalytics: React.FC = () => {
  const [dateRange, setDateRange] = useState('2026');

  const { data: monthlyIncidentTrend = [] } = useMonthlyTrends();
  const { data: disasterTypeDistribution = [] } = useDisasterTypeDistribution();
  const { data: responseTimeData = [] } = useAgencyResponseTimes();
  const { data: rawResourceUtilization = [] } = useResourceUtilization();
  const { data: stateIncidentHeatmap = [] } = useStateHeatmap();

  const resourceUtilization = rawResourceUtilization.map((r) => ({
    category: r.name,
    used: r.value,
  }));

  const totalIncidents = monthlyIncidentTrend.reduce((s, m) => s + m.incidents, 0);
  const totalResolved = monthlyIncidentTrend.reduce((s, m) => s + m.resolved, 0);
  const resolutionRate = totalIncidents > 0 ? Math.round((totalResolved / totalIncidents) * 100) : 0;

  return (
    <motion.div
      variants={containerAnim}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemAnim} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Government Evaluation · Response performance, historical disaster trends, and agency metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 shadow-2xs"
          >
            <option value="2026">Year: 2026</option>
            <option value="2025">Year: 2025</option>
            <option value="Q3-2026">Q3 2026</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs">
            <Download size={14} />
            Export Executive PDF
          </button>
        </div>
      </motion.div>

      {/* Summary KPIs */}
      <motion.div variants={itemAnim} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={16} className="text-orange-600" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Incidents</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalIncidents}</p>
          <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-red-600">
            <TrendingUp size={12} />
            <span>+12% vs prior period</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity size={16} className="text-emerald-600" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Resolution Rate</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{resolutionRate}%</p>
          <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-600">
            <TrendingUp size={12} />
            <span>+3% performance improvement</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock size={16} className="text-blue-600" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Avg Response Time</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">26 min</p>
          <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-600">
            <TrendingDown size={12} />
            <span>-8 min faster</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <Users size={16} className="text-purple-600" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Evacuated</p>
          </div>
          <p className="text-2xl font-bold text-purple-700">53,800</p>
          <p className="text-xs text-slate-500 font-medium mt-1">Across all districts {dateRange}</p>
        </div>
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
                    data={disasterTypeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {disasterTypeDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1">
              {disasterTypeDistribution.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
                  <span className="text-xs font-semibold text-slate-700 flex-1">{d.name}</span>
                  <span className="text-sm font-bold text-slate-900">{d.value}%</span>
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
            <h3 className="text-sm font-bold text-slate-800">Average Response Time by Agency (Minutes)</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={responseTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="agency" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgMins" name="Avg Minutes" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Resource Utilization */}
        <motion.div variants={itemAnim} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Resource Utilization Rate (%)</h3>
          </div>
          <div className="space-y-4">
            {resourceUtilization.map((res) => (
              <div key={res.category}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-800">{res.category}</span>
                  <span className={`text-xs font-bold ${
                    res.used > 80 ? 'text-red-600' : res.used > 50 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {res.used}% Allocated
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
            <h3 className="text-sm font-bold text-slate-800">State Disaster Impact & Performance Summary</h3>
          </div>
          <button className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
            <Download size={13} />
            Export CSV Dataset
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['State', 'Total Incidents', 'Highest Severity', 'Response Rate', 'Avg Resolution (hrs)', 'Affected Population'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stateIncidentHeatmap.map((state) => (
                <tr key={state.state} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-bold text-slate-900">{state.state}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-800">{state.count}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      state.severity === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200' :
                      state.severity === 'High' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                      state.severity === 'Medium' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {state.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-emerald-700">{92 + Math.floor(Math.random() * 6)}%</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">{(4 + Math.random() * 8).toFixed(1)} hrs</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-800">{(state.count * 2000 + Math.floor(Math.random() * 5000)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReportsAnalytics;
