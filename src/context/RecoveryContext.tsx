import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  RecoveryState, 
  RecoveryPlan, 
  DailyGoal, 
  EnergyCheckIn, 
  CoachTriggerConfig, 
  RecoverySessionLog,
  StrainLevel,
  MenstrualState,
  MenstrualPeriodEntry,
  MenstrualFlowLevel,
  MenstrualCycleAnalysis
} from '../types';
import { useAuth } from './AuthContext';
import { safeFetchJson } from '../lib/api';
import { db, doc, setDoc, onSnapshot } from '../lib/firebase';
import { cleanUndefined } from '../utils/sanitize';
import { 
  getMenstrualAdjustedGoals, 
  analyzeMenstrualCycle, 
  diffDays 
} from '../utils/menstrualCycle';

const DEFAULT_COACH_CONFIG: CoachTriggerConfig = {
  highStrainSensitivity: 'medium',
  autoActivateRecovery: true,
  goalReductionPercentage: 70,
  enableStreakProtection: true,
  minRestAllocationHours: 4,
  emergencyHelplineEnabled: true,
  customSupportMessage: 'Self-compassion is a high-performance skill. When your physiological markers indicate strain, lowering output protects longevity.'
};

export const GOAL_LIMITS: Record<string, { maxTarget: number; minTarget: number; stepDelta: number; isDecimal: boolean; label: string }> = {
  movement: { maxTarget: 100000, minTarget: 500, stepDelta: 500, isDecimal: false, label: 'Steps (Max 100k)' },
  exercise: { maxTarget: 720, minTarget: 5, stepDelta: 15, isDecimal: false, label: 'Minutes (Max 12h / 720m)' },
  sleep: { maxTarget: 24, minTarget: 1, stepDelta: 0.5, isDecimal: true, label: 'Hours (Max 24h)' },
  hydration: { maxTarget: 10000, minTarget: 250, stepDelta: 250, isDecimal: false, label: 'Milliliters (Max 10L / 10k ml)' },
  focus: { maxTarget: 24, minTarget: 0.5, stepDelta: 0.5, isDecimal: true, label: 'Hours (Max 24h)' },
};

const DEFAULT_GOALS: DailyGoal[] = [
  {
    id: 'goal-movement',
    title: 'Daily Movement',
    name: 'Daily Movement',
    category: 'movement',
    normalTarget: 10000,
    adjustedTarget: 10000,
    currentValue: 0,
    unit: 'steps',
    isPausedOrReduced: false,
    recoveryNote: 'Standard active movement goal.'
  },
  {
    id: 'goal-exercise',
    title: 'Cardio / Workout',
    name: 'Cardio / Workout',
    category: 'exercise',
    normalTarget: 45,
    adjustedTarget: 45,
    currentValue: 0,
    unit: 'mins',
    isPausedOrReduced: false,
    recoveryNote: 'Standard daily exercise target.'
  },
  {
    id: 'goal-sleep',
    title: 'Sleep Duration',
    name: 'Sleep Duration',
    category: 'sleep',
    normalTarget: 7.5,
    adjustedTarget: 7.5,
    currentValue: 0,
    unit: 'hours',
    isPausedOrReduced: false,
    recoveryNote: 'Standard rest baseline.'
  },
  {
    id: 'goal-hydration',
    title: 'Hydration Intake',
    name: 'Hydration Intake',
    category: 'hydration',
    normalTarget: 2000,
    adjustedTarget: 2000,
    currentValue: 0,
    unit: 'ml',
    isPausedOrReduced: false,
    recoveryNote: 'Optimal daily water intake.'
  },
  {
    id: 'goal-focus',
    title: 'Screen & Deep Focus',
    name: 'Screen & Deep Focus',
    category: 'focus',
    normalTarget: 6.0,
    adjustedTarget: 6.0,
    currentValue: 0,
    unit: 'hours',
    isPausedOrReduced: false,
    recoveryNote: 'Standard work focus block.'
  }
];

export const DEFAULT_MENSTRUAL_STATE: MenstrualState = {
  isEnabled: true,
  isPeriodActive: false,
  activePeriodOnset: undefined,
  activePeriodFlow: undefined,
  activeSymptoms: [],
  periodHistory: [],
  lastUpdated: new Date().toISOString()
};

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const calculateStreakFromHistory = (
  history: Record<string, any> = {},
  todayGoals: DailyGoal[] = [],
  isRecoveryActive: boolean = false,
  isShieldActive: boolean = false,
  isPeriodActive: boolean = false
): { currentStreak: number; longestStreak: number; todayStatus: 'completed' | 'recovery' | 'period' | 'inactive' } => {
  const todayStr = getLocalDateString();
  const todayCompletedCount = todayGoals.filter(g => g.currentValue >= g.adjustedTarget).length;
  const todayTotal = todayGoals.length;
  
  let todayStatus: 'completed' | 'recovery' | 'period' | 'inactive' = 'inactive';
  if (todayCompletedCount === todayTotal && todayTotal > 0) {
    if (isPeriodActive) {
      todayStatus = 'period';
    } else {
      todayStatus = (isRecoveryActive || isShieldActive) ? 'recovery' : 'completed';
    }
  } else if (todayCompletedCount > 0 && isPeriodActive) {
    todayStatus = 'period';
  } else if (todayCompletedCount > 0 && (isRecoveryActive || isShieldActive)) {
    todayStatus = 'recovery';
  }

  const allRecords = { ...history };
  if (todayStatus !== 'inactive') {
    allRecords[todayStr] = {
      date: todayStr,
      status: todayStatus,
      completedCount: todayCompletedCount,
      totalGoals: todayTotal
    };
  }

  const isStreakDay = (st?: string) => st === 'completed' || st === 'recovery' || st === 'period';

  // Calculate consecutive streak working backwards
  let currentStreak = 0;
  const cursor = new Date();
  
  // If today is completed or recovery or period, count today
  const todayRec = allRecords[todayStr];
  if (todayRec && isStreakDay(todayRec.status)) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    // Today not done yet: check if yesterday was completed
    cursor.setDate(cursor.getDate() - 1);
  }

  // Count backwards day-by-day
  for (let i = 0; i < 365; i++) {
    const key = getLocalDateString(cursor);
    const rec = allRecords[key];
    if (rec && isStreakDay(rec.status)) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak from all recorded days
  const activeDates = Object.keys(allRecords)
    .filter(k => isStreakDay(allRecords[k]?.status))
    .sort();

  let longest = 0;
  let tempStreak = 0;
  let prevDateObj: Date | null = null;

  for (const dateKey of activeDates) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const currDateObj = new Date(y, m - 1, d);
    if (!prevDateObj) {
      tempStreak = 1;
    } else {
      const diffTime = currDateObj.getTime() - prevDateObj.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longest) longest = tempStreak;
    prevDateObj = currDateObj;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longest, currentStreak),
    todayStatus
  };
};

