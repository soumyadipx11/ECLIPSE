import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  RecoveryState, 
  RecoveryPlan, 
  DailyGoal, 
  EnergyCheckIn, 
  CoachTriggerConfig, 
  RecoverySessionLog,
  StrainLevel 
} from '../types';
import { useAuth } from './AuthContext';
import { safeFetchJson } from '../lib/api';
import { db, doc, setDoc, onSnapshot } from '../lib/firebase';
import { cleanUndefined } from '../utils/sanitize';

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
    name: 'Daily Movement',
    category: 'movement',
    normalTarget: 10000,
    adjustedTarget: 10000,
    currentValue: 3420,
    unit: 'steps',
    isPausedOrReduced: false,
    recoveryNote: 'Standard active movement goal.'
  },
  {
    id: 'goal-exercise',
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
    name: 'Sleep Duration',
    category: 'sleep',
    normalTarget: 7.5,
    adjustedTarget: 7.5,
    currentValue: 4.5,
    unit: 'hours',
    isPausedOrReduced: false,
    recoveryNote: 'Standard rest baseline.'
  },
  {
    id: 'goal-hydration',
    name: 'Hydration Intake',
    category: 'hydration',
    normalTarget: 2000,
    adjustedTarget: 2000,
    currentValue: 900,
    unit: 'ml',
    isPausedOrReduced: false,
    recoveryNote: 'Optimal daily water intake.'
  },
  {
    id: 'goal-focus',
    name: 'Screen & Deep Focus',
    category: 'focus',
    normalTarget: 6.0,
    adjustedTarget: 6.0,
    currentValue: 3.5,
    unit: 'hours',
    isPausedOrReduced: false,
    recoveryNote: 'Standard work focus block.'
  }
];

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
  recordSessionCompleted: (planTitle: string, durationSeconds: number, rating?: 'much_better' | 'slightly_calmer' | 'still_drained') => void;
  updateCoachConfig: (newConfig: Partial<CoachTriggerConfig>) => void;
  restoreOriginalGoals: () => void;
  triggerPresetScenario: (scenarioKey: string) => Promise<EnergyCheckIn>;
}

const RecoveryContext = createContext<RecoveryContextType | undefined>(undefined);

export const RecoveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();

  const [state, setState] = useState<RecoveryState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aroveda_recovery_state');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return {
      isActive: false,
      strainLevel: 'normal',
      energyScore: 88,
      adjustedGoals: DEFAULT_GOALS,
      streakShieldActive: false,
      currentStreakDays: 14,
      checkInHistory: [],
      sessionLogs: [],
      coachConfig: DEFAULT_COACH_CONFIG
    };
  });

  const [isAssessing, setIsAssessing] = useState<boolean>(false);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
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
            const nextState: RecoveryState = {
              isActive: typeof data.isActive === 'boolean' ? data.isActive : prev.isActive,
              strainLevel: data.strainLevel || prev.strainLevel,
              energyScore: typeof data.energyScore === 'number' ? data.energyScore : prev.energyScore,
              activatedAt: data.activatedAt ?? prev.activatedAt,
              reason: data.reason ?? prev.reason,
              currentPlan: data.currentPlan ?? prev.currentPlan,
              adjustedGoals: Array.isArray(data.adjustedGoals) && data.adjustedGoals.length > 0 ? data.adjustedGoals : prev.adjustedGoals,
              streakShieldActive: typeof data.streakShieldActive === 'boolean' ? data.streakShieldActive : prev.streakShieldActive,
              currentStreakDays: typeof data.currentStreakDays === 'number' ? data.currentStreakDays : prev.currentStreakDays,
              lastShieldUsedDate: data.lastShieldUsedDate ?? prev.lastShieldUsedDate,
              checkInHistory: Array.isArray(data.checkInHistory) ? data.checkInHistory : prev.checkInHistory,
              sessionLogs: Array.isArray(data.sessionLogs) ? data.sessionLogs : prev.sessionLogs,
              coachConfig: data.coachConfig ? { ...DEFAULT_COACH_CONFIG, ...data.coachConfig } : prev.coachConfig,
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
          name: 'Strenuous Workout',
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
          name: 'Recovery & Sleep',
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
          name: 'Deep Screen Focus',
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
    setState(prev => ({
      ...prev,
      adjustedGoals: prev.adjustedGoals.map(g => {
        if (g.id === goalId) {
          // Progress value cannot be less than 0 or greater than the goal's target limit
          const maxLimit = Math.max(0, g.adjustedTarget);
          const clampedVal = Math.min(maxLimit, Math.max(0, rawVal));
          // Precision round if decimal (sleep / focus)
          const isDecimal = g.category === 'sleep' || g.category === 'focus';
          const finalVal = isDecimal ? Math.round(clampedVal * 10) / 10 : Math.round(clampedVal);
          return {
            ...g,
            currentValue: finalVal
          };
        }
        return g;
      })
    }));
  };

  const setGoalTarget = (goalId: string, target: number) => {
    const rawTarget = isNaN(target) ? 0 : Number(target);
    setState(prev => ({
      ...prev,
      adjustedGoals: prev.adjustedGoals.map(g => {
        if (g.id === goalId) {
          const limits = GOAL_LIMITS[g.category] || { maxTarget: 10000, minTarget: 1 };
          const clampedTarget = Math.min(limits.maxTarget, Math.max(limits.minTarget, rawTarget));
          const isDecimal = g.category === 'sleep' || g.category === 'focus';
          const finalTarget = isDecimal ? Math.round(clampedTarget * 10) / 10 : Math.round(clampedTarget);
          // If current progress value exceeds the newly adjusted target limit, clamp currentValue to target
          const clampedCurrent = Math.min(finalTarget, g.currentValue);
          return {
            ...g,
            adjustedTarget: finalTarget,
            currentValue: clampedCurrent
          };
        }
        return g;
      })
    }));
  };

  const updateGoal = (goalId: string, updates: Partial<DailyGoal>) => {
    setState(prev => ({
      ...prev,
      adjustedGoals: prev.adjustedGoals.map(g => {
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
      })
    }));
  };

  const toggleGoalProgress = (goalId: string, delta?: number) => {
    setState(prev => ({
      ...prev,
      adjustedGoals: prev.adjustedGoals.map(g => {
        if (g.id === goalId) {
          const step = delta ?? (g.category === 'movement' ? 500 : g.category === 'hydration' ? 250 : 1);
          const rawNext = g.currentValue + step;
          // Clamp progress value between 0 and adjustedTarget limit
          const nextVal = Math.min(g.adjustedTarget, Math.max(0, rawNext));
          const isDecimal = g.category === 'sleep' || g.category === 'focus';
          const finalVal = isDecimal ? Math.round(nextVal * 10) / 10 : Math.round(nextVal);
          return {
            ...g,
            currentValue: finalVal
          };
        }
        return g;
      })
    }));
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

  return (
    <RecoveryContext.Provider value={{
      state,
      isAssessing,
      isCloudSynced,
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
      recordSessionCompleted,
      updateCoachConfig,
      restoreOriginalGoals,
      triggerPresetScenario
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
