import React, { useState, useRef } from 'react';
import { 
  Stethoscope, 
  Download, 
  FileText, 
  AlertTriangle, 
  HelpCircle, 
  Sparkles, 
  Printer, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';
import { LabReport, DoctorVisitSummaryData } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface DoctorVisitSummaryProps {
  reports: LabReport[];
}

export const DoctorVisitSummary: React.FC<DoctorVisitSummaryProps> = ({ reports }) => {
  const printableRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [summaryData, setSummaryData] = useState<DoctorVisitSummaryData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate Doctor Visit Preparation Data
  const handleGenerateDoctorSummary = async () => {
    setErrorMsg(null);
    if (!reports || reports.length === 0) {
      setErrorMsg("Please upload at least one lab report first.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/doctor-summary-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportHistory: reports })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to generate summary.');
      }

      setSummaryData(resData.summary);
    } catch (err: any) {
      console.error("Doctor summary error:", err);
      setErrorMsg("Failed to generate doctor visit summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Download PDF using html2canvas & jsPDF
  const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    setErrorMsg(null);
    setDownloading(true);

    try {
      const canvas = await html2canvas(printableRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`ArovedaAI_Doctor_Visit_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      setErrorMsg("Failed to export PDF file.");
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
      <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            onClick={handleGenerateDoctorSummary}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Generate AI Summary</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading || !summaryData}
            title={!summaryData ? "Please generate the AI Summary first to download" : "Download PDF report"}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold px-4 py-2.5 rounded-2xl text-xs transition-all shadow-sm disabled:opacity-40 flex items-center gap-2 cursor-pointer"
          >
            {downloading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
            <span>Download PDF</span>
          </button>
        </div>
      </div>

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
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-2xl mx-auto">
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
          className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-200 shadow-lg space-y-6 font-sans text-xs"
        >
          {/* Document Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2 text-rose-700 font-bold text-lg">
                 <Stethoscope className="w-6 h-6" />
                <span>ArovedaAI • Physician Discussion Preparation</span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Personal Laboratory Record Overview & Historical Trajectory
              </p>
            </div>

            <div className="text-right text-[11px]">
              <p className="font-semibold text-slate-800">Date Generated: {new Date().toISOString().split('T')[0]}</p>
              <p className="text-slate-500">Reports Analyzed: {reports.length}</p>
            </div>
          </div>

          {/* Executive Note for Physician */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
              Executive Patient Summary
            </span>
            <p className="text-slate-700 leading-relaxed text-xs">
              {summaryData.generalNote}
            </p>
          </div>

          {/* Latest Abnormal Values Callout */}
          {summaryData.latestAbnormalities && summaryData.latestAbnormalities.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Recent Out-of-Range Biomarkers
              </h2>

              <div className="border border-rose-200 bg-rose-50/50 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-rose-100 text-rose-900 font-bold">
                    <tr>
                      <th className="p-2.5">Test Name</th>
                      <th className="p-2.5">Value</th>
                      <th className="p-2.5">Reference Range</th>
                      <th className="p-2.5">Flag</th>
                      <th className="p-2.5">Test Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-200/60">
                    {summaryData.latestAbnormalities.map((item, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-bold text-slate-900">{item.testName}</td>
                        <td className="p-2.5 font-bold text-rose-700">{item.value} {item.unit}</td>
                        <td className="p-2.5 text-slate-600">{item.referenceRange}</td>
                        <td className="p-2.5">
                          <span className="bg-rose-200 text-rose-800 font-bold px-2 py-0.5 rounded text-[10px] uppercase">
                            {item.flag}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600">{item.testDate}</td>
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
                <FileText className="w-4 h-4 text-rose-600" />
                Multi-Report Historical Comparisons
              </h2>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
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
                        <td className="p-2.5 text-slate-600">{comp.previous}</td>
                        <td className="p-2.5 font-bold text-slate-900">{comp.current}</td>
                        <td className="p-2.5 text-slate-500">{comp.unit}</td>
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
                <HelpCircle className="w-4 h-4 text-rose-600" />
                Suggested Questions to Discuss with Your Physician
              </h2>

              <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
                <ul className="list-disc list-inside space-y-1.5 text-slate-800 text-xs">
                  {summaryData.suggestedQuestions.map((q, idx) => (
                    <li key={idx} className="leading-relaxed">{q}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Document Footer Disclaimer */}
          <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
              <span>ArovedaAI Patient Preparation Document • Educational Only</span>
            </div>
            <p>Confidential Personal Health Information</p>
          </div>
        </div>
      )}
    </div>
  );
};
