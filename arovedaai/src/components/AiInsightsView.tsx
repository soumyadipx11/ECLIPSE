import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  HeartHandshake, 
  Clock, 
  CheckCircle2, 
  Bell, 
  Plus, 
  Trash2, 
  ShieldCheck,
  Zap,
  BookOpen
} from 'lucide-react';
import { LabReport, UserReminder } from '../types';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../lib/api';

interface AiInsightsViewProps {
  reports: LabReport[];
}

export const AiInsightsView: React.FC<AiInsightsViewProps> = ({ reports }) => {
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [insightsData, setInsightsData] = useState<{
    overallTrajectory?: string;
    keyInsights?: string[];
    lifestyleRecommendations?: string[];
    suggestedReminders?: { biomarkerName: string; intervalMonths: number; notes: string }[];
    disclaimer?: string;
  } | null>(null);

  const [customReminders, setCustomReminders] = useState<UserReminder[]>([
    {
      id: 'rem-1',
      biomarkerName: 'Vitamin D (25-OH)',
      intervalMonths: 3,
      lastTestDate: '2026-06-15',
      nextDueDate: '2026-09-15',
      notes: 'Evaluate recheck after supplement routine.'
    },
    {
      id: 'rem-2',
      biomarkerName: 'Lipid Profile & Glucose',
      intervalMonths: 6,
      lastTestDate: '2026-06-15',
      nextDueDate: '2026-12-15',
      notes: 'Routine follow-up interval.'
    }
  ]);

  const [newReminderName, setNewReminderName] = useState('');
  const [newReminderInterval, setNewReminderInterval] = useState(3);

  // Generate Multi-Report AI Insights
  const handleGenerateInsights = async () => {
    if (!reports || reports.length === 0) {
      setError('Please upload at least one lab report or load demo reports to generate AI insights.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resData = await safeFetchJson('/api/trend-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportHistory: reports,
          userConsentGiven: true
        })
      });

      if (!resData.success) {
        throw new Error(resData.error || 'Failed to generate trend insights.');
      }

      setInsightsData(resData.insights);
    } catch (err: any) {
      console.error("Insights error:", err);
      setError(err.message || 'An error occurred while fetching AI insights.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomReminder = () => {
    if (!newReminderName) return;
    const now = new Date();
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + Number(newReminderInterval));

    const reminder: UserReminder = {
      id: `rem-${Date.now()}`,
      biomarkerName: newReminderName,
      intervalMonths: Number(newReminderInterval),
      lastTestDate: now.toISOString().split('T')[0],
      nextDueDate: dueDate.toISOString().split('T')[0],
      notes: 'User-defined follow-up schedule'
    };

    setCustomReminders([...customReminders, reminder]);
    setNewReminderName('');
  };

  const handleDeleteReminder = (id: string) => {
    setCustomReminders(customReminders.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-0.5 bg-rose-600 rounded-full"></span>
            <span className="text-[10px] font-extrabold tracking-widest text-rose-600 dark:text-rose-500 uppercase">
              Q3 CLINICAL SUMMARY • SYSTEM SYNC: 100%
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            Comprehensive <span className="italic font-extrabold text-rose-600 dark:text-rose-500">Health Synthesis</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Advanced multi-variate analysis of your longitudinal data streams with specific optimization windows for wellness and longevity.
          </p>
        </div>

        {insightsData && (
          <button
            onClick={handleGenerateInsights}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Analyzing Trends...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Refresh AI Insights</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs backdrop-blur-md flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-amber-900 dark:text-amber-200">
            Educational Disclaimer
          </span>
          <p className="mt-0.5 leading-relaxed text-[11px]">
            This analysis is for informational and educational purposes only and should not be considered medical advice. Please consult a qualified healthcare professional for diagnosis or treatment.
          </p>
        </div>
      </div>

      {/* AI Insights Results */}
      {insightsData ? (
        <div className="space-y-6">
          {/* Overall Trajectory Card */}
          <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Overall Health Trajectory
            </h2>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              {insightsData.overallTrajectory}
            </p>
          </div>

          {/* Key Observations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-rose-500" /> Key Clinical Pattern Insights
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {(insightsData.keyInsights || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2.5 rounded-2xl bg-white/10 dark:bg-slate-950/20 border border-white/20 dark:border-white/10 backdrop-blur-md">
                    <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* General Wellness Recommendations */}
            <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-rose-500" /> General Wellness Guidance
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {(insightsData.lifestyleRecommendations || [
                  'Stay hydrated by consuming daily fluids.',
                  'Maintain balanced nutrition.',
                  'Engage in regular physical activity.',
                  'Discuss abnormal lab values.'
                ]).map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2.5 rounded-2xl bg-white/10 dark:bg-slate-950/20 border border-white/20 dark:border-white/10 backdrop-blur-md">
                    <Sparkles className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Multi-Report Health Trajectory Analysis
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Synthesize clinical values across all your lab test dates to highlight persistent health patterns, progress trends, and personalized wellness context.
            </p>
          </div>
          <button
            onClick={handleGenerateInsights}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-3 rounded-2xl text-xs transition-all shadow-md shadow-rose-600/25 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Analyzing Multi-Report Trends...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Generate AI Insights</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Routine Follow-Up Reminders Manager */}
      <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-rose-500" /> Routine Follow-Up Testing Reminders
            </h3>
            <p className="text-xs text-slate-400">
              Set user-defined testing intervals recommended by your healthcare provider
            </p>
          </div>
        </div>

        {/* Add Reminder Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/10 dark:bg-slate-950/15 p-3 rounded-2xl border border-white/10 dark:border-white/5 backdrop-blur-sm text-xs">
          <input
            type="text"
            placeholder="Biomarker or Test Name (e.g. Vitamin D)"
            value={newReminderName}
            onChange={(e) => setNewReminderName(e.target.value)}
            className="bg-white/10 dark:bg-slate-950/20 border border-white/20 dark:border-white/10 rounded-xl p-2 font-medium text-slate-900 dark:text-white backdrop-blur-sm"
          />

          <select
            value={newReminderInterval}
            onChange={(e) => setNewReminderInterval(Number(e.target.value))}
            className="bg-white/10 dark:bg-slate-950/20 border border-white/20 dark:border-white/10 rounded-xl p-2 font-medium text-slate-900 dark:text-white backdrop-blur-sm"
          >
            <option value={3}>Recheck in 3 Months</option>
            <option value={6}>Recheck in 6 Months</option>
            <option value={12}>Annual Checkup (12 Months)</option>
          </select>

          <button
            onClick={handleAddCustomReminder}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-sm shadow-rose-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Reminder
          </button>
        </div>

        {/* Reminders List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {customReminders.map((rem) => (
            <div key={rem.id} className="p-3.5 rounded-2xl border border-white/10 dark:border-white/5 bg-white/20 dark:bg-slate-950/20 backdrop-blur-md flex items-center justify-between text-xs shadow-sm">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">{rem.biomarkerName}</span>
                <span className="text-[11px] text-slate-400">Next due: <span className="font-semibold text-rose-600 dark:text-rose-400">{rem.nextDueDate}</span> ({rem.intervalMonths} mo interval)</span>
              </div>

              <button
                onClick={() => handleDeleteReminder(rem.id)}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
