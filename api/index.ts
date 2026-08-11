import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// ==========================================
// CONFIGURABLE RATE LIMITING IMPLEMENTATION
// ==========================================

export const rateLimitConfig = {
  // Auth routes (stricter limits with per-IP + per-account + exponential backoff)
  authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 mins
  authMaxAttemptsIp: parseInt(process.env.AUTH_MAX_ATTEMPTS_PER_IP || "5", 10), // 5 failures per IP
  authMaxAttemptsAccount: parseInt(process.env.AUTH_MAX_ATTEMPTS_PER_ACCOUNT || "5", 10), // 5 failures per account
  authBackoffBaseSec: parseInt(process.env.AUTH_EXPONENTIAL_BACKOFF_BASE_SEC || "2", 10), // 2s base backoff
  authBackoffMaxSec: parseInt(process.env.AUTH_EXPONENTIAL_BACKOFF_MAX_SEC || "900", 10), // 15 mins max backoff

  // Public endpoints (moderate limits)
  publicWindowMs: parseInt(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 min
  publicMaxRequests: parseInt(process.env.PUBLIC_RATE_LIMIT_MAX_REQUESTS || "30", 10), // 30 req/min

  // Authenticated endpoints (looser limits)
  authedWindowMs: parseInt(process.env.AUTHED_RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 min
  authedMaxRequests: parseInt(process.env.AUTHED_RATE_LIMIT_MAX_REQUESTS || "120", 10), // 120 req/min
};

interface AuthRecord {
  failures: number;
  lastFailureTime: number;
  attempts: number[];
}

interface GeneralRecord {
  count: number;
  resetTime: number;
}

// In-memory rate limit stores
const ipAuthStore = new Map<string, AuthRecord>();
const accountAuthStore = new Map<string, AuthRecord>();
const generalStore = new Map<string, GeneralRecord>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = (typeof forwarded === "string" ? forwarded : forwarded[0]).split(",");
    return ips[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "127.0.0.1";
}

export function calculateBackoffDelaySec(excessFailures: number): number {
  if (excessFailures <= 0) return 0;
  const delay = rateLimitConfig.authBackoffBaseSec * Math.pow(2, excessFailures - 1);
  return Math.min(rateLimitConfig.authBackoffMaxSec, Math.round(delay));
}

export function checkAuthRateLimit(ip: string, email?: string): {
  limited: boolean;
  retryAfterSec: number;
  reason?: string;
  isIpLimited: boolean;
  isAccountLimited: boolean;
  currentFailures: number;
} {
  const now = Date.now();
  let maxRetrySec = 0;
  let isIpLimited = false;
  let isAccountLimited = false;
  let reason = "";
  let highestFailures = 0;

  // 1. Check IP store
  const ipRecord = ipAuthStore.get(ip);
  if (ipRecord && ipRecord.failures >= rateLimitConfig.authMaxAttemptsIp) {
    const excess = ipRecord.failures - rateLimitConfig.authMaxAttemptsIp + 1;
    const requiredDelaySec = calculateBackoffDelaySec(excess);
    const timePassedSec = (now - ipRecord.lastFailureTime) / 1000;

    if (timePassedSec < requiredDelaySec) {
      const remainingSec = Math.ceil(requiredDelaySec - timePassedSec);
      if (remainingSec > maxRetrySec) {
        maxRetrySec = remainingSec;
        isIpLimited = true;
        reason = `IP rate limit reached (${ipRecord.failures} consecutive auth failures). Exponential backoff active.`;
      }
    }
    highestFailures = Math.max(highestFailures, ipRecord.failures);
  }

  // 2. Check Account store
  if (email) {
    const cleanEmail = email.toLowerCase().trim();
    const accountRecord = accountAuthStore.get(cleanEmail);
    if (accountRecord && accountRecord.failures >= rateLimitConfig.authMaxAttemptsAccount) {
      const excess = accountRecord.failures - rateLimitConfig.authMaxAttemptsAccount + 1;
      const requiredDelaySec = calculateBackoffDelaySec(excess);
      const timePassedSec = (now - accountRecord.lastFailureTime) / 1000;

      if (timePassedSec < requiredDelaySec) {
        const remainingSec = Math.ceil(requiredDelaySec - timePassedSec);
        if (remainingSec > maxRetrySec) {
          maxRetrySec = remainingSec;
          isAccountLimited = true;
          reason = `Account rate limit reached for ${cleanEmail} (${accountRecord.failures} consecutive auth failures). Exponential backoff active.`;
        }
      }
      highestFailures = Math.max(highestFailures, accountRecord.failures);
    }
  }

  return {
    limited: maxRetrySec > 0,
    retryAfterSec: maxRetrySec,
    reason: reason || undefined,
    isIpLimited,
    isAccountLimited,
    currentFailures: highestFailures,
  };
}

export function recordAuthAttempt(ip: string, email: string | undefined, success: boolean) {
  const now = Date.now();
  const cleanEmail = email ? email.toLowerCase().trim() : undefined;

  let ipRecord = ipAuthStore.get(ip) || { failures: 0, lastFailureTime: 0, attempts: [] };
  if (success) {
    ipRecord.failures = 0;
  } else {
    ipRecord.failures += 1;
    ipRecord.lastFailureTime = now;
  }
  ipRecord.attempts.push(now);
  ipRecord.attempts = ipRecord.attempts.filter((t) => now - t <= rateLimitConfig.authWindowMs);
  ipAuthStore.set(ip, ipRecord);

  if (cleanEmail) {
    let accountRecord = accountAuthStore.get(cleanEmail) || { failures: 0, lastFailureTime: 0, attempts: [] };
    if (success) {
      accountRecord.failures = 0;
    } else {
      accountRecord.failures += 1;
      accountRecord.lastFailureTime = now;
    }
    accountRecord.attempts.push(now);
    accountRecord.attempts = accountRecord.attempts.filter((t) => now - t <= rateLimitConfig.authWindowMs);
    accountAuthStore.set(cleanEmail, accountRecord);
  }

  return {
    ipFailures: ipRecord.failures,
    accountFailures: cleanEmail ? accountAuthStore.get(cleanEmail)?.failures || 0 : 0,
  };
}

export function authRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const email = req.body?.email || req.query?.email || req.body?.accountIdentifier;

  const check = checkAuthRateLimit(ip, typeof email === "string" ? email : undefined);

  if (check.limited) {
    res.setHeader("Retry-After", check.retryAfterSec.toString());
    res.setHeader("X-RateLimit-Reset-Seconds", check.retryAfterSec.toString());
    return res.status(429).json({
      success: false,
      error: "Too many authentication attempts. Exponential backoff active.",
      details: check.reason,
      retryAfterSeconds: check.retryAfterSec,
      isIpLimited: check.isIpLimited,
      isAccountLimited: check.isAccountLimited,
      currentFailures: check.currentFailures,
    });
  }

  next();
}

export function publicRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const key = `public:${ip}`;
  const now = Date.now();

  let record = generalStore.get(key);
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + rateLimitConfig.publicWindowMs,
    };
    generalStore.set(key, record);
    return next();
  }

  record.count += 1;
  generalStore.set(key, record);

  if (record.count > rateLimitConfig.publicMaxRequests) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader("Retry-After", retryAfterSec.toString());
    return res.status(429).json({
      success: false,
      error: "Public endpoint rate limit exceeded.",
      details: `Maximum ${rateLimitConfig.publicMaxRequests} requests per ${Math.round(
        rateLimitConfig.publicWindowMs / 1000
      )}s allowed. Please try again in ${retryAfterSec} seconds.`,
      retryAfterSeconds: retryAfterSec,
    });
  }

  next();
}

