import React, { useState } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  Calendar, 
  Activity, 
  Sparkles, 
  Info,
  CheckCircle2,
  AlertTriangle,
  FlaskConical
} from 'lucide-react';
import { LabReport, BiomarkerTrendSummary } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

interface BiomarkerTrendsProps {
  reports: LabReport[];
  getBiomarkerTrend: (name: string) => BiomarkerTrendSummary | null;
}

export const BiomarkerTrends: React.FC<BiomarkerTrendsProps> = ({
  reports,
  getBiomarkerTrend
}) => {
  // Preset list of popular biomarkers
  const commonBiomarkers = [
    'Fasting Blood Sugar',
    'HbA1c',
    'Total Cholesterol',
    'LDL Cholesterol',
    'HDL Cholesterol',
    'Triglycerides',
    'Vitamin D (25-OH)',
    'Vitamin B12',
    'TSH',
    'Creatinine',
    'Hemoglobin'
  ];

  const [selectedBiomarker, setSelectedBiomarker] = useState<string>('LDL Cholesterol');

  const trendData = getBiomarkerTrend(selectedBiomarker);

  const getYDomain = () => {
    if (!trendData || trendData.historicalPoints.length === 0) return ['auto', 'auto'];
    
    const values = trendData.historicalPoints.map(pt => pt.value);
    const minRefs = trendData.historicalPoints.map(pt => pt.minRef).filter((v): v is number => v !== undefined);
    const maxRefs = trendData.historicalPoints.map(pt => pt.maxRef).filter((v): v is number => v !== undefined);
    
    const allValues = [...values, ...minRefs, ...maxRefs];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    
    const range = maxValue - minValue;
    const padding = range === 0 ? Math.max(1, maxValue * 0.1) : range * 0.2; // 20% padding
    
    const finalMin = minValue - padding < 0 && minValue >= 0 ? 0 : minValue - padding;
    const finalMax = maxValue + padding;
    
    return [parseFloat(finalMin.toFixed(1)), parseFloat(finalMax.toFixed(1))];
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-0.5 bg-rose-600 rounded-full"></span>
            <span className="text-[10px] font-extrabold tracking-widest text-rose-600 dark:text-rose-500 uppercase">
              HISTORICAL BIOMARKER TRENDS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            Biomarker <span className="italic font-extrabold text-rose-600 dark:text-rose-500">Trends</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Select a biomarker below to map its values across your complete laboratory history. Monitor trajectories, deviations, and reference lines.
          </p>
        </div>
      </div>

      {/* Preset Selector Grid */}
      <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-5 shadow-sm space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          Select Biomarker to Analyze
        </label>

        <div className="flex flex-wrap gap-2">
          {commonBiomarkers.map((name) => {
            const isSelected = selectedBiomarker.toLowerCase() === name.toLowerCase();
            const hasData = getBiomarkerTrend(name) !== null;

            return (
              <button
                key={name}
                onClick={() => setSelectedBiomarker(name)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/25'
                    : hasData
                    ? 'bg-white/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60 backdrop-blur-md'
                    : 'bg-white/20 dark:bg-slate-950/40 text-slate-400 border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-sm'
                }`}
              >
                <FlaskConical className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                {name}
                {hasData && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trend Interactive Display Card */}
      {!trendData || trendData.historicalPoints.length === 0 ? (
        <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-500 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/40">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No historical data found for "{selectedBiomarker}"
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Upload lab reports containing this biomarker, or load sample demonstration reports to view multi-point trend graphs.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview Metrics Banner */}
          <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Latest Test Value</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                {trendData.currentVal} <span className="text-xs font-normal text-slate-500">{trendData.unit}</span>
              </span>
              <span className="text-[11px] text-slate-400">Ref: {trendData.referenceRange}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Previous Test Value</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                {trendData.previousVal !== undefined ? `${trendData.previousVal} ${trendData.unit}` : 'N/A'}
              </span>
              <span className="text-[11px] text-slate-400">Previous record</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Percentage Change</span>
              <span className={`text-2xl font-bold mt-1 flex items-center gap-1 ${
                trendData.status === 'improving' ? 'text-emerald-600 dark:text-emerald-400' :
                trendData.status === 'declining' ? 'text-amber-600 dark:text-amber-400' :
                'text-slate-600 dark:text-slate-400'
              }`}>
                {trendData.changePercent !== undefined ? `${trendData.changePercent > 0 ? '+' : ''}${trendData.changePercent}%` : 'Baseline'}
              </span>
              <span className="text-[11px] text-slate-400">over test history</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Trend Status</span>
              <div className="mt-1">
                {trendData.status === 'improving' ? (
                  <span className="bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800/40">
                    <ArrowDownRight className="w-4 h-4 text-emerald-500" /> Improving Trajectory
                  </span>
                ) : trendData.status === 'declining' ? (
                  <span className="bg-amber-100/80 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 border border-amber-200/60 dark:border-amber-800/40">
                    <ArrowUpRight className="w-4 h-4 text-amber-500" /> Needs Review
                  </span>
                ) : (
                  <span className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 border border-slate-200/60 dark:border-slate-700/40">
                    <Minus className="w-4 h-4 text-slate-500" /> Stable Value
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Recharts Line Graph Card */}
          <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedBiomarker} Historical Trajectory
                </h3>
                <p className="text-xs text-slate-400">
                  Dotted lines represent clinical standard reference bounds.
                </p>
              </div>

              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/50 backdrop-blur-md px-3 py-1 rounded-xl">
                Unit: {trendData.unit}
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.historicalPoints} margin={{ top: 15, right: 30, left: 10, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={getYDomain()} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#1e293b', 
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '12px',
                      backdropFilter: 'blur(8px)'
                    }}
                    labelFormatter={(l) => `Test Date: ${l}`}
                  />
                  {/* Reference threshold lines if available */}
                  {trendData.historicalPoints[0]?.maxRef !== undefined && (
                    <ReferenceLine y={trendData.historicalPoints[0].maxRef} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Upper Limit', fill: '#ef4444', fontSize: 10, position: 'top' }} />
                  )}
                  {trendData.historicalPoints[0]?.minRef !== undefined && trendData.historicalPoints[0]?.minRef! > 0 && (
                    <ReferenceLine y={trendData.historicalPoints[0].minRef} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: 'Lower Limit', fill: '#3b82f6', fontSize: 10, position: 'bottom' }} />
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#e11d48"
                    strokeWidth={3}
                    dot={{ r: 6, fill: '#e11d48', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical Data Table */}
          <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              All Recorded Measurements for {selectedBiomarker}
            </h3>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Test Date</th>
                    <th className="p-3">Report Title</th>
                    <th className="p-3">Value</th>
                    <th className="p-3">Reference Range</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {trendData.historicalPoints.map((pt, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{pt.date}</td>
                      <td className="p-3 text-slate-500">{pt.reportTitle}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {pt.value} <span className="font-normal text-slate-400 text-[10px]">{pt.unit}</span>
                      </td>
                      <td className="p-3 text-slate-500">{trendData.referenceRange}</td>
                      <td className="p-3">
                        {pt.flag === 'high' ? (
                          <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px]">
                            HIGH
                          </span>
                        ) : pt.flag === 'low' ? (
                          <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded text-[10px]">
                            LOW
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                            NORMAL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
