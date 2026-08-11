import React, { useState, useRef, useEffect } from 'react';
import { 
  Stethoscope, 
  Download, 
  FileText, 
  AlertTriangle, 
  HelpCircle, 
  Sparkles, 
  Printer, 
  CheckCircle2, 
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { LabReport, DoctorVisitSummaryData } from '../types';
import jsPDF from 'jspdf';
import { safeFetchJson } from '../lib/api';
import { normalizeBiomarkerName } from '../utils/biomarkerNormalizer';
import { cleanUserErrorMessage } from '../utils/sanitize';

interface DoctorVisitSummaryProps {
  reports: LabReport[];
}

export const DoctorVisitSummary: React.FC<DoctorVisitSummaryProps> = ({ reports }) => {
  const { user, userProfile } = useAuth();
  const printableRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [summaryData, setSummaryData] = useState<DoctorVisitSummaryData | null>(() => {
    try {
      const saved = localStorage.getItem('aroveda_doctor_summary');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasNewData = React.useMemo(() => {
    if (!summaryData || !reports || reports.length === 0) return false;

    if (Array.isArray(summaryData.generatedReportIds)) {
      const savedIds = new Set(summaryData.generatedReportIds);
      return reports.some(r => !savedIds.has(r.id)) || reports.length !== summaryData.generatedReportIds.length;
    }

    if (typeof summaryData.generatedReportCount === 'number') {
      return reports.length !== summaryData.generatedReportCount;
    }

    return reports.length > 0;
  }, [summaryData, reports]);

  // Real-time sync with Firestore for cross-device access
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.doctorSummary !== undefined) {
          setSummaryData(data.doctorSummary);
        }
      }
    }, (err) => {
      console.error('Error subscribing to Doctor Visit Summary:', err);
    });
    return () => unsub();
  }, [user]);

  // Persist doctor visit summary to localStorage and Firestore whenever it changes
  useEffect(() => {
    try {
      if (summaryData) {
        localStorage.setItem('aroveda_doctor_summary', JSON.stringify(summaryData));
      } else {
        localStorage.removeItem('aroveda_doctor_summary');
      }
    } catch (e) {
      console.error('Failed to save doctor summary to localStorage', e);
    }

    if (user) {
      setDoc(doc(db, 'users', user.uid), {
        doctorSummary: summaryData,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch((err) => console.error('Error persisting doctor summary to Firestore:', err));
    }
  }, [summaryData, user]);

  // Generate Doctor Visit Preparation Data
  const handleGenerateDoctorSummary = async () => {
    setErrorMsg(null);
    if (!reports || reports.length === 0) {
      setErrorMsg("Please upload at least one lab report first.");
      return;
    }

    setLoading(true);
    try {
      const resData = await safeFetchJson('/api/doctor-summary-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportHistory: reports,
          age: userProfile?.age,
          gender: userProfile?.gender
        })
      });

      if (!resData.success) {
        throw new Error(resData.error || 'Failed to generate summary.');
      }

      const rawData = resData.summary || resData.data || resData;

      const formattedSummary: DoctorVisitSummaryData = {
        patientAgeGroup: rawData.patientAgeGroup || "Adult",
        generalNote: rawData.generalNote || rawData.visitGoal || "Executive Patient Summary prepared based on active laboratory records for upcoming physician discussion.",
        latestAbnormalities: Array.isArray(rawData.latestAbnormalities) && rawData.latestAbnormalities.length > 0
          ? rawData.latestAbnormalities.map((item: any) => ({
              testName: normalizeBiomarkerName(item.testName || item.name || "Biomarker"),
              value: Number(item.value || item.latestValue) || 0,
              unit: item.unit || "",
              referenceRange: item.referenceRange || item.range || "Out of range",
              flag: (item.flag || item.status || "high").toLowerCase() as any,
              testDate: item.testDate || "Recent"
            }))
          : (Array.isArray(rawData.abnormalBiomarkers) ? rawData.abnormalBiomarkers.map((ab: any) => ({
              testName: normalizeBiomarkerName(ab.testName || ab.name || "Biomarker"),
              value: Number(ab.value || ab.latestValue) || 0,
              unit: ab.unit || "",
              referenceRange: ab.referenceRange || ab.range || "Out of range",
              flag: (ab.flag || ab.status || "high").toLowerCase() as any,
              testDate: ab.testDate || "Recent"
            })) : []),
        reportComparisons: Array.isArray(rawData.reportComparisons)
          ? rawData.reportComparisons.map((c: any) => ({
              ...c,
              biomarkerName: normalizeBiomarkerName(c.biomarkerName || c.testName || "Biomarker")
            }))
          : [],
        suggestedQuestions: Array.isArray(rawData.suggestedQuestions) && rawData.suggestedQuestions.length > 0
          ? rawData.suggestedQuestions
          : (Array.isArray(rawData.questionsForDoctor) && rawData.questionsForDoctor.length > 0
              ? rawData.questionsForDoctor
              : [
                  "Are my recent lab values within expected limits for my age and profile?",
                  "Are there any specific follow-up tests or retesting schedules you recommend?",
                  "Do any of these biomarker trends warrant dietary or medication adjustments?"
                ]),
        keyTrends: Array.isArray(rawData.keyTrends) ? rawData.keyTrends : [],
        generatedReportIds: reports.map(r => r.id),
        generatedReportCount: reports.length
      };

      setSummaryData(formattedSummary);
    } catch (err: any) {
      console.error("Doctor summary error:", err);
      setErrorMsg(cleanUserErrorMessage(err, "Failed to generate doctor visit summary. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleClearDoctorSummary = async () => {
    setSummaryData(null);
    try {
      localStorage.removeItem('aroveda_doctor_summary');
    } catch (e) {
      console.error('Failed to clear doctor summary from localStorage', e);
    }

    if (user) {
      await setDoc(doc(db, 'users', user.uid), {
        doctorSummary: null,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch((err) => console.error('Error clearing Doctor Visit Summary in Firestore:', err));
    }
  };

  // Download real vector text-based PDF using jsPDF
  const handleDownloadPdf = () => {
    if (!summaryData) return;
    setErrorMsg(null);
    setDownloading(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const printableWidth = pageWidth - margin * 2; // 180mm
      let yPos = margin;

      // Helper for page break management
      const checkPageBreak = (neededHeight: number) => {
        if (yPos + neededHeight > pageHeight - margin - 10) {
          pdf.addPage();
          yPos = margin + 5;
          // Running top header line
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.3);
          pdf.line(margin, yPos - 3, pageWidth - margin, yPos - 3);
        }
      };

      // --- 1. Document Header ---
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(190, 18, 60); // Rose 700
      pdf.text('ArovedaAI • Physician Discussion Preparation', margin, yPos);

      // Right-aligned Date & Reports count
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139); // Slate 500
      const todayStr = new Date().toISOString().split('T')[0];
      pdf.text(`Date: ${todayStr} | Reports Analyzed: ${reports.length}`, pageWidth - margin, yPos, { align: 'right' });

      yPos += 5;
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Personal Laboratory Record Overview & Historical Trajectory', margin, yPos);

      yPos += 5;
      pdf.setDrawColor(15, 23, 42); // Slate 900
      pdf.setLineWidth(0.8);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // --- 2. Executive Patient Summary ---
      if (summaryData.generalNote) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(30, 41, 59); // Slate 800
        pdf.text('EXECUTIVE PATIENT SUMMARY', margin, yPos);
        yPos += 4;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(51, 65, 85);

        const noteLines = pdf.splitTextToSize(summaryData.generalNote, printableWidth - 8);
        const boxHeight = noteLines.length * 4.2 + 6;

        checkPageBreak(boxHeight + 5);

        pdf.setFillColor(248, 250, 252); // Slate 50
        pdf.setDrawColor(226, 232, 240); // Slate 200
        pdf.setLineWidth(0.3);
        pdf.roundedRect(margin, yPos - 2, printableWidth, boxHeight, 2, 2, 'FD');

        pdf.text(noteLines, margin + 4, yPos + 3);
        yPos += boxHeight + 8;
      }

      // --- 3. Recent Out-of-Range Biomarkers Table ---
      if (summaryData.latestAbnormalities && summaryData.latestAbnormalities.length > 0) {
        checkPageBreak(25);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(190, 18, 60); // Rose 700
        pdf.text('RECENT OUT-OF-RANGE BIOMARKERS', margin, yPos);
        yPos += 5;

        // Table Column Widths (total 180mm)
        const colWidths = [50, 30, 40, 25, 35];
        const colX = [
          margin,
          margin + colWidths[0],
          margin + colWidths[0] + colWidths[1],
          margin + colWidths[0] + colWidths[1] + colWidths[2],
          margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]
        ];

        // Header row background
        pdf.setFillColor(255, 228, 230); // Rose 100
        pdf.setDrawColor(254, 205, 211);
        pdf.rect(margin, yPos - 1, printableWidth, 7, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(136, 19, 55); // Rose 900
        pdf.text('Test Name', colX[0] + 2, yPos + 3.5);
        pdf.text('Value', colX[1] + 2, yPos + 3.5);
        pdf.text('Reference Range', colX[2] + 2, yPos + 3.5);
        pdf.text('Flag', colX[3] + 2, yPos + 3.5);
        pdf.text('Test Date', colX[4] + 2, yPos + 3.5);

        yPos += 7;

        summaryData.latestAbnormalities.forEach((item, i) => {
          checkPageBreak(8);

          // Row background striping
          if (i % 2 === 1) {
            pdf.setFillColor(255, 241, 242);
            pdf.rect(margin, yPos - 1, printableWidth, 7, 'F');
          }

          pdf.setDrawColor(241, 245, 249);
          pdf.line(margin, yPos + 6, margin + printableWidth, yPos + 6);

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(15, 23, 42);
          const testNameText = pdf.splitTextToSize(item.testName, colWidths[0] - 3)[0] || item.testName;
          pdf.text(testNameText, colX[0] + 2, yPos + 3.5);

          pdf.setTextColor(190, 18, 60);
          pdf.text(`${item.value} ${item.unit}`, colX[1] + 2, yPos + 3.5);

          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(71, 85, 105);
          pdf.text(item.referenceRange || 'N/A', colX[2] + 2, yPos + 3.5);

          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(159, 18, 57);
          pdf.text(String(item.flag).toUpperCase(), colX[3] + 2, yPos + 3.5);

          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(71, 85, 105);
          pdf.text(item.testDate || 'N/A', colX[4] + 2, yPos + 3.5);

          yPos += 7;
        });

        yPos += 6;
      }

      // --- 4. Multi-Report Historical Comparisons Table ---
      if (summaryData.reportComparisons && summaryData.reportComparisons.length > 0) {
        checkPageBreak(25);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59);
        pdf.text('MULTI-REPORT HISTORICAL COMPARISONS', margin, yPos);
        yPos += 5;

        const compWidths = [65, 40, 40, 35];
        const compX = [
          margin,
          margin + compWidths[0],
          margin + compWidths[0] + compWidths[1],
          margin + compWidths[0] + compWidths[1] + compWidths[2]
        ];

        pdf.setFillColor(241, 245, 249); // Slate 100
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(margin, yPos - 1, printableWidth, 7, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(51, 65, 85);
        pdf.text('Biomarker Name', compX[0] + 2, yPos + 3.5);
        pdf.text('Previous Value', compX[1] + 2, yPos + 3.5);
        pdf.text('Current Value', compX[2] + 2, yPos + 3.5);
        pdf.text('Unit', compX[3] + 2, yPos + 3.5);

        yPos += 7;

        summaryData.reportComparisons.forEach((comp, i) => {
          checkPageBreak(8);

          if (i % 2 === 1) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(margin, yPos - 1, printableWidth, 7, 'F');
          }

          pdf.setDrawColor(241, 245, 249);
          pdf.line(margin, yPos + 6, margin + printableWidth, yPos + 6);

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(15, 23, 42);
          const nameText = pdf.splitTextToSize(comp.biomarkerName, compWidths[0] - 3)[0] || comp.biomarkerName;
          pdf.text(nameText, compX[0] + 2, yPos + 3.5);

          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(71, 85, 105);
          pdf.text(String(comp.previous), compX[1] + 2, yPos + 3.5);

          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(15, 23, 42);
          pdf.text(String(comp.current), compX[2] + 2, yPos + 3.5);

          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 116, 139);
          pdf.text(comp.unit || '', compX[3] + 2, yPos + 3.5);

          yPos += 7;
        });

        yPos += 6;
      }

      // --- 5. Key Trends & Trajectory ---
      if (summaryData.keyTrends && summaryData.keyTrends.length > 0) {
        checkPageBreak(20);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59);
        pdf.text('KEY BIOMARKER TRENDS & OBSERVED TRAJECTORY', margin, yPos);
        yPos += 5;

        summaryData.keyTrends.forEach((trend) => {
          const trendText = `${trend.biomarkerName}: ${trend.description}`;
          const lines = pdf.splitTextToSize(`• ${trendText}`, printableWidth - 5);
          checkPageBreak(lines.length * 4 + 2);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          pdf.setTextColor(51, 65, 85);
          pdf.text(lines, margin + 2, yPos);
          yPos += lines.length * 4 + 2;
        });

        yPos += 4;
      }

      // --- 6. Suggested Questions for Physician ---
      if (summaryData.suggestedQuestions && summaryData.suggestedQuestions.length > 0) {
        checkPageBreak(20);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(190, 18, 60); // Rose 700
        pdf.text('SUGGESTED QUESTIONS TO DISCUSS WITH YOUR PHYSICIAN', margin, yPos);
        yPos += 5;

        summaryData.suggestedQuestions.forEach((q, idx) => {
          const lines = pdf.splitTextToSize(`${idx + 1}. ${q}`, printableWidth - 5);
          checkPageBreak(lines.length * 4 + 2);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          pdf.setTextColor(30, 41, 59);
          pdf.text(lines, margin + 2, yPos);
          yPos += lines.length * 4 + 2;
        });

        yPos += 4;
      }

      // --- 7. Page Footer on All Pages ---
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(148, 163, 184); // Slate 400

        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        pdf.text('ArovedaAI Patient Preparation Document • Educational Only', margin, pageHeight - 7);
        pdf.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
      }

      // Save PDF
      const fileName = `ArovedaAI_Doctor_Visit_Summary_${todayStr}.pdf`;
      pdf.save(fileName);

    } catch (err: any) {
      console.error("PDF generation error:", err);
      setErrorMsg("Failed to export PDF file: " + (err?.message || "Please try again."));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Error Message Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 backdrop-blur-md rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold underline text-[11px] ml-2">Dismiss</button>
        </div>
      )}
      <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-0.5 bg-rose-600 rounded-full"></span>
            <span className="text-[10px] font-extrabold tracking-widest text-rose-600 dark:text-rose-500 uppercase">
              PHYSICIAN APPOINTMENT PREPARATION
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            Doctor Visit <span className="italic font-extrabold text-rose-600 dark:text-rose-500">Summary</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            Generate a clean, downloadable 1-page summary formatted for discussion during your physician appointment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            key={loading ? "btn-loading" : "btn-idle"}
            onClick={handleGenerateDoctorSummary}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-colors duration-150 shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0" />
            )}
            <span>{summaryData ? 'Regenerate AI Summary' : 'Generate AI Summary'}</span>
          </button>

          <button
            key={downloading ? "btn-downloading" : "btn-idle"}
            onClick={handleDownloadPdf}
            disabled={downloading || !summaryData}
            title={!summaryData ? "Please generate the AI Summary first to download" : "Download PDF report"}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold px-4 py-2.5 rounded-2xl text-xs transition-colors duration-150 shadow-sm disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
          >
            {downloading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
            ) : (
              <Download className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>Download PDF</span>
          </button>

          {summaryData && (
            <button
              onClick={handleClearDoctorSummary}
              disabled={loading}
              title="Clear Doctor Visit Summary"
              className="bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700/60 font-bold px-3 py-2.5 rounded-2xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* New Data Available Prompt Banner */}
      {summaryData && hasNewData && (
        <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-rose-800 dark:text-rose-200 block sm:inline">
                New Lab Data Available!
              </span>
              <span className="text-xs text-rose-700/80 dark:text-rose-300/80 block sm:inline sm:ml-1.5">
                New health records have been added since this summary was last generated.
              </span>
            </div>
          </div>
          <button
            key={loading ? "btn-regen" : "btn-idle"}
            onClick={handleGenerateDoctorSummary}
            disabled={loading}
            className="bg-[#ec003f] hover:bg-[#ff2b66] text-white font-bold px-4 py-2 rounded-2xl text-xs transition-colors duration-150 shadow-md shadow-[#ec003f]/25 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>Regenerating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Regenerate Doctor Summary</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Conditionally render preparation view or the printable PDF document */}
      {!summaryData ? (
        <div className="space-y-6">
          {reports.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/20 backdrop-blur-md rounded-2xl p-8 text-center space-y-3 max-w-2xl mx-auto">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">No Lab Reports Available</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  To prepare your Physician Discussion Summary, you must first upload at least one health record. Please go to the <strong>Upload</strong> or <strong>Timeline</strong> section to add your lab results.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md border border-white/30 dark:border-white/10 rounded-3xl p-8 text-center space-y-4 max-w-2xl mx-auto shadow-sm">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Physician Report Summary Prepared</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  You have <strong>{reports.length}</strong> active health report{reports.length > 1 ? 's' : ''} available. Click the <strong>Generate AI Summary</strong> button above to prepare a professional, structured overview optimized for discussions with your physician.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Printable Sheet Area */
        <div
          ref={printableRef}
          data-pdf-printable-root="true"
          className="bg-white text-slate-900 p-4 sm:p-8 rounded-2xl border border-slate-200 shadow-lg space-y-6 font-sans text-xs overflow-hidden w-full"
        >
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2 text-rose-700 font-bold text-base sm:text-lg">
                 <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                <span>ArovedaAI • Physician Discussion Preparation</span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Personal Laboratory Record Overview & Historical Trajectory
              </p>
            </div>

            <div className="text-left sm:text-right text-[11px]">
              <p className="font-semibold text-slate-800">Date Generated: {new Date().toISOString().split('T')[0]}</p>
              <p className="text-slate-500">Reports Analyzed: {reports.length}</p>
            </div>
          </div>

          {/* Executive Note for Physician */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
              Executive Patient Summary
            </span>
            <p className="text-slate-700 leading-relaxed text-xs break-words">
              {summaryData.generalNote}
            </p>
          </div>

          {/* Latest Abnormal Values Callout */}
          {summaryData.latestAbnormalities && summaryData.latestAbnormalities.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 mb-2" style={{ color: '#be123c' }}>
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" style={{ color: '#e11d48' }} />
                <span>Recent Out-of-Range Biomarkers</span>
              </h2>

              <div className="border border-rose-200 bg-rose-50/50 rounded-xl overflow-x-auto" style={{ backgroundColor: 'rgba(255, 241, 242, 0.5)', borderColor: '#fecdd3' }}>
                <table className="w-full text-xs text-left min-w-[480px] sm:min-w-0">
                  <thead className="bg-rose-100 text-rose-900 font-bold border-b border-rose-200" style={{ backgroundColor: '#ffe4e6', color: '#881337' }}>
                    <tr>
                      <th className="p-2.5 align-middle">Test Name</th>
                      <th className="p-2.5 align-middle">Value</th>
                      <th className="p-2.5 align-middle">Reference Range</th>
                      <th className="p-2.5 align-middle">Flag</th>
                      <th className="p-2.5 align-middle">Test Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-200/60">
                    {summaryData.latestAbnormalities.map((item, i) => (
                      <tr key={i}>
                        <td className="p-2.5 align-middle font-bold text-slate-900">{item.testName}</td>
                        <td className="p-2.5 align-middle font-bold text-rose-700 whitespace-nowrap" style={{ color: '#be123c' }}>{item.value} {item.unit}</td>
                        <td className="p-2.5 align-middle text-slate-600 whitespace-nowrap">{item.referenceRange}</td>
                        <td className="p-2.5 align-middle" style={{ verticalAlign: 'middle' }}>
                          <span
                            data-flag-badge="true"
                            className="bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase inline-block align-middle"
                            style={{ backgroundColor: '#ffe4e6', color: '#9f1239', borderColor: '#fca5a5', verticalAlign: 'middle', lineHeight: '1.2', display: 'inline-block', textAlign: 'center' }}
                          >
                            {item.flag}
                          </span>
                        </td>
                        <td className="p-2.5 align-middle text-slate-600 whitespace-nowrap">{item.testDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Long-Term Comparison Table */}
          {summaryData.reportComparisons && summaryData.reportComparisons.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-2">
                <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Multi-Report Historical Comparisons</span>
              </h2>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[400px] sm:min-w-0">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Biomarker Name</th>
                      <th className="p-2.5">Previous Value</th>
                      <th className="p-2.5">Current Value</th>
                      <th className="p-2.5">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaryData.reportComparisons.map((comp, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-semibold text-slate-900">{comp.biomarkerName}</td>
                        <td className="p-2.5 text-slate-600 whitespace-nowrap">{comp.previous}</td>
                        <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">{comp.current}</td>
                        <td className="p-2.5 text-slate-500 whitespace-nowrap">{comp.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Suggested Questions for Doctor */}
          {summaryData.suggestedQuestions && summaryData.suggestedQuestions.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 mb-2">
                <HelpCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Suggested Questions to Discuss with Your Physician</span>
              </h2>

              <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
                <ul className="list-disc list-inside space-y-1.5 text-slate-800 text-xs">
                  {summaryData.suggestedQuestions.map((q, idx) => (
                    <li key={idx} className="leading-relaxed break-words">{q}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Document Footer Disclaimer */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>ArovedaAI Patient Preparation Document • Educational Only</span>
            </div>
            <p>Confidential Personal Health Information</p>
          </div>
        </div>
      )}
    </div>
  );
};
