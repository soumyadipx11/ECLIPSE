export type BiomarkerFlag = 'normal' | 'high' | 'low';

export interface LabBiomarker {
  id: string;
  testName: string;
  category: string; // e.g. "Lipid Profile", "Complete Blood Count", "Thyroid", "Kidney Function", "Liver Function", "Vitamins"
  value: number;
  unit: string;
  referenceRange: string;
  minRef?: number;
  maxRef?: number;
  flag: BiomarkerFlag;
  isAbnormal: boolean;
  notes?: string;
}

export interface ReportAiSummary {
  overview: string;
  normalValues: string[];
  abnormalValues: string[];
  observations: string[];
  educationalNote: string;
}

export interface LabReport {
  id: string;
  userId: string;
  title: string;
  testDate: string; // YYYY-MM-DD
  labName: string;
  fileType: 'pdf' | 'image' | 'manual';
  fileName?: string;
  fileDataUrl?: string;
  status: 'processed' | 'draft';
  extractedData: LabBiomarker[];
  aiSummary?: ReportAiSummary;
  anonymizedTextSentToAi?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: 'UPLOAD_REPORT' | 'UPDATE_REPORT' | 'DELETE_REPORT' | 'AI_ANALYSIS' | 'DELETE_ACCOUNT' | 'EXPORT_DATA' | 'CONSENT_GRANTED';
  details: string;
  timestamp: string;
}

export interface SmartAlert {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'abnormal' | 'trend_decline' | 'reminder' | 'system';
  read: boolean;
  createdAt: string;
  reportId?: string;
}

export interface StandardReferenceRange {
  minRef?: number;
  maxRef?: number;
  unit: string;
  referenceRange: string;
  category: string;
  clinicalNote: string;
  source: string;
}

export interface HealthTrendPoint {
  date: string;
  value: number;
  unit: string;
  reportTitle: string;
  flag: BiomarkerFlag;
  minRef?: number;
  maxRef?: number;
  referenceRange?: string;
  standardMinRef?: number;
  standardMaxRef?: number;
  standardReferenceRange?: string;
}

export interface BiomarkerTrendSummary {
  biomarkerName: string;
  category: string;
  currentVal: number;
  previousVal?: number;
  unit: string;
  changePercent?: number;
  status: 'improving' | 'stable' | 'declining' | 'neutral';
  historicalPoints: HealthTrendPoint[];
  referenceRange: string;
  minRef?: number;
  maxRef?: number;
  rangeSource: 'report' | 'gemini_ai';
  hasMultipleReportRanges?: boolean;
  chosenRangeExplanation?: string;
  rangeHistory?: { date: string; reportTitle: string; range: string }[];
  recommendation?: string;
  standardReference?: StandardReferenceRange;
}

export interface UserReminder {
  id: string;
  biomarkerName: string;
  intervalMonths: number;
  lastTestDate: string;
  nextDueDate: string;
  notes?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  age?: number | string;
  gender?: string;
  bloodGroup?: string;
  phone?: string;
  preExistingConditions?: string;
  healthGoals?: string;
  emergencyContact?: string;
  privacyConsent: boolean;
  consentDate?: string;
  customReminders?: UserReminder[];
}

export interface DoctorVisitSummaryData {
  patientAgeGroup?: string;
  latestAbnormalities: {
    testName: string;
    value: number;
    unit: string;
    referenceRange: string;
    flag: BiomarkerFlag;
    testDate: string;
  }[];
  keyTrends: {
    biomarkerName: string;
    description: string;
    direction: string;
  }[];
  suggestedQuestions: string[];
  reportComparisons: {
    biomarkerName: string;
    previous: string;
    current: string;
    unit: string;
  }[];
  generalNote: string;
  generatedReportIds?: string[];
  generatedReportCount?: number;
}

// -------------------------------------------------------------
// AI-Powered Recovery & Triage Mode Types
// -------------------------------------------------------------

export type StrainLevel = 'normal' | 'moderate' | 'high';

export interface RecoveryActivityStep {
  id: string;
  stepNumber: number;
  title: string;
  durationSeconds: number;
  instruction: string;
  guidanceAudioText?: string;
  actionType: 'breathing' | 'somatic' | 'hydration' | 'cognitive_pause' | 'rest';
  breathingPattern?: {
    inhale: number;
    hold1?: number;
    exhale: number;
    hold2?: number;
    cycles?: number;
  };
  tips?: string[];
}

export interface RecoveryPlan {
  id: string;
  title: string;
  tagline: string;
  totalDurationMinutes: number;
  rationale: string;
  comfortAffirmation: string;
  hydrationTip: string;
  steps: RecoveryActivityStep[];
  emergencyNote?: string;
}

export interface DailyGoal {
  id: string;
  name: string;
  category: 'movement' | 'exercise' | 'sleep' | 'hydration' | 'mindfulness' | 'focus';
  normalTarget: number;
  adjustedTarget: number;
  currentValue: number;
  unit: string;
  isPausedOrReduced: boolean;
  recoveryNote: string;
}

export interface EnergyCheckIn {
  id: string;
  userId: string;
  timestamp: string;
  inputMode: 'text' | 'voice' | 'preset';
  rawInput: string;
  strainLevel: StrainLevel;
  energyScore: number; // 0 (critically exhausted) to 100 (full energetic baseline)
  primaryFactors: string[];
  emotionalState: string;
  aiAssessment: string;
  aiEmpathyMessage: string;
  recoveryPlan?: RecoveryPlan;
  adjustedGoals?: DailyGoal[];
  postActivityFeedback?: {
    rating: 'much_better' | 'slightly_calmer' | 'still_drained';
    notes?: string;
    completedAt: string;
  };
}

export interface CoachTriggerConfig {
  highStrainSensitivity: 'low' | 'medium' | 'high';
  autoActivateRecovery: boolean;
  goalReductionPercentage: number; // e.g. 70 means 70% reduction in high-pressure goals
  enableStreakProtection: boolean;
  minRestAllocationHours: number;
  emergencyHelplineEnabled: boolean;
  customSupportMessage: string;
}

export interface RecoverySessionLog {
  id: string;
  timestamp: string;
  planTitle: string;
  durationSecondsCompleted: number;
  totalDurationSeconds: number;
  strainLevelBefore: StrainLevel;
  energyScoreBefore: number;
  ratingAfter?: 'much_better' | 'slightly_calmer' | 'still_drained';
  streakProtected: boolean;
}

export interface RecoveryState {
  isActive: boolean;
  activatedAt?: string;
  reason?: string;
  strainLevel: StrainLevel;
  energyScore: number;
  currentPlan?: RecoveryPlan;
  adjustedGoals: DailyGoal[];
  streakShieldActive: boolean;
  currentStreakDays: number;
  lastShieldUsedDate?: string;
  checkInHistory: EnergyCheckIn[];
  sessionLogs: RecoverySessionLog[];
  coachConfig: CoachTriggerConfig;
}
