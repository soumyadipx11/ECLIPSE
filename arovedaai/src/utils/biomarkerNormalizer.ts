/**
 * Biomarker Name Normalization & Equivalence Utility
 * Standardizes medical test names across different lab report formats
 * (e.g., "LDL Cholesterol" vs "Cholesterol (LDL)" vs "LDL-C")
 */

// Dictionary mapping common variations to canonical clinical names
const BIOMARKER_ALIASES: Record<string, string> = {
  // Lipid Profile
  'ldl': 'LDL Cholesterol',
  'ldl c': 'LDL Cholesterol',
  'ldl-c': 'LDL Cholesterol',
  'ldl cholesterol': 'LDL Cholesterol',
  'cholesterol ldl': 'LDL Cholesterol',
  'cholesterol (ldl)': 'LDL Cholesterol',
  'low density lipoprotein': 'LDL Cholesterol',
  'low density lipoprotein cholesterol': 'LDL Cholesterol',
  'low-density lipoprotein': 'LDL Cholesterol',
  'calculated ldl': 'LDL Cholesterol',
  
  'hdl': 'HDL Cholesterol',
  'hdl c': 'HDL Cholesterol',
  'hdl-c': 'HDL Cholesterol',
  'hdl cholesterol': 'HDL Cholesterol',
  'cholesterol hdl': 'HDL Cholesterol',
  'cholesterol (hdl)': 'HDL Cholesterol',
  'high density lipoprotein': 'HDL Cholesterol',
  'high-density lipoprotein': 'HDL Cholesterol',

  'total cholesterol': 'Total Cholesterol',
  'cholesterol total': 'Total Cholesterol',
  'cholesterol (total)': 'Total Cholesterol',
  'serum cholesterol': 'Total Cholesterol',
  'cholesterol': 'Total Cholesterol',

  'triglycerides': 'Triglycerides',
  'triglyceride': 'Triglycerides',
  'serum triglycerides': 'Triglycerides',
  'tg': 'Triglycerides',

  'vldl': 'VLDL Cholesterol',
  'vldl cholesterol': 'VLDL Cholesterol',
  'very low density lipoprotein': 'VLDL Cholesterol',

  // Blood Glucose & Diabetes
  'fasting blood sugar': 'Fasting Blood Sugar',
  'fasting blood glucose': 'Fasting Blood Sugar',
  'fasting glucose': 'Fasting Blood Sugar',
  'fasting plasma glucose': 'Fasting Blood Sugar',
  'glucose fasting': 'Fasting Blood Sugar',
  'glucose (fasting)': 'Fasting Blood Sugar',
  'fbs': 'Fasting Blood Sugar',
  'fpg': 'Fasting Blood Sugar',

  'postprandial blood sugar': 'Postprandial Blood Sugar',
  'ppbs': 'Postprandial Blood Sugar',
  'post prandial glucose': 'Postprandial Blood Sugar',
  'pp glucose': 'Postprandial Blood Sugar',

  'random blood sugar': 'Random Blood Sugar',
  'random blood glucose': 'Random Blood Sugar',
  'rbs': 'Random Blood Sugar',
  'glucose random': 'Random Blood Sugar',

  'hba1c': 'HbA1c',
  'hemoglobin a1c': 'HbA1c',
  'haemoglobin a1c': 'HbA1c',
  'hb a1c': 'HbA1c',
  'a1c': 'HbA1c',
  'glycated hemoglobin': 'HbA1c',
  'glycosylated hemoglobin': 'HbA1c',

  // Vitamins & Minerals
  'vitamin d': 'Vitamin D (25-OH)',
  'vitamin d (25-oh)': 'Vitamin D (25-OH)',
  '25-oh vitamin d': 'Vitamin D (25-OH)',
  '25 hydroxy vitamin d': 'Vitamin D (25-OH)',
  '25-hydroxyvitamin d': 'Vitamin D (25-OH)',
  'vit d': 'Vitamin D (25-OH)',
  'vit d3': 'Vitamin D (25-OH)',
  'vitamin d3': 'Vitamin D (25-OH)',

  'vitamin b12': 'Vitamin B12',
  'vit b12': 'Vitamin B12',
  'vitamin b-12': 'Vitamin B12',
  'b12': 'Vitamin B12',
  'cobalamin': 'Vitamin B12',
  'cyanocobalamin': 'Vitamin B12',

  // Thyroid
  'tsh': 'TSH',
  'thyroid stimulating hormone': 'TSH',
  'thyroid-stimulating hormone': 'TSH',
  'tsh (thyroid stimulating hormone)': 'TSH',
  'serum tsh': 'TSH',

  'free t3': 'Free T3',
  'ft3': 'Free T3',
  'triiodothyronine free': 'Free T3',

  'free t4': 'Free T4',
  'ft4': 'Free T4',
  'thyroxine free': 'Free T4',

  // Kidney Function
  'creatinine': 'Serum Creatinine',
  'serum creatinine': 'Serum Creatinine',
  'creatinine serum': 'Serum Creatinine',
  'creatinine (serum)': 'Serum Creatinine',
  'blood creatinine': 'Serum Creatinine',

  'blood urea nitrogen': 'BUN (Blood Urea Nitrogen)',
  'bun': 'BUN (Blood Urea Nitrogen)',
  'urea': 'Blood Urea',
  'blood urea': 'Blood Urea',

  'uric acid': 'Uric Acid',
  'serum uric acid': 'Uric Acid',
  'uric acid serum': 'Uric Acid',

  // Liver Function
  'alt': 'ALT (SGPT)',
  'sgpt': 'ALT (SGPT)',
  'alt (sgpt)': 'ALT (SGPT)',
  'sgpt (alt)': 'ALT (SGPT)',
  'alanine aminotransferase': 'ALT (SGPT)',
  'alanine transaminase': 'ALT (SGPT)',

  'ast': 'AST (SGOT)',
  'sgot': 'AST (SGOT)',
  'ast (sgot)': 'AST (SGOT)',
  'sgot (ast)': 'AST (SGOT)',
  'aspartate aminotransferase': 'AST (SGOT)',
  'aspartate transaminase': 'AST (SGOT)',

  'total bilirubin': 'Total Bilirubin',
  'bilirubin total': 'Total Bilirubin',
  'bilirubin (total)': 'Total Bilirubin',

  // Complete Blood Count (CBC)
  'hemoglobin': 'Hemoglobin',
  'haemoglobin': 'Hemoglobin',
  'hb': 'Hemoglobin',
  'hgb': 'Hemoglobin',

  'platelet count': 'Platelet Count',
  'platelets': 'Platelet Count',
  'plt': 'Platelet Count',

  'wbc': 'WBC Count',
  'wbc count': 'WBC Count',
  'white blood cell count': 'WBC Count',
  'total wbc': 'WBC Count',

  'rbc': 'RBC Count',
  'rbc count': 'RBC Count',
  'red blood cell count': 'RBC Count',

  // Electrolytes
  'calcium': 'Calcium',
  'serum calcium': 'Calcium',
  'potassium': 'Potassium',
  'serum potassium': 'Potassium',
  'sodium': 'Sodium',
  'serum sodium': 'Sodium'
};