export function authedRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const authHeader = req.headers.authorization;
  const userId = req.headers["x-user-id"] || req.body?.userId;

  const isAuthenticated = Boolean(authHeader || userId || req.body?.userConsentGiven);
  const windowMs = rateLimitConfig.authedWindowMs;
  const maxRequests = isAuthenticated
    ? rateLimitConfig.authedMaxRequests
    : rateLimitConfig.publicMaxRequests;

  const identifier = isAuthenticated ? `authed:${userId || ip}` : `unauthed:${ip}`;
  const now = Date.now();

  let record = generalStore.get(identifier);
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    generalStore.set(identifier, record);
    return next();
  }

  record.count += 1;
  generalStore.set(identifier, record);

  if (record.count > maxRequests) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader("Retry-After", retryAfterSec.toString());
    return res.status(429).json({
      success: false,
      error: "Rate limit exceeded for user action.",
      details: `Maximum ${maxRequests} requests per ${Math.round(
        windowMs / 1000
      )}s allowed for ${isAuthenticated ? "authenticated users" : "public requests"}. Please try again in ${retryAfterSec} seconds.`,
      retryAfterSeconds: retryAfterSec,
    });
  }

  next();
}

const app = express();

// Increase body parser limits for base64 image/pdf upload
app.use(express.json({ limit: "25mb" }));

// Helper to sanitize/remove PII from text before sending to AI
function scrubPiiFromText(text: string): string {
  if (!text) return "";
  let clean = text;
  // Patterns for typical PII
  clean = clean.replace(/(?:Patient\s*Name|Name|MRN|Patient\s*ID|DOB|Date\s*of\s*Birth|Phone|Address|Aadhaar|SSN|Hospital\s*ID|Doctor|Physician|Ref\s*By)\s*[:\-]\s*[^\n,]+/gi, '[PII REMOVED]');
  clean = clean.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REMOVED]');
  clean = clean.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE REMOVED]');
  return clean;
}

