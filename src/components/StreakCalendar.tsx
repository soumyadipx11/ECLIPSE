import React, { useState, useMemo } from 'react';
import { useRecovery } from '../context/RecoveryContext';
import { 
  Flame, 
  ShieldCheck, 
  Trophy, 
  RotateCcw, 
  CheckCircle2, 
  Calendar as CalendarIcon,
  Info,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLocalDateString } from '../context/RecoveryContext';

interface StreakCalendarProps {
  onNavigateToRecovery?: () => void;
  compact?: boolean;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({ 
  onNavigateToRecovery,
  compact = false 
}) => {
  const { 
    state, 
    resetGoalsToday,
    setAllGoalsMet,
    isCloudSynced 
  } = useRecovery();

  const [hoveredDay, setHoveredDay] = useState<{
    dateStr: string;
    formattedDate: string;
    status: 'completed' | 'recovery' | 'period' | 'inactive';
    completedCount: number;
    totalGoals: number;
    note?: string;
    isToday: boolean;
  } | null>(null);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Compute 14 weeks (98 days) matrix ending at today/current week
  const { weeks, monthLabels, stats } = useMemo(() => {
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const history = state.streakHistory || {};
    const isPeriod = Boolean(state.menstrualState?.isPeriodActive);

    // Determine today's live completion status
    const todayGoals = state.adjustedGoals || [];
    const todayCompletedCount = todayGoals.filter(g => g.currentValue >= g.adjustedTarget).length;
    const todayTotal = todayGoals.length;
    let todayStatus: 'completed' | 'recovery' | 'period' | 'inactive' = 'inactive';
    if (todayCompletedCount === todayTotal && todayTotal > 0) {
      if (isPeriod) {
        todayStatus = 'period';
      } else {
        todayStatus = state.isActive || state.streakShieldActive ? 'recovery' : 'completed';
      }
    } else if (todayCompletedCount > 0 && isPeriod) {
      todayStatus = 'period';
    } else if (todayCompletedCount > 0 && (state.isActive || state.streakShieldActive)) {
      todayStatus = 'recovery';
    }

    // Number of weeks to display: 14 weeks = 98 days
    const totalWeeks = compact ? 10 : 14;
    const daysToShow = totalWeeks * 7;

    // End date should be Saturday of the current week (or Sunday) to align rows
    const currentDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
    // We want Monday-indexed (0=Mon, ... 6=Sun)
    const daysUntilEndOfWeek = 6 - ((currentDayOfWeek + 6) % 7);
    
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysUntilEndOfWeek);

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - daysToShow + 1);

    const generatedWeeks: Array<Array<{
      date: Date;
      dateStr: string;
      formattedDate: string;
      dayOfWeek: number;
      status: 'completed' | 'recovery' | 'period' | 'inactive';
      completedCount: number;
      totalGoals: number;
      isToday: boolean;
      isFuture: boolean;
      note?: string;
    }>> = [];

    const monthHeaders: Array<{ monthName: string; weekIndex: number }> = [];
    let lastMonth = -1;

    let cursor = new Date(startDate);
    let currentWeek: Array<any> = [];

    let completedDaysCount = 0;
    let recoveryDaysCount = 0;
    let periodDaysCount = 0;

    for (let i = 0; i < daysToShow; i++) {
      const dateStr = getLocalDateString(cursor);
      const isToday = dateStr === todayStr;
      const isFuture = cursor > today;

      const record = history[dateStr];
      let status: 'completed' | 'recovery' | 'period' | 'inactive' = 'inactive';
      let completedCount = 0;
      let totalGoals = 5;
      let note = '';

      if (isToday) {
        status = todayStatus;
        completedCount = todayCompletedCount;
        totalGoals = todayTotal;
        note = status === 'period'
          ? '🌸 Period Mode Active • Restorative Targets Met'
          : status === 'completed' 
          ? 'All 5 Daily Goals Completed Today!' 
          : status === 'recovery'
          ? 'Recovery Mode Active • Grace Shield Protected'
          : `${completedCount}/${totalGoals} Goals in Progress`;
      } else if (record && !isFuture) {
        status = record.status;
        completedCount = record.completedCount;
        totalGoals = record.totalGoals || 5;
        note = record.note || (status === 'period' ? '🌸 Menstrual restorative period day' : status === 'completed' ? 'All goals completed' : status === 'recovery' ? 'Restorative recovery day' : 'Rest day');
      }

      if (!isFuture) {
        if (status === 'completed') completedDaysCount++;
        if (status === 'recovery') recoveryDaysCount++;
        if (status === 'period') periodDaysCount++;
      }

      const formattedDate = cursor.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const dayObj = {
        date: new Date(cursor),
        dateStr,
        formattedDate,
        dayOfWeek: (cursor.getDay() + 6) % 7, // 0 = Mon, 6 = Sun
        status: isFuture ? 'inactive' : status,
        completedCount,
        totalGoals,
        isToday,
        isFuture,
        note
      };

      currentWeek.push(dayObj);

      // Check month change for header label
      if (cursor.getDate() <= 7 && cursor.getMonth() !== lastMonth) {
        monthHeaders.push({
          monthName: cursor.toLocaleDateString('en-US', { month: 'short' }),
          weekIndex: generatedWeeks.length
        });
        lastMonth = cursor.getMonth();
      }

      if (currentWeek.length === 7) {
        generatedWeeks.push(currentWeek);
        currentWeek = [];
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      generatedWeeks.push(currentWeek);
    }

    return {
      weeks: generatedWeeks,
      monthLabels: monthHeaders,
      stats: {
        currentStreak: state.currentStreakDays || 0,
        longestStreak: Math.max(state.longestStreakDays || 0, state.currentStreakDays || 0),
        totalActiveDays: completedDaysCount + recoveryDaysCount + periodDaysCount,
        completedDaysCount,
        recoveryDaysCount,
        periodDaysCount
      }
    };
  }, [state.streakHistory, state.currentStreakDays, state.longestStreakDays, state.adjustedGoals, state.isActive, state.streakShieldActive, state.menstrualState?.isPeriodActive, compact]);

