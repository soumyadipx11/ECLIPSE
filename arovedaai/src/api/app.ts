import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

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
  return new GoogleGenAI({ apiKey });
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
  const primaryModel = params.model || "gemini-2.5-flash";
  const modelsToTry = [
    primaryModel,
    "gemini-2.5-flash",
    "gemini-2.0-flash"
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

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "HealthLens AI Server", timestamp: new Date().toISOString() });
});

// Endpoint: OCR & AI Biomarker Extraction
apiRouter.post("/ocr-analyze", async (req, res) => {
  try {
    const { fileBase64, mimeType, rawText, userConsentGiven } = req.body;

    if (!userConsentGiven) {
      return res.status(403).json({ error: "User consent for AI data processing is required." });
    }

    if (!fileBase64 && !rawText) {
      return res.status(400).json({ error: "No document image or text provided for analysis." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are a medical lab report data extractor and clinical insights AI for HealthLens AI.
Analyze the provided medical lab report (image/PDF or text) and extract structured biomarker findings.

CRITICAL INSTRUCTIONS:
1. Extract ALL biological markers, lab values, measurements, and reference ranges found in the report.
2. For each biomarker, determine:
   - name: standard clinical name (e.g., "Fasting Blood Glucose", "Hemoglobin A1c", "TSH", "Total Cholesterol")
   - value: numeric value as a number (e.g. 110, 5.8)
   - unit: unit string (e.g. "mg/dL", "%", "uIU/mL")
   - referenceRange: standard range string (e.g. "70 - 99", "< 5.7")
   - category: one of ["Metabolic", "Lipids", "Hematology", "Thyroid", "Renal", "Liver", "Vitamins", "Hormones", "General"]
   - status: one of ["normal", "borderline", "high", "low", "critical"]
3. Provide an overall executive summary of the lab report:
   - summaryText: clear, patient-friendly summary (2-3 paragraphs) explaining key findings, what is normal, and what requires attention.
   - keyObservations: array of strings with 3-5 key bullet takeaways.
   - recommendedQuestionsForDoctor: array of 3-5 specific questions the patient should ask their physician based on these results.
   - riskLevel: one of ["low", "moderate", "high"] based on out-of-range markers.
4. Privacy: Do NOT include patient name, doctor name, address, or PII in your output.
5. Disclaimer: Always frame findings as informational for discussion with a doctor.

Return ONLY a valid JSON object with the following schema:
{
  "biomarkers": [
    {
      "name": "string",
      "value": number,
      "unit": "string",
      "referenceRange": "string",
      "category": "string",
      "status": "normal" | "borderline" | "high" | "low" | "critical"
    }
  ],
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
      model: "gemini-2.5-flash",
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
      error: "Failed to analyze lab report document.",
      details: err.message || String(err)
    });
  }
});

// Endpoint: Multi-Report Trend Insights & Recommendations
apiRouter.post("/trend-insights", async (req, res) => {
  try {
    const { reportHistory, userConsentGiven } = req.body;

    if (!userConsentGiven) {
      return res.status(403).json({ error: "User consent required for health analytics." });
    }

    if (!reportHistory || !Array.isArray(reportHistory) || reportHistory.length === 0) {
      return res.status(400).json({ error: "No report history provided." });
    }

    const ai = getGeminiClient();

    const sanitizedHistory = reportHistory.map((rep: any) => ({
      date: rep.reportDate,
      title: rep.title,
      biomarkers: (rep.biomarkers || []).map((b: any) => ({
        name: b.name,
        value: b.value,
        unit: b.unit,
        status: b.status,
        category: b.category
      }))
    }));

    const prompt = `You are a clinical biomarker analytics expert for HealthLens AI.
Analyze this user's historical lab reports across time and identify longitudinal trends, positive trajectories, areas of concern, and evidence-based health recommendations.

User Report History:
${JSON.stringify(sanitizedHistory, null, 2)}

Provide an in-depth longitudinal health analysis with:
1. overallTrendSummary: 2-3 paragraph synthesis of health progression across reports.
2. keyTrends: array of objects with { biomarkerName, direction ("improving"|"worsening"|"stable"), summary, recommendation }.
3. lifestyleActionables: array of 3-5 specific lifestyle, nutrition, sleep, or exercise habits backed by clinical guidelines.
4. flaggedRisks: array of markers that remain consistently out of range or are showing negative momentum.
5. positiveMilestones: array of markers that have normalized or improved.

Return ONLY a JSON object matching this schema:
{
  "overallTrendSummary": "string",
  "keyTrends": [
    {
      "biomarkerName": "string",
      "direction": "improving" | "worsening" | "stable",
      "summary": "string",
      "recommendation": "string"
    }
  ],
  "lifestyleActionables": ["string"],
  "flaggedRisks": ["string"],
  "positiveMilestones": ["string"]
}
`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
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
      data: parsedData
    });
  } catch (err: any) {
    console.error("Error in /trend-insights:", err);
    res.status(500).json({
      success: false,
      error: "Failed to generate health trend insights.",
      details: err.message || String(err)
    });
  }
});

// Endpoint: Doctor Visit Summary Generator
apiRouter.post("/doctor-summary-ai", async (req, res) => {
  try {
    const { reportHistory } = req.body;
    if (!reportHistory || reportHistory.length === 0) {
      return res.status(400).json({ error: "No lab reports selected for summary." });
    }

    const ai = getGeminiClient();

    const sanitizedHistory = reportHistory.map((rep: any) => ({
      date: rep.reportDate,
      title: rep.title,
      biomarkers: (rep.biomarkers || []).map((b: any) => ({
        name: b.name,
        value: b.value,
        unit: b.unit,
        status: b.status,
        range: b.referenceRange
      }))
    }));

    const prompt = `You are a clinical physician assistant tool creating a concise, high-yield "Doctor Visit Prep Brief".
Review these lab reports and synthesize a 1-page structured briefing for the patient's upcoming physician consultation.

Report Data:
${JSON.stringify(sanitizedHistory, null, 2)}

Requirements:
1. Patient Overview: concise recap of recent lab history.
2. Primary Topics to Discuss: 3-4 key clinical priorities or out-of-range trends.
3. Out-Of-Range Highlights: clear bullet list of abnormal markers with dates and values.
4. Suggested Physician Questions: 4 specific, actionable questions for the doctor (e.g. retesting timelines, dosage adjustments, specialist referrals).
5. Lifestyle / Medication Notes: items the patient should mention to their doctor.

Return ONLY a JSON object with schema:
{
  "visitGoal": "string",
  "keyTopics": ["string"],
  "abnormalBiomarkers": [
    {
      "name": "string",
      "latestValue": "string",
      "status": "string",
      "clinicalNote": "string"
    }
  ],
  "questionsForDoctor": ["string"],
  "discussionPoints": ["string"]
}
`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
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
      data: parsedData
    });
  } catch (err: any) {
    console.error("Error in /doctor-summary-ai:", err);
    res.status(500).json({
      success: false,
      error: "Failed to generate doctor visit summary.",
      details: err.message || String(err)
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
    error: err?.message || "An internal server error occurred.",
    details: String(err)
  });
});

export default app;