// Lazy Gemini API client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing on server. Please configure GEMINI_API_KEY in your deployment environment variables.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Helper to execute generateContent with retries and fallback models for transient 503/429 errors
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    model?: string;
    contents: any;
    config?: any;
  },
  maxRetries = 2
) {
  const primaryModel = params.model || "gemini-3.6-flash";
  const modelsToTry = [
    primaryModel,
    "gemini-3.6-flash",
    "gemini-flash-latest"
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model: modelName,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const message = String(err?.message || err || "").toLowerCase();
        const status = err?.status || err?.code || err?.statusCode;

        const isTransient = 
          status === 503 || 
          status === 429 || 
          message.includes("503") || 
          message.includes("unavailable") || 
          message.includes("high demand") || 
          message.includes("resource_exhausted") ||
          message.includes("quota");

        if (isTransient && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1200));
          continue;
        }

        if (isTransient) {
          break;
        }

        throw err;
      }
    }
  }

  throw lastError;
}

// Express Router for API Endpoints
const apiRouter = express.Router();

// Public Endpoint with Moderate Rate Limiting
apiRouter.get("/health", publicRateLimitMiddleware, (_req, res) => {
  res.json({
    status: "ok",
    app: "HealthLens AI Server",
    timestamp: new Date().toISOString(),
    rateLimits: {
      publicWindowMs: rateLimitConfig.publicWindowMs,
      publicMaxRequests: rateLimitConfig.publicMaxRequests,
      authedWindowMs: rateLimitConfig.authedWindowMs,
      authedMaxRequests: rateLimitConfig.authedMaxRequests,
      authMaxAttemptsIp: rateLimitConfig.authMaxAttemptsIp,
      authMaxAttemptsAccount: rateLimitConfig.authMaxAttemptsAccount,
    }
  });
});

// --- AUTHENTICATION RATE LIMITING ENDPOINTS ---
// Stricter limits with per-IP + per-account limits and exponential backoff

// Endpoint to verify if login/signup/reset is currently allowed before proceeding
apiRouter.post("/auth/check-limit", authRateLimitMiddleware, (req, res) => {
  const ip = getClientIp(req);
  const email = req.body?.email;
  const status = checkAuthRateLimit(ip, typeof email === "string" ? email : undefined);
  res.json({
    allowed: !status.limited,
    retryAfterSeconds: status.retryAfterSec,
    reason: status.reason,
    isIpLimited: status.isIpLimited,
    isAccountLimited: status.isAccountLimited
  });
});

// Endpoint to record attempt outcomes (success resets failures, failure increments and triggers exponential backoff)
apiRouter.post("/auth/report-attempt", (req, res) => {
  const ip = getClientIp(req);
  const { email, success } = req.body;
  const result = recordAuthAttempt(ip, typeof email === "string" ? email : undefined, Boolean(success));
  res.json({
    success: true,
    ipFailures: result.ipFailures,
    accountFailures: result.accountFailures
  });
});

// Server Auth Login Route
apiRouter.post("/auth/login", authRateLimitMiddleware, (req, res) => {
  const ip = getClientIp(req);
  const { email, password } = req.body;

  if (!email || !password) {
    recordAuthAttempt(ip, typeof email === "string" ? email : undefined, false);
    return res.status(400).json({
      success: false,
      error: "Email and password are required."
    });
  }

  res.json({
    success: true,
    message: "Auth route rate limit verified.",
    email: String(email).toLowerCase().trim()
  });
});

// Server Auth Signup Route
apiRouter.post("/auth/signup", authRateLimitMiddleware, (req, res) => {
  const ip = getClientIp(req);
  const { email, password } = req.body;

  if (!email || !password) {
    recordAuthAttempt(ip, typeof email === "string" ? email : undefined, false);
    return res.status(400).json({
      success: false,
      error: "Email and password are required."
    });
  }

  res.json({
    success: true,
    message: "Signup route rate limit verified.",
    email: String(email).toLowerCase().trim()
  });
});

// Server Auth Reset Password Route
apiRouter.post("/auth/reset-password", authRateLimitMiddleware, (req, res) => {
  const ip = getClientIp(req);
  const { email } = req.body;

  if (!email) {
    recordAuthAttempt(ip, typeof email === "string" ? email : undefined, false);
    return res.status(400).json({
      success: false,
      error: "Email is required."
    });
  }

  res.json({
    success: true,
    message: "Reset password route rate limit verified.",
    email: String(email).toLowerCase().trim()
  });
});

