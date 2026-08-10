# ArovedaAI — Clinical Biomarker Analytics & AI Health Companion

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg)](https://expressjs.com/)
[![Google Gemini API](https://img.shields.io/badge/Gemini_API-3.6_Flash-4285f4.svg)](https://ai.google.dev/)

ArovedaAI is an intelligent, secure personal health platform that parses diagnostic lab reports, extracts complex clinical biomarkers, tracks longitudinal health trends, and equips patients with actionable health insights and physician visit summaries.

---

## ✨ Key Features

- 📄 **AI-Powered Multi-Page OCR Lab Extraction**:
  - Automatically processes PDF documents and medical images using Google Gemini 3.6 Flash vision.
  - Extracts test names, numerical values, units, reference intervals, and flags out-of-range results.
  - Features intelligent normalization that strictly distinguishes ambiguous test names across labs (e.g., distinguishing **VLDL Cholesterol** from **LDL Cholesterol**, **HbA1c**, **Fasting Blood Sugar**, **ALT/SGPT**, **TSH**, etc.).

- 📈 **Longitudinal Biomarker Trend Tracking**:
  - Interactive visualization powered by Recharts to observe biomarker trajectories across multiple historical lab reports.
  - Highlights healthy reference corridors, borderline flags, and critical ranges over time.

- 🩺 **Doctor Visit Summary Generator (Exportable PDF)**:
  - Generates concise, structured clinical summaries tailored for physician consultations.
  - Includes recent abnormalities, biomarker trend shifts, and custom-generated discussion questions for your healthcare provider.
  - One-click PDF export using `jspdf` and `html2canvas`.

- 🤖 **Interactive AI Health Assistant**:
  - Context-aware conversational assistant trained on clinical literature.
  - Explains medical terminology, offers dietary/lifestyle context, and suggests relevant questions to ask your doctor.

- 🔒 **Secure & Privacy-Conscious Architecture**:
  - Client-side storage and optional Firebase Firestore synchronization.
  - All Gemini API calls are securely proxied server-side to protect API keys.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, Motion
- **Backend**: Express.js, TypeScript (`tsx` for dev, `esbuild` for production bundle)
- **AI Integration**: `@google/genai` (Gemini 3.6 Flash)
- **Export & Utilities**: `jsPDF`, `html2canvas`
- **Database / Auth**: Firebase Firestore & Firebase Auth (Optional Cloud Sync)

---

## 🩺 Medical Disclaimer

ArovedaAI is an informational tool designed to help users organize and understand their diagnostic lab results. **It does not provide medical advice, diagnosis, or treatment.** Always consult a qualified healthcare professional regarding any medical condition or before making changes to your health regimen.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