/**
 * Clean and simplify a raw biomarker name string.
 */
function cleanString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns a standardized, canonical clinical name for any biomarker.
 */
export function normalizeBiomarkerName(rawName: string): string {
  if (!rawName) return 'Biomarker';

  const cleaned = cleanString(rawName);

  // 1. Direct Alias Match
  if (BIOMARKER_ALIASES[cleaned]) {
    return BIOMARKER_ALIASES[cleaned];
  }

  // 2. Check if raw string contains parenthetical details like "Cholesterol (LDL)" or "Creatinine, Serum"
  // Try reversing inverted names like "Cholesterol, Total" or "Glucose, Fasting"
  if (rawName.includes(',')) {
    const parts = rawName.split(',').map(p => p.trim());
    if (parts.length === 2) {
      const reversed = cleanString(`${parts[1]} ${parts[0]}`);
      if (BIOMARKER_ALIASES[reversed]) {
        return BIOMARKER_ALIASES[reversed];
      }
    }
  }

  if (rawName.includes('(') && rawName.includes(')')) {
    const inner = rawName.substring(rawName.indexOf('(') + 1, rawName.indexOf(')')).trim();
    const outer = rawName.replace(/\(.*?\)/, '').trim();
    
    const combined1 = cleanString(`${inner} ${outer}`);
    if (BIOMARKER_ALIASES[combined1]) return BIOMARKER_ALIASES[combined1];

    const combined2 = cleanString(`${outer} ${inner}`);
    if (BIOMARKER_ALIASES[combined2]) return BIOMARKER_ALIASES[combined2];
  }

  // 3. Fallback partial token matching for common medical keywords
  if (cleaned.includes('ldl') && cleaned.includes('cholesterol')) return 'LDL Cholesterol';
  if (cleaned.includes('hdl') && cleaned.includes('cholesterol')) return 'HDL Cholesterol';
  if (cleaned.includes('fasting') && (cleaned.includes('glucose') || cleaned.includes('sugar'))) return 'Fasting Blood Sugar';
  if (cleaned.includes('hba1c') || cleaned.includes('a1c')) return 'HbA1c';
  if (cleaned.includes('vitamin d') || cleaned.includes('25 oh') || cleaned.includes('vit d')) return 'Vitamin D (25-OH)';
  if (cleaned.includes('vitamin b12') || cleaned.includes('vit b12') || cleaned.includes('b12')) return 'Vitamin B12';
  if (cleaned.includes('tsh')) return 'TSH';
  if (cleaned.includes('creatinine')) return 'Serum Creatinine';
  if (cleaned.includes('triglycerides') || cleaned.includes('triglyceride')) return 'Triglycerides';
  if (cleaned.includes('sgpt') || (cleaned.includes('alt') && !cleaned.includes('salt'))) return 'ALT (SGPT)';
  if (cleaned.includes('sgot') || cleaned.includes('ast')) return 'AST (SGOT)';
  if (cleaned.includes('uric acid')) return 'Uric Acid';
  if (cleaned.includes('hemoglobin') || cleaned.includes('haemoglobin')) return 'Hemoglobin';

  // Return formatted original name if no alias matched
  // Title-case words nicely
  return rawName
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/**
 * Checks whether two biomarker name strings refer to the exact same test.
 */
export function areBiomarkersEqual(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  if (name1.toLowerCase().trim() === name2.toLowerCase().trim()) return true;

  const norm1 = normalizeBiomarkerName(name1);
  const norm2 = normalizeBiomarkerName(name2);

  return norm1.toLowerCase() === norm2.toLowerCase();
}
