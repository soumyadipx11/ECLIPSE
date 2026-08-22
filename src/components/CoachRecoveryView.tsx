import React, { useState } from 'react';
import { useRecovery } from '../context/RecoveryContext';
import { 
  Layers, 
  Sliders, 
  History, 
  ShieldCheck, 
  Flame, 
  Activity, 
  HeartPulse, 
  CheckCircle2, 
  Save, 
  AlertTriangle, 
  Smile, 
  Frown, 
  Clock, 
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react';
import { CoachTriggerConfig } from '../types';

export const CoachRecoveryView: React.FC = () => {
  const { state, updateCoachConfig } = useRecovery();
  const [localConfig, setLocalConfig] = useState<CoachTriggerConfig>(state.coachConfig);
  const [saveNotification, setSaveNotification] = useState<boolean>(false);

  const handleSave = () => {
    updateCoachConfig(localConfig);
    setSaveNotification(true);
    setTimeout(() => setSaveNotification(false), 3000);
  };

  const totalCheckIns = state.checkInHistory.length;
  const highStrainCount = state.checkInHistory.filter(c => c.strainLevel === 'high').length;
  const moderateStrainCount = state.checkInHistory.filter(c => c.strainLevel === 'moderate').length;
  const normalStrainCount = state.checkInHistory.filter(c => c.strainLevel === 'normal').length;
  const totalCompletedSessions = state.sessionLogs.length;

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                CLINICAL / COACH DASHBOARD
              </span>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Triage Management
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Recovery & Strain <span className="text-emerald-600 dark:text-emerald-400 italic">Analytics</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Audit patient strain check-ins, inspect recovery session completion rates, and calibrate automated triage sensitivity triggers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-2xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/25 cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              Save Trigger Policies
            </button>
          </div>
        </div>

        {saveNotification && (
          <div className="mt-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Trigger policies and strain sensitivity settings saved successfully!
          </div>
        )}
      </div>

      {/* Aggregate Triage Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md p-5 rounded-3xl border border-white/30 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Total Check-Ins</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCheckIns}</p>
            <p className="text-[11px] text-slate-400 mt-1">Logged by user</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/40">
            <HeartPulse className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md p-5 rounded-3xl border border-white/30 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">High Strain Events</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{highStrainCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">{totalCheckIns > 0 ? Math.round((highStrainCount / totalCheckIns) * 100) : 0}% of all check-ins</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/40">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md p-5 rounded-3xl border border-white/30 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Completed Resets</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalCompletedSessions}</p>
            <p className="text-[11px] text-slate-400 mt-1">3-min recovery sessions</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md p-5 rounded-3xl border border-white/30 dark:border-white/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Streak Shields Used</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {state.currentStreakDays} <span className="text-xs font-semibold text-slate-400">Days</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Safeguarded with 0 penalty</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40">
            <Flame className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Policy Configuration & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Config Controls (1 col) */}
        <div className="space-y-6">
          <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
              <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Triage Trigger Policies
              </h3>
            </div>

            {/* High Strain Sensitivity */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                High Strain Sensitivity
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['low', 'medium', 'high'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLocalConfig(prev => ({ ...prev, highStrainSensitivity: lvl }))}
                    className={`py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                      localConfig.highStrainSensitivity === lvl
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {localConfig.highStrainSensitivity === 'high'
                  ? 'Triggers recovery mode on mild fatigue and moderate deadlines.'
                  : localConfig.highStrainSensitivity === 'medium'
                  ? 'Triggers on acute headaches, severe sleep deficit, and exam stress.'
                  : 'Triggers only on severe physical exhaustion or viral fever.'}
              </p>
            </div>

            {/* Auto-Activate Recovery Mode */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Auto-Activate Recovery Mode
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Switch interface automatically on high strain
                </span>
              </div>
              <input
                type="checkbox"
                checked={localConfig.autoActivateRecovery}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, autoActivateRecovery: e.target.checked }))}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Daily Goal Reduction % Slider */}
            <div className="pt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Goal Reduction Factor
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {localConfig.goalReductionPercentage}%
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="90"
                step="5"
                value={localConfig.goalReductionPercentage}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, goalReductionPercentage: Number(e.target.value) }))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Reduces strenuous targets by {localConfig.goalReductionPercentage}% during recovery.
              </p>
            </div>

            {/* Streak Protection Toggle */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Streak Grace Shield
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Prevent broken streak during recovery
                </span>
              </div>
              <input
                type="checkbox"
                checked={localConfig.enableStreakProtection}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, enableStreakProtection: e.target.checked }))}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Support Message Editor */}
            <div className="pt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Coach Empathy Message
              </label>
              <textarea
                rows={3}
                value={localConfig.customSupportMessage}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, customSupportMessage: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Check-in History & Session Logs (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Check-In History */}
          <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  User Check-In History Log
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {state.checkInHistory.length} Total Check-Ins
              </span>
            </div>

            {state.checkInHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <HeartPulse className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p>No check-in entries logged yet.</p>
                <p className="text-[11px]">User check-ins will appear here with AI strain assessments.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {state.checkInHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border text-xs space-y-2 backdrop-blur-sm ${
                      item.strainLevel === 'high'
                        ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40'
                        : 'bg-white/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.strainLevel === 'high'
                            ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                            : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {item.strainLevel} Strain
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>

                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        Energy: {item.energyScore}/100
                      </span>
                    </div>

                    <p className="text-slate-800 dark:text-slate-200 font-medium italic">
                      "{item.rawInput}"
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/40 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Assessment: {item.aiAssessment}</span>
                      {item.postActivityFeedback && (
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                          Outcome: {item.postActivityFeedback.rating}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Sessions Log */}
          <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Completed Recovery Activity Sessions
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {state.sessionLogs.length} Completed
              </span>
            </div>

            {state.sessionLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                <p>No completed recovery sessions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {state.sessionLogs.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3 rounded-2xl bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {sess.planTitle}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(sess.timestamp).toLocaleDateString()} • {sess.durationSecondsCompleted}s completed
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {sess.streakProtected && (
                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-500" /> Shielded
                        </span>
                      )}
                      {sess.ratingAfter && (
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {sess.ratingAfter}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