export const getGoalDisplayTitle = (goal: { category: string; title?: string; name?: string }): string => {
  if (goal.title && goal.title.trim().length > 0) return goal.title;
  if (goal.name && goal.name.trim().length > 0) return goal.name;
  switch (goal.category) {
    case 'movement':
      return 'Daily Movement';
    case 'exercise':
      return 'Cardio / Workout';
    case 'sleep':
      return 'Sleep Duration';
    case 'hydration':
      return 'Hydration Intake';
    case 'focus':
    case 'mindfulness':
    default:
      return 'Screen & Deep Focus';
  }
};

export const normalizeGoal = (goal: any): DailyGoal => {
  const category = goal.category || 'focus';
  let title = goal.title || goal.name;
  if (!title) {
    if (category === 'movement') title = 'Daily Movement';
    else if (category === 'exercise') title = 'Cardio / Workout';
    else if (category === 'sleep') title = 'Sleep Duration';
    else if (category === 'hydration') title = 'Hydration Intake';
    else title = 'Screen & Deep Focus';
  }
  return {
    ...goal,
    title,
    name: goal.name || title
  };
};

export const normalizeGoalList = (goals: any[]): DailyGoal[] => {
  if (!Array.isArray(goals) || goals.length === 0) return DEFAULT_GOALS;
  return goals.map(normalizeGoal);
};

export const PRESET_SCENARIOS: Record<string, { title: string; prompt: string; label: string; strain: StrainLevel }> = {
  exam_stress: {
    title: 'Pre-Exam Panic & Severe Headache',
    label: 'Exams in 2h, 3h sleep, intense tension headache & nausea',
    prompt: 'My final exams start in two hours, I only slept 3 hours last night, my temples are throbbing with a severe headache, and I feel nauseous from stress.',
    strain: 'high'
  },
  work_burnout: {
    title: 'Deep Work Burnout & Sensory Overload',
    label: '14-hour screen day, neck spasms, cognitive exhaustion',
    prompt: 'I have been staring at spreadsheets for 14 hours straight, my neck is stiff with sharp muscle spasms, and my brain feels totally fried.',
    strain: 'high'
  },
  post_illness: {
    title: 'Flu Recovery & Low Physical Energy',
    label: 'Fever breaking, heavy limbs, zero physical stamina',
    prompt: 'Recovering from viral flu. Fever is down but my limbs feel heavy like lead and I get dizzy if I walk too fast.',
    strain: 'high'
  },
  afternoon_slump: {
    title: 'Afternoon Energy Dip & Mild Stress',
    label: 'Mild 3 PM slump, tight shoulders, manageable fatigue',
    prompt: 'Feeling a bit sluggish after lunch and my shoulders are tight, but generally doing okay and want a quick refresh.',
    strain: 'moderate'
  },
  optimal_baseline: {
    title: 'Energized & Focused Baseline',
    label: 'Slept 8 hours, feeling refreshed, ready for challenges',
    prompt: 'Slept great last night for 8 hours, had a nutritious breakfast, feeling energized, grounded, and ready for the day.',
    strain: 'normal'
  }
};

interface RecoveryContextType {
  state: RecoveryState;
  isAssessing: boolean;
  isCloudSynced: boolean;
  isSaving: boolean;
  lastSyncedAt: Date | null;
  activeCheckInModal: boolean;
  activePlayerModal: boolean;
  openCheckInModal: () => void;
  closeCheckInModal: () => void;
  openPlayerModal: () => void;
  closePlayerModal: () => void;
  submitCheckIn: (input: string, mode: 'text' | 'voice' | 'preset') => Promise<EnergyCheckIn>;
  enterRecoveryMode: (plan?: RecoveryPlan, customGoals?: DailyGoal[], reason?: string) => void;
  exitRecoveryMode: (feedback?: { rating: 'much_better' | 'slightly_calmer' | 'still_drained'; notes?: string }) => void;
  toggleGoalProgress: (goalId: string, delta?: number) => void;
  setGoalValue: (goalId: string, value: number) => void;
  setGoalTarget: (goalId: string, target: number) => void;
  updateGoal: (goalId: string, updates: Partial<DailyGoal>) => void;
  resetGoalsToday: () => void;
  setAllGoalsMet: () => void;
  saveAndSyncToFirebase: () => Promise<boolean>;
  recordSessionCompleted: (planTitle: string, durationSeconds: number, rating?: 'much_better' | 'slightly_calmer' | 'still_drained') => void;
  updateCoachConfig: (newConfig: Partial<CoachTriggerConfig>) => void;
  restoreOriginalGoals: () => void;
  triggerPresetScenario: (scenarioKey: string) => Promise<EnergyCheckIn>;
  // Menstrual Cycle Tracking & Period Mode Support
  isFemaleUser: boolean;
  isPeriodActive: boolean;
  menstrualState: MenstrualState;
  cycleAnalysis: MenstrualCycleAnalysis;
  activatePeriodMode: (onsetDate?: string, flow?: MenstrualFlowLevel, symptoms?: string[], notes?: string) => void;
  endPeriodMode: (offsetDate?: string, notes?: string) => void;
  logMenstrualEntry: (entry: Partial<MenstrualPeriodEntry>) => void;
  deleteMenstrualEntry: (entryId: string) => void;
  toggleMenstrualTracking: (enable: boolean) => void;
}

const RecoveryContext = createContext<RecoveryContextType | undefined>(undefined);