const BIOMARKER_ALIASES: Record<string, string> = {
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

  'hdl': 'HDL Cholesterol',
  'hdl c': 'HDL Cholesterol',
  'hdl-c': 'HDL Cholesterol',
  'hdl cholesterol': 'HDL Cholesterol',
  'cholesterol hdl': 'HDL Cholesterol',
  'cholesterol (hdl)': 'HDL Cholesterol',
  'high density lipoprotein': 'HDL Cholesterol',
  'high-density lipoprotein': 'HDL Cholesterol',

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

  'total cholesterol': 'Total Cholesterol',
  'cholesterol total': 'Total Cholesterol',
  'cholesterol (total)': 'Total Cholesterol',
  'serum cholesterol': 'Total Cholesterol',
  'cholesterol': 'Total Cholesterol',

  'triglycerides': 'Triglycerides',
  'triglyceride': 'Triglycerides',
  'serum triglycerides': 'Triglycerides',
  'tg': 'Triglycerides',

  // --- BLOOD GLUCOSE & DIABETES ---
  'fasting blood sugar': 'Fasting Blood Sugar',
  'fasting blood glucose': 'Fasting Blood Sugar',
  'fasting glucose': 'Fasting Blood Sugar',
  'fasting plasma glucose': 'Fasting Blood Sugar',
  'glucose fasting': 'Fasting Blood Sugar',
  'glucose (fasting)': 'Fasting Blood Sugar',
  'fbs': 'Fasting Blood Sugar',
  'fpg': 'Fasting Blood Sugar',

  'postprandial blood sugar': 'Postprandial Blood Sugar',
  'postprandial blood glucose': 'Postprandial Blood Sugar',
  'post prandial glucose': 'Postprandial Blood Sugar',
  'glucose post prandial': 'Postprandial Blood Sugar',
  'ppbs': 'Postprandial Blood Sugar',

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

  'fasting insulin': 'Fasting Insulin',
  'insulin fasting': 'Fasting Insulin',

  // --- THYROID PANEL ---
  'tsh': 'TSH',
  'thyroid stimulating hormone': 'TSH',
  'tsh (thyroid stimulating hormone)': 'TSH',
  'serum tsh': 'TSH',

  'free t3': 'Free T3',
  'ft3': 'Free T3',
  'free t4': 'Free T4',
  'ft4': 'Free T4',
  'total t3': 'Total T3',
  't3': 'Total T3',
  'total t4': 'Total T4',
  't4': 'Total T4',

  // --- KIDNEY / RENAL FUNCTION ---
  'creatinine': 'Serum Creatinine',
  'serum creatinine': 'Serum Creatinine',
  'creatinine serum': 'Serum Creatinine',
  'creatinine (serum)': 'Serum Creatinine',

  'blood urea nitrogen': 'BUN (Blood Urea Nitrogen)',
  'bun': 'BUN (Blood Urea Nitrogen)',
  'urea': 'Blood Urea',
  'blood urea': 'Blood Urea',

  'uric acid': 'Uric Acid',
  'serum uric acid': 'Uric Acid',
  'egfr': 'eGFR',

  // --- LIVER FUNCTION (LFT) ---
  'alt': 'ALT (SGPT)',
  'sgpt': 'ALT (SGPT)',
  'alt (sgpt)': 'ALT (SGPT)',
  'sgpt (alt)': 'ALT (SGPT)',
  'alanine aminotransferase': 'ALT (SGPT)',

  'ast': 'AST (SGOT)',
  'sgot': 'AST (SGOT)',
  'ast (sgot)': 'AST (SGOT)',
  'sgot (ast)': 'AST (SGOT)',
  'aspartate aminotransferase': 'AST (SGOT)',

  'alkaline phosphatase': 'Alkaline Phosphatase (ALP)',
  'alp': 'Alkaline Phosphatase (ALP)',

  'ggt': 'Gamma-GT (GGT)',
  'ggtp': 'Gamma-GT (GGT)',

  'total bilirubin': 'Total Bilirubin',
  'direct bilirubin': 'Direct Bilirubin',
  'indirect bilirubin': 'Indirect Bilirubin',
  'total protein': 'Total Protein',
  'albumin': 'Serum Albumin',
  'globulin': 'Serum Globulin',

  // --- COMPLETE BLOOD COUNT (CBC) ---
  'hemoglobin': 'Hemoglobin',
  'haemoglobin': 'Hemoglobin',
  'hb': 'Hemoglobin',
  'hgb': 'Hemoglobin',

  'hematocrit': 'Hematocrit (PCV)',
  'pcv': 'Hematocrit (PCV)',
  'packed cell volume': 'Hematocrit (PCV)',

  'platelets': 'Platelet Count',
  'platelet count': 'Platelet Count',
  'plt': 'Platelet Count',

  'wbc': 'WBC Count',
  'wbc count': 'WBC Count',
  'white blood cell count': 'WBC Count',

  'rbc': 'RBC Count',
  'rbc count': 'RBC Count',

  'mcv': 'MCV',
  'mch': 'MCH',
  'mchc': 'MCHC',
  'rdw': 'RDW',
  'esr': 'ESR',
  'neutrophils': 'Neutrophils',
  'lymphocytes': 'Lymphocytes',
  'monocytes': 'Monocytes',
  'eosinophils': 'Eosinophils',
  'basophils': 'Basophils',

  // --- VITAMINS & MINERALS ---
  'vitamin d': 'Vitamin D (25-OH)',
  'vitamin d (25-oh)': 'Vitamin D (25-OH)',
  '25-oh vitamin d': 'Vitamin D (25-OH)',
  '25 hydroxy vitamin d': 'Vitamin D (25-OH)',
  'vit d': 'Vitamin D (25-OH)',
  'vitamin d3': 'Vitamin D (25-OH)',

  'vitamin b12': 'Vitamin B12',
  'vit b12': 'Vitamin B12',
  'vitamin b-12': 'Vitamin B12',
  'b12': 'Vitamin B12',

  'iron': 'Serum Iron',
  'serum iron': 'Serum Iron',
  'ferritin': 'Serum Ferritin',
  'serum ferritin': 'Serum Ferritin',
  'tibc': 'TIBC',
  'calcium': 'Calcium',
  'serum calcium': 'Calcium',
  'potassium': 'Potassium',
  'sodium': 'Sodium',
  'magnesium': 'Magnesium',

  // --- CARDIAC & INFLAMMATION ---
  'hs-crp': 'hs-CRP',
  'hscrp': 'hs-CRP',
  'crp': 'CRP',
  'c-reactive protein': 'CRP'
};

