import React, { useState, useEffect } from 'react';
import { useRecovery, GOAL_LIMITS, getGoalDisplayTitle } from '../context/RecoveryContext';
import { DailyGoal } from '../types';
import { 
  HeartPulse, 
  Sparkles, 
  Play, 
  ShieldCheck, 
  Flame, 
  Droplets, 
  Moon, 
  Footprints, 
  Activity, 
  Tv, 
  Check, 
  Plus, 
  Minus, 
  Edit2, 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle, 
  Smile, 
  Layers, 
  Clock, 
  Cloud, 
  CheckCheck, 
  RotateCcw,
  Save,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RecoveryModeViewProps {
  onNavigateToDashboard: () => void;
  onNavigateToCoachView?: () => void;
}

export const RecoveryModeView: React.FC<RecoveryModeViewProps> = ({ 
  onNavigateToDashboard,
  onNavigateToCoachView 
}) => {
  const { 
    state, 
    isCloudSynced,
    isSaving,
    lastSyncedAt,
    saveAndSyncToFirebase,
    openCheckInModal, 
    openPlayerModal, 
    exitRecoveryMode, 
    toggleGoalProgress,
    setGoalValue,
    setGoalTarget,
    restoreOriginalGoals
  } = useRecovery();

  const [saveSuccessNotification, setSaveSuccessNotification] = useState<string | null>(null);

  const plan = state.currentPlan;

  const handleManualSave = async () => {
    const success = await saveAndSyncToFirebase();
    if (success) {
      setSaveSuccessNotification("Goals and target limits saved! Synced in real-time across all devices via Firebase.");
      setTimeout(() => {
        setSaveSuccessNotification(null);
      }, 3500);
    }
  };

  const handleMarkAllMet = () => {
    state.adjustedGoals.forEach(g => {
      setGoalValue(g.id, g.adjustedTarget);
    });
    setSaveSuccessNotification("All goals marked completed! Click 'Save & Sync' to persist to Firebase.");
    setTimeout(() => {
      setSaveSuccessNotification(null);
    }, 3500);
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Header & Mode Status */}
      <div className="bg-gradient-to-br from-teal-900/80 via-slate-900/90 to-emerald-950/80 text-white rounded-3xl p-6 sm:p-8 border border-emerald-500/30 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-md shadow-emerald-500/20">
                <HeartPulse className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
                    RECOVERY & GOALS CANVAS
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                    {state.isActive ? "Recovery Mode Active" : "Interactive Mode"}
                  </span>
                  {isCloudSynced && (
                    <span className="bg-teal-500/20 text-teal-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-teal-400/30 flex items-center gap-1">
                      <Cloud className="w-3 h-3 text-teal-400" /> Firebase Synced
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                  Recovery & Goals <span className="text-emerald-400 italic">Management</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={openCheckInModal}
                className="bg-white/15 hover:bg-white/25 text-white font-semibold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition-all border border-white/20 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                New Check-In
              </button>

              <button
                onClick={onNavigateToDashboard}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* AI Reassurance Statement */}
          <div className="bg-white/10 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-sm space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>AI Biological Assessment & Goal Protection</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {state.isActive 
                ? `"${state.reason ? `We detected: ${state.reason}. ` : 'High physiological strain detected. '} Your energy reserve is at ${state.energyScore}%. Target limits have been calibrated to protect your autonomic nervous system from overtraining."`
                : "Customize your active targets, log completed steps, workouts, sleep, and hydration, and sync your baseline limits across all devices via Firebase."}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-black/30 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Strain Status</span>
                <p className="text-sm font-black capitalize text-rose-400 mt-0.5">
                  {state.strainLevel} Strain
                </p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            </div>

            <div className="bg-black/30 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Energy Reserve</span>
                <p className="text-sm font-black text-amber-400 mt-0.5">
                  {state.energyScore}/100 Reserve
                </p>
              </div>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>

            <div className="bg-black/30 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Streak Protection</span>
                <p className="text-sm font-black text-emerald-400 mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Active ({state.currentStreakDays} Days)
                </p>
              </div>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: 3-Minute Plan + Goal Adjustments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 3-Minute Interactive Routine & Goal Edit Module (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {plan && (
            <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md rounded-3xl border border-emerald-500/30 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Personalized Interactive Session
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {plan.title}
                  </h2>
                </div>

                <button
                  onClick={openPlayerModal}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/25 cursor-pointer shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Launch 3-Min Player
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {plan.tagline}
              </p>

              {/* Step Sequence Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {plan.steps.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className="bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl text-xs space-y-1.5 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
                        Step {step.stepNumber} • {step.durationSeconds}s
                      </span>
                      <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                        {step.actionType}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {step.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {step.instruction}
                    </p>
                  </div>
                ))}
              </div>

              {/* Rationale & Comfort Note */}
              <div className="bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 text-xs space-y-1.5">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  Physiological Mechanism:
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {plan.rationale}
                </p>
              </div>
            </div>
          )}

          {/* EDITABLE DAILY GOALS & LIMITS SECTION WITH FIREBASE SAVE BUTTON */}
          <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-sm space-y-5">
            {/* Header & Primary Save Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5" /> GOAL EDITOR & LIMIT CONTROLS
                  </span>
                  <span className="bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-teal-500" /> Firebase Cloud Sync
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Edit Daily Goals, Progress & Target Limits
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Type your progress numbers, click targets to adjust upper limits, and click Save to synchronize across all devices.
                </p>
              </div>

              {/* SAVE & SYNC BUTTON */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleManualSave}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/25 cursor-pointer"
                  title="Save completed goals and custom limits to Firebase"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Firebase...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save & Sync Goals</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Save Notification Toast */}
            <AnimatePresence>
              {saveSuccessNotification && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-semibold p-3 rounded-2xl flex items-center gap-2.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{saveSuccessNotification}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Bulk Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Quick Goal Actions:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllMet}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Mark All Met</span>
                </button>
                <button
                  type="button"
                  onClick={restoreOriginalGoals}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset Default Baselines</span>
                </button>
              </div>
            </div>

            {/* Goal Row List */}
            <div className="space-y-3.5">
              {state.adjustedGoals.map((goal) => (
                <RecoveryGoalRow
                  key={goal.id}
                  goal={goal}
                  onUpdateValue={(val) => setGoalValue(goal.id, val)}
                  onUpdateTarget={(target) => setGoalTarget(goal.id, target)}
                  onToggleStep={(delta) => toggleGoalProgress(goal.id, delta)}
                />
              ))}
            </div>

            {/* Bottom Save Bar with Last Synced Timestamp */}
            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>
                  {lastSyncedAt 
                    ? `Last synced to Firebase: ${lastSyncedAt.toLocaleTimeString()}`
                    : "Auto-synced with Firestore database"}
                </span>
              </div>

              <button
                onClick={handleManualSave}
                disabled={isSaving}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-bold px-5 py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save All Completed Goals & Limits</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Somatic Checklist & Streak Grace Shield (1 col) */}
        <div className="space-y-6">
          {/* Grace Shield Badge */}
          <div className="bg-gradient-to-tr from-amber-500/15 via-amber-600/10 to-transparent border border-amber-500/30 rounded-3xl p-5 backdrop-blur-md space-y-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-500">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Streak Grace Shield Active
                </h4>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {state.currentStreakDays}-Day Streak Preserved
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              In ArovedaAI, choosing to rest when your body is strained counts as a proactive wellness decision. Your streak is 100% protected.
            </p>
          </div>

          {/* 1-Minute Somatic Relief Micro-Actions */}
          <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-teal-500" />
              Somatic Micro-Actions
            </h4>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">1</div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Hydrate with Electrolytes</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">250ml water with pinch of sea salt or lemon relieves cerebral tension.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">2</div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Palms Over Eyes</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Cup warm palms over closed eyes for 60 seconds to reset optic nerve strain.</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">3</div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Shoulder & Jaw Release</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Unclench jaw, let tongue rest on bottom of mouth, drop shoulders.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coach View Link */}
          {onNavigateToCoachView && (
            <div className="bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-3xl p-5 backdrop-blur-md space-y-2 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-500" />
                Coach / Clinical Trigger Dashboard
              </span>
              <p className="text-slate-500 dark:text-slate-400">
                View longitudinal recovery trends, strain analytics, and configure trigger sensitivity thresholds.
              </p>
              <button
                onClick={onNavigateToCoachView}
                className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-2 rounded-xl text-xs transition-colors mt-1 cursor-pointer"
              >
                Open Coach & Trigger Controls →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface RecoveryGoalRowProps {
  goal: DailyGoal;
  onUpdateValue: (val: number) => void;
  onUpdateTarget: (target: number) => void;
  onToggleStep: (delta?: number) => void;
}

const RecoveryGoalRow: React.FC<RecoveryGoalRowProps> = ({
  goal,
  onUpdateValue,
  onUpdateTarget,
  onToggleStep
}) => {
  const [inputValue, setInputValue] = useState<string>(goal.currentValue.toString());
  const [targetValue, setTargetValue] = useState<string>(goal.adjustedTarget.toString());
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const limits = GOAL_LIMITS[goal.category] || { maxTarget: 10000, minTarget: 1, stepDelta: 1, isDecimal: false };

  useEffect(() => {
    setInputValue(goal.currentValue.toString());
  }, [goal.currentValue]);

  useEffect(() => {
    setTargetValue(goal.adjustedTarget.toString());
  }, [goal.adjustedTarget]);

  const isCompleted = goal.adjustedTarget > 0 ? goal.currentValue >= goal.adjustedTarget : true;
  const progressPercent = goal.adjustedTarget > 0 
    ? Math.min(100, Math.round((goal.currentValue / goal.adjustedTarget) * 100))
    : 100;

  const isDecimal = goal.category === 'sleep' || goal.category === 'focus';
  const stepDelta = goal.category === 'movement' ? 500 : goal.category === 'hydration' ? 250 : isDecimal ? 0.5 : 15;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setInputValue('');
      return;
    }
    const num = Number(raw);
    if (isNaN(num)) return;

    // Prevent entering value larger than target limit
    if (num > goal.adjustedTarget) {
      setInputValue(goal.adjustedTarget.toString());
      onUpdateValue(goal.adjustedTarget);
      setLimitWarning(`Capped at target limit (${goal.adjustedTarget} ${goal.unit})`);
      setTimeout(() => setLimitWarning(null), 2500);
      return;
    }

    if (num < 0) {
      setInputValue('0');
      onUpdateValue(0);
      return;
    }

    setLimitWarning(null);
    setInputValue(raw);
    onUpdateValue(num);
  };

  const handleInputBlur = () => {
    if (inputValue === '' || isNaN(Number(inputValue))) {
      setInputValue(goal.currentValue.toString());
    } else {
      const num = Number(inputValue);
      const clamped = Math.min(goal.adjustedTarget, Math.max(0, num));
      setInputValue(clamped.toString());
      onUpdateValue(clamped);
    }
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setTargetValue('');
      return;
    }
    const num = Number(raw);
    if (isNaN(num)) return;

    if (num > limits.maxTarget) {
      setTargetValue(limits.maxTarget.toString());
      onUpdateTarget(limits.maxTarget);
      setLimitWarning(`Max limit is ${limits.maxTarget} ${goal.unit}`);
      setTimeout(() => setLimitWarning(null), 2500);
      return;
    }

    setLimitWarning(null);
    setTargetValue(raw);
    onUpdateTarget(num);
  };

  const handleTargetBlur = () => {
    if (targetValue === '' || isNaN(Number(targetValue))) {
      setTargetValue(goal.adjustedTarget.toString());
    } else {
      const num = Number(targetValue);
      const clamped = Math.min(limits.maxTarget, Math.max(limits.minTarget, num));
      setTargetValue(clamped.toString());
      onUpdateTarget(clamped);
    }
  };

  const getCategoryIcon = () => {
    switch (goal.category) {
      case 'movement':
        return <Footprints className="w-4 h-4 text-teal-500" />;
      case 'exercise':
        return <Activity className="w-4 h-4 text-rose-500" />;
      case 'sleep':
        return <Moon className="w-4 h-4 text-indigo-500" />;
      case 'hydration':
        return <Droplets className="w-4 h-4 text-blue-500" />;
      case 'focus':
      default:
        return <Tv className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all space-y-3 relative ${
      isCompleted 
        ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/40 shadow-sm' 
        : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/10'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {getCategoryIcon()}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
              {getGoalDisplayTitle(goal)}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {goal.recoveryAdjustmentReason || "Daily target baseline"}
            </p>
          </div>
        </div>

        {/* Status Badge & Complete Button */}
        <div className="flex items-center gap-1.5">
          {isCompleted ? (
            <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-500" /> Target Met
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onUpdateValue(goal.adjustedTarget)}
              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Mark Met
            </button>
          )}
        </div>
      </div>

      {/* Transient Limit Warning */}
      <AnimatePresence>
        {limitWarning && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-lg px-2 py-1 flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
            <span>{limitWarning}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing Input & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Type progress number directly */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Logged:</span>
          <div className="relative">
            <input
              type="number"
              step={isDecimal ? "0.1" : "1"}
              min="0"
              max={goal.adjustedTarget}
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className="w-20 sm:w-24 px-2 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs text-slate-400">/</span>

          {/* Editable target limit */}
          {isEditingTarget ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={isDecimal ? "0.1" : "1"}
                min={limits.minTarget}
                max={limits.maxTarget}
                autoFocus
                value={targetValue}
                onChange={handleTargetChange}
                onBlur={() => { handleTargetBlur(); setIsEditingTarget(false); }}
                className="w-20 sm:w-24 px-2 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border-2 border-emerald-500 text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => { handleTargetBlur(); setIsEditingTarget(false); }}
                className="p-1 rounded bg-emerald-500 text-slate-950 text-xs font-bold"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTarget(true)}
              title="Click to customize target limit"
              className="font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer text-xs"
            >
              <span>{goal.adjustedTarget} {goal.unit}</span>
              <Edit2 className="w-3 h-3 opacity-60" />
            </button>
          )}
        </div>

        {/* Quick Stepper Adjusters */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleStep(-stepDelta)}
            disabled={goal.currentValue <= 0}
            title={`Decrease by ${stepDelta} ${goal.unit}`}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 font-bold transition-all text-xs cursor-pointer flex items-center gap-1"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onToggleStep(stepDelta)}
            disabled={goal.currentValue >= goal.adjustedTarget}
            title={goal.currentValue >= goal.adjustedTarget ? `Target limit reached (${goal.adjustedTarget} ${goal.unit})` : `Increase by ${stepDelta} ${goal.unit}`}
            className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-950 font-bold transition-all text-xs cursor-pointer flex items-center gap-1 shadow-sm shadow-emerald-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden sm:inline">+{stepDelta}</span>
          </button>
        </div>
      </div>

      {/* Numerical Progress Bar */}
      <div className="space-y-1 pt-1">
        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Progress</span>
          <span className="font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
};
