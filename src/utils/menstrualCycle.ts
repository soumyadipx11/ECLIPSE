import { 
  DailyGoal, 
  MenstrualPeriodEntry, 
  MenstrualCycleAnalysis, 
  MenstrualCycleRegularityStatus,
  MenstrualFlowLevel
} from '../types';
import { getLocalDateString } from '../context/RecoveryContext';

export const MENSTRUAL_SYMPTOMS_LIST = [
  { id: 'cramps', label: 'Abdominal Cramping', category: 'physical' },
  { id: 'lower_back_pain', label: 'Lower Back Ache', category: 'physical' },
  { id: 'fatigue', label: 'Lethargy & Fatigue', category: 'physical' },
  { id: 'headache', label: 'Hormonal Headache', category: 'physical' },
  { id: 'bloating', label: 'Water Retention & Bloating', category: 'physical' },
  { id: 'breast_tenderness', label: 'Breast Tenderness', category: 'physical' },
  { id: 'mood_swings', label: 'Emotional Sensitivity / Mood Shift', category: 'emotional' },
  { id: 'anxiety', label: 'Restlessness / Mild Anxiety', category: 'emotional' },
  { id: 'cravings', label: 'Nutrient / Sweet Cravings', category: 'metabolic' },
  { id: 'insomnia', label: 'Restless Sleep', category: 'sleep' },
  { id: 'nausea', label: 'Mild Nausea', category: 'digestive' },
  { id: 'joint_pain', label: 'Pelvic / Joint Aches', category: 'physical' }
];

export const FLOW_LEVEL_CONFIG: Record<MenstrualFlowLevel, { label: string; description: string; color: string; badgeBg: string }> = {
  spotting: {
    label: 'Spotting',
    description: 'Very light droplets or brownish discharge',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-300'
  },
  light: {
    label: 'Light Flow',
    description: 'Minimal flow requiring light absorbency',
    color: 'text-rose-500',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
  },
  medium: {
    label: 'Medium Flow',
    description: 'Standard steady menstrual flow',
    color: 'text-rose-600',
    badgeBg: 'bg-rose-200/80 dark:bg-rose-900/70 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-200'
  },
  heavy: {
    label: 'Heavy Flow',
    description: 'High flow requiring frequent protection changes',
    color: 'text-rose-700 dark:text-rose-400',
    badgeBg: 'bg-rose-500 text-white border-rose-600 shadow-xs'
  }
};

/**
 * Calculate difference in whole calendar days between two YYYY-MM-DD strings
 */
