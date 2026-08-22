import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { KPI_ACCENT_MAP } from '../../../constants';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { direction: 'up' | 'down' | 'stable'; label: string };
  /** Raw number array for sparkline / bar chart */
  sparkData?: number[];
  /** 0–100 for donut chart */
  donutValue?: number;
  /** Which micro-viz to render in the card */
  chartType?: 'area' | 'bar' | 'donut' | 'none';
  accentColor?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
  onClick?: () => void;
}

const SPARK_COLORS: Record<string, { stroke: string; fill: string }> = {
  red: { stroke: '#dc2626', fill: '#fef2f2' },
  orange: { stroke: '#ea580c', fill: '#fff7ed' },
  yellow: { stroke: '#d97706', fill: '#fffbeb' },
  green: { stroke: '#16a34a', fill: '#f0fdf4' },
  blue: { stroke: '#2563eb', fill: '#eff6ff' },
  purple: { stroke: '#9333ea', fill: '#faf5ff' },
};

/** Inline SVG donut ring (no dependency, tiny) */
const DonutRing: React.FC<{ value: number; color: string; trackColor: string }> = ({ value, color, trackColor }) => {
  const r = 22, circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={56} height={56} viewBox="0 0 56 56" className="shrink-0">
      <circle cx={28} cy={28} r={r} fill="none" stroke={trackColor} strokeWidth={5} />
      <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={28} y={29} textAnchor="middle" dominantBaseline="middle"
        fontSize={11} fontWeight={700} fill={color}>
        {value}%
      </text>
    </svg>
  );
};

const KPICard: React.FC<KPICardProps> = ({
  title, value, subtitle, icon, trend,
  sparkData, donutValue, chartType = 'area',
  accentColor = 'blue', onClick,
}) => {
  const a = KPI_ACCENT_MAP[accentColor] || KPI_ACCENT_MAP.blue;
  const sparkColors = SPARK_COLORS[accentColor] || SPARK_COLORS.blue;
  const chartData = sparkData?.map((val, idx) => ({ i: idx, val })) || [];
  const showArea = chartType === 'area' && chartData.length > 0;
  const showBar = chartType === 'bar' && chartData.length > 0;
  const showDonut = chartType === 'donut' && donutValue !== undefined;

  return (
    <div
      onClick={onClick}
      className="rounded-xl p-4 transition-all duration-200 bg-white border border-slate-200 hover:shadow-sm relative overflow-hidden"
      style={{ cursor: onClick ? 'pointer' : 'default', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Top row: text + icon/donut */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide truncate text-slate-500">{title}</p>
          <p className="text-2xl font-bold mt-1.5" style={{ color: a.valueColor }}>{value}</p>
          {subtitle && <p className="text-xs mt-0.5 font-medium truncate text-slate-500">{subtitle}</p>}
        </div>

        {/* Right side: icon or donut */}
        {showDonut ? (
          <DonutRing value={donutValue!} color={sparkColors.stroke} trackColor={`${sparkColors.stroke}22`} />
        ) : (
          <div className="p-2.5 rounded-lg shrink-0 border shadow-xs"
            style={{ background: a.iconBg, borderColor: a.iconBorder }}
          >
            <span style={{ color: a.iconColor }}>{icon}</span>
          </div>
        )}
      </div>

      {/* Micro chart */}
      {showArea && (
        <div className="h-10 -mx-4 -mb-1 mt-2 pointer-events-none opacity-90">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`ag-${accentColor}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={sparkColors.stroke} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={sparkColors.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="val" stroke={sparkColors.stroke} strokeWidth={2}
                fill={`url(#ag-${accentColor})`} isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {showBar && (
        <div className="h-10 -mx-4 -mb-1 mt-2 pointer-events-none opacity-90">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barSize={6}>
              <Bar dataKey="val" fill={sparkColors.stroke} radius={[2, 2, 0, 0]} isAnimationActive />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Trend footer */}
      {trend && (
        <div className="flex items-center justify-between gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            {trend.direction === 'up' && <TrendingUp size={12} className="text-red-700" />}
            {trend.direction === 'down' && <TrendingDown size={12} className="text-emerald-700" />}
            {trend.direction === 'stable' && <Minus size={12} className="text-slate-400" />}
            <span className={`text-[11px] font-semibold ${trend.direction === 'up' ? 'text-red-700' :
                trend.direction === 'down' ? 'text-emerald-700' : 'text-slate-500'
              }`}>{trend.label}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">7h trend</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