function normalizeServerBiomarkerName(rawName: string): string {
  if (!rawName) return 'Biomarker';
  const cleaned = rawName.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  if (BIOMARKER_ALIASES[cleaned]) return BIOMARKER_ALIASES[cleaned];

  if (rawName.includes(',')) {
    const parts = rawName.split(',').map(p => p.trim());
    if (parts.length === 2) {
      const reversed = `${parts[1]} ${parts[0]}`.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
      if (BIOMARKER_ALIASES[reversed]) return BIOMARKER_ALIASES[reversed];
    }
  }

  // Protect ratios and composite tests from being collapsed into single markers
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

  if (cleaned.includes('vldl') || cleaned.includes('very low density')) return 'VLDL Cholesterol';
  if (cleaned.includes('non hdl') || cleaned.includes('non-hdl')) return 'Non-HDL Cholesterol';
  if (!cleaned.includes('vldl') && cleaned.includes('ldl')) return 'LDL Cholesterol';
  if (!cleaned.includes('vldl') && !cleaned.includes('non') && cleaned.includes('hdl')) return 'HDL Cholesterol';

  if (cleaned.includes('fasting') && (cleaned.includes('glucose') || cleaned.includes('sugar'))) return 'Fasting Blood Sugar';
  if ((cleaned.includes('postprandial') || cleaned.includes('post prandial') || cleaned.includes('pp')) && (cleaned.includes('glucose') || cleaned.includes('sugar'))) return 'Postprandial Blood Sugar';
  if (cleaned.includes('random') && (cleaned.includes('glucose') || cleaned.includes('sugar'))) return 'Random Blood Sugar';
  if (cleaned.includes('hba1c') || cleaned.includes('a1c')) return 'HbA1c';

  if (cleaned.includes('vitamin d') || cleaned.includes('25 oh') || cleaned.includes('vit d')) return 'Vitamin D (25-OH)';
  if (cleaned.includes('vitamin b12') || cleaned.includes('vit b12') || cleaned.includes('b12')) return 'Vitamin B12';

  if (cleaned.includes('tsh')) return 'TSH';
  if (cleaned.includes('free t3') || cleaned.includes('ft3')) return 'Free T3';
  if (cleaned.includes('free t4') || cleaned.includes('ft4')) return 'Free T4';

  if (cleaned.includes('creatinine')) return 'Serum Creatinine';
  if (cleaned.includes('blood urea nitrogen') || cleaned.includes('bun')) return 'BUN (Blood Urea Nitrogen)';
  if (cleaned.includes('uric acid')) return 'Uric Acid';

  if (cleaned.includes('sgpt') || (cleaned.includes('alt') && !cleaned.includes('salt'))) return 'ALT (SGPT)';
  if (cleaned.includes('sgot') || cleaned.includes('ast')) return 'AST (SGOT)';
  if (cleaned.includes('alkaline phosphatase') || cleaned.includes('alk phos')) return 'Alkaline Phosphatase (ALP)';
  if (cleaned.includes('gamma gt') || cleaned.includes('ggt')) return 'Gamma-GT (GGT)';

  if (cleaned.includes('total bilirubin')) return 'Total Bilirubin';
  if (cleaned.includes('direct bilirubin')) return 'Direct Bilirubin';

  if (cleaned.includes('hemoglobin') || cleaned.includes('haemoglobin')) return 'Hemoglobin';
  if (cleaned.includes('hematocrit') || cleaned.includes('pcv')) return 'Hematocrit (PCV)';
  if (cleaned.includes('platelet')) return 'Platelet Count';
  if (cleaned.includes('wbc') || cleaned.includes('white blood cell')) return 'WBC Count';
  if (cleaned.includes('rbc') || cleaned.includes('red blood cell')) return 'RBC Count';

  if (cleaned.includes('hs crp') || cleaned.includes('hscrp')) return 'hs-CRP';
  if (cleaned.includes('c reactive protein') || cleaned.includes('crp')) return 'CRP';

  return rawName.trim().replace(/\s+/g, ' ').replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// Endpoint: OCR & AI Biomarker Extraction (Authenticated User Action Rate Limit)
apiRouter.post("/ocr-analyze", authedRateLimitMiddleware, async (req, res) => {
  try {
    const { fileBase64, mimeType, rawText, userConsentGiven, age, gender } = req.body;

    if (!userConsentGiven) {
      return res.status(403).json({ error: "User consent for AI data processing is required." });
    }

    if (!fileBase64 && !rawText) {
      return res.status(400).json({ error: "No document image or text provided for analysis." });
    }

    const ai = getGeminiClient();

    let demographicsContext = "";
    if (age || gender) {
      demographicsContext = `\nCRITICAL PATIENT DEMOGRAPHICS:\n`;
      if (age) demographicsContext += `- Patient Age: ${age} years old\n`;
      if (gender) demographicsContext += `- Patient Biological Gender: ${gender}\n`;
      demographicsContext += `You MUST interpret all biomarkers, evaluate high/low/normal flags, reference ranges, and formulate all insights specifically calibrated for an individual matching these demographics.\n`;
    }

    const systemPrompt = `You are a medical lab report data extractor and clinical insights AI for HealthLens AI.
Analyze the provided medical lab report (image/PDF or text) and extract structured biomarker findings dynamically.
${demographicsContext}
CRITICAL INSTRUCTIONS:
1. Extract report metadata:
   - title: concise title of the lab report (e.g., "Comprehensive Metabolic Panel", "Lipid Profile & Thyroid Test")
   - testDate: date of collection or test in YYYY-MM-DD format if present in the document, or empty string if not found
   - labName: facility/lab name if present (e.g. "Quest Diagnostics", "Labcorp"), or "Laboratory Center"
2. Extract ALL biological markers, lab values, ratios, calculated parameters, measurements, and reference ranges found in the report.
   - DO NOT skip or omit any row/test listed on the report.
   - DO NOT merge or collapse ratio or composite tests (e.g. "LDL / HDL Ratio", "Total Cholesterol / HDL Ratio", "BUN / Creatinine Ratio", "AST / ALT Ratio", "A/G Ratio", "Sodium / Potassium Ratio") into single component markers like "LDL" or "Creatinine". Extract each ratio or calculated index as its own distinct test entry with its value and unit.
3. For each biomarker/ratio, provide:
   - testName: standard canonical clinical name as printed or standardized. Keep compound/ratio names intact (e.g., "LDL / HDL Ratio", "Total Cholesterol / HDL Ratio", "BUN / Creatinine Ratio").
   - value: numeric value as a number (e.g. 112.6, 2.7, 190)
   - unit: unit string (e.g. "mg/dL", "%", "uIU/mL", "ratio", "mg/g")
   - referenceRange: standard range string from the report (e.g. "70 - 99", "< 3.5", "1.0 - 2.5")
   - category: dynamic category matching the panel or test type (e.g., "Lipids", "Metabolic", "Hematology", "Thyroid", "Renal", "Liver", "Vitamins", "Hormones", "Cardiac", "Immunology", "Urine", "Coagulation", "Oncology", "General")
   - flag: one of ["normal", "high", "low"] based on the reference range provided in the report or standard medical ranges.
   - notes: short clinical context or explanation for this value
4. Provide an executive summary of the lab report:
   - overview: clear, patient-friendly summary paragraph explaining overall findings
   - observations: array of 3-5 key bullet takeaways or lifestyle recommendations
   - educationalNote: medical disclaimer reminding the patient to discuss results with their physician
5. Privacy: Do NOT include patient name, doctor name, address, or PII in your output.

Return ONLY a valid JSON object matching this schema:
{
  "title": "string",
  "testDate": "YYYY-MM-DD",
  "labName": "string",
  "extractedData": [
    {
      "testName": "string",
      "value": 0,
      "unit": "string",
      "referenceRange": "string",
      "category": "string",
      "flag": "normal" | "high" | "low",
      "notes": "string"
    }
  ],
  "biomarkers": [
    {
      "name": "string",
      "value": 0,
      "unit": "string",
      "referenceRange": "string",
      "category": "string",
      "status": "normal" | "borderline" | "high" | "low" | "critical"
    }
  ],
  "aiSummary": {
    "overview": "string",
    "observations": ["string"],
    "educationalNote": "string"
  },
  "summary": {
    "summaryText": "string",
    "keyObservations": ["string"],
    "recommendedQuestionsForDoctor": ["string"],
    "riskLevel": "low" | "moderate" | "high"
  }
}
`;

    const contents: any[] = [];

    if (fileBase64) {
      const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
      contents.push({
        inlineData: {
          mimeType: mimeType || "image/png",
          data: cleanBase64
        }
      });
    }

    const promptText = rawText
      ? `Analyze this lab report text:\n\n${scrubPiiFromText(rawText)}\n\n${systemPrompt}`
      : systemPrompt;

    contents.push({ text: promptText });

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "";
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse JSON response from AI model.");
      }
    }

    res.json({
      success: true,
      data: parsedData
    });
  } catch (err: any) {
    console.error("Error in /ocr-analyze:", err);
    res.status(500).json({
      success: false,
      error: "Failed to analyze lab report document. Please try again."
    });
  }
});

