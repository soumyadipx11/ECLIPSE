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

export interface HealthTrendPoint {
  date: string;
  value: number;
  unit: string;
  reportTitle: string;
  flag: BiomarkerFlag;
  minRef?: number;
  maxRef?: number;
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
  recommendation?: string;
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
}