  const handleResetConfirm = () => {
    resetGoalsToday();
    setResetConfirmOpen(false);
  };

  const dayLabels = ['Mon', 'Wed', 'Fri', 'Sun'];

  return (
    <div className="bg-white/40 dark:bg-[#121418]/40 backdrop-blur-md rounded-3xl border border-slate-200/70 dark:border-white/10 p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header with Title and Streak Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/50 dark:border-slate-800 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center border border-amber-200/60 dark:border-amber-900/40 shadow-sm shrink-0">
            <Flame className="w-5 h-5 fill-amber-500/20 text-amber-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Daily Habit & Recovery Streak Calendar
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live consecutive day activity matrix. Daily goals reset every midnight automatically.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Reset progress values for today's goals"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Today</span>
          </button>

          <button
            onClick={setAllGoalsMet}
            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Mark all goals as completed for today"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Complete Today</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-50/80 dark:bg-slate-900/40 p-2.5 sm:p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Current Streak</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400 leading-tight">
              {stats.currentStreak} {stats.currentStreak === 1 ? 'Day' : 'Days'}
            </span>
          </div>
        </div>

        <div className="bg-slate-50/80 dark:bg-slate-900/40 p-2.5 sm:p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Completed</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {stats.completedDaysCount} Days
            </span>
          </div>
        </div>

        <div className="bg-slate-50/80 dark:bg-slate-900/40 p-2.5 sm:p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Recovery & Period</span>
            <span className="text-base font-black text-yellow-600 dark:text-yellow-400 leading-tight">
              {stats.recoveryDaysCount + (stats.periodDaysCount || 0)} Days
            </span>
          </div>
        </div>

        <div className="bg-slate-50/80 dark:bg-slate-900/40 p-2.5 sm:p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Longest Record</span>
            <span className="text-base font-black text-indigo-600 dark:text-indigo-400 leading-tight">
              {stats.longestStreak} Days
            </span>
          </div>
        </div>
      </div>

      {/* Grid Matrix Container */}
      <div className="relative overflow-x-auto pb-2 pt-1">
        <div className="min-w-[620px]">
          {/* Month Header Row */}
          <div className="flex text-[10px] font-bold text-slate-400 mb-1 pl-8">
            {weeks.map((week, idx) => {
              const label = monthLabels.find(m => m.weekIndex === idx);
              return (
                <div key={idx} className="w-[17px] sm:w-[19px] text-left shrink-0">
                  {label ? label.monthName : ''}
                </div>
              );
            })}
          </div>

          {/* Grid with Day Labels on Left */}
          <div className="flex items-start gap-1.5">
            {/* Days of week labels (Mon, Wed, Fri, Sun) */}
            <div className="flex flex-col justify-between h-[112px] sm:h-[126px] text-[9px] font-semibold text-slate-400 pr-1 select-none">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
              <span>Sun</span>
            </div>

            {/* Matrix of Days */}
            <div className="flex gap-[3px] sm:gap-1">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px] sm:gap-1">
                  {week.map((day) => {
                    let cellBg = 'bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/50';
                    if (day.status === 'completed') {
                      cellBg = 'bg-emerald-500 dark:bg-emerald-500 border border-emerald-400/80 shadow-xs shadow-emerald-500/30';
                    } else if (day.status === 'recovery') {
                      cellBg = 'bg-yellow-400 dark:bg-yellow-400 border border-yellow-300/80 shadow-xs shadow-yellow-500/30';
                    } else if (day.status === 'period') {
                      cellBg = 'bg-rose-500 dark:bg-rose-500 border border-rose-400/80 shadow-xs shadow-rose-500/30';
                    }

                    if (day.isFuture) {
                      cellBg = 'bg-slate-100/40 dark:bg-slate-900/20 border border-dashed border-slate-200/40 dark:border-slate-800/30 opacity-40 cursor-not-allowed';
                    }

                    return (
                      <div
                        key={day.dateStr}
                        onMouseEnter={() => !day.isFuture && setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] rounded-[3px] transition-all cursor-pointer relative ${cellBg} ${
                          day.isToday 
                            ? day.status === 'period'
                              ? 'ring-2 ring-rose-500 dark:ring-rose-400 ring-offset-1 dark:ring-offset-slate-900 scale-105'
                              : 'ring-2 ring-emerald-500 dark:ring-emerald-400 ring-offset-1 dark:ring-offset-slate-900 scale-105' 
                            : 'hover:scale-115'
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating / Active Day Info Tooltip Bar */}
      <div className="bg-slate-100/80 dark:bg-slate-900/60 rounded-2xl p-2.5 sm:p-3 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          {hoveredDay ? (
            <div>
              <span className="font-bold text-slate-900 dark:text-white mr-2">
                {hoveredDay.formattedDate}:
              </span>
              <span className={`font-semibold ${
                hoveredDay.status === 'completed'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : hoveredDay.status === 'period'
                  ? 'text-rose-600 dark:text-rose-400'
                  : hoveredDay.status === 'recovery'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}>
                {hoveredDay.status === 'completed' && '✅ Completed Goal Streak (All Met)'}
                {hoveredDay.status === 'period' && '🌸 Menstrual Cycle Streak (Period Goals Maintained)'}
                {hoveredDay.status === 'recovery' && '🛡️ Recovery Day Streak (Grace Shield Active)'}
                {hoveredDay.status === 'inactive' && '⚪ Rest / Inactive Day'}
              </span>
              {hoveredDay.note && (
                <span className="text-slate-500 dark:text-slate-400 ml-1 text-[11px]">
                  — {hoveredDay.note}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              Hover over any square to view historical streak logs and target details.
            </span>
          )}
        </div>

        {/* Color Key / Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 self-end sm:self-auto shrink-0 font-medium">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Legend:</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[2px] bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 block"></span>
            <span>Inactive</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[2px] bg-yellow-400 dark:bg-yellow-400 block shadow-xs shadow-yellow-500/20"></span>
            <span className="text-yellow-700 dark:text-yellow-400 font-bold">Recovery</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[2px] bg-rose-500 dark:bg-rose-500 block shadow-xs shadow-rose-500/20"></span>
            <span className="text-rose-700 dark:text-rose-400 font-bold">Period Day</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[2px] bg-emerald-500 dark:bg-emerald-500 block shadow-xs shadow-emerald-500/20"></span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Completed</span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Resetting Today */}
      <AnimatePresence>
        {resetConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Reset Today's Goals?</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This resets your logged progress values for today back to 0 while keeping your target limits intact.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setResetConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetConfirm}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  Reset Progress
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