// Endpoint: Multi-Report Trend Insights & Recommendations
apiRouter.post("/trend-insights", authedRateLimitMiddleware, async (req, res) => {
  try {
    const { reportHistory, userConsentGiven, age, gender } = req.body;

    if (!userConsentGiven) {
      return res.status(403).json({ error: "User consent required for health analytics." });
    }

    if (!reportHistory || !Array.isArray(reportHistory) || reportHistory.length === 0) {
      return res.status(400).json({ error: "No report history provided." });
    }

    const ai = getGeminiClient();

    let demographicsContext = "";
    if (age || gender) {
      demographicsContext = `\nPatient Demographics Context:\n`;
      if (age) demographicsContext += `- Patient Age: ${age} years old\n`;
      if (gender) demographicsContext += `- Patient Biological Gender: ${gender}\n`;
      demographicsContext += `Customize all longitudinal insights, dietary recommendations, and health trajectories specifically for an individual matching these demographics.\n`;
    }

    const sanitizedHistory = reportHistory.map((rep: any) => {
      const date = rep.testDate || rep.reportDate || rep.createdAt || "Recent Date";
      const title = rep.title || rep.labName || "Lab Report";
      const list = rep.extractedData || rep.biomarkers || [];
      const biomarkers = (Array.isArray(list) ? list : []).map((b: any) => ({
        name: normalizeServerBiomarkerName(b.testName || b.name || b.biomarkerName || "Biomarker"),
        value: b.value,
        unit: b.unit || "",
        referenceRange: b.referenceRange || b.range || "",
        flag: b.flag || (b.isAbnormal ? "abnormal" : "normal") || b.status || "normal",
        category: b.category || "General"
      }));
      return { date, title, biomarkers };
    });

    const prompt = `You are a clinical biomarker analytics expert for HealthLens AI.
Analyze this user's historical lab reports across time and identify longitudinal trends, positive trajectories, areas of concern, and evidence-based health recommendations.
${demographicsContext}
User Report History:
${JSON.stringify(sanitizedHistory, null, 2)}

Provide an in-depth longitudinal health analysis with:
1. overallTrendSummary / overallTrajectory: 2-3 paragraph synthesis of health progression across reports.
2. keyTrends / keyInsights: array of objects or strings describing notable trends and findings.
3. lifestyleActionables / lifestyleRecommendations: array of 3-5 specific lifestyle, nutrition, sleep, or exercise habits backed by clinical guidelines.
4. flaggedRisks: array of markers that remain consistently out of range or are showing negative momentum.
5. positiveMilestones: array of markers that have normalized or improved.

Return ONLY a JSON object matching this schema:
{
  "overallTrendSummary": "string",
  "overallTrajectory": "string",
  "keyTrends": [
    {
      "biomarkerName": "string",
      "direction": "improving" | "worsening" | "stable",
      "summary": "string",
      "recommendation": "string"
    }
  ],
  "keyInsights": ["string"],
  "lifestyleActionables": ["string"],
  "lifestyleRecommendations": ["string"],
  "flaggedRisks": ["string"],
  "positiveMilestones": ["string"]
}
`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "";
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI trend analysis.");
      }
    }

    res.json({
      success: true,
      data: parsedData,
      insights: parsedData
    });
  } catch (err: any) {
    console.error("Error in /trend-insights:", err);
    res.status(500).json({
      success: false,
      error: "Failed to generate health trend insights. Please try again later."
    });
  }
});

