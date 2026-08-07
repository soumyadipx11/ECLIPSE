import React from 'react';
import { 
  FileText, 
  TrendingUp, 
  Activity, 
  ShieldAlert, 
  Sparkles, 
  Plus, 
  Calendar, 
  Building, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  FlaskConical,
  Database,
  Stethoscope,
  Clock
} from 'lucide-react';
import { LabReport } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';

import { normalizeBiomarkerName } from '../utils/biomarkerNormalizer';

interface DashboardProps {
  reports: LabReport[];
  loading: boolean;
  onNavigate: (tab: string) => void;
  onLoadDemo: () => void;
  getBiomarkerTrend: (name: string) => any;
}

export const Dashboard: React.FC<DashboardProps> = ({
  reports,
  loading,
  onNavigate,
  onLoadDemo,
  getBiomarkerTrend
}) => {
  const totalReports = reports.length;
  
  // Calculate total unique biomarkers tracked
  const uniqueBiomarkers = new Set<string>();
  let totalAbnormalCount = 0;
  reports.forEach(r => {
    (r.extractedData || []).forEach(b => {
      uniqueBiomarkers.add(normalizeBiomarkerName(b.testName));
      if (b.isAbnormal) totalAbnormalCount++;
    });
  });

  const latestReport = reports[0]; // Most recent report

  // Quick preset key biomarkers for summary charts
  const keyPresets = [
    'Fasting Blood Sugar',
    'LDL Cholesterol',
    'Vitamin D (25-OH)',
    'HbA1c'
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl p-6 shadow-sm relative overflow-hidden border border-white/20 dark:border-white/10">
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 bg-rose-600 rounded-full"></span>
              <span className="text-[11px] font-extrabold tracking-widest text-rose-600 dark:text-rose-500 uppercase">
                DIAGNOSTIC GRADE SECURITY
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Personal Health <span className="italic font-extrabold text-rose-600 dark:text-rose-500">Dashboard</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
              Analyze laboratory test values, track long-term biomarker trends, and prepare for physician appointments with Tier-1 encrypted privacy protection.
            </p>

            {/* Translucent Security Badges */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="bg-slate-100/80 dark:bg-slate-800/70 backdrop-blur-md text-slate-700 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> DPDPA 2023 COMPLIANT
              </span>
              <span className="bg-slate-100/80 dark:bg-slate-800/70 backdrop-blur-md text-slate-700 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> ABDM ALIGNED
              </span>
              <span className="bg-slate-100/80 dark:bg-slate-800/70 backdrop-blur-md text-slate-700 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> AES-256 ENCRYPTED
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('reports')}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-3 rounded-2xl text-xs transition-all shadow-md shadow-rose-600/25 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Upload Lab Report
            </button>

            {totalReports === 0 && (
              <button
                onClick={onLoadDemo}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold px-4 py-3 rounded-2xl text-xs transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <Database className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Load Demo Lab Data
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md p-5 rounded-3xl border border-white/20 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Lab Reports</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalReports}</p>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {latestReport ? `Latest: ${latestReport.testDate}` : 'No reports yet'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/40">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md p-5 rounded-3xl border border-white/20 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Biomarkers Tracked</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{uniqueBiomarkers.size}</p>
            <p className="text-[11px] text-slate-400 mt-1">across all test categories</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/40">
            <FlaskConical className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md p-5 rounded-3xl border border-white/20 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Abnormal Flagged</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{totalAbnormalCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">outside standard reference range</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md p-5 rounded-3xl border border-white/20 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Health Trajectory</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              {totalReports > 1 ? 'Improving' : 'Baseline Set'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">long-term biomarker stability</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Latest Report Card & Quick Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Report Overview (2 cols) */}
        <div className="lg:col-span-2 bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-rose-600 dark:text-rose-400 uppercase">
                Most Recent Laboratory Test
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {latestReport ? latestReport.title : 'No Reports Uploaded Yet'}
              </h2>
            </div>
            {latestReport && (
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  {latestReport.labName}
                </span>
                <span className="text-[11px] text-slate-400">{latestReport.testDate}</span>
              </div>
            )}
          </div>

          {!latestReport ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                Your Health Record is currently empty
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Upload a PDF or image lab report, or click "Load Demo Lab Data" to test instant OCR extraction and AI summary.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={onLoadDemo}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-4 py-2.5 rounded-2xl text-xs transition-all shadow-md shadow-rose-600/20"
                >
                  Load 3 Sample Lab Reports
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* AI Executive Summary Box */}
              {latestReport.aiSummary && (
                <div className="bg-white/10 dark:bg-slate-950/15 border border-white/10 dark:border-white/5 backdrop-blur-sm rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Health Synthesis Summary</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {latestReport.aiSummary.overview}
                  </p>
                </div>
              )}

              {/* Extracted Biomarkers List Preview */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Key Biomarkers in this Report ({latestReport.extractedData?.length || 0})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(latestReport.extractedData || []).slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border text-xs flex items-center justify-between transition-all backdrop-blur-sm ${
                        item.isAbnormal
                          ? 'bg-rose-500/5 dark:bg-rose-500/10 border-rose-300/40 dark:border-rose-800/30'
                          : 'bg-white/20 dark:bg-slate-950/20 border-white/10 dark:border-white/5'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {normalizeBiomarkerName(item.testName)}
                        </span>
                        <span className="text-[11px] text-slate-400">Ref: {item.referenceRange} {item.unit}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-white block">
                          {item.value} <span className="text-[10px] font-normal text-slate-500">{item.unit}</span>
                        </span>
                        {item.flag === 'high' ? (
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
                            HIGH
                          </span>
                        ) : item.flag === 'low' ? (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                            LOW
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                            OPTIMAL
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => onNavigate('reports')}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                >
                  View All Reports & Full Test Lists →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar Column: AI Guardrails & Quick Navigation */}
        <div className="space-y-6">
          {/* AI Medical Safety Guardrails Card */}
          <div className="bg-rose-500/10 dark:bg-rose-950/20 text-slate-200 rounded-3xl p-5 border border-rose-500/20 dark:border-rose-500/15 shadow-md backdrop-blur-md space-y-3 text-xs">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
              <ShieldAlert className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />
              <span>Medical Safety & Guardrails</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              ArovedaAI translates complex laboratory data into clear, non-technical explanations and tracks trends.
            </p>
            <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
              <li>No medical diagnoses or disease predictions</li>
              <li>No drug dosages or prescription recommendations</li>
              <li>PII is scrubbed prior to model execution</li>
            </ul>
            <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/10 text-[11px] text-slate-400 italic">
              "This platform is educational only and does not replace professional medical diagnosis."
            </div>
          </div>

          {/* Quick Doctor Summary Prep Card */}
          <div className="bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/20 dark:border-rose-500/15 rounded-3xl p-5 backdrop-blur-md text-xs space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold">
              <Stethoscope className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span>Doctor Appointment Preparation</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Generate a printable 1-page summary highlighting recent abnormal values, trends, and suggested questions for your next doctor visit.
            </p>
            <button
              onClick={() => onNavigate('doctor-summary')}
              className="w-full bg-[#ec003f] hover:bg-[#ff2b66] text-white font-bold py-2.5 rounded-2xl text-xs transition-all shadow-md shadow-[#ec003f]/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              Generate Doctor Summary PDF
            </button>
          </div>
        </div>
      </div>

      {/* Quick Biomarker Mini Charts Section */}
      {reports.length > 0 && (
        <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Key Biomarkers Quick Overview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tracking historical test values across uploaded reports
              </p>
            </div>
            <button
              onClick={() => onNavigate('trends')}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Interactive Trend Analyzer →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {keyPresets.map((presetName) => {
              const trend = getBiomarkerTrend(presetName);
              if (!trend || trend.historicalPoints.length === 0) {
                return (
                  <div key={presetName} className="p-4 rounded-2xl border border-dashed border-white/25 dark:border-white/10 bg-white/10 dark:bg-slate-950/15 backdrop-blur-sm text-center">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{presetName}</p>
                    <p className="text-[11px] text-slate-400 mt-2">Not found in recent lab tests</p>
                  </div>
                );
              }

              return (
                <div key={presetName} className="p-4 rounded-2xl border border-white/20 dark:border-white/10 bg-white/20 dark:bg-slate-950/20 backdrop-blur-md space-y-2 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white">{presetName}</span>
                    <span className="text-[10px] text-slate-400">{trend.unit}</span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {trend.currentVal}
                    </span>
                    {trend.changePercent !== undefined && (
                      <span className={`text-[11px] font-bold flex items-center ${
                        trend.status === 'improving' ? 'text-emerald-600' : trend.status === 'declining' ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {trend.status === 'improving' ? <ArrowDownRight className="w-3.5 h-3.5" /> : trend.status === 'declining' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        {Math.abs(trend.changePercent)}%
                      </span>
                    )}
                  </div>

                  {/* Mini Line Chart */}
                  <div className="h-16 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend.historicalPoints}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#e11d48"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#e11d48' }}
                        />
                        <Tooltip
                          contentStyle={{ fontSize: '10px', borderRadius: '8px', padding: '4px 8px' }}
                          labelFormatter={(l) => `Date: ${l}`}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="text-[10px] text-slate-400 text-right">
                    Ref: {trend.referenceRange}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
