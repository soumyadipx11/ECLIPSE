import React, { useState } from 'react';
import { useRecovery } from '../context/RecoveryContext';
import { DailyGoal } from '../types';
import { 
  Footprints, 
  Activity, 
  Moon, 
  Droplets, 
  Tv, 
  Check, 
  Plus, 
  Minus, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Edit2,
  CheckCheck,
  Flame,
  RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';

interface DailyGoalsSectionProps {
  onNavigateToRecovery?: () => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export const DailyGoalsSection: React.FC<DailyGoalsSectionProps> = ({
  onNavigateToRecovery,
  title = "Daily Health & Restorative Goals",
  subtitle,
  compact = false
}) => {
  const { 
    state, 
    setGoalValue, 
    setGoalTarget, 
    toggleGoalProgress,
    openCheckInModal
  } = useRecovery();

  const goals = state.adjustedGoals || [];
  
  // Calculate completion stats
  const completedCount = goals.filter(g => g.currentValue >= g.adjustedTarget).length;
  const totalGoals = goals.length;
  const overallPercentage = totalGoals > 0 
    ? Math.round(goals.reduce((acc, g) => acc + Math.min(100, (g.adjustedTarget > 0 ? (g.currentValue / g.adjustedTarget) * 100 : 100)), 0) / totalGoals)
    : 0;

  return (
    <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-5">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> DAILY TARGET TRACKER
            </span>
            {state.isActive ? (
              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Restorative Baselines Active
              </span>
            ) : (
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Standard Baselines
              </span>
            )}
            {state.streakShieldActive && (
              <span className="bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500" /> {state.currentStreakDays}-Day Streak Safeguarded
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle || (state.isActive 
              ? "Goals automatically adjusted for your current strain level. Type your numbers directly to update."
              : "Track your daily activity, recovery, and hydration. Type progress directly into any goal.")}
          </p>
        </div>

        {/* Completion Progress Bar & Action */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {completedCount}/{totalGoals} Completed
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {overallPercentage}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-32 sm:w-40 h-2 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5 border border-slate-300/40 dark:border-slate-700/40">
              <motion.div 
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, overallPercentage)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {onNavigateToRecovery && (
            <button
              onClick={onNavigateToRecovery}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <span>{state.isActive ? "Recovery Canvas" : "Adjust Goals"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((goal) => (
          <GoalInteractiveCard 
            key={goal.id}
            goal={goal}
            isRecoveryActive={state.isActive}
            onUpdateValue={(val) => setGoalValue(goal.id, val)}
            onUpdateTarget={(target) => setGoalTarget(goal.id, target)}
            onToggleStep={(delta) => toggleGoalProgress(goal.id, delta)}
          />
        ))}
      </div>
    </div>
  );
};

interface GoalInteractiveCardProps {
  goal: DailyGoal;
  isRecoveryActive: boolean;
  onUpdateValue: (val: number) => void;
  onUpdateTarget: (target: number) => void;
  onToggleStep: (delta?: number) => void;
}

const GoalInteractiveCard: React.FC<GoalInteractiveCardProps> = ({
  goal,
  isRecoveryActive,
  onUpdateValue,
  onUpdateTarget,
  onToggleStep
}) => {
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [inputValue, setInputValue] = useState<string>(goal.currentValue.toString());
  const [targetInputValue, setTargetInputValue] = useState<string>(goal.adjustedTarget.toString());

  // Keep local string in sync if goal props change from external updates
  React.useEffect(() => {
    setInputValue(goal.currentValue.toString());
  }, [goal.currentValue]);

  React.useEffect(() => {
    setTargetInputValue(goal.adjustedTarget.toString());
  }, [goal.adjustedTarget]);

  const isCompleted = goal.adjustedTarget > 0 ? goal.currentValue >= goal.adjustedTarget : true;
  const progressPercent = goal.adjustedTarget > 0 
    ? Math.min(100, Math.round((goal.currentValue / goal.adjustedTarget) * 100))
    : 100;

  // Category Icon & Theme
  const getCategoryTheme = () => {
    switch (goal.category) {
      case 'movement':
        return {
          icon: <Footprints className="w-4 h-4 text-teal-500" />,
          accentBg: 'bg-teal-500/10 dark:bg-teal-950/30',
          accentBorder: 'border-teal-500/30',
          barGradient: 'from-teal-500 to-emerald-500',
          badgeText: 'text-teal-600 dark:text-teal-400',
          stepDelta: 500,
          isDecimal: false
        };
      case 'exercise':
        return {
          icon: <Activity className="w-4 h-4 text-rose-500" />,
          accentBg: 'bg-rose-500/10 dark:bg-rose-950/30',
          accentBorder: 'border-rose-500/30',
          barGradient: 'from-rose-500 to-orange-500',
          badgeText: 'text-rose-600 dark:text-rose-400',
          stepDelta: 15,
          isDecimal: false
        };
      case 'sleep':
        return {
          icon: <Moon className="w-4 h-4 text-indigo-500" />,
          accentBg: 'bg-indigo-500/10 dark:bg-indigo-950/30',
          accentBorder: 'border-indigo-500/30',
          barGradient: 'from-indigo-500 to-violet-500',
          badgeText: 'text-indigo-600 dark:text-indigo-400',
          stepDelta: 0.5,
          isDecimal: true
        };
      case 'hydration':
        return {
          icon: <Droplets className="w-4 h-4 text-blue-500" />,
          accentBg: 'bg-blue-500/10 dark:bg-blue-950/30',
          accentBorder: 'border-blue-500/30',
          barGradient: 'from-cyan-500 to-blue-500',
          badgeText: 'text-blue-600 dark:text-blue-400',
          stepDelta: 250,
          isDecimal: false
        };
      case 'focus':
      case 'mindfulness':
      default:
        return {
          icon: <Tv className="w-4 h-4 text-amber-500" />,
          accentBg: 'bg-amber-500/10 dark:bg-amber-950/30',
          accentBorder: 'border-amber-500/30',
          barGradient: 'from-amber-500 to-yellow-500',
          badgeText: 'text-amber-600 dark:text-amber-400',
          stepDelta: 0.5,
          isDecimal: true
        };
    }
  };

  const theme = getCategoryTheme();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (val !== '' && !isNaN(Number(val))) {
      onUpdateValue(Number(val));
    }
  };

  const handleInputBlur = () => {
    if (inputValue === '' || isNaN(Number(inputValue))) {
      setInputValue(goal.currentValue.toString());
    } else {
      onUpdateValue(Math.max(0, Number(inputValue)));
    }
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTargetInputValue(val);
    if (val !== '' && !isNaN(Number(val))) {
      onUpdateTarget(Number(val));
    }
  };

  const handleTargetBlur = () => {
    setIsEditingTarget(false);
    if (targetInputValue === '' || isNaN(Number(targetInputValue))) {
      setTargetInputValue(goal.adjustedTarget.toString());
    } else {
      onUpdateTarget(Math.max(0, Number(targetInputValue)));
    }
  };

  return (
    <div className={`p-4 rounded-2xl border backdrop-blur-sm transition-all flex flex-col justify-between space-y-3 ${
      isCompleted 
        ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/40 shadow-sm' 
        : 'bg-white/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-white/10'
    }`}>
      {/* Top Meta */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-xl ${theme.accentBg} ${theme.accentBorder} border flex items-center justify-center`}>
              {theme.icon}
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
              {goal.name}
            </span>
          </div>

          {isCompleted ? (
            <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" /> Met
            </span>
          ) : goal.isPausedOrReduced && isRecoveryActive ? (
            <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Reduced
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-400">
              {progressPercent}%
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
          {goal.recoveryNote}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
          <motion.div 
            className={`h-full bg-gradient-to-r ${theme.barGradient} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Interactive Value Typing & Controls */}
      <div className="pt-1 flex items-center justify-between gap-2">
        {/* Direct Input Field */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="relative flex items-center">
            <input
              type="number"
              step={theme.isDecimal ? "0.1" : "1"}
              min="0"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              aria-label={`Type current value for ${goal.name}`}
              className="w-20 sm:w-24 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center shadow-inner"
              placeholder="0"
            />
          </div>

          <div className="text-left text-xs">
            <span className="text-slate-400 font-medium">/ </span>
            {isEditingTarget ? (
              <input
                type="number"
                step={theme.isDecimal ? "0.1" : "1"}
                min="0"
                autoFocus
                value={targetInputValue}
                onChange={handleTargetChange}
                onBlur={handleTargetBlur}
                className="w-16 bg-white dark:bg-slate-950 border border-emerald-500 rounded-lg px-1.5 py-0.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none text-center"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTarget(true)}
                title="Click to edit target"
                className="font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
              >
                {goal.adjustedTarget}
                <span className="text-[10px] font-normal text-slate-400 ml-0.5">{goal.unit}</span>
                <Edit2 className="w-2.5 h-2.5 opacity-40 hover:opacity-100 ml-0.5" />
              </button>
            )}
          </div>
        </div>

        {/* Stepper Quick-Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggleStep(-theme.stepDelta)}
            title={`Decrease by ${theme.stepDelta} ${goal.unit}`}
            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center transition-colors cursor-pointer text-xs"
          >
            <Minus className="w-3 h-3" />
          </button>
          
          <button
            type="button"
            onClick={() => onToggleStep(theme.stepDelta)}
            title={`Increase by ${theme.stepDelta} ${goal.unit}`}
            className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center transition-colors cursor-pointer text-xs shadow-sm shadow-emerald-500/20"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Normal target strikethrough if reduced */}
      {goal.normalTarget !== goal.adjustedTarget && isRecoveryActive && (
        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5 border-t border-slate-100 dark:border-slate-800/60">
          <span className="line-through">Normal Baseline: {goal.normalTarget} {goal.unit}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Strain Shield</span>
        </div>
      )}
    </div>
  );
};
