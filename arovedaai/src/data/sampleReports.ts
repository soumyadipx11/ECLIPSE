import { LabReport } from '../types';

export const SAMPLE_LAB_REPORTS: Omit<LabReport, 'userId'>[] = [
  {
    id: 'demo-report-1',
    title: 'Comprehensive Metabolic & Lipid Panel',
    testDate: '2026-06-15',
    labName: 'Dr Lal PathLabs (NABL Accredited)',
    fileType: 'pdf',
    fileName: 'LalPathLabs_Lipid_Metabolic_June2026.pdf',
    status: 'processed',
    anonymizedTextSentToAi: '[PII REMOVED] Lab Report Date: 2026-06-15. Lab: Dr Lal PathLabs (NABL Accredited). Test Results: Fasting Blood Sugar: 98 mg/dL (70-99), HbA1c: 5.6 % (4.0-5.6), Total Cholesterol: 215 mg/dL (<200 HIGH), HDL: 48 mg/dL (>40), LDL: 138 mg/dL (<100 HIGH), Triglycerides: 165 mg/dL (<150 HIGH), Vitamin D: 22 ng/mL (30-100 LOW), Vitamin B12: 450 pg/mL (200-900), Creatinine: 0.9 mg/dL (0.6-1.2), TSH: 2.1 mIU/L (0.4-4.0).',
    extractedData: [
      {
        id: 'bm-1-1',
        testName: 'Fasting Blood Sugar',
        category: 'Metabolic & Sugar',
        value: 98,
        unit: 'mg/dL',
        referenceRange: '70 - 99',
        minRef: 70,
        maxRef: 99,
        flag: 'normal',
        isAbnormal: false,
        notes: 'Optimal fasting blood glucose.'
      },
      {
        id: 'bm-1-2',
        testName: 'HbA1c',
        category: 'Metabolic & Sugar',
        value: 5.6,
        unit: '%',
        referenceRange: '4.0 - 5.6',
        minRef: 4.0,
        maxRef: 5.6,
        flag: 'normal',
        isAbnormal: false,
        notes: 'Upper limit of normal range.'
      },
      {
        id: 'bm-1-3',
        testName: 'Total Cholesterol',
        category: 'Lipid Profile',
        value: 215,
        unit: 'mg/dL',
        referenceRange: '< 200',
        minRef: 0,
        maxRef: 200,
        flag: 'high',
        isAbnormal: true,
        notes: 'Mildly elevated total cholesterol.'
      },
      {
        id: 'bm-1-4',
        testName: 'HDL Cholesterol',
        category: 'Lipid Profile',
        value: 48,
        unit: 'mg/dL',
        referenceRange: '> 40',
        minRef: 40,
        maxRef: 100,
        flag: 'normal',
        isAbnormal: false,
        notes: 'Desirable level of good cholesterol.'
      },
      {
        id: 'bm-1-5',
        testName: 'LDL Cholesterol',
        category: 'Lipid Profile',
        value: 138,
        unit: 'mg/dL',
        referenceRange: '< 100',
        minRef: 0,
        maxRef: 100,
        flag: 'high',
        isAbnormal: true,
        notes: 'Elevated low-density lipoprotein.'
      },
      {
        id: 'bm-1-6',
        testName: 'Triglycerides',
        category: 'Lipid Profile',
        value: 165,
        unit: 'mg/dL',
        referenceRange: '< 150',
        minRef: 0,
        maxRef: 150,
        flag: 'high',
        isAbnormal: true,
        notes: 'Slightly elevated triglycerides.'
      },
      {
        id: 'bm-1-7',
        testName: 'Vitamin D (25-OH)',
        category: 'Vitamins',
        value: 22,
        unit: 'ng/mL',
        referenceRange: '30 - 100',
        minRef: 30,
        maxRef: 100,
        flag: 'low',
        isAbnormal: true,
        notes: 'Below sufficiency threshold.'
      },
      {
        id: 'bm-1-8',
        testName: 'Vitamin B12',
        category: 'Vitamins',
        value: 450,
        unit: 'pg/mL',
        referenceRange: '200 - 900',
        minRef: 200,
        maxRef: 900,
        flag: 'normal',
        isAbnormal: false
      },
      {
        id: 'bm-1-9',
        testName: 'Creatinine',
        category: 'Kidney Function',
        value: 0.9,
        unit: 'mg/dL',
        referenceRange: '0.6 - 1.2',
        minRef: 0.6,
        maxRef: 1.2,
        flag: 'normal',
        isAbnormal: false
      },
      {
        id: 'bm-1-10',
        testName: 'TSH',
        category: 'Thyroid',
        value: 2.1,
        unit: 'mIU/L',
        referenceRange: '0.4 - 4.0',
        minRef: 0.4,
        maxRef: 4.0,
        flag: 'normal',
        isAbnormal: false
      }
    ],
    aiSummary: {
      overview: 'This comprehensive metabolic and lipid panel shows healthy glucose, kidney, and thyroid function. Elevated Total Cholesterol, LDL, and Triglycerides are noted along with Vitamin D insufficiency.',
      normalValues: ['Fasting Blood Sugar (98 mg/dL)', 'HbA1c (5.6%)', 'HDL Cholesterol (48 mg/dL)', 'Vitamin B12 (450 pg/mL)', 'Creatinine (0.9 mg/dL)', 'TSH (2.1 mIU/L)'],
      abnormalValues: ['Total Cholesterol (215 mg/dL - High)', 'LDL Cholesterol (138 mg/dL - High)', 'Triglycerides (165 mg/dL - High)', 'Vitamin D (22 ng/mL - Low)'],
      observations: [
        'Lipid markers (LDL and Total Cholesterol) are above optimal thresholds.',
        'Vitamin D level is 22 ng/mL, indicating mild vitamin D deficiency/insufficiency.',
        'Blood sugar markers remain in the non-diabetic reference range.'
      ],
      educationalNote: 'Lipid levels are influenced by dietary intake, physical activity, and genetics. Vitamin D levels often vary with sun exposure and dietary intake. Discuss lifestyle adjustments or dietary options with your healthcare provider.'
    },
    createdAt: '2026-06-15T10:00:00Z',
    updatedAt: '2026-06-15T10:00:00Z'
  },
  {
    id: 'demo-report-2',
    title: 'Routine Blood Check & Thyroid Profile',
    testDate: '2026-01-10',
    labName: 'Metropolis Healthcare (NABL Accredited)',
    fileType: 'pdf',
    fileName: 'Metropolis_CBC_Thyroid_Jan2026.pdf',
    status: 'processed',
    anonymizedTextSentToAi: '[PII REMOVED] Lab Report Date: 2026-01-10. Lab: Metropolis Healthcare (NABL Accredited). Test Results: Fasting Blood Sugar: 105 mg/dL (70-99 HIGH), HbA1c: 5.8 % (4.0-5.6 HIGH), Total Cholesterol: 228 mg/dL (<200 HIGH), LDL: 146 mg/dL (<100 HIGH), Triglycerides: 180 mg/dL (<150 HIGH), Vitamin D: 18 ng/mL (30-100 LOW), Hemoglobin: 14.2 g/dL (13.5-17.5), TSH: 2.3 mIU/L (0.4-4.0).',
    extractedData: [
      {
        id: 'bm-2-1',
        testName: 'Fasting Blood Sugar',
        category: 'Metabolic & Sugar',
        value: 105,
        unit: 'mg/dL',
        referenceRange: '70 - 99',
        minRef: 70,
        maxRef: 99,
        flag: 'high',
        isAbnormal: true,
        notes: 'Slightly elevated fasting blood sugar.'
      },
      {
        id: 'bm-2-2',
        testName: 'HbA1c',
        category: 'Metabolic & Sugar',
        value: 5.8,
        unit: '%',
        referenceRange: '4.0 - 5.6',
        minRef: 4.0,
        maxRef: 5.6,
        flag: 'high',
        isAbnormal: true,
        notes: 'Slightly above reference range.'
      },
      {
        id: 'bm-2-3',
        testName: 'Total Cholesterol',
        category: 'Lipid Profile',
        value: 228,
        unit: 'mg/dL',
        referenceRange: '< 200',
        minRef: 0,
        maxRef: 200,
        flag: 'high',
        isAbnormal: true
      },
      {
        id: 'bm-2-4',
        testName: 'LDL Cholesterol',
        category: 'Lipid Profile',
        value: 146,
        unit: 'mg/dL',
        referenceRange: '< 100',
        minRef: 0,
        maxRef: 100,
        flag: 'high',
        isAbnormal: true
      },
      {
        id: 'bm-2-5',
        testName: 'Triglycerides',
        category: 'Lipid Profile',
        value: 180,
        unit: 'mg/dL',
        referenceRange: '< 150',
        minRef: 0,
        maxRef: 150,
        flag: 'high',
        isAbnormal: true
      },
      {
        id: 'bm-2-6',
        testName: 'Vitamin D (25-OH)',
        category: 'Vitamins',
        value: 18,
        unit: 'ng/mL',
        referenceRange: '30 - 100',
        minRef: 30,
        maxRef: 100,
        flag: 'low',
        isAbnormal: true
      },
      {
        id: 'bm-2-7',
        testName: 'Hemoglobin',
        category: 'Complete Blood Count',
        value: 14.2,
        unit: 'g/dL',
        referenceRange: '13.5 - 17.5',
        minRef: 13.5,
        maxRef: 17.5,
        flag: 'normal',
        isAbnormal: false
      },
      {
        id: 'bm-2-8',
        testName: 'TSH',
        category: 'Thyroid',
        value: 2.3,
        unit: 'mIU/L',
        referenceRange: '0.4 - 4.0',
        minRef: 0.4,
        maxRef: 4.0,
        flag: 'normal',
        isAbnormal: false
      }
    ],
    aiSummary: {
      overview: 'Report shows mild elevations in fasting blood glucose (105 mg/dL), HbA1c (5.8%), Total Cholesterol, and LDL. Vitamin D was low (18 ng/mL). Thyroid and Hemoglobin were within normal bounds.',
      normalValues: ['Hemoglobin (14.2 g/dL)', 'TSH (2.3 mIU/L)'],
      abnormalValues: ['Fasting Blood Sugar (105 mg/dL)', 'HbA1c (5.8%)', 'Total Cholesterol (228 mg/dL)', 'LDL Cholesterol (146 mg/dL)', 'Vitamin D (18 ng/mL)'],
      observations: [
        'Fasting glucose and HbA1c showed mild elevation.',
        'Vitamin D level was 18 ng/mL, requiring attention.'
      ],
      educationalNote: 'Tracking glucose and lipid trends over time assists in evaluating dietary changes and exercise routines.'
    },
    createdAt: '2026-01-10T11:00:00Z',
    updatedAt: '2026-01-10T11:00:00Z'
  },
  {
    id: 'demo-report-3',
    title: 'Annual Executive Health Checkup',
    testDate: '2025-07-20',
    labName: 'Apollo Diagnostics (NABL Accredited)',
    fileType: 'pdf',
    fileName: 'Apollo_Executive_Health_2025.pdf',
    status: 'processed',
    anonymizedTextSentToAi: '[PII REMOVED] Lab Report Date: 2025-07-20. Lab: Apollo Diagnostics (NABL Accredited). Test Results: Fasting Blood Sugar: 112 mg/dL (70-99 HIGH), HbA1c: 6.0 % (4.0-5.6 HIGH), Total Cholesterol: 240 mg/dL (<200 HIGH), LDL: 155 mg/dL (<100 HIGH), Triglycerides: 195 mg/dL (<150 HIGH), Vitamin D: 15 ng/mL (30-100 LOW), Hemoglobin: 14.0 g/dL (13.5-17.5), Creatinine: 0.95 mg/dL (0.6-1.2), TSH: 2.5 mIU/L (0.4-4.0).',
    extractedData: [
      {
        id: 'bm-3-1',
        testName: 'Fasting Blood Sugar',
        category: 'Metabolic & Sugar',
        value: 112,
        unit: 'mg/dL',
        referenceRange: '70 - 99',
        minRef: 70,
        maxRef: 99,
        flag: 'high',
        isAbnormal: true
      },
      {
        id: 'bm-3-2',
        testName: 'HbA1c',
        category: 'Metabolic & Sugar',
        value: 6.0,
        unit: '%',
        referenceRange: '4.0 - 5.6',
        minRef: 4.0,
        maxRef: 5.6,
        flag: 'high',
        isAbnormal: true
      },
      {
        id: 'bm-3-3',
        testName: 'Total Cholesterol',
        category: 'Lipid Profile',
        value: 240,
        unit: 'mg/dL',
        referenceRange: '< 200',
        minRef: 0,
        maxRef: 200,
        flag: 'high',
        isAbnormal: true
      },
      {
        id: 'bm-3-4',
        testName: 'LDL Cholesterol',
        category: 'Lipid Profile',
        value: 155,
        unit: 'mg/dL',
        referenceRange: '< 100',
        minRef: 0,
        maxRef: 100,
        flag: 'high',
        isAbnormal: true
      },
      {
        id: 'bm-3-5',
        testName: 'Triglycerides',
        category: 'Lipid Profile',
        value: 195,
        unit: 'mg/dL',
        referenceRange: '< 150',
        minRef: 0,
        maxRef: 150,
        flag: 'high',
        isAbnormal: true
      },
      {
        id: 'bm-3-6',
        testName: 'Vitamin D (25-OH)',
        category: 'Vitamins',
        value: 15,
        unit: 'ng/mL',
        referenceRange: '30 - 100',
        minRef: 30,
        maxRef: 100,
        flag: 'low',
        isAbnormal: true
      },
      {
        id: 'bm-3-7',
        testName: 'Hemoglobin',
        category: 'Complete Blood Count',
        value: 14.0,
        unit: 'g/dL',
        referenceRange: '13.5 - 17.5',
        minRef: 13.5,
        maxRef: 17.5,
        flag: 'normal',
        isAbnormal: false
      },
      {
        id: 'bm-3-8',
        testName: 'Creatinine',
        category: 'Kidney Function',
        value: 0.95,
        unit: 'mg/dL',
        referenceRange: '0.6 - 1.2',
        minRef: 0.6,
        maxRef: 1.2,
        flag: 'normal',
        isAbnormal: false
      },
      {
        id: 'bm-3-9',
        testName: 'TSH',
        category: 'Thyroid',
        value: 2.5,
        unit: 'mIU/L',
        referenceRange: '0.4 - 4.0',
        minRef: 0.4,
        maxRef: 4.0,
        flag: 'normal',
        isAbnormal: false
      }
    ],
    aiSummary: {
      overview: 'Historical baseline from July 2025. Showed highest elevated glucose, HbA1c, and lipid levels, along with low Vitamin D.',
      normalValues: ['Hemoglobin (14.0 g/dL)', 'Creatinine (0.95 mg/dL)', 'TSH (2.5 mIU/L)'],
      abnormalValues: ['Fasting Sugar (112 mg/dL)', 'HbA1c (6.0%)', 'Total Cholesterol (240 mg/dL)', 'LDL (155 mg/dL)', 'Triglycerides (195 mg/dL)', 'Vitamin D (15 ng/mL)'],
      observations: ['Shows progressive improvement when compared to subsequent reports in Jan and June 2026.'],
      educationalNote: 'Baseline values are useful for tracking long-term health trajectory and lifestyle interventions.'
    },
    createdAt: '2025-07-20T09:30:00Z',
    updatedAt: '2025-07-20T09:30:00Z'
  }
];