export const RecoveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const todayStr = getLocalDateString();

  const [state, setState] = useState<RecoveryState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aroveda_recovery_state');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const normalizedGoals = normalizeGoalList(parsed.adjustedGoals);
          const parsedHistory = parsed.streakHistory || {};
          const parsedLastDate = parsed.lastActiveDate || todayStr;
          const parsedMenstrual = parsed.menstrualState || DEFAULT_MENSTRUAL_STATE;
          const isPeriod = Boolean(parsedMenstrual.isPeriodActive);

          // Check if stored date is a previous date (day rollover reset)
          if (parsedLastDate < todayStr) {
            // Archive previous day's record if completed
            const prevCompleted = normalizedGoals.filter((g: DailyGoal) => g.currentValue >= g.adjustedTarget).length;
            const prevTotal = normalizedGoals.length;
            if (prevCompleted === prevTotal && prevTotal > 0) {
              parsedHistory[parsedLastDate] = {
                date: parsedLastDate,
                status: isPeriod ? 'period' : (parsed.isActive || parsed.streakShieldActive ? 'recovery' : 'completed'),
                completedCount: prevCompleted,
                totalGoals: prevTotal
              };
            }
            // Reset today's progress to 0
            const resetGoals = normalizedGoals.map((g: DailyGoal) => ({ ...g, currentValue: 0 }));
            const { currentStreak, longestStreak } = calculateStreakFromHistory(
              parsedHistory,
              resetGoals,
              parsed.isActive,
              parsed.streakShieldActive,
              isPeriod
            );
            return {
              ...parsed,
              adjustedGoals: resetGoals,
              lastActiveDate: todayStr,
              streakHistory: parsedHistory,
              menstrualState: parsedMenstrual,
              currentStreakDays: currentStreak,
              longestStreakDays: Math.max(parsed.longestStreakDays || 0, longestStreak)
            };
          }

          const { currentStreak, longestStreak } = calculateStreakFromHistory(
            parsedHistory,
            normalizedGoals,
            parsed.isActive,
            parsed.streakShieldActive,
            isPeriod
          );

          return {
            ...parsed,
            adjustedGoals: normalizedGoals,
            lastActiveDate: todayStr,
            streakHistory: parsedHistory,
            menstrualState: parsedMenstrual,
            currentStreakDays: typeof parsed.currentStreakDays === 'number' ? parsed.currentStreakDays : currentStreak,
            longestStreakDays: typeof parsed.longestStreakDays === 'number' ? parsed.longestStreakDays : longestStreak
          };
        } catch (e) {}
      }
    }
    return {
      isActive: false,
      strainLevel: 'normal',
      energyScore: 88,
      adjustedGoals: DEFAULT_GOALS,
      streakShieldActive: false,
      currentStreakDays: 0,
      longestStreakDays: 0,
      lastActiveDate: todayStr,
      streakHistory: {},
      checkInHistory: [],
      sessionLogs: [],
      coachConfig: DEFAULT_COACH_CONFIG,
      menstrualState: DEFAULT_MENSTRUAL_STATE
    };
  });

  const [isAssessing, setIsAssessing] = useState<boolean>(false);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [activeCheckInModal, setActiveCheckInModal] = useState<boolean>(false);
  const [activePlayerModal, setActivePlayerModal] = useState<boolean>(false);

  const isRemoteUpdateRef = useRef<boolean>(false);
  const stateRef = useRef<RecoveryState>(state);
  stateRef.current = state;

  // Real-time Firestore synchronization for cross-device persistence
  useEffect(() => {
    if (!user?.uid) {
      setIsCloudSynced(false);
      return;
    }

    const recoveryDocRef = doc(db, 'recovery_states', user.uid);
    const unsub = onSnapshot(recoveryDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data) {
          isRemoteUpdateRef.current = true;
          setState(prev => {
            const rawGoals = Array.isArray(data.adjustedGoals) && data.adjustedGoals.length > 0 
              ? normalizeGoalList(data.adjustedGoals) 
              : prev.adjustedGoals;
            const history = data.streakHistory && typeof data.streakHistory === 'object' ? data.streakHistory : (prev.streakHistory || {});
            const lastDate = data.lastActiveDate || prev.lastActiveDate || getLocalDateString();
            const currentToday = getLocalDateString();

            // Calculate current streak from history
            const { currentStreak, longestStreak } = calculateStreakFromHistory(
              history,
              rawGoals,
              typeof data.isActive === 'boolean' ? data.isActive : prev.isActive,
              typeof data.streakShieldActive === 'boolean' ? data.streakShieldActive : prev.streakShieldActive
            );

            const nextState: RecoveryState = {
              isActive: typeof data.isActive === 'boolean' ? data.isActive : prev.isActive,
              strainLevel: data.strainLevel || prev.strainLevel,
              energyScore: typeof data.energyScore === 'number' ? data.energyScore : prev.energyScore,
              activatedAt: data.activatedAt ?? prev.activatedAt,
              reason: data.reason ?? prev.reason,
              currentPlan: data.currentPlan ?? prev.currentPlan,
              adjustedGoals: rawGoals,
              streakShieldActive: typeof data.streakShieldActive === 'boolean' ? data.streakShieldActive : prev.streakShieldActive,
              currentStreakDays: typeof data.currentStreakDays === 'number' ? data.currentStreakDays : currentStreak,
              longestStreakDays: typeof data.longestStreakDays === 'number' ? data.longestStreakDays : longestStreak,
              lastActiveDate: lastDate,
              streakHistory: history,
              lastShieldUsedDate: data.lastShieldUsedDate ?? prev.lastShieldUsedDate,
              checkInHistory: Array.isArray(data.checkInHistory) ? data.checkInHistory : prev.checkInHistory,
              sessionLogs: Array.isArray(data.sessionLogs) ? data.sessionLogs : prev.sessionLogs,
              coachConfig: data.coachConfig ? { ...DEFAULT_COACH_CONFIG, ...data.coachConfig } : prev.coachConfig,
              menstrualState: data.menstrualState ? data.menstrualState : prev.menstrualState,
            };
            try {
              localStorage.setItem('aroveda_recovery_state', JSON.stringify(nextState));
            } catch (e) {}
            return nextState;
          });
          setIsCloudSynced(true);
        }
      } else {
        // Doc doesn't exist on Firestore yet, seed with initial state
        try {
          const initPayload = cleanUndefined({
            ...stateRef.current,
            userId: user.uid,
            updatedAt: new Date().toISOString()
          });
          setDoc(recoveryDocRef, initPayload)
            .then(() => setIsCloudSynced(true))
            .catch((err) => console.warn("Initial sync to Firestore recovery state failed:", err));
        } catch (e) {
          console.warn("Could not sanitize initial recovery state payload:", e);
        }
      }
    }, (error) => {
      console.warn("Firestore recovery state subscription error:", error);
    });

    return () => unsub();
  }, [user?.uid]);

  // Periodic and on-focus check for calendar day turnover (Midnight Reset)
  useEffect(() => {
    const checkDayRollover = () => {
      const currentToday = getLocalDateString();
      setState(prev => {
        if (!prev.lastActiveDate || prev.lastActiveDate === currentToday) {
          return prev;
        }

        // The day has changed! Archive previous day's completion record
        const prevGoals = prev.adjustedGoals || [];
        const prevCompleted = prevGoals.filter(g => g.currentValue >= g.adjustedTarget).length;
        const prevTotal = prevGoals.length;
        const updatedHistory = { ...(prev.streakHistory || {}) };

        if (prevCompleted === prevTotal && prevTotal > 0) {
          updatedHistory[prev.lastActiveDate] = {
            date: prev.lastActiveDate,
            status: prev.isActive || prev.streakShieldActive ? 'recovery' : 'completed',
            completedCount: prevCompleted,
            totalGoals: prevTotal,
            note: 'All daily goals completed on previous day'
          };
        } else if (prevCompleted > 0 && (prev.isActive || prev.streakShieldActive)) {
          updatedHistory[prev.lastActiveDate] = {
            date: prev.lastActiveDate,
            status: 'recovery',
            completedCount: prevCompleted,
            totalGoals: prevTotal,
            note: 'Grace Shield restorative day on previous day'
          };
        }

        // Reset today's goals: progress back to 0, retaining user targets & limits
        const freshGoals = prevGoals.map(g => ({
          ...g,
          currentValue: 0
        }));

        const { currentStreak, longestStreak } = calculateStreakFromHistory(
          updatedHistory,
          freshGoals,
          prev.isActive,
          prev.streakShieldActive
        );

        return {
          ...prev,
          adjustedGoals: freshGoals,
          lastActiveDate: currentToday,
          streakHistory: updatedHistory,
          currentStreakDays: currentStreak,
          longestStreakDays: Math.max(prev.longestStreakDays || 0, longestStreak)
        };
      });
    };

    // Run check immediately
    checkDayRollover();

    // Re-check every 60 seconds and on window focus
    const interval = setInterval(checkDayRollover, 60000);
    window.addEventListener('focus', checkDayRollover);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDayRollover);
    };
  }, []);

  // Persist local state updates to Firestore & localStorage
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const syncToCloud = useCallback(async (stateToSave: RecoveryState) => {
    if (!user?.uid) return;
    try {
      const payload = cleanUndefined({
        ...stateToSave,
        userId: user.uid,
        updatedAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'recovery_states', user.uid), payload, { merge: true });
      setIsCloudSynced(true);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.warn("Error syncing recovery state to Firestore:", err);
    }
  }, [user?.uid]);

  useEffect(() => {
    try {
      localStorage.setItem('aroveda_recovery_state', JSON.stringify(state));
    } catch (e) {}

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (user?.uid) {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        syncToCloud(state);
      }, 300);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [state, user?.uid, syncToCloud]);

  const openCheckInModal = () => setActiveCheckInModal(true);
  const closeCheckInModal = () => setActiveCheckInModal(false);
  const openPlayerModal = () => setActivePlayerModal(true);
  const closePlayerModal = () => setActivePlayerModal(false);

  const submitCheckIn = async (input: string, mode: 'text' | 'voice' | 'preset'): Promise<EnergyCheckIn> => {
    setIsAssessing(true);
    try {
      const result = await safeFetchJson<{
        success: boolean;
        data: {
          strainLevel: StrainLevel;
          energyScore: number;
          isHighStrain: boolean;
          primaryFactors: string[];
          emotionalState: string;
          aiAssessment: string;
          aiEmpathyMessage: string;
          recommendedMode: 'recovery' | 'normal';
          recoveryPlan: RecoveryPlan;
          adjustedGoals: DailyGoal[];
          streakProtected: boolean;
        };
      }>('/api/recovery/assess-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkInText: input,
          inputMode: mode,
          age: userProfile?.age,
          gender: userProfile?.gender,
          coachConfig: state.coachConfig,
          currentGoals: state.adjustedGoals
        })
      });

      const data = result.data;
      const newCheckIn: EnergyCheckIn = {
        id: 'chk_' + Date.now(),
        userId: user?.uid || 'guest',
        timestamp: new Date().toISOString(),
        inputMode: mode,
        rawInput: input,
        strainLevel: data.strainLevel,
        energyScore: data.energyScore,
        primaryFactors: data.primaryFactors || ['Physical & Mental Fatigue'],
        emotionalState: data.emotionalState || 'High strain response',
        aiAssessment: data.aiAssessment || 'Nervous system strain detected.',
        aiEmpathyMessage: data.aiEmpathyMessage || 'Taking rest right now is vital biological protection.',
        recoveryPlan: data.recoveryPlan,
        adjustedGoals: data.adjustedGoals
      };

      const shouldActivate = state.coachConfig.autoActivateRecovery
        ? (data.isHighStrain || data.strainLevel === 'high' || data.strainLevel === 'moderate')
        : (data.isHighStrain || data.strainLevel === 'high');

      setState(prev => ({
        ...prev,
        isActive: shouldActivate ? true : prev.isActive,
        activatedAt: shouldActivate ? new Date().toISOString() : prev.activatedAt,
        reason: shouldActivate ? (data.primaryFactors?.[0] || 'High strain detected') : prev.reason,
        strainLevel: data.strainLevel,
        energyScore: data.energyScore,
        currentPlan: data.recoveryPlan || prev.currentPlan,
        adjustedGoals: data.adjustedGoals && data.adjustedGoals.length > 0 ? data.adjustedGoals : prev.adjustedGoals,
        streakShieldActive: state.coachConfig.enableStreakProtection && (shouldActivate || data.strainLevel === 'high'),
        lastShieldUsedDate: shouldActivate ? new Date().toISOString() : prev.lastShieldUsedDate,
        checkInHistory: [newCheckIn, ...prev.checkInHistory]
      }));

      setIsAssessing(false);
      return newCheckIn;
    } catch (err: any) {
      setIsAssessing(false);
      console.warn("Falling back to local heuristic analysis:", err);
      
      // Resilient local fallback
      const lower = input.toLowerCase();
      const isExam = lower.includes('exam') || lower.includes('test') || lower.includes('deadline');
      const isHeadache = lower.includes('headache') || lower.includes('migraine') || lower.includes('temple');
      const isSleepDeprived = lower.includes('sleep') || lower.includes('tired') || lower.includes('exhausted') || lower.includes('3 hour') || lower.includes('2 hour');
      const isSick = lower.includes('sick') || lower.includes('fever') || lower.includes('nausea') || lower.includes('dizzy');
      
      const isHigh = isExam || isHeadache || isSleepDeprived || isSick;
      const strain: StrainLevel = isHigh ? 'high' : 'normal';
      const energy = isHigh ? 28 : 82;

      const fallbackPlan: RecoveryPlan = {
        id: 'plan_fallback_' + Date.now(),
        title: isExam ? '3-Minute Pre-Exam & Headache Reset' : '3-Minute Acute Vagal & Somatic Reset',
        tagline: 'Decompress acute tension, reduce cerebral stress, and regulate breathing rhythm.',
        totalDurationMinutes: 3,
        rationale: 'Activates parasympathetic vagal braking to halt panic adrenaline loops and oxygenate cortical tissue.',
        comfortAffirmation: 'Your nervous system requires 3 minutes of decompression. Resting right now protects your clarity.',
        hydrationTip: 'Sip 250ml room temperature water slowly to relieve vasoconstriction headaches.',
        steps: [
          {
            id: 's1',
            stepNumber: 1,
            title: 'Suboccipital & Temple Release',
            durationSeconds: 60,
            actionType: 'somatic',
            instruction: 'Place gentle thumbs at base of skull and fingertips on temples. Perform slow circular pressure with eyes closed.',
            guidanceAudioText: 'Close your eyes. Gently massage the base of your skull and temples in slow circles. Drop your shoulders away from your ears.',
            tips: ['Keep jaw relaxed', 'Breathe through your nose only']
          },
          {
            id: 's2',
            stepNumber: 2,
            title: 'Physiological Sigh Breathing',
            durationSeconds: 60,
            actionType: 'breathing',
            instruction: 'Take two quick deep inhales through your nose, then a long, slow 8-second sigh out through your mouth.',
            guidanceAudioText: 'Take a double inhale through your nose. Now slowly release all the air out through your mouth with a calm sigh.',
            breathingPattern: { inhale: 4, hold1: 2, exhale: 8, hold2: 0 },
            tips: ['Repeat 5 times', 'Allow belly to expand on inhale']
          },
          {
            id: 's3',
            stepNumber: 3,
            title: 'Cognitive Shielding & Hydration',
            durationSeconds: 60,
            actionType: 'cognitive_pause',
            instruction: 'Cover eyes with warm cupped palms. Sip 250ml water and set mental boundary.',
            guidanceAudioText: 'Cup your warm hands over your eyes. Take three slow grounding breaths and allow your nervous system to settle.',
            tips: ['Total darkness for eyes', 'Feel your feet solid on the floor']
          }
        ]
      };

      const fallbackGoals: DailyGoal[] = [
        {
          id: 'goal-movement',
          title: 'Daily Movement',
          name: 'Daily Movement',
          category: 'movement',
          normalTarget: 10000,
          adjustedTarget: 2000,
          currentValue: 850,
          unit: 'steps',
          isPausedOrReduced: true,
          recoveryNote: 'Reduced to gentle restorative steps. No cardio strain.'
        },
        {
          id: 'goal-exercise',
          title: 'Cardio / Workout',
          name: 'Cardio / Workout',
          category: 'exercise',
          normalTarget: 45,
          adjustedTarget: 0,
          currentValue: 0,
          unit: 'mins',
          isPausedOrReduced: true,
          recoveryNote: 'Paused. Protects cardiovascular and immune system.'
        },
        {
          id: 'goal-sleep',
          title: 'Sleep Duration',
          name: 'Sleep Duration',
          category: 'sleep',
          normalTarget: 7.5,
          adjustedTarget: 9.0,
          currentValue: 3.0,
          unit: 'hours',
          isPausedOrReduced: false,
          recoveryNote: 'Increased target to pay back sleep debt.'
        },
        {
          id: 'goal-hydration',
          title: 'Hydration Intake',
          name: 'Hydration Intake',
          category: 'hydration',
          normalTarget: 2000,
          adjustedTarget: 2500,
          currentValue: 800,
          unit: 'ml',
          isPausedOrReduced: false,
          recoveryNote: 'Increased fluids to relieve tension headache.'
        },
        {
          id: 'goal-focus',
          title: 'Screen & Deep Focus',
          name: 'Screen & Deep Focus',
          category: 'focus',
          normalTarget: 6.0,
          adjustedTarget: 2.0,
          currentValue: 1.5,
          unit: 'hours',
          isPausedOrReduced: true,
          recoveryNote: 'Capped to prevent migraine & visual exhaustion.'
        }
      ];

      const fallbackCheckIn: EnergyCheckIn = {
        id: 'chk_' + Date.now(),
        userId: user?.uid || 'guest',
        timestamp: new Date().toISOString(),
        inputMode: mode,
        rawInput: input,
        strainLevel: strain,
        energyScore: energy,
        primaryFactors: isExam ? ['Exam Anxiety (2h)', 'Severe Sleep Deprivation (3h)', 'Tension Headache'] : ['Acute Fatigue', 'Stress Overload'],
        emotionalState: isHigh ? 'High acute strain & cognitive overload' : 'Balanced state',
        aiAssessment: isHigh ? 'Nervous system is in sympathetic fight-or-flight with severe sleep deficit.' : 'Energy baseline is steady.',
        aiEmpathyMessage: 'Your body is asking for recovery. Pausing for 3 minutes will ground your nervous system.',
        recoveryPlan: fallbackPlan,
        adjustedGoals: fallbackGoals
      };

      setState(prev => ({
        ...prev,
        isActive: isHigh,
        activatedAt: isHigh ? new Date().toISOString() : prev.activatedAt,
        reason: isHigh ? fallbackCheckIn.primaryFactors[0] : prev.reason,
        strainLevel: strain,
        energyScore: energy,
        currentPlan: fallbackPlan,
        adjustedGoals: isHigh ? fallbackGoals : DEFAULT_GOALS,
        streakShieldActive: isHigh && prev.coachConfig.enableStreakProtection,
        checkInHistory: [fallbackCheckIn, ...prev.checkInHistory]
      }));

      return fallbackCheckIn;
    }
  };

  const enterRecoveryMode = (plan?: RecoveryPlan, customGoals?: DailyGoal[], reason?: string) => {
    setState(prev => ({
      ...prev,
      isActive: true,
      activatedAt: new Date().toISOString(),
      reason: reason || 'User requested low-effort recovery mode',
      strainLevel: 'high',
      energyScore: Math.min(prev.energyScore, 40),
      currentPlan: plan || prev.currentPlan,
      adjustedGoals: customGoals || prev.adjustedGoals,
      streakShieldActive: prev.coachConfig.enableStreakProtection
    }));
  };

  const exitRecoveryMode = (feedback?: { rating: 'much_better' | 'slightly_calmer' | 'still_drained'; notes?: string }) => {
    setState(prev => {
      const updatedHistory = [...prev.checkInHistory];
      if (updatedHistory.length > 0 && feedback) {
        updatedHistory[0] = {
          ...updatedHistory[0],
          postActivityFeedback: {
            rating: feedback.rating,
            notes: feedback.notes,
            completedAt: new Date().toISOString()
          }
        };
      }

      return {
        ...prev,
        isActive: false,
        strainLevel: 'normal',
        energyScore: feedback?.rating === 'much_better' ? 75 : feedback?.rating === 'slightly_calmer' ? 62 : 48,
        adjustedGoals: DEFAULT_GOALS,
        streakShieldActive: false,
        checkInHistory: updatedHistory
      };
    });
  };

  const restoreOriginalGoals = () => {
    setState(prev => ({
      ...prev,
      adjustedGoals: DEFAULT_GOALS
    }));
  };

  const setGoalValue = (goalId: string, value: number) => {
    const rawVal = isNaN(value) ? 0 : Number(value);
    setState(prev => {
      const updatedGoals = prev.adjustedGoals.map(g => {
        if (g.id === goalId) {
          const maxLimit = Math.max(0, g.adjustedTarget);
          const clampedVal = Math.min(maxLimit, Math.max(0, rawVal));
          const isDecimal = g.category === 'sleep' || g.category === 'focus';
          const finalVal = isDecimal ? Math.round(clampedVal * 10) / 10 : Math.round(clampedVal);
          return {
            ...g,
            currentValue: finalVal
          };
        }
        return g;
      });

      const today = getLocalDateString();
      const updatedHistory = { ...(prev.streakHistory || {}) };
      const isPeriod = Boolean(isFemaleUser && prev.menstrualState?.isPeriodActive);
      const { currentStreak, longestStreak, todayStatus } = calculateStreakFromHistory(
        updatedHistory,
        updatedGoals,
        prev.isActive,
        prev.streakShieldActive,
        isPeriod
      );

      if (todayStatus !== 'inactive') {
        const completedCount = updatedGoals.filter(g => g.currentValue >= g.adjustedTarget).length;
        updatedHistory[today] = {
          date: today,
          status: todayStatus,
          completedCount,
          totalGoals: updatedGoals.length,
          note: todayStatus === 'period' ? '🌸 Menstrual Phase: Restorative Goals Met' : todayStatus === 'completed' ? 'All daily targets met' : 'Restorative day active'
        };
      } else {
        delete updatedHistory[today];
      }

      return {
        ...prev,
        adjustedGoals: updatedGoals,
        streakHistory: updatedHistory,
        currentStreakDays: currentStreak,
        longestStreakDays: Math.max(prev.longestStreakDays || 0, longestStreak)
      };
    });
  };

  const setGoalTarget = (goalId: string, target: number) => {
    const rawTarget = isNaN(target) ? 0 : Number(target);
    setState(prev => {
      const updatedGoals = prev.adjustedGoals.map(g => {
        if (g.id === goalId) {
          const limits = GOAL_LIMITS[g.category] || { maxTarget: 10000, minTarget: 1 };
          const clampedTarget = Math.min(limits.maxTarget, Math.max(limits.minTarget, rawTarget));
          const isDecimal = g.category === 'sleep' || g.category === 'focus';
          const finalTarget = isDecimal ? Math.round(clampedTarget * 10) / 10 : Math.round(clampedTarget);
          const clampedCurrent = Math.min(finalTarget, g.currentValue);
          return {
            ...g,
            adjustedTarget: finalTarget,
            currentValue: clampedCurrent
          };
        }
        return g;
      });

      const today = getLocalDateString();
      const updatedHistory = { ...(prev.streakHistory || {}) };
      const isPeriod = Boolean(isFemaleUser && prev.menstrualState?.isPeriodActive);
      const { currentStreak, longestStreak, todayStatus } = calculateStreakFromHistory(
        updatedHistory,
        updatedGoals,
        prev.isActive,
        prev.streakShieldActive,
        isPeriod
      );

      if (todayStatus !== 'inactive') {
        const completedCount = updatedGoals.filter(g => g.currentValue >= g.adjustedTarget).length;
        updatedHistory[today] = {
          date: today,
          status: todayStatus,
          completedCount,
          totalGoals: updatedGoals.length
        };
      } else {
        delete updatedHistory[today];
      }

      return {
        ...prev,
        adjustedGoals: updatedGoals,
        streakHistory: updatedHistory,
        currentStreakDays: currentStreak,
        longestStreakDays: Math.max(prev.longestStreakDays || 0, longestStreak)
      };
    });
  };

  const updateGoal = (goalId: string, updates: Partial<DailyGoal>) => {
    setState(prev => {
      const updatedGoals = prev.adjustedGoals.map(g => {
        if (g.id === goalId) {
          const updated = { ...g, ...updates };
          if (typeof updated.adjustedTarget === 'number') {
            const limits = GOAL_LIMITS[updated.category] || { maxTarget: 10000, minTarget: 1 };
            updated.adjustedTarget = Math.min(limits.maxTarget, Math.max(limits.minTarget, updated.adjustedTarget));
          }
          if (typeof updated.currentValue === 'number') {
            updated.currentValue = Math.min(updated.adjustedTarget, Math.max(0, updated.currentValue));
          }
          return updated;
        }
        return g;
      });

      const today = getLocalDateString();
      const updatedHistory = { ...(prev.streakHistory || {}) };
      const isPeriod = Boolean(isFemaleUser && prev.menstrualState?.isPeriodActive);
      const { currentStreak, longestStreak, todayStatus } = calculateStreakFromHistory(
        updatedHistory,
        updatedGoals,
        prev.isActive,
        prev.streakShieldActive,
        isPeriod
      );

      if (todayStatus !== 'inactive') {
        const completedCount = updatedGoals.filter(g => g.currentValue >= g.adjustedTarget).length;
        updatedHistory[today] = {
          date: today,
          status: todayStatus,
          completedCount,
          totalGoals: updatedGoals.length
        };
      } else {
        delete updatedHistory[today];
      }

      return {
        ...prev,
        adjustedGoals: updatedGoals,
        streakHistory: updatedHistory,
        currentStreakDays: currentStreak,
        longestStreakDays: Math.max(prev.longestStreakDays || 0, longestStreak)
      };
    });
  };

  const toggleGoalProgress = (goalId: string, delta?: number) => {
    setState(prev => {
      const updatedGoals = prev.adjustedGoals.map(g => {
        if (g.id === goalId) {
          const step = delta ?? (g.category === 'movement' ? 500 : g.category === 'hydration' ? 250 : 1);
          const rawNext = g.currentValue + step;
          const nextVal = Math.min(g.adjustedTarget, Math.max(0, rawNext));
          const isDecimal = g.category === 'sleep' || g.category === 'focus';
          const finalVal = isDecimal ? Math.round(nextVal * 10) / 10 : Math.round(nextVal);
          return {
            ...g,
            currentValue: finalVal
          };
        }
        return g;
      });

      const today = getLocalDateString();
      const updatedHistory = { ...(prev.streakHistory || {}) };
      const isPeriod = Boolean(isFemaleUser && prev.menstrualState?.isPeriodActive);
      const { currentStreak, longestStreak, todayStatus } = calculateStreakFromHistory(
        updatedHistory,
        updatedGoals,
        prev.isActive,
        prev.streakShieldActive,
        isPeriod
      );

      if (todayStatus !== 'inactive') {
        const completedCount = updatedGoals.filter(g => g.currentValue >= g.adjustedTarget).length;
        updatedHistory[today] = {
          date: today,
          status: todayStatus,
          completedCount,
          totalGoals: updatedGoals.length,
          note: todayStatus === 'period' ? '🌸 Menstrual Phase: Restorative Goals Met' : todayStatus === 'completed' ? 'All daily targets met' : 'Restorative day active'
        };
      } else {
        delete updatedHistory[today];
      }

      return {
        ...prev,
        adjustedGoals: updatedGoals,
        streakHistory: updatedHistory,
        currentStreakDays: currentStreak,
        longestStreakDays: Math.max(prev.longestStreakDays || 0, longestStreak)
      };
    });
  };

  const resetGoalsToday = () => {
    setState(prev => {
      const resetGoals = prev.adjustedGoals.map(g => ({
        ...g,
        currentValue: 0
      }));

      const today = getLocalDateString();
      const updatedHistory = { ...(prev.streakHistory || {}) };
      delete updatedHistory[today];

      const isPeriod = Boolean(isFemaleUser && prev.menstrualState?.isPeriodActive);
      const { currentStreak, longestStreak } = calculateStreakFromHistory(
        updatedHistory,
        resetGoals,
        prev.isActive,
        prev.streakShieldActive,
        isPeriod
      );

      return {
        ...prev,
        adjustedGoals: resetGoals,
        streakHistory: updatedHistory,
        currentStreakDays: currentStreak,
        longestStreakDays: Math.max(prev.longestStreakDays || 0, longestStreak)
      };
    });
  };

  const setAllGoalsMet = () => {
    setState(prev => {
      const completedGoals = prev.adjustedGoals.map(g => ({
        ...g,
        currentValue: g.adjustedTarget
      }));

      const today = getLocalDateString();
      const isPeriod = Boolean(isFemaleUser && prev.menstrualState?.isPeriodActive);
      const status: 'completed' | 'recovery' | 'period' = isPeriod 
        ? 'period' 
        : (prev.isActive || prev.streakShieldActive ? 'recovery' : 'completed');

      const updatedHistory = {
        ...(prev.streakHistory || {}),
        [today]: {
          date: today,
          status,
          completedCount: completedGoals.length,
          totalGoals: completedGoals.length,
          note: status === 'period' 
            ? '🌸 Menstrual Phase: Restorative Goals Completed' 
            : status === 'completed' 
            ? 'All 5 daily targets met' 
            : 'Grace Shield protected day'
        }
      };

      const { currentStreak, longestStreak } = calculateStreakFromHistory(
        updatedHistory,
        completedGoals,
        prev.isActive,
        prev.streakShieldActive,
        isPeriod
      );

      return {
        ...prev,
        adjustedGoals: completedGoals,
        streakHistory: updatedHistory,
        currentStreakDays: currentStreak,
        longestStreakDays: Math.max(prev.longestStreakDays || 0, longestStreak)
      };
    });
  };

  // Menstrual cycle tracking operations
  const activatePeriodMode = (
    onsetDate?: string, 
    flow: MenstrualFlowLevel = 'medium', 
    symptoms: string[] = ['cramps', 'fatigue'], 
    notes?: string
  ) => {
    if (!isFemaleUser) return;
    const today = getLocalDateString();
    const effectiveOnset = onsetDate || today;

    setState(prev => {
      // 1. Calculate reduced period goals
      const reducedGoals = getMenstrualAdjustedGoals(prev.adjustedGoals);

      // 2. Build updated menstrual state
      const currentHistory = prev.menstrualState?.periodHistory || [];
      const updatedMenstrual: MenstrualState = {
        isEnabled: true,
        isPeriodActive: true,
        activePeriodOnset: effectiveOnset,
        activePeriodFlow: flow,
        activeSymptoms: symptoms,
        periodHistory: currentHistory,
        lastUpdated: new Date().toISOString()
      };

      // 3. Update streak record for today if goals completed
      const updatedHistory = { ...(prev.streakHistory || {}) };
      const completedCount = reducedGoals.filter(g => g.currentValue >= g.adjustedTarget).length;
      if (completedCount > 0) {
        updatedHistory[today] = {
          date: today,
          status: 'period',
          completedCount,
          totalGoals: reducedGoals.length,
          note: '🌸 Menstrual Mode Active: Period Goals Maintained'
        };
      }

      const { currentStreak, longestStreak } = calculateStreakFromHistory(
        updatedHistory,
        reducedGoals,
        prev.isActive,
        prev.streakShieldActive,
        true
      );

      return {
        ...prev,
        menstrualState: updatedMenstrual,
        adjustedGoals: reducedGoals,
        streakHistory: updatedHistory,
        currentStreakDays: currentStreak,
        longestStreakDays: Math.max(prev.longestStreakDays || 0, longestStreak)
      };
    });
  };

  const endPeriodMode = (offsetDate?: string, notes?: string) => {
    if (!isFemaleUser) return;
    const today = getLocalDateString();
    const effectiveOffset = offsetDate || today;

    setState(prev => {
      const onset = prev.menstrualState?.activePeriodOnset || today;
      const durationDays = Math.max(1, diffDays(onset, effectiveOffset) + 1);

      // Determine cycle length based on previous historical entry
      const existingHistory = [...(prev.menstrualState?.periodHistory || [])];
      let cycleLengthDays: number | undefined = undefined;
      if (existingHistory.length > 0) {
        const sorted = [...existingHistory].sort((a, b) => new Date(b.onsetDate).getTime() - new Date(a.onsetDate).getTime());
        const lastCycle = sorted[0];
        cycleLengthDays = Math.max(15, diffDays(lastCycle.onsetDate, onset));
      }

      const newEntry: MenstrualPeriodEntry = {
        id: 'cycle_' + Date.now(),
        onsetDate: onset,
        offsetDate: effectiveOffset,
        durationDays,
        cycleLengthDays,
        flowLevel: prev.menstrualState?.activePeriodFlow || 'medium',
        symptoms: prev.menstrualState?.activeSymptoms || [],
        notes: notes || undefined,
        isOngoing: false
      };

      const updatedHistory = [newEntry, ...existingHistory];

      const updatedMenstrual: MenstrualState = {
        isEnabled: prev.menstrualState?.isEnabled ?? true,
        isPeriodActive: false,
        activePeriodOnset: undefined,
        activePeriodFlow: undefined,
        activeSymptoms: [],
        periodHistory: updatedHistory,
        lastUpdated: new Date().toISOString()
      };

      // Restore baseline daily targets (normalTarget)
      const restoredGoals = prev.adjustedGoals.map(g => ({
        ...g,
        adjustedTarget: g.normalTarget,
        currentValue: Math.min(g.normalTarget, g.currentValue),
        isPausedOrReduced: false,
        recoveryNote: undefined
      }));

      const streakHistory = { ...(prev.streakHistory || {}) };
      const { currentStreak, longestStreak } = calculateStreakFromHistory(
        streakHistory,
        restoredGoals,
        prev.isActive,
        prev.streakShieldActive,
        false
      );

      return {
        ...prev,
        menstrualState: updatedMenstrual,
        adjustedGoals: restoredGoals,
        streakHistory,
        currentStreakDays: currentStreak,
        longestStreakDays: Math.max(prev.longestStreakDays || 0, longestStreak)
      };
    });
  };

  const logMenstrualEntry = (entry: Partial<MenstrualPeriodEntry>) => {
    if (!isFemaleUser) return;
    setState(prev => {
      const existing = prev.menstrualState?.periodHistory || [];
      const entryId = entry.id || ('cycle_' + Date.now());
      const onset = entry.onsetDate || getLocalDateString();
      const offset = entry.offsetDate || onset;
      const duration = Math.max(1, diffDays(onset, offset) + 1);

      const fullEntry: MenstrualPeriodEntry = {
        id: entryId,
        onsetDate: onset,
        offsetDate: offset,
        durationDays: duration,
        cycleLengthDays: entry.cycleLengthDays,
        flowLevel: entry.flowLevel || 'medium',
        symptoms: entry.symptoms || [],
        notes: entry.notes,
        isOngoing: entry.isOngoing || false
      };

      const filtered = existing.filter(e => e.id !== entryId);
      const updatedHistory = [fullEntry, ...filtered].sort((a, b) => new Date(b.onsetDate).getTime() - new Date(a.onsetDate).getTime());

      const updatedMenstrual: MenstrualState = {
        ...(prev.menstrualState || DEFAULT_MENSTRUAL_STATE),
        periodHistory: updatedHistory,
        lastUpdated: new Date().toISOString()
      };

      return {
        ...prev,
        menstrualState: updatedMenstrual
      };
    });
  };

  const deleteMenstrualEntry = (entryId: string) => {
    if (!isFemaleUser) return;
    setState(prev => {
      const existing = prev.menstrualState?.periodHistory || [];
      const updatedHistory = existing.filter(e => e.id !== entryId);
      return {
        ...prev,
        menstrualState: {
          ...(prev.menstrualState || DEFAULT_MENSTRUAL_STATE),
          periodHistory: updatedHistory,
          lastUpdated: new Date().toISOString()
        }
      };
    });
  };

  const toggleMenstrualTracking = (enable: boolean) => {
    if (!isFemaleUser) return;
    setState(prev => ({
      ...prev,
      menstrualState: {
        ...(prev.menstrualState || DEFAULT_MENSTRUAL_STATE),
        isEnabled: enable,
        lastUpdated: new Date().toISOString()
      }
    }));
  };

  const saveAndSyncToFirebase = async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const currentState = stateRef.current;
      if (user?.uid) {
        const payload = cleanUndefined({
          ...currentState,
          userId: user.uid,
          updatedAt: new Date().toISOString()
        });
        await setDoc(doc(db, 'recovery_states', user.uid), payload, { merge: true });
        setIsCloudSynced(true);
      }
      try {
        localStorage.setItem('aroveda_recovery_state', JSON.stringify(currentState));
      } catch (e) {}
      setLastSyncedAt(new Date());
      setIsSaving(false);
      return true;
    } catch (err) {
      console.warn("Manual save to Firebase failed:", err);
      setIsSaving(false);
      return false;
    }
  };

  const recordSessionCompleted = (planTitle: string, durationSeconds: number, rating?: 'much_better' | 'slightly_calmer' | 'still_drained') => {
    const newLog: RecoverySessionLog = {
      id: 'sess_' + Date.now(),
      timestamp: new Date().toISOString(),
      planTitle,
      durationSecondsCompleted: durationSeconds,
      totalDurationSeconds: 180,
      strainLevelBefore: state.strainLevel,
      energyScoreBefore: state.energyScore,
      ratingAfter: rating,
      streakProtected: state.streakShieldActive
    };

    setState(prev => ({
      ...prev,
      sessionLogs: [newLog, ...prev.sessionLogs]
    }));
  };

  const updateCoachConfig = (newConfig: Partial<CoachTriggerConfig>) => {
    setState(prev => ({
      ...prev,
      coachConfig: {
        ...prev.coachConfig,
        ...newConfig
      }
    }));
  };

  const triggerPresetScenario = async (scenarioKey: string): Promise<EnergyCheckIn> => {
    const scenario = PRESET_SCENARIOS[scenarioKey];
    if (!scenario) throw new Error("Scenario not found");
    return await submitCheckIn(scenario.prompt, 'preset');
  };

  // Female user detection & cycle analysis
  const isFemaleUser = userProfile?.gender?.toLowerCase() === 'female';
  const menstrualState = state.menstrualState || DEFAULT_MENSTRUAL_STATE;
  const isPeriodActive = Boolean(isFemaleUser && menstrualState.isPeriodActive);

  // Automatically reset menstrual state and restore baseline targets if gender changes from female to male or other
  useEffect(() => {
    if (!isFemaleUser) {
      setState(prev => {
        const activePeriod = prev.menstrualState?.isPeriodActive;
        const hasMenstrualNote = prev.adjustedGoals.some(g => g.recoveryNote?.includes('Menstrual') || g.recoveryNote?.includes('🌸'));

        if (!activePeriod && !hasMenstrualNote) {
          return prev;
        }

        // Restore normal targets if they were modified by menstrual mode
        const restoredGoals = prev.adjustedGoals.map(g => ({
          ...g,
          adjustedTarget: g.normalTarget,
          currentValue: Math.min(g.normalTarget, g.currentValue),
          isPausedOrReduced: false,
          recoveryNote: undefined,
          recoveryAdjustmentReason: undefined
        }));

        const updatedMenstrual: MenstrualState = {
          ...(prev.menstrualState || DEFAULT_MENSTRUAL_STATE),
          isPeriodActive: false,
          activePeriodOnset: undefined,
          activePeriodFlow: undefined,
          activeSymptoms: [],
        };

        const today = getLocalDateString();
        const updatedHistory = { ...(prev.streakHistory || {}) };
        if (updatedHistory[today]?.status === 'period') {
          updatedHistory[today] = {
            ...updatedHistory[today],
            status: 'completed',
            note: 'All daily targets met'
          };
        }

        const { currentStreak, longestStreak } = calculateStreakFromHistory(
          updatedHistory,
          restoredGoals,
          prev.isActive,
          prev.streakShieldActive,
          false
        );

        return {
          ...prev,
          menstrualState: updatedMenstrual,
          adjustedGoals: restoredGoals,
          streakHistory: updatedHistory,
          currentStreakDays: currentStreak,
          longestStreakDays: Math.max(prev.longestStreakDays || 0, longestStreak)
        };
      });
    }
  }, [isFemaleUser]);

  const cycleAnalysis = useMemo(() => {
    return analyzeMenstrualCycle(
      menstrualState.periodHistory || [],
      menstrualState.isPeriodActive,
      menstrualState.activePeriodOnset
    );
  }, [menstrualState.periodHistory, menstrualState.isPeriodActive, menstrualState.activePeriodOnset]);

  return (
    <RecoveryContext.Provider value={{
      state,
      isAssessing,
      isCloudSynced,
      isSaving,
      lastSyncedAt,
      activeCheckInModal,
      activePlayerModal,
      openCheckInModal,
      closeCheckInModal,
      openPlayerModal,
      closePlayerModal,
      submitCheckIn,
      enterRecoveryMode,
      exitRecoveryMode,
      toggleGoalProgress,
      setGoalValue,
      setGoalTarget,
      updateGoal,
      resetGoalsToday,
      setAllGoalsMet,
      saveAndSyncToFirebase,
      recordSessionCompleted,
      updateCoachConfig,
      restoreOriginalGoals,
      triggerPresetScenario,
      // Menstrual features
      isFemaleUser,
      isPeriodActive,
      menstrualState,
      cycleAnalysis,
      activatePeriodMode,
      endPeriodMode,
      logMenstrualEntry,
      deleteMenstrualEntry,
      toggleMenstrualTracking
    }}>
      {children}
    </RecoveryContext.Provider>
  );
};

export const useRecovery = () => {
  const ctx = useContext(RecoveryContext);
  if (!ctx) {
    throw new Error("useRecovery must be used within a RecoveryProvider");
  }
  return ctx;
};
