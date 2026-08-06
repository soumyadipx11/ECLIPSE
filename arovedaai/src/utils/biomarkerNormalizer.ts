/**
 * Biomarker Name Normalization & Equivalence Utility
 * Standardizes medical test names across different lab report formats
 * (e.g., "LDL Cholesterol" vs "Cholesterol (LDL)" vs "LDL-C", "SGPT" vs "ALT")
 */

// Comprehensive Dictionary mapping common variations & inverted names to canonical clinical names
const BIOMARKER_ALIASES: Record<string, string> = {
  // --- RATIOS & CALCULATED INDICES ---
  'ldl hdl ratio': 'LDL / HDL Ratio',
  'ldl/hdl ratio': 'LDL / HDL Ratio',
  'ldl hdl': 'LDL / HDL Ratio',
  'ldl/hdl': 'LDL / HDL Ratio',
  'total cholesterol hdl ratio': 'Total Cholesterol / HDL Ratio',
  'total cholesterol/hdl ratio': 'Total Cholesterol / HDL Ratio',
  'cholesterol hdl ratio': 'Total Cholesterol / HDL Ratio',
  'cholesterol/hdl ratio': 'Total Cholesterol / HDL Ratio',
  'bun creatinine ratio': 'BUN / Creatinine Ratio',
  'bun/creatinine ratio': 'BUN / Creatinine Ratio',
  'bun creatinine': 'BUN / Creatinine Ratio',
  'ast alt ratio': 'AST / ALT Ratio',
  'ast/alt ratio': 'AST / ALT Ratio',
  'sgot sgpt ratio': 'AST / ALT Ratio',
  'sgot/sgpt ratio': 'AST / ALT Ratio',
  'albumin globulin ratio': 'Albumin / Globulin Ratio',
  'albumin/globulin ratio': 'Albumin / Globulin Ratio',
  'a g ratio': 'Albumin / Globulin Ratio',
  'a/g ratio': 'Albumin / Globulin Ratio',
  'neutrophil lymphocyte ratio': 'Neutrophil / Lymphocyte Ratio',
  'neutrophil/lymphocyte ratio': 'Neutrophil / Lymphocyte Ratio',
  'nlr': 'Neutrophil / Lymphocyte Ratio',
  'sodium potassium ratio': 'Sodium / Potassium Ratio',
  'sodium/potassium ratio': 'Sodium / Potassium Ratio',

  // --- LIPID PROFILE ---
  'ldl': 'LDL Cholesterol',
  'ldl c': 'LDL Cholesterol',
  'ldl-c': 'LDL Cholesterol',
  'ldl cholesterol': 'LDL Cholesterol',
  'cholesterol ldl': 'LDL Cholesterol',
  'cholesterol (ldl)': 'LDL Cholesterol',
  'ldl cholesterol calculated': 'LDL Cholesterol',
  'ldl cholesterol, calculated': 'LDL Cholesterol',
  'low density lipoprotein': 'LDL Cholesterol',
  'low density lipoprotein cholesterol': 'LDL Cholesterol',
  'low-density lipoprotein': 'LDL Cholesterol',
  'calculated ldl': 'LDL Cholesterol',
  'direct ldl': 'LDL Cholesterol',
  'direct ldl cholesterol': 'LDL Cholesterol',

  'hdl': 'HDL Cholesterol',
  'hdl c': 'HDL Cholesterol',
  'hdl-c': 'HDL Cholesterol',
  'hdl cholesterol': 'HDL Cholesterol',
  'cholesterol hdl': 'HDL Cholesterol',
  'cholesterol (hdl)': 'HDL Cholesterol',
  'high density lipoprotein': 'HDL Cholesterol',
  'high-density lipoprotein': 'HDL Cholesterol',
  'direct hdl': 'HDL Cholesterol',

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
  'vldl c': 'VLDL Cholesterol',
  'vldl-c': 'VLDL Cholesterol',
  'vldl cholesterol': 'VLDL Cholesterol',
  'vldl cholesterol calculated': 'VLDL Cholesterol',
  'vldl cholesterol, calculated': 'VLDL Cholesterol',
  'vldl-cholesterol': 'VLDL Cholesterol',
  'vldl-cholesterol calculated': 'VLDL Cholesterol',
  'cholesterol vldl': 'VLDL Cholesterol',
  'cholesterol (vldl)': 'VLDL Cholesterol',
  'very low density lipoprotein': 'VLDL Cholesterol',
  'very low-density lipoprotein': 'VLDL Cholesterol',
  'very low density lipoprotein cholesterol': 'VLDL Cholesterol',

  'non hdl': 'Non-HDL Cholesterol',
  'non-hdl': 'Non-HDL Cholesterol',
  'non hdl cholesterol': 'Non-HDL Cholesterol',
  'non-hdl cholesterol': 'Non-HDL Cholesterol',
  'cholesterol non hdl': 'Non-HDL Cholesterol',
  'cholesterol non-hdl': 'Non-HDL Cholesterol',

  'apolipoprotein b': 'Apolipoprotein B (ApoB)',
  'apo b': 'Apolipoprotein B (ApoB)',
  'apob': 'Apolipoprotein B (ApoB)',
  'apolipoprotein a1': 'Apolipoprotein A1 (ApoA1)',
  'apo a1': 'Apolipoprotein A1 (ApoA1)',
  'apoa1': 'Apolipoprotein A1 (ApoA1)',

  // --- BLOOD GLUCOSE & DIABETES ---
  'fasting blood sugar': 'Fasting Blood Sugar',
  'fasting blood glucose': 'Fasting Blood Sugar',
  'fasting glucose': 'Fasting Blood Sugar',
  'fasting plasma glucose': 'Fasting Blood Sugar',
  'glucose fasting': 'Fasting Blood Sugar',
  'glucose (fasting)': 'Fasting Blood Sugar',
  'sugar fasting': 'Fasting Blood Sugar',
  'fbs': 'Fasting Blood Sugar',
  'fpg': 'Fasting Blood Sugar',

  'postprandial blood sugar': 'Postprandial Blood Sugar',
  'postprandial blood glucose': 'Postprandial Blood Sugar',
  'post prandial glucose': 'Postprandial Blood Sugar',
  'glucose post prandial': 'Postprandial Blood Sugar',
  'ppbs': 'Postprandial Blood Sugar',
  'pp glucose': 'Postprandial Blood Sugar',

  'random blood sugar': 'Random Blood Sugar',
  'random blood glucose': 'Random Blood Sugar',
  'rbs': 'Random Blood Sugar',
  'glucose random': 'Random Blood Sugar',
  'plasma glucose random': 'Random Blood Sugar',

  'hba1c': 'HbA1c',
  'hemoglobin a1c': 'HbA1c',
  'haemoglobin a1c': 'HbA1c',
  'hb a1c': 'HbA1c',
  'a1c': 'HbA1c',
  'glycated hemoglobin': 'HbA1c',
  'glycosylated hemoglobin': 'HbA1c',

  'fasting insulin': 'Fasting Insulin',
  'insulin fasting': 'Fasting Insulin',
  'serum insulin': 'Fasting Insulin',

  // --- THYROID PANEL ---
  'tsh': 'TSH',
  'thyroid stimulating hormone': 'TSH',
  'thyroid-stimulating hormone': 'TSH',
  'tsh (thyroid stimulating hormone)': 'TSH',
  'serum tsh': 'TSH',
  'tsh ultra sensitive': 'TSH',

  'free t3': 'Free T3',
  'ft3': 'Free T3',
  'triiodothyronine free': 'Free T3',
  'free triiodothyronine': 'Free T3',

  'free t4': 'Free T4',
  'ft4': 'Free T4',
  'thyroxine free': 'Free T4',
  'free thyroxine': 'Free T4',

  'total t3': 'Total T3',
  't3': 'Total T3',
  'triiodothyronine': 'Total T3',
  'triiodothyronine total': 'Total T3',

  'total t4': 'Total T4',
  't4': 'Total T4',
  'thyroxine': 'Total T4',
  'thyroxine total': 'Total T4',

  'anti tpo': 'Anti-TPO Antibodies',
  'anti-tpo': 'Anti-TPO Antibodies',
  'thyroid peroxidase antibody': 'Anti-TPO Antibodies',

  // --- KIDNEY / RENAL FUNCTION ---
  'creatinine': 'Serum Creatinine',
  'serum creatinine': 'Serum Creatinine',
  'creatinine serum': 'Serum Creatinine',
  'creatinine (serum)': 'Serum Creatinine',
  'blood creatinine': 'Serum Creatinine',

  'blood urea nitrogen': 'BUN (Blood Urea Nitrogen)',
  'bun': 'BUN (Blood Urea Nitrogen)',

  'urea': 'Blood Urea',
  'blood urea': 'Blood Urea',
  'serum urea': 'Blood Urea',

  'uric acid': 'Uric Acid',
  'serum uric acid': 'Uric Acid',
  'uric acid serum': 'Uric Acid',

  'egfr': 'eGFR',
  'estimated gfr': 'eGFR',
  'estimated glomerular filtration rate': 'eGFR',

  // --- LIVER FUNCTION (LFT) ---
  'alt': 'ALT (SGPT)',
  'sgpt': 'ALT (SGPT)',
  'alt (sgpt)': 'ALT (SGPT)',
  'sgpt (alt)': 'ALT (SGPT)',
  'alanine aminotransferase': 'ALT (SGPT)',
  'alanine transaminase': 'ALT (SGPT)',
  'sgpt alanine aminotransferase': 'ALT (SGPT)',

  'ast': 'AST (SGOT)',
  'sgot': 'AST (SGOT)',
  'ast (sgot)': 'AST (SGOT)',
  'sgot (ast)': 'AST (SGOT)',
  'aspartate aminotransferase': 'AST (SGOT)',
  'aspartate transaminase': 'AST (SGOT)',
  'sgot aspartate aminotransferase': 'AST (SGOT)',

  'alkaline phosphatase': 'Alkaline Phosphatase (ALP)',
  'alp': 'Alkaline Phosphatase (ALP)',
  'alk phos': 'Alkaline Phosphatase (ALP)',
  'serum alkaline phosphatase': 'Alkaline Phosphatase (ALP)',

  'ggt': 'Gamma-GT (GGT)',
  'ggtp': 'Gamma-GT (GGT)',
  'gamma glutamyl transferase': 'Gamma-GT (GGT)',
  'gamma-glutamyl transferase': 'Gamma-GT (GGT)',

  'total bilirubin': 'Total Bilirubin',
  'bilirubin total': 'Total Bilirubin',
  'bilirubin (total)': 'Total Bilirubin',
  'serum bilirubin total': 'Total Bilirubin',

  'direct bilirubin': 'Direct Bilirubin',
  'bilirubin direct': 'Direct Bilirubin',
  'conjugated bilirubin': 'Direct Bilirubin',

  'indirect bilirubin': 'Indirect Bilirubin',
  'bilirubin indirect': 'Indirect Bilirubin',
  'unconjugated bilirubin': 'Indirect Bilirubin',

  'total protein': 'Total Protein',
  'protein total': 'Total Protein',
  'serum protein': 'Total Protein',

  'albumin': 'Serum Albumin',
  'serum albumin': 'Serum Albumin',
  'albumin serum': 'Serum Albumin',

  'globulin': 'Serum Globulin',
  'serum globulin': 'Serum Globulin',

  // --- COMPLETE BLOOD COUNT (CBC) ---
  'hemoglobin': 'Hemoglobin',
  'haemoglobin': 'Hemoglobin',
  'hb': 'Hemoglobin',
  'hgb': 'Hemoglobin',
  'total hemoglobin': 'Hemoglobin',

  'hematocrit': 'Hematocrit (PCV)',
  'pcv': 'Hematocrit (PCV)',
  'packed cell volume': 'Hematocrit (PCV)',
  'hct': 'Hematocrit (PCV)',

  'platelet count': 'Platelet Count',
  'platelets': 'Platelet Count',
  'plt': 'Platelet Count',
  'total platelet count': 'Platelet Count',

  'wbc': 'WBC Count',
  'wbc count': 'WBC Count',
  'white blood cell count': 'WBC Count',
  'total wbc': 'WBC Count',
  'tlc': 'WBC Count',

  'rbc': 'RBC Count',
  'rbc count': 'RBC Count',
  'red blood cell count': 'RBC Count',

  'mcv': 'MCV',
  'mean corpuscular volume': 'MCV',

  'mch': 'MCH',
  'mean corpuscular hemoglobin': 'MCH',

  'mchc': 'MCHC',
  'mean corpuscular hemoglobin concentration': 'MCHC',

  'rdw': 'RDW',
  'rdw cv': 'RDW',
  'rdw-cv': 'RDW',
  'red cell distribution width': 'RDW',

  'esr': 'ESR',
  'erythrocyte sedimentation rate': 'ESR',

  'neutrophils': 'Neutrophils',
  'neutrophil': 'Neutrophils',
  'neutrophil count': 'Neutrophils',
  'absolute neutrophil count': 'Neutrophils',
  'anc': 'Neutrophils',

  'lymphocytes': 'Lymphocytes',
  'lymphocyte': 'Lymphocytes',
  'lymphocyte count': 'Lymphocytes',
  'absolute lymphocyte count': 'Lymphocytes',

  'monocytes': 'Monocytes',
  'monocyte': 'Monocytes',

  'eosinophils': 'Eosinophils',
  'eosinophil': 'Eosinophils',

  'basophils': 'Basophils',
  'basophil': 'Basophils',

  // --- VITAMINS & MINERALS ---
  'vitamin d': 'Vitamin D (25-OH)',
  'vitamin d (25-oh)': 'Vitamin D (25-OH)',
  '25-oh vitamin d': 'Vitamin D (25-OH)',
  '25 hydroxy vitamin d': 'Vitamin D (25-OH)',
  '25-hydroxyvitamin d': 'Vitamin D (25-OH)',
  'vit d': 'Vitamin D (25-OH)',
  'vit d3': 'Vitamin D (25-OH)',
  'vitamin d3': 'Vitamin D (25-OH)',
  '25 oh vitamin d total': 'Vitamin D (25-OH)',

  'vitamin b12': 'Vitamin B12',
  'vit b12': 'Vitamin B12',
  'vitamin b-12': 'Vitamin B12',
  'b12': 'Vitamin B12',
  'cobalamin': 'Vitamin B12',
  'cyanocobalamin': 'Vitamin B12',

  'iron': 'Serum Iron',
  'serum iron': 'Serum Iron',
  'iron serum': 'Serum Iron',

  'ferritin': 'Serum Ferritin',
  'serum ferritin': 'Serum Ferritin',
  'ferritin serum': 'Serum Ferritin',

  'tibc': 'TIBC',
  'total iron binding capacity': 'TIBC',

  'calcium': 'Calcium',
  'serum calcium': 'Calcium',
  'potassium': 'Potassium',
  'serum potassium': 'Potassium',
  'sodium': 'Sodium',
  'serum sodium': 'Sodium',
  'magnesium': 'Magnesium',
  'serum magnesium': 'Magnesium',
  'phosphorus': 'Phosphorus',
  'serum phosphorus': 'Phosphorus',
  'zinc': 'Zinc',
  'serum zinc': 'Zinc',

  // --- CARDIAC & INFLAMMATION ---
  'hs-crp': 'hs-CRP',
  'hscrp': 'hs-CRP',
  'high sensitivity crp': 'hs-CRP',
  'c-reactive protein': 'CRP',
  'crp': 'CRP',
  'c reactive protein': 'CRP',
  'homocysteine': 'Homocysteine',
  'serum homocysteine': 'Homocysteine'
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

  // 2. Check comma or parenthetical variants (e.g. "Creatinine, Serum" or "Glucose (Fasting)")
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

  // 3. Protect Ratios and Calculated/Composite Indices from being collapsed into a single component
  const isRatioOrComposite = 
    rawName.includes('/') || 
    cleaned.includes('ratio') || 
    cleaned.includes('index') || 
    cleaned.includes('score') || 
    cleaned.includes('calculated') || 
    (cleaned.includes('ldl') && cleaned.includes('hdl')) ||
    (cleaned.includes('bun') && cleaned.includes('creatinine')) ||
    (cleaned.includes('ast') && cleaned.includes('alt')) ||
    (cleaned.includes('sgot') && cleaned.includes('sgpt'));

  if (isRatioOrComposite) {
    const commonAcronyms = new Set([
      'HDL', 'LDL', 'VLDL', 'BUN', 'AST', 'ALT', 'SGOT', 'SGPT', 'TSH', 'PSA',
      'GGT', 'ALP', 'MCV', 'MCH', 'MCHC', 'RDW', 'MPV', 'ESR', 'CRP', 'PTH',
      'ACTH', 'LH', 'FSH', 'DHEA', 'CPK', 'CK', 'LDH', 'EGFR', 'HBA1C', 'NLR',
      'RBC', 'WBC', 'TIBC', 'UIBC'
    ]);

    return rawName
      .trim()
      .replace(/\s*\/\s*/g, ' / ')
      .replace(/\s+/g, ' ')
      .replace(/\w\S*/g, (w) => {
        const upper = w.toUpperCase();
        if (commonAcronyms.has(upper) || /^[A-Z]{2,5}$/.test(w)) {
          return upper;
        }
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      });
  }

  // 4. Fallback token-based rules for single component medical tests
  if (cleaned.includes('vldl') || cleaned.includes('very low density')) return 'VLDL Cholesterol';
  if (cleaned.includes('non hdl') || cleaned.includes('non-hdl')) return 'Non-HDL Cholesterol';
  if (!cleaned.includes('vldl') && cleaned.includes('ldl')) return 'LDL Cholesterol';
  if (!cleaned.includes('vldl') && !cleaned.includes('non') && cleaned.includes('hdl')) return 'HDL Cholesterol';

  if (cleaned.includes('fasting') && (cleaned.includes('glucose') || cleaned.includes('sugar'))) return 'Fasting Blood Sugar';
  if ((cleaned.includes('postprandial') || cleaned.includes('post prandial') || cleaned.includes('pp')) && (cleaned.includes('glucose') || cleaned.includes('sugar'))) return 'Postprandial Blood Sugar';
  if (cleaned.includes('random') && (cleaned.includes('glucose') || cleaned.includes('sugar'))) return 'Random Blood Sugar';
  if (cleaned.includes('hba1c') || cleaned.includes('a1c') || cleaned.includes('glycated')) return 'HbA1c';

  if (cleaned.includes('vitamin d') || cleaned.includes('25 oh') || cleaned.includes('vit d') || cleaned.includes('25 hydroxy')) return 'Vitamin D (25-OH)';
  if (cleaned.includes('vitamin b12') || cleaned.includes('vit b12') || cleaned.includes('b12') || cleaned.includes('cobalamin')) return 'Vitamin B12';

  if (cleaned.includes('tsh')) return 'TSH';
  if (cleaned.includes('free t3') || cleaned.includes('ft3')) return 'Free T3';
  if (cleaned.includes('free t4') || cleaned.includes('ft4')) return 'Free T4';

  if (cleaned.includes('creatinine')) return 'Serum Creatinine';
  if (cleaned.includes('blood urea nitrogen') || cleaned.includes('bun')) return 'BUN (Blood Urea Nitrogen)';
  if (cleaned.includes('uric acid')) return 'Uric Acid';

  if (cleaned.includes('sgpt') || (cleaned.includes('alt') && !cleaned.includes('salt'))) return 'ALT (SGPT)';
  if (cleaned.includes('sgot') || cleaned.includes('ast')) return 'AST (SGOT)';
  if (cleaned.includes('alkaline phosphatase') || cleaned.includes('alk phos') || cleaned.includes('alp')) return 'Alkaline Phosphatase (ALP)';
  if (cleaned.includes('gamma gt') || cleaned.includes('ggt')) return 'Gamma-GT (GGT)';

  if (cleaned.includes('total bilirubin')) return 'Total Bilirubin';
  if (cleaned.includes('direct bilirubin') || cleaned.includes('conjugated bilirubin')) return 'Direct Bilirubin';

  if (cleaned.includes('hemoglobin') || cleaned.includes('haemoglobin')) return 'Hemoglobin';
  if (cleaned.includes('hematocrit') || cleaned.includes('pcv') || cleaned.includes('packed cell volume')) return 'Hematocrit (PCV)';
  if (cleaned.includes('platelet')) return 'Platelet Count';
  if (cleaned.includes('wbc') || cleaned.includes('white blood cell')) return 'WBC Count';
  if (cleaned.includes('rbc') || cleaned.includes('red blood cell')) return 'RBC Count';

  if (cleaned.includes('hs crp') || cleaned.includes('hscrp') || cleaned.includes('high sensitivity crp')) return 'hs-CRP';
  if (cleaned.includes('c reactive protein') || cleaned.includes('crp')) return 'CRP';

  // Return formatted original name if no alias matched
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
