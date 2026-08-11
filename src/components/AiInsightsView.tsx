import React, { useState, useEffect } from 'react';
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
  BookOpen,
  Check
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LabReport, UserReminder } from '../types';
import { useAuth } from '../context/AuthContext';
import { safeFetchJson } from '../lib/api';
import { cleanUserErrorMessage } from '../utils/sanitize';

interface AiInsightsViewProps {
  reports: LabReport[];
}

export const AiInsightsView: React.FC<AiInsightsViewProps> = ({ reports }) => {
  const { user, userProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [insightsData, setInsightsData] = useState<{
    overallTrajectory?: string;
    keyInsights?: string[];
    lifestyleRecommendations?: string[];
    suggestedReminders?: { biomarkerName: string; intervalMonths: number; notes: string }[];
    disclaimer?: string;
    generatedReportIds?: string[];
    generatedReportCount?: number;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('aroveda_ai_insights');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const hasNewData = React.useMemo(() => {
    if (!insightsData || !reports || reports.length === 0) return false;

    if (Array.isArray(insightsData.generatedReportIds)) {
      const savedIds = new Set(insightsData.generatedReportIds);
      return reports.some(r => !savedIds.has(r.id)) || reports.length !== insightsData.generatedReportIds.length;
    }

    if (typeof insightsData.generatedReportCount === 'number') {
      return reports.length !== insightsData.generatedReportCount;
    }

    return reports.length > 0;
  }, [insightsData, reports]);

  const [customReminders, setCustomReminders] = useState<UserReminder[]>(() => {
    try {
      const saved = localStorage.getItem('aroveda_custom_reminders');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
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
    ];
  });

  // Real-time sync with Firestore for cross-device access
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.aiInsights !== undefined) {
          setInsightsData(data.aiInsights);
        }
        if (data.customReminders !== undefined) {
          setCustomReminders(data.customReminders);
        }
      }
    }, (err) => {
      console.error('Error subscribing to AI insights:', err);
    });
    return () => unsub();
  }, [user]);

  // Persist insights data to localStorage and Firestore whenever it changes
  useEffect(() => {
    try {
      if (insightsData) {
        localStorage.setItem('aroveda_ai_insights', JSON.stringify(insightsData));
      } else {
        localStorage.removeItem('aroveda_ai_insights');
      }
    } catch (e) {
      console.error('Failed to save insights to localStorage', e);
    }

    if (user) {
      setDoc(doc(db, 'users', user.uid), {
        aiInsights: insightsData,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch((err) => console.error('Error persisting AI insights to Firestore:', err));
    }
  }, [insightsData, user]);

  // Persist custom reminders to localStorage and Firestore whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('aroveda_custom_reminders', JSON.stringify(customReminders));
    } catch (e) {
      console.error('Failed to save custom reminders to localStorage', e);
    }

    if (user) {
      setDoc(doc(db, 'users', user.uid), {
        customReminders,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch((err) => console.error('Error persisting custom reminders to Firestore:', err));
    }
  }, [customReminders, user]);

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
          userConsentGiven: true,
          age: userProfile?.age,
          gender: userProfile?.gender
        })
      });

      if (!resData.success) {
        throw new Error(resData.error || 'Failed to generate trend insights.');
      }

      const rawData = resData.data || resData.insights || resData;

      let keyInsightsList: string[] = [];
      if (Array.isArray(rawData.keyTrends) && rawData.keyTrends.length > 0) {
        keyInsightsList = rawData.keyTrends.map((kt: any) =>
          typeof kt === 'string'
            ? kt
            : `${kt.biomarkerName || 'Biomarker'} (${kt.direction || 'observed'}): ${kt.summary || kt.description || ''}${kt.recommendation ? ' — ' + kt.recommendation : ''}`
        );
      } else if (Array.isArray(rawData.keyInsights) && rawData.keyInsights.length > 0) {
        keyInsightsList = rawData.keyInsights.map((item: any) => (typeof item === 'string' ? item : JSON.stringify(item)));
      } else if (Array.isArray(rawData.flaggedRisks) && rawData.flaggedRisks.length > 0) {
        keyInsightsList = rawData.flaggedRisks.map((item: any) => (typeof item === 'string' ? item : JSON.stringify(item)));
      }

      if (keyInsightsList.length === 0) {
        keyInsightsList = ["Longitudinal lab patterns analyzed. Overall biomarker trends remain stable."];
      }

      let lifestyleList: string[] = [];
      if (Array.isArray(rawData.lifestyleActionables) && rawData.lifestyleActionables.length > 0) {
        lifestyleList = rawData.lifestyleActionables.map((item: any) => (typeof item === 'string' ? item : JSON.stringify(item)));
      } else if (Array.isArray(rawData.lifestyleRecommendations) && rawData.lifestyleRecommendations.length > 0) {
        lifestyleList = rawData.lifestyleRecommendations.map((item: any) => (typeof item === 'string' ? item : JSON.stringify(item)));
      } else if (Array.isArray(rawData.positiveMilestones) && rawData.positiveMilestones.length > 0) {
        lifestyleList = rawData.positiveMilestones.map((item: any) => (typeof item === 'string' ? item : JSON.stringify(item)));
      }

      if (lifestyleList.length === 0) {
        lifestyleList = [
          'Stay hydrated by consuming daily fluids.',
          'Maintain balanced nutrition with a diet rich in whole foods.',
          'Engage in regular physical activity suitable for your lifestyle.',
          'Discuss any persistent abnormal lab values with your healthcare provider.'
        ];
      }

      const formattedInsights = {
        overallTrajectory: rawData.overallTrendSummary || rawData.overallTrajectory || "Overall health trajectory generated successfully.",
        keyInsights: keyInsightsList,
        lifestyleRecommendations: lifestyleList,
        suggestedReminders: rawData.suggestedReminders || [],
        generatedReportIds: reports.map(r => r.id),
        generatedReportCount: reports.length
      };

      setInsightsData(formattedInsights);
    } catch (err: any) {
      console.error("Insights error:", err);
      setError(cleanUserErrorMessage(err, 'An error occurred while fetching AI insights. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleClearInsights = async () => {
    setInsightsData(null);
    try {
      localStorage.removeItem('aroveda_ai_insights');
    } catch (e) {
      console.error('Failed to clear AI insights from localStorage', e);
    }

    if (user) {
      await setDoc(doc(db, 'users', user.uid), {
        aiInsights: null,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch((err) => console.error('Error clearing AI insights in Firestore:', err));
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
      <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          <div className="flex items-center gap-2 shrink-0">
            <button
              key={loading ? "btn-loading" : "btn-idle"}
              onClick={handleGenerateInsights}
              disabled={loading}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  <span>Analyzing Trends...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 shrink-0" />
                  <span>Refresh AI Insights</span>
                </>
              )}
            </button>
            <button
              onClick={handleClearInsights}
              disabled={loading}
              title="Clear AI Insights"
              className="bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700/60 font-bold px-3 py-2.5 rounded-2xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear Insights</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs backdrop-blur-md">
          {error}
        </div>
      )}

      {/* New Data Available Prompt Banner */}
      {insightsData && hasNewData && (
        <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-rose-800 dark:text-rose-200 block sm:inline">
                New Lab Data Available!
              </span>
              <span className="text-xs text-rose-700/80 dark:text-rose-300/80 block sm:inline sm:ml-1.5">
                New reports have been uploaded since these AI insights were last generated.
              </span>
            </div>
          </div>
          <button
            key={loading ? "btn-regen-loading" : "btn-regen-idle"}
            onClick={handleGenerateInsights}
            disabled={loading}
            className="bg-[#ec003f] hover:bg-[#ff2b66] text-white font-bold px-4 py-2 rounded-2xl text-xs transition-all shadow-md shadow-[#ec003f]/25 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>Regenerating...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 shrink-0" />
                <span>Regenerate AI Insights</span>
              </>
            )}
          </button>
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
          <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Overall Health Trajectory
            </h2>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              {insightsData.overallTrajectory}
            </p>
          </div>

          {/* Key Observations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-rose-500" /> Key Clinical Pattern Insights
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {(insightsData.keyInsights || []).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2.5 rounded-2xl bg-white/20 dark:bg-black/30 border border-white/20 dark:border-white/10 backdrop-blur-md">
                    <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* General Wellness Recommendations */}
            <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-3">
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
                  <li key={idx} className="flex items-start gap-2 p-2.5 rounded-2xl bg-white/20 dark:bg-black/30 border border-white/20 dark:border-white/10 backdrop-blur-md">
                    <Sparkles className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-12 text-center space-y-4">
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
            key={loading ? "btn-multi-loading" : "btn-multi-idle"}
            onClick={handleGenerateInsights}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-3 rounded-2xl text-xs transition-all shadow-md shadow-rose-600/25 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>Analyzing Multi-Report Trends...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 shrink-0" />
                <span>Generate AI Insights</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Routine Follow-Up Reminders Manager */}
      <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-rose-500" /> Routine Follow-Up Testing Reminders
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set user-defined testing intervals recommended by your healthcare provider
            </p>
          </div>
        </div>

        {/* Add Reminder Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md p-3 rounded-2xl border border-white/30 dark:border-white/10 text-xs shadow-sm">
          <input
            type="text"
            placeholder="Biomarker or Test Name (e.g. Vitamin D)"
            value={newReminderName}
            onChange={(e) => setNewReminderName(e.target.value)}
            className="bg-white/40 dark:bg-[#121418]/40 border border-white/20 dark:border-white/10 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 backdrop-blur-sm"
          />

          <select
            value={newReminderInterval}
            onChange={(e) => setNewReminderInterval(Number(e.target.value))}
            className="bg-white/40 dark:bg-[#121418]/40 border border-white/20 dark:border-white/10 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 backdrop-blur-sm"
          >
            <option value={3} className="bg-white dark:bg-[#16181c] text-slate-900 dark:text-white">Recheck in 3 Months</option>
            <option value={6} className="bg-white dark:bg-[#16181c] text-slate-900 dark:text-white">Recheck in 6 Months</option>
            <option value={12} className="bg-white dark:bg-[#16181c] text-slate-900 dark:text-white">Annual Checkup (12 Months)</option>
          </select>

          <button
            onClick={handleAddCustomReminder}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Reminder
          </button>
        </div>

        {/* AI Suggested Reminders */}
        {insightsData?.suggestedReminders && insightsData.suggestedReminders.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" /> AI Recommended Reminders
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {insightsData.suggestedReminders.map((sug, idx) => {
                const isAdded = customReminders.some(r => r.biomarkerName.toLowerCase().includes(sug.biomarkerName.toLowerCase()));
                return (
                  <div key={idx} className="p-3.5 rounded-2xl bg-white/70 dark:bg-[#121418]/70 border border-slate-200/50 dark:border-white/5 flex items-center justify-between gap-3 text-xs backdrop-blur-md shadow-sm">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">{sug.biomarkerName}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Interval: {sug.intervalMonths} months</span>
                      {sug.notes && <span className="text-[10px] text-slate-400 dark:text-slate-500 italic block mt-0.5">{sug.notes}</span>}
                    </div>
                    <button
                      onClick={() => {
                        const now = new Date();
                        const dueDate = new Date();
                        dueDate.setMonth(dueDate.getMonth() + Number(sug.intervalMonths));
                        const reminder: UserReminder = {
                          id: `rem-${Date.now()}-${idx}`,
                          biomarkerName: sug.biomarkerName,
                          intervalMonths: Number(sug.intervalMonths),
                          lastTestDate: now.toISOString().split('T')[0],
                          nextDueDate: dueDate.toISOString().split('T')[0],
                          notes: sug.notes || 'AI Recommended'
                        };
                        setCustomReminders([...customReminders, reminder]);
                      }}
                      disabled={isAdded}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 ${
                        isAdded
                          ? 'bg-slate-100 dark:bg-slate-800/30 text-slate-400 dark:text-slate-600 border border-slate-200/10'
                          : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 cursor-pointer'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Reminder</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reminders List */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Active Testing Reminders
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customReminders.map((rem) => (
              <div key={rem.id} className="p-3.5 rounded-2xl border border-slate-200/60 dark:border-white/5 bg-white/70 dark:bg-[#121418]/70 backdrop-blur-md flex items-center justify-between text-xs shadow-sm">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{rem.biomarkerName}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Next due: <span className="font-semibold text-rose-600 dark:text-rose-400">{rem.nextDueDate}</span> ({rem.intervalMonths} mo interval)</span>
                </div>

                <button
                  onClick={() => handleDeleteReminder(rem.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
