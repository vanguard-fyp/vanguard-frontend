export const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="text-slate-500 font-medium">{label}</p>
        {payload[0].payload?.detail && <p className="text-slate-700 font-semibold">{payload[0].payload.detail}</p>}
        <p className="text-blue-700 font-bold">Priority Score: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};