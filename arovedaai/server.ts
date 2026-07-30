import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

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
    throw new Error("GEMINI_API_KEY environment variable is missing.");
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

// ---------------- API ROUTES ----------------

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "HealthLens AI Server", timestamp: new Date().toISOString() });
});

// Endpoint: OCR & Structured Report Analysis
app.post("/api/ocr-analyze", async (req, res) => {
  try {
    const { fileBase64, mimeType, rawText, userConsentGiven } = req.body;

    if (!userConsentGiven) {
      return res.status(400).json({ 
        error: "User consent is required before processing lab reports with AI." 
      });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are ArovedaAI, a specialized medical report parser and laboratory data extraction engine.
CRITICAL SAFETY & PRIVACY RULES:
1. Strip and ignore ALL Personally Identifiable Information (PII) such as Patient Name, Phone, Address, Patient ID, Hospital Name/ID, SSN.
2. Do NOT diagnose diseases or prescribe treatments/medicines.
3. Extract lab tests with precision: Test Name, Category (e.g., Lipid Profile, Complete Blood Count, Metabolic, Thyroid, Kidney Function, Liver Function, Vitamins, Harmones), numerical Value, Unit, Reference Range, and flag ('normal', 'high', or 'low').
4. Include minRef and maxRef as numerical values if present in the reference range (e.g. range "70 - 99" -> minRef: 70, maxRef: 99; range "< 200" -> minRef: 0, maxRef: 200; range "> 40" -> minRef: 40, maxRef: null).
5. Generate a clear patient-friendly summary: Overview, Normal Values, Abnormal Values, Key Observations, and Educational Note.
6. Always return valid JSON matching the requested JSON structure.
`;

    const promptText = `
Extract laboratory test data from the attached document/text into valid JSON.

JSON Structure required:
{
  "title": "Report title (e.g., Comprehensive Metabolic & Lipid Panel)",
  "testDate": "YYYY-MM-DD or estimated date if not found",
  "labName": "Name of laboratory (e.g., Quest Diagnostics) or Unknown Lab",
  "anonymizedTextSentToAi": "Summary of extracted text with all PII scrubbed",
  "extractedData": [
    {
      "testName": "Exact name of test (e.g. LDL Cholesterol)",
      "category": "Category name",
      "value": 138.5,
      "unit": "mg/dL",
      "referenceRange": "< 100",
      "minRef": 0,
      "maxRef": 100,
      "flag": "high",
      "isAbnormal": true,
      "notes": "Short educational description"
    }
  ],
  "aiSummary": {
    "overview": "Clear patient-friendly overall report explanation.",
    "normalValues": ["List of normal test names with values"],
    "abnormalValues": ["List of abnormal test names with values and flags"],
    "observations": ["3 key educational observations"],
    "educationalNote": "General wellness context."
  }
}

${rawText ? `Raw Report Text (PII Scrubbed): ${scrubPiiFromText(rawText)}` : "Extract from the provided image/pdf document."}
`;

    let contents: any[] = [];

    if (fileBase64 && mimeType) {
      // Remove data URL prefix if present
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, "");
      contents.push({
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType
        }
      });
    }

    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    let responseText = (response.text || "{}").trim();
    responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsedData = JSON.parse(responseText);

    // Append mandatory disclaimer
    if (parsedData.aiSummary) {
      parsedData.aiSummary.disclaimer = "This analysis is for informational and educational purposes only and should not be considered medical advice. Please consult a qualified healthcare professional for diagnosis or treatment.";
    }

    res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Error in /api/ocr-analyze:", err);
    res.status(500).json({ 
      error: "Failed to parse lab report with AI.", 
      details: err.message || String(err) 
    });
  }
});

// Endpoint: Multi-Report Trend Insights & Recommendations
app.post("/api/trend-insights", async (req, res) => {
  try {
    const { reportHistory, userConsentGiven } = req.body;

    if (!userConsentGiven) {
      return res.status(400).json({ error: "User consent required." });
    }

    if (!reportHistory || !Array.isArray(reportHistory) || reportHistory.length === 0) {
      return res.status(400).json({ error: "At least one report is required for trend insights." });
    }

    const ai = getGeminiClient();

    // Sanitize input to send ONLY anonymized lab values
    const anonymizedHistory = reportHistory.map(r => ({
      date: r.testDate,
      lab: r.labName,
      title: r.title,
      biomarkers: (r.extractedData || []).map((b: any) => ({
        name: b.testName,
        val: b.value,
        unit: b.unit,
        ref: b.referenceRange,
        flag: b.flag
      }))
    }));

    const prompt = `
Analyze the following patient lab test history across multiple test dates.

Lab Test History (Anonymized):
${JSON.stringify(anonymizedHistory, null, 2)}

Provide structured JSON insights with:
1. "overallTrajectory": Plain language summary of trends over time (e.g. improving blood sugar, stable kidney function).
2. "keyInsights": Array of 3 to 5 observations (e.g., "Persistent Low Vitamin D across last 2 tests", "Gradual decrease in LDL cholesterol").
3. "lifestyleRecommendations": Array of 4 general, non-medical wellness tips (e.g. hydration, physical activity, balanced diet, discussing values with physician). STRICTLY NO PRESCRIPTIONS OR DRUG DOSAGES.
4. "suggestedReminders": Array of suggested follow-up testing intervals (e.g. "Re-check Vitamin D in 3 months", "Annual Lipid Panel").

Return JSON format:
{
  "overallTrajectory": "...",
  "keyInsights": ["..."],
  "lifestyleRecommendations": ["..."],
  "suggestedReminders": [{"biomarkerName": "...", "intervalMonths": 3, "notes": "..."}]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an AI health insights assistant. Strictly educational, no diagnoses or prescriptions. Always include medical disclaimers.",
        responseMimeType: "application/json"
      }
    });

    let responseText = (response.text || "{}").trim();
    responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(responseText);
    parsed.disclaimer = "This analysis is for informational and educational purposes only and should not be considered medical advice. Please consult a qualified healthcare professional for diagnosis or treatment.";

    res.json({ success: true, insights: parsed });
  } catch (err: any) {
    console.error("Error in /api/trend-insights:", err);
    res.status(500).json({ error: "Failed to generate trend insights.", details: err.message || String(err) });
  }
});

// Endpoint: Doctor Visit Summary Generator
app.post("/api/doctor-summary-ai", async (req, res) => {
  try {
    const { reportHistory } = req.body;
    if (!reportHistory || reportHistory.length === 0) {
      return res.status(400).json({ error: "No reports provided." });
    }

    const ai = getGeminiClient();

    const anonymizedHistory = reportHistory.map((r: any) => ({
      date: r.testDate,
      title: r.title,
      biomarkers: (r.extractedData || []).map((b: any) => ({
        name: b.testName,
        value: b.value,
        unit: b.unit,
        flag: b.flag,
        ref: b.referenceRange
      }))
    }));

    const prompt = `
Generate a concise, 1-page "Doctor Visit Preparation Summary" based on these lab reports:
${JSON.stringify(anonymizedHistory, null, 2)}

Return JSON with:
{
  "latestAbnormalities": [
    { "testName": "...", "value": 138, "unit": "mg/dL", "referenceRange": "< 100", "flag": "high", "testDate": "..." }
  ],
  "keyTrends": [
    { "biomarkerName": "...", "description": "...", "direction": "improving" | "stable" | "declining" }
  ],
  "suggestedQuestions": [
    "Clear, thoughtful question for the patient to ask their physician during the visit"
  ],
  "reportComparisons": [
    { "biomarkerName": "...", "previous": "...", "current": "...", "unit": "..." }
  ],
  "generalNote": "Brief executive summary for the doctor's appointment context."
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let responseText = (response.text || "{}").trim();
    responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(responseText);
    parsed.disclaimer = "This summary is an educational preparation tool for your doctor visit and does not constitute medical diagnosis or treatment.";

    res.json({ success: true, summary: parsed });
  } catch (err: any) {
    console.error("Error in /api/doctor-summary-ai:", err);
    res.status(500).json({ error: "Failed to generate doctor visit summary.", details: err.message || String(err) });
  }
});

// ---------------- VITE / STATIC SERVING ----------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HealthLens AI backend server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
