import React from 'react';
import { useRecovery, getGoalDisplayTitle } from '../context/RecoveryContext';
import { DailyGoal } from '../types';
import { 
  Footprints, 
  Activity, 
  Moon, 
  Droplets, 
  Tv, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Flame,
  Cloud,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';

interface DailyGoalsSectionProps {
  onNavigateToRecovery?: () => void;
  title?: string;
  subtitle?: string;
}

export const DailyGoalsSection: React.FC<DailyGoalsSectionProps> = ({
  onNavigateToRecovery,
  title = "Daily Health & Restorative Goals",
  subtitle
}) => {
  const { state } = useRecovery();
  const goals = state.adjustedGoals || [];
  
  // Calculate completion stats
  const completedCount = goals.filter(g => g.currentValue >= g.adjustedTarget).length;
  const totalGoals = goals.length;
  const overallPercentage = totalGoals > 0 
    ? Math.round(goals.reduce((acc, g) => acc + Math.min(100, (g.adjustedTarget > 0 ? (g.currentValue / g.adjustedTarget) * 100 : 100)), 0) / totalGoals)
    : 0;

  return (
    <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md rounded-3xl border border-slate-200/70 dark:border-white/10 p-6 shadow-sm space-y-5">
      {/* Header with Stats & Direct Edit Link */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> DAILY TARGET TRACKER
            </span>
            
            {/* Real-time cross-device sync badge */}
            <span className="bg-teal-500/10 border border-teal-500/25 text-teal-700 dark:text-teal-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              <Cloud className="w-3 h-3 text-teal-500" /> Synced Across Devices
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
              ? "Live overview of today's restorative goals. To update progress or modify limits, edit in Recovery Mode."
              : "Live status of today's health targets. Progress and limits can be modified in Recovery Mode.")}
          </p>
        </div>

        {/* Completion Progress Bar & Link to Edit in Recovery Mode */}
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
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-emerald-500/20 shrink-0"
              title="Open Recovery Mode to edit progress, customize limits, and sync"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Edit Goals in Recovery Mode</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Goal Cards Grid - READ ONLY STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((goal) => (
          <GoalStatusCard 
            key={goal.id}
            goal={goal}
            isRecoveryActive={state.isActive}
            onNavigateToRecovery={onNavigateToRecovery}
          />
        ))}
      </div>
    </div>
  );
};

interface GoalStatusCardProps {
  goal: DailyGoal;
  isRecoveryActive: boolean;
  onNavigateToRecovery?: () => void;
}

const GoalStatusCard: React.FC<GoalStatusCardProps> = ({
  goal,
  isRecoveryActive,
  onNavigateToRecovery
}) => {
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
        };
      case 'exercise':
        return {
          icon: <Activity className="w-4 h-4 text-rose-500" />,
          accentBg: 'bg-rose-500/10 dark:bg-rose-950/30',
          accentBorder: 'border-rose-500/30',
          barGradient: 'from-rose-500 to-orange-500',
          badgeText: 'text-rose-600 dark:text-rose-400',
        };
      case 'sleep':
        return {
          icon: <Moon className="w-4 h-4 text-indigo-500" />,
          accentBg: 'bg-indigo-500/10 dark:bg-indigo-950/30',
          accentBorder: 'border-indigo-500/30',
          barGradient: 'from-indigo-500 to-violet-500',
          badgeText: 'text-indigo-600 dark:text-indigo-400',
        };
      case 'hydration':
        return {
          icon: <Droplets className="w-4 h-4 text-blue-500" />,
          accentBg: 'bg-blue-500/10 dark:bg-blue-950/30',
          accentBorder: 'border-blue-500/30',
          barGradient: 'from-cyan-500 to-blue-500',
          badgeText: 'text-blue-600 dark:text-blue-400',
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
        };
    }
  };

  const theme = getCategoryTheme();

  return (
    <div 
      onClick={onNavigateToRecovery}
      className={`p-4 rounded-2xl border backdrop-blur-sm transition-all flex flex-col justify-between space-y-3 cursor-pointer group hover:border-emerald-500/50 hover:shadow-md ${
        isCompleted 
          ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/40 shadow-sm' 
          : 'bg-white/60 dark:bg-slate-900/50 border-slate-200/70 dark:border-white/10'
      }`}
    >
      {/* Card Header: Icon, Title & Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${theme.accentBg} ${theme.accentBorder}`}>
            {theme.icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
              {getGoalDisplayTitle(goal)}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
              {goal.isPausedOrReduced && isRecoveryActive
                ? (goal.recoveryAdjustmentReason || "Lowered for biological recharge")
                : `Target: ${goal.adjustedTarget.toLocaleString()} ${goal.unit}`}
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div>
          {isCompleted ? (
            <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Target Met
            </span>
          ) : goal.isPausedOrReduced && isRecoveryActive ? (
            <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Restorative Mode
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {progressPercent}%
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar & Numerical Metrics */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {goal.currentValue.toLocaleString()} <span className="text-[11px] text-slate-400 font-normal">/ {goal.adjustedTarget.toLocaleString()} {goal.unit}</span>
          </span>
          <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {progressPercent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
          <motion.div
            className={`h-full bg-gradient-to-r ${theme.barGradient} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Footer Navigation Hint */}
      <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
        <span className="flex items-center gap-1">
          {isCompleted ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Goal complete for today</span>
          ) : (
            <span>Remaining: {(Math.max(0, goal.adjustedTarget - goal.currentValue)).toLocaleString()} {goal.unit}</span>
          )}
        </span>
        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Edit in Recovery</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </span>
      </div>
    </div>
  );
};