// Endpoint: Doctor Visit Summary Generator
apiRouter.post("/doctor-summary-ai", authedRateLimitMiddleware, async (req, res) => {
  try {
    const { reportHistory, age, gender } = req.body;
    if (!reportHistory || reportHistory.length === 0) {
      return res.status(400).json({ error: "No lab reports selected for summary." });
    }

    const ai = getGeminiClient();

    let demographicsContext = "";
    if (age || gender) {
      demographicsContext = `\nPatient Demographics Context:\n`;
      if (age) demographicsContext += `- Patient Age: ${age} years old\n`;
      if (gender) demographicsContext += `- Patient Biological Gender: ${gender}\n`;
      demographicsContext += `Synthesize the doctor visit prep briefing, general summary notes, out-of-range flag highlighting, and clinical consultation questions specifically calibrated for this patient's age and biological gender.\n`;
    }

    const sanitizedHistory = reportHistory.map((rep: any) => {
      const date = rep.testDate || rep.reportDate || rep.createdAt || "Recent Date";
      const title = rep.title || rep.labName || "Lab Report";
      const list = rep.extractedData || rep.biomarkers || [];
      const biomarkers = (Array.isArray(list) ? list : []).map((b: any) => ({
        testName: normalizeServerBiomarkerName(b.testName || b.name || b.biomarkerName || "Biomarker"),
        value: b.value,
        unit: b.unit || "",
        referenceRange: b.referenceRange || b.range || "",
        flag: b.flag || (b.isAbnormal ? "high" : "normal") || b.status || "normal",
        category: b.category || "General"
      }));
      return { date, title, biomarkers };
    });

    const prompt = `You are a clinical physician assistant tool creating a concise, high-yield "Doctor Visit Prep Brief".
Review these lab reports and synthesize a 1-page structured briefing for the patient's upcoming physician consultation.
${demographicsContext}
Report Data:
${JSON.stringify(sanitizedHistory, null, 2)}

Requirements:
1. generalNote: 2-3 sentence executive recap of patient's overall lab trajectory and goals for the consultation.
2. latestAbnormalities: array of out-of-range biomarkers across recent reports with testName, value (numeric), unit, referenceRange, flag ("high"|"low"|"normal"), testDate.
3. reportComparisons: array of comparisons for key biomarkers over time with biomarkerName, previous, current, unit.
4. suggestedQuestions: array of 4-5 specific, actionable questions for the doctor (e.g. retesting timelines, dosage adjustments, lifestyle guidance).
5. keyTrends: array of objects with biomarkerName, description, direction ("improving"|"worsening"|"stable").

Return ONLY a JSON object with this schema:
{
  "generalNote": "string",
  "latestAbnormalities": [
    {
      "testName": "string",
      "value": 0,
      "unit": "string",
      "referenceRange": "string",
      "flag": "high" | "low" | "normal",
      "testDate": "string"
    }
  ],
  "reportComparisons": [
    {
      "biomarkerName": "string",
      "previous": "string",
      "current": "string",
      "unit": "string"
    }
  ],
  "suggestedQuestions": ["string"],
  "keyTrends": [
    {
      "biomarkerName": "string",
      "description": "string",
      "direction": "improving" | "worsening" | "stable"
    }
  ]
}
`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "";
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse doctor summary.");
      }
    }

    res.json({
      success: true,
      data: parsedData,
      summary: parsedData
    });
  } catch (err: any) {
    console.error("Error in /doctor-summary-ai:", err);
    res.status(500).json({
      success: false,
      error: "Failed to generate doctor visit summary. Please try again later."
    });
  }
});