export function diffDays(dateAStr: string, dateBStr: string): number {
  const [y1, m1, d1] = dateAStr.split('-').map(Number);
  const [y2, m2, d2] = dateBStr.split('-').map(Number);
  const dateA = new Date(y1, m1 - 1, d1);
  const dateB = new Date(y2, m2 - 1, d2);
  const diffTime = dateB.getTime() - dateA.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format a YYYY-MM-DD string to user friendly format (e.g. "Oct 14, 2026")
 */
export function formatCycleDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Generate menstrual-phase adapted daily goals
 */
export function getMenstrualAdjustedGoals(currentGoals: DailyGoal[]): DailyGoal[] {
  return currentGoals.map(g => {
    switch (g.category) {
      case 'movement':
        return {
          ...g,
          adjustedTarget: 4000,
          currentValue: Math.min(4000, g.currentValue),
          isPausedOrReduced: true,
          recoveryNote: '🌸 Menstrual Phase: Gentle walking, pelvic mobility & low-impact movement.',
          recoveryAdjustmentReason: 'Estrogen & progesterone baselines are low during early menstruation. Gentle pacing protects pelvic floor comfort.'
        };
      case 'exercise':
        return {
          ...g,
          adjustedTarget: 15,
          currentValue: Math.min(15, g.currentValue),
          isPausedOrReduced: true,
          recoveryNote: '🌸 Menstrual Phase: High-intensity workouts paused in favor of restorative yoga & stretching.',
          recoveryAdjustmentReason: 'Vigorous training during peak cramps increases cortisol. Restorative stretching eases uterine tension.'
        };
      case 'sleep':
        return {
          ...g,
          adjustedTarget: 8.5,
          currentValue: g.currentValue,
          isPausedOrReduced: true,
          recoveryNote: '🌸 Menstrual Phase: Baseline sleep increased to 8.5h for cellular repair and energy preservation.',
          recoveryAdjustmentReason: 'Body temperature shifts and cytokine cascades during menstruation increase metabolic recovery requirements.'
        };
      case 'hydration':
        return {
          ...g,
          adjustedTarget: 2400,
          currentValue: g.currentValue,
          isPausedOrReduced: true,
          recoveryNote: '🌸 Menstrual Phase: Optimal 2.4L hydration with warm herbal teas to reduce prostaglandin cramping.',
          recoveryAdjustmentReason: 'Adequate hydration prevents vascular constriction and reduces water retention / bloating.'
        };
      case 'focus':
        return {
          ...g,
          adjustedTarget: 4.0,
          currentValue: Math.min(4.0, g.currentValue),
          isPausedOrReduced: true,
          recoveryNote: '🌸 Menstrual Phase: 4h focus block with frequent micro-breaks to avoid cognitive fatigue.',
          recoveryAdjustmentReason: 'Pacing cognitive load prevents central nervous system fatigue when energy is biologically channeled to uterine repair.'
        };
      default:
        return g;
    }
  });
}

/**
 * Clinical analysis of menstrual cycle regularities and variations
 */
export function analyzeMenstrualCycle(
  history: MenstrualPeriodEntry[] = [],
  isCurrentlyActive: boolean = false,
  activeOnset?: string
): MenstrualCycleAnalysis {
  const todayStr = getLocalDateString();
  const sorted = [...history].sort((a, b) => a.onsetDate.localeCompare(b.onsetDate));

  // Determine effective ongoing period
  let latestOnset = activeOnset || (sorted.length > 0 ? sorted[sorted.length - 1].onsetDate : undefined);

  // Compute completed period durations
  const recordedDurations: number[] = [];
  sorted.forEach(entry => {
    if (entry.offsetDate) {
      const dur = Math.max(1, diffDays(entry.onsetDate, entry.offsetDate) + 1);
      recordedDurations.push(dur);
    }
  });

  // Calculate cycle lengths between successive onsets
  const recordedCycleLengths: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentOn = sorted[i].onsetDate;
    const nextOn = sorted[i + 1].onsetDate;
    const length = diffDays(currentOn, nextOn);
    if (length >= 10 && length <= 120) {
      recordedCycleLengths.push(length);
    }
  }

  // If currently active and last completed exists, check duration between last onset and active onset
  if (isCurrentlyActive && activeOnset && sorted.length > 0) {
    const lastSavedOnset = sorted[sorted.length - 1].onsetDate;
    if (lastSavedOnset !== activeOnset) {
      const length = diffDays(lastSavedOnset, activeOnset);
      if (length >= 10 && length <= 120) {
        recordedCycleLengths.push(length);
      }
    }
  }

  const avgPeriodDuration = recordedDurations.length > 0 
    ? Math.round(recordedDurations.reduce((a, b) => a + b, 0) / recordedDurations.length)
    : 5;

  const avgCycleLength = recordedCycleLengths.length > 0
    ? Math.round(recordedCycleLengths.reduce((a, b) => a + b, 0) / recordedCycleLengths.length)
    : 28;

  // Compute current cycle day
  let currentCycleDay = 1;
  if (latestOnset) {
    currentCycleDay = Math.max(1, diffDays(latestOnset, todayStr) + 1);
  }

  // Determine current cycle phase
  let currentCyclePhase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' = 'follicular';
  if (isCurrentlyActive) {
    currentCyclePhase = 'menstrual';
  } else if (currentCycleDay <= 5) {
    currentCyclePhase = 'menstrual';
  } else if (currentCycleDay <= 13) {
    currentCyclePhase = 'follicular';
  } else if (currentCycleDay <= 17) {
    currentCyclePhase = 'ovulatory';
  } else {
    currentCyclePhase = 'luteal';
  }

  // Predict next onset
  let nextPredictedOnset: string | undefined = undefined;
  if (latestOnset) {
    const [y, m, d] = latestOnset.split('-').map(Number);
    const nextDate = new Date(y, m - 1, d);
    nextDate.setDate(nextDate.getDate() + avgCycleLength);
    nextPredictedOnset = getLocalDateString(nextDate);
  }

  // Evaluate regularity & irregularity detection
  let regularityStatus: MenstrualCycleRegularityStatus = 'regular';
  let regularityScore = 95;
  let isRegular = true;
  let irregularityReason: string | undefined = undefined;
  const clinicalInsights: string[] = [];
  const suggestedCarePlan: string[] = [];

  if (recordedCycleLengths.length === 0) {
    regularityStatus = 'insufficient_data';
    regularityScore = 100;
    isRegular = true;
    irregularityReason = 'Tracking your first menstrual cycles. Log at least 2 consecutive cycles to generate clinical variance analytics.';
    clinicalInsights.push('Clinical baseline: A healthy menstrual cycle ranges between 21 and 35 days with 2 to 7 days of bleeding.');
    suggestedCarePlan.push('Continue logging your cycle onsets and symptoms to build your personalized endocrine profile.');
  } else {
    const minCycle = Math.min(...recordedCycleLengths);
    const maxCycle = Math.max(...recordedCycleLengths);
    const cycleVariance = maxCycle - minCycle;
    const lastCycle = recordedCycleLengths[recordedCycleLengths.length - 1];

    const hasShortCycle = recordedCycleLengths.some(len => len < 21);
    const hasLongCycle = recordedCycleLengths.some(len => len > 35);
    const hasProlongedBleeding = recordedDurations.some(dur => dur > 8) || (isCurrentlyActive && currentCycleDay > 8);

    if (hasShortCycle) {
      regularityStatus = 'irregular_short';
      regularityScore = 65;
      isRegular = false;
      irregularityReason = `Short cycle identified (${minCycle} days). Standard healthy menstrual intervals are between 21 and 35 days. Frequent cycles may indicate luteal phase shortening or anovulatory patterns.`;
      clinicalInsights.push('Frequent periods (under 21 days) can lead to gradual iron depletion (ferritin decline).');
      suggestedCarePlan.push('Prioritize dietary iron (spinach, lentils, seeds) and consider requesting a serum ferritin & progesterone panel if this pattern repeats.');
    } else if (hasLongCycle || currentCycleDay > 38) {
      regularityStatus = 'irregular_delayed';
      regularityScore = 60;
      isRegular = false;
      const delayedDays = Math.max(maxCycle, currentCycleDay);
      irregularityReason = `Delayed cycle identified (${delayedDays} days). Cycles exceeding 35 days (oligomenorrhea) often relate to elevated stress cortisol, sleep disruptions, sudden metabolic shifts, or thyroid/PCOS fluctuations.`;
      clinicalInsights.push('Prolonged follicular phases frequently occur when acute psychological or physical stress temporarily pauses the LH surge.');
      suggestedCarePlan.push('Focus on steady blood sugar balance, restorative sleep, and calming vagal toning practices.');
    } else if (cycleVariance > 8) {
      regularityStatus = 'variable';
      regularityScore = 70;
      isRegular = false;
      irregularityReason = `Cycle length variability of ${cycleVariance} days detected across tracked cycles (from ${minCycle} to ${maxCycle} days). Standard physiological variation is under 7 days.`;
      clinicalInsights.push('Cycle length fluctuation can reflect fluctuating ovulation timing influenced by circadian disruption or travel.');
      suggestedCarePlan.push('Maintain consistent sleep-wake cycles and keep monitoring over the next 2 cycles.');
    } else if (hasProlongedBleeding) {
      regularityStatus = 'prolonged_bleeding';
      regularityScore = 68;
      isRegular = false;
      irregularityReason = `Prolonged bleeding duration observed (> 7-8 days). Standard menstrual bleeding typically resolves within 2 to 7 days.`;
      clinicalInsights.push('Extended bleeding increases iron demands and warrants gynecological review if persistent.');
      suggestedCarePlan.push('Replenish with iron-rich nutrition and stay well-hydrated with electrolyte support.');
    } else {
      regularityStatus = 'regular';
      regularityScore = 96;
      isRegular = true;
      irregularityReason = `Cycles are regular and predictable (averaging ${avgCycleLength} days with low variability of ±${Math.round(cycleVariance / 2)} days).`;
      clinicalInsights.push(`Your cycle patterns align with the optimal clinical 21–35 day reference window.`);
      suggestedCarePlan.push('Maintain balanced nutrition, regular circadian rhythms, and cyclical training adjustments.');
    }
  }

  // Phase-specific clinical guidance
  if (currentCyclePhase === 'menstrual') {
    clinicalInsights.push('Menstrual Phase (Days 1–5): Estrogen and progesterone are at their lowest baseline. Uterine contractions are mediated by prostaglandins.');
    suggestedCarePlan.push('Incorporate warm ginger or chamomile tea to soothe prostaglandins, take warm baths, and choose gentle walking or pelvic stretches over heavy resistance training.');
  } else if (currentCyclePhase === 'follicular') {
    clinicalInsights.push('Follicular Phase (Days 6–13): Estrogen levels rise progressively, boosting natural metabolic energy, cognitive sharpness, and tissue recovery.');
    suggestedCarePlan.push('Great window for progressive strength training, creative deep work, and balanced high-protein nutrition.');
  } else if (currentCyclePhase === 'ovulatory') {
    clinicalInsights.push('Ovulatory Phase (Days 14–17): Peak estrogen and luteinizing hormone (LH). Basal body temperature shows a slight rise.');
    suggestedCarePlan.push('Peak endurance and stamina window. Ensure adequate hydration and antioxidant-rich foods.');
  } else {
    clinicalInsights.push('Luteal Phase (Days 18–28+): Progesterone dominates, elevating metabolic rate while calming the central nervous system.');
    suggestedCarePlan.push('Incorporate complex carbohydrates, magnesium glycinate for evening calm, and moderate-intensity workouts with adequate recovery.');
  }

  return {
    averageCycleLength: avgCycleLength,
    averagePeriodDuration: avgPeriodDuration,
    regularityStatus,
    regularityScore,
    isRegular,
    nextPredictedOnset,
    currentCycleDay,
    currentCyclePhase,
    irregularityReason,
    clinicalInsights,
    suggestedCarePlan
  };
}