// Endpoint: Infer Biomarker Reference Range using Gemini AI when lab report lacks reference ranges
apiRouter.post("/infer-reference-range", authedRateLimitMiddleware, async (req, res) => {
  try {
    const { biomarkerName, unit } = req.body;
    if (!biomarkerName) {
      return res.status(400).json({ error: "Biomarker name is required." });
    }

    const ai = getGeminiClient();
    const prompt = `You are a clinical pathology assistant for HealthLens AI.
Provide the standard clinical reference range for the biomarker "${biomarkerName}" (unit: "${unit || ''}") according to established guidelines (ADA, AHA, NKF, ATA, WHO).

Return ONLY a valid JSON object matching this schema:
{
  "referenceRange": "string (e.g. '< 100 mg/dL' or '70 - 99 mg/dL')",
  "minRef": number or null,
  "maxRef": number or null,
  "unit": "string",
  "source": "string (e.g. 'Gemini AI Clinical Guidelines (ADA/AHA)')",
  "clinicalNote": "string"
}
`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text || "";
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI reference range.");
      }
    }

    res.json({
      success: true,
      data: parsedData
    });
  } catch (err: any) {
    console.error("Error in /infer-reference-range:", err);
    res.status(500).json({
      success: false,
      error: "Failed to infer reference range via Gemini AI."
    });
  }
});

// URL normalization for Vercel rewrites
app.use((req, _res, next) => {
  if (req.url === "/api" && req.originalUrl && req.originalUrl !== "/api") {
    req.url = req.originalUrl;
  }
  next();
});

// Mount API router on both /api and /
app.use("/api", apiRouter);
app.use("/", apiRouter);

// 404 handler for API routes
app.use((req, res, next) => {
  if (
    req.path.startsWith("/api") || 
    req.url.includes("ocr-analyze") || 
    req.url.includes("trend-insights") || 
    req.url.includes("doctor-summary-ai") ||
    req.url.includes("health")
  ) {
    return res.status(404).json({
      success: false,
      error: `API route '${req.originalUrl || req.url}' was not found.`
    });
  }
  next();
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled API error:", err);
  res.status(500).json({
    success: false,
    error: "An unexpected server error occurred. Please try again later."
  });
});

export default app;
