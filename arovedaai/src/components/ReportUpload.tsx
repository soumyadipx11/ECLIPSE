import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Lightbulb,
  Sparkles, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Edit3, 
  Save, 
  Database,
  Eye,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { LabBiomarker, LabReport, ReportAiSummary } from '../types';
import { safeFetchJson } from '../lib/api';
import { cleanUndefined, cleanUserErrorMessage } from '../utils/sanitize';
import { normalizeBiomarkerName } from '../utils/biomarkerNormalizer';
import { useAuth } from '../context/AuthContext';

interface ReportUploadProps {
  onSaveReport: (report: Omit<LabReport, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  onLoadDemo: () => void;
  onSuccess: () => void;
}

export const ReportUpload: React.FC<ReportUploadProps> = ({
  onSaveReport,
  onLoadDemo,
  onSuccess
}) => {
  const { userProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insightsRef = useRef<HTMLDivElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [userConsent, setUserConsent] = useState<boolean>(true);

  useEffect(() => {
    if (userProfile && userProfile.privacyConsent !== undefined) {
      setUserConsent(userProfile.privacyConsent);
    }
  }, [userProfile]);

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Extracted Result State for Verification
  const [reportTitle, setReportTitle] = useState<string>('Laboratory Test Report');
  const [testDate, setTestDate] = useState<string>('');
  const [isDateMissing, setIsDateMissing] = useState<boolean>(false);
  const [labName, setLabName] = useState<string>('Quest Diagnostics');
  const [extractedItems, setExtractedItems] = useState<LabBiomarker[]>([]);
  const [aiSummary, setAiSummary] = useState<ReportAiSummary | undefined>(undefined);
  const [anonymizedTextSent, setAnonymizedTextSent] = useState<string>('');
  const [isExtracted, setIsExtracted] = useState<boolean>(false);

  // Immediate Insights & Recommendations after save
  const [savedReportInsights, setSavedReportInsights] = useState<{
    title: string;
    testDate: string;
    labName: string;
    aiSummary?: ReportAiSummary;
    extractedItems: LabBiomarker[];
  } | null>(null);

  useEffect(() => {
    if (savedReportInsights) {
      const timer = setTimeout(() => {
        if (insightsRef.current) {
          insightsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [savedReportInsights]);

  // Clear / Discard Draft
  const handleDiscardDraft = () => {
    setSelectedFile(null);
    setFileBase64(null);
    setRawText('');
    setExtractedItems([]);
    setReportTitle('Laboratory Test Report');
    setTestDate('');
    setIsExtracted(false);
    setIsDateMissing(false);
    setError(null);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);

      const reader = new FileReader();
      reader.onload = () => {
        setFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setError(null);

      const reader = new FileReader();
      reader.onload = () => {
        setFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Submit to Backend Express /api/ocr-analyze
  const handleAnalyze = async () => {
    if (!selectedFile && !rawText) {
      setError('Please select a PDF or image report file, or paste raw lab report text.');
      return;
    }

    if (!userConsent) {
      setError('Explicit consent is required prior to AI report processing.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const mimeType = selectedFile
        ? (selectedFile.type || (selectedFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png'))
        : 'text/plain';

      const resData = await safeFetchJson('/api/ocr-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: fileBase64,
          mimeType: mimeType,
          rawText: rawText,
          userConsentGiven: userConsent
        })
      });

      if (!resData.success) {
        throw new Error(resData.details ? `${resData.error} (${resData.details})` : (resData.error || 'Failed to extract lab data.'));
      }

      const d = resData.data || {};
      setReportTitle(d.title || selectedFile?.name?.replace(/\.[^/.]+$/, "") || 'Laboratory Test Report');
      
      // Check if test date is present
      const hasValidDate = Boolean(d.testDate && typeof d.testDate === 'string' && d.testDate.trim().length === 10);
      setTestDate(hasValidDate ? d.testDate : (new Date().toISOString().split('T')[0]));
      setIsDateMissing(!hasValidDate);

      setLabName(d.labName || 'Laboratory Center');
      setAnonymizedTextSent(d.anonymizedTextSentToAi || 'PII removed before AI processing.');

      // Map extracted data with unique IDs for editing
      const rawList = Array.isArray(d.extractedData) && d.extractedData.length > 0
        ? d.extractedData
        : (Array.isArray(d.biomarkers) ? d.biomarkers : []);

      const mappedItems: LabBiomarker[] = rawList.map((b: any, index: number) => {
        const rawTestName = b.testName || b.name || b.biomarkerName || `Test ${index + 1}`;
        const testName = normalizeBiomarkerName(rawTestName);
        const rawVal = b.value;
        const valNum = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal || '0').replace(/[^0-9.-]/g, '')) || 0;
        const unit = b.unit || 'mg/dL';
        const referenceRange = b.referenceRange || b.range || 'Standard';
        const flagStatus = String(b.flag || b.status || 'normal').toLowerCase();
        const isAbnormal = flagStatus === 'high' || flagStatus === 'low' || flagStatus === 'critical' || flagStatus === 'borderline' || b.isAbnormal === true;
        const flag = flagStatus.includes('high') || flagStatus.includes('critical') ? 'high' : (flagStatus.includes('low') ? 'low' : 'normal');

        return {
          id: `extracted-${index}-${Date.now()}`,
          testName,
          category: b.category || 'General',
          value: valNum,
          unit,
          referenceRange,
          minRef: b.minRef !== undefined ? Number(b.minRef) : undefined,
          maxRef: b.maxRef !== undefined ? Number(b.maxRef) : undefined,
          flag,
          isAbnormal,
          notes: b.notes || b.clinicalNote || ''
        };
      });

      setExtractedItems(mappedItems);

      const summaryObj = d.aiSummary || {
        overview: d.summary?.summaryText || d.summaryText || 'Lab report processed successfully.',
        observations: d.summary?.keyObservations || d.keyObservations || [],
        educationalNote: 'Consult your physician regarding lab report findings.'
      };
      setAiSummary(summaryObj);
      setIsExtracted(true);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(cleanUserErrorMessage(err, 'An error occurred while analyzing the lab report document. Please try again.'));
    } finally {
      setAnalyzing(false);
    }
  };

  // Add custom biomarker row
  const handleAddRow = () => {
    const newItem: LabBiomarker = {
      id: `custom-${Date.now()}`,
      testName: 'New Test',
      category: 'General',
      value: 0,
      unit: 'mg/dL',
      referenceRange: '0 - 100',
      flag: 'normal',
      isAbnormal: false
    };
    setExtractedItems([...extractedItems, newItem]);
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    setExtractedItems(extractedItems.filter(i => i.id !== id));
  };

  // Edit item field
  const handleItemChange = (id: string, field: keyof LabBiomarker, val: any) => {
    setExtractedItems(extractedItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: val };
        if (field === 'flag') {
          updated.isAbnormal = val === 'high' || val === 'low';
        }
        return updated;
      }
      return item;
    }));
  };

  // Save to Health Record
  const handleSave = async () => {
    if (!extractedItems.length) {
      setError('At least one extracted biomarker is required to save a report.');
      return;
    }

    if (!testDate || testDate.trim() === '') {
      setError('Test Date is required. Please enter or select the lab test date before saving.');
      setIsDateMissing(true);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSaveReport(cleanUndefined({
        title: reportTitle,
        testDate,
        labName,
        fileType: selectedFile ? (selectedFile.type.includes('pdf') ? 'pdf' : 'image') : 'manual',
        fileName: selectedFile?.name || 'manual_entry.txt',
        status: 'processed',
        extractedData: extractedItems,
        aiSummary: aiSummary,
        anonymizedTextSentToAi: anonymizedTextSent
      }));

      // Save insights and recommendations to display THEN AND THERE
      setSavedReportInsights({
        title: reportTitle,
        testDate,
        labName,
        aiSummary,
        extractedItems: [...extractedItems]
      });

      // Empty / Reset the Review Structured Lab Data section
      setSelectedFile(null);
      setFileBase64(null);
      setRawText('');
      setExtractedItems([]);
      setReportTitle('Laboratory Test Report');
      setTestDate('');
      setIsExtracted(false);
      setIsDateMissing(false);

      onSuccess();
    } catch (err: any) {
      console.error("Save error:", err);
      setError(cleanUserErrorMessage(err, 'Failed to save report to database. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-0.5 bg-rose-600 rounded-full"></span>
            <span className="text-[11px] font-extrabold tracking-widest text-rose-600 dark:text-rose-500 uppercase">
              DIAGNOSTIC GRADE SECURITY
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            Secure Health <span className="italic font-extrabold text-rose-600 dark:text-rose-500">Gateway</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Upload diagnostic imaging, pathology results, and clinical notes directly to our encrypted processing engine. All data is anonymized and processed according to Tier-1 clinical standards.
          </p>
        </div>

        <button
          onClick={onLoadDemo}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold px-4 py-2.5 rounded-2xl text-xs transition-all shadow-sm flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Database className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          Load Demo Lab Data
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Immediate AI Insights & Recommendations Card (Displayed Then and There) */}
      {savedReportInsights && (() => {
        const abnormalItems = savedReportInsights.extractedItems.filter(
          i => i.isAbnormal || ['high', 'low', 'h', 'l', 'critical'].includes(String(i.flag || '').toLowerCase())
        );
        const hasHigh = savedReportInsights.extractedItems.some(
          i => (i.isAbnormal || ['high', 'h', 'critical'].includes(String(i.flag || '').toLowerCase())) &&
          String(i.flag || '').toLowerCase() !== 'low' && String(i.flag || '').toLowerCase() !== 'l'
        );

        const isAbnormalReport = abnormalItems.length > 0;

        const recBgClass = hasHigh
          ? 'bg-rose-500/10 border-rose-500/20'
          : isAbnormalReport
          ? 'bg-amber-500/10 border-amber-500/20'
          : 'bg-emerald-500/10 border-emerald-500/20';

        const recTitleClass = hasHigh
          ? 'text-rose-900 dark:text-rose-200'
          : isAbnormalReport
          ? 'text-amber-900 dark:text-amber-200'
          : 'text-emerald-900 dark:text-emerald-200';

        const recTextClass = hasHigh
          ? 'text-rose-900 dark:text-rose-200'
          : isAbnormalReport
          ? 'text-amber-900 dark:text-amber-200'
          : 'text-emerald-900 dark:text-emerald-200';

        const recBodyTextClass = hasHigh
          ? 'text-rose-800 dark:text-rose-300'
          : isAbnormalReport
          ? 'text-amber-800 dark:text-amber-300'
          : 'text-emerald-800 dark:text-emerald-300';

        const recIconClass = hasHigh
          ? 'text-rose-500'
          : isAbnormalReport
          ? 'text-amber-500'
          : 'text-emerald-500';

        const outerBorderClass = hasHigh
          ? 'border-rose-500/40'
          : isAbnormalReport
          ? 'border-amber-500/40'
          : 'border-emerald-500/40';

        return (
          <div ref={insightsRef} className={`bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border ${outerBorderClass} p-6 shadow-xl space-y-5 animate-in fade-in duration-300 scroll-mt-28 sm:scroll-mt-32`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner ${
                  hasHigh ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' :
                  isAbnormalReport ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    hasHigh ? 'text-rose-600 dark:text-rose-400' :
                    isAbnormalReport ? 'text-amber-600 dark:text-amber-400' :
                    'text-emerald-600 dark:text-emerald-400'
                  }`}>Lab Report Saved & Immediate Insights Ready</span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {savedReportInsights.title} {savedReportInsights.testDate && `(${savedReportInsights.testDate})`}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setSavedReportInsights(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
              >
                Close Insights
              </button>
            </div>

            {/* AI Executive Summary Overview */}
            {savedReportInsights.aiSummary?.overview && (
              <div className="bg-rose-500/5 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-500/20 backdrop-blur-sm text-xs space-y-1">
                <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-rose-500" /> Executive Health Overview
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {savedReportInsights.aiSummary.overview}
                </p>
              </div>
            )}

            {/* Insights Grid: Out-of-Range vs Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Out-of-Range Biomarkers */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl space-y-2">
                <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Key Observations & Flagged Biomarkers ({savedReportInsights.extractedItems.filter(i => i.isAbnormal).length})
                </span>
                {savedReportInsights.extractedItems.filter(i => i.isAbnormal).length > 0 ? (
                  <ul className="space-y-1.5">
                    {savedReportInsights.extractedItems.filter(i => i.isAbnormal).map(item => (
                      <li key={item.id} className="flex items-center justify-between bg-white/10 dark:bg-[#121418]/15 p-2 rounded-xl text-slate-800 dark:text-slate-200 border border-amber-500/25 backdrop-blur-sm">
                        <span className="font-semibold">{normalizeBiomarkerName(item.testName)}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{item.value} {item.unit} ({item.flag.toUpperCase()})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-amber-800 dark:text-amber-300">All analyzed test values in this report are within standard reference ranges.</p>
                )}
              </div>

              {/* Recommendations & Lifestyle Tips */}
              <div className={`${recBgClass} border p-4 rounded-2xl space-y-2 transition-colors`}>
                <span className={`font-bold ${recTitleClass} flex items-center gap-1.5`}>
                  <Lightbulb className={`w-4 h-4 ${recIconClass}`} /> Health Recommendations & Next Steps
                </span>
                {savedReportInsights.aiSummary?.observations && savedReportInsights.aiSummary.observations.length > 0 ? (
                  <ul className={`space-y-1.5 ${recTextClass}`}>
                    {savedReportInsights.aiSummary.observations.map((obs, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className={`${recIconClass} font-bold`}>•</span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={recBodyTextClass}>
                    Maintain balanced nutrition and hydrate well. Schedule regular checkups with your doctor.
                  </p>
                )}
              </div>
            </div>

            {savedReportInsights.aiSummary?.educationalNote && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic border-t border-slate-100 dark:border-slate-800 pt-3">
                💡 {savedReportInsights.aiSummary.educationalNote}
              </p>
            )}
          </div>
        );
      })()}

      {/* Step 1: Upload or Paste Input Form */}
      {!isExtracted && (
        <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-6">
          {/* Drag & Drop File Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-rose-200/40 dark:border-rose-900/40 hover:border-rose-500 dark:hover:border-rose-400 rounded-3xl p-10 text-center cursor-pointer bg-white/10 dark:bg-[#121418]/15 backdrop-blur-sm transition-all space-y-4 max-w-full overflow-hidden"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm border border-rose-100 dark:border-rose-900/40 shrink-0">
              <Upload className="w-7 h-7" />
            </div>

            <div className="space-y-1 max-w-full px-2 overflow-hidden">
              <p
                className="text-base font-bold text-slate-900 dark:text-white truncate max-w-md mx-auto"
                title={selectedFile ? selectedFile.name : undefined}
              >
                {selectedFile ? selectedFile.name : 'Drag & Drop Clinical Records'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Support for PDF, PNG, JPG, and text lab reports. Maximum file size: 15MB.
              </p>
            </div>

            {selectedFile ? (
              <div className="inline-flex max-w-full items-center gap-2 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border border-rose-200 dark:border-rose-900 overflow-hidden">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-xs">Ready for OCR Analysis ({Math.round(selectedFile.size / 1024)} KB)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-3 rounded-2xl text-xs transition-all shadow-md shadow-rose-600/25 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Select from Device
              </button>
            )}
          </div>

          {/* Alternative Raw Text Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Or Paste Raw Lab Text / OCR Text Below
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Fasting Glucose: 98 mg/dL (70-99), Total Cholesterol: 215 mg/dL (<200)..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-2xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 backdrop-blur-md"
            />
          </div>

          {/* Privacy Consent Box */}
          <div className="p-4 rounded-2xl bg-white/30 dark:bg-[#121418]/30 text-slate-700 dark:text-slate-300 text-xs border border-white/30 dark:border-white/10 backdrop-blur-md flex items-start justify-between gap-4">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white block">Explicit AI Privacy Consent</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-1">
                I consent to sending extracted non-identifiable test values to Gemini AI for automated structure extraction and summary. PII is scrubbed prior to API transmission.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={userConsent}
                onChange={(e) => setUserConsent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          {/* Action Button */}
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3.5 rounded-2xl text-xs transition-all shadow-md shadow-rose-600/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {analyzing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running Medical OCR & AI Extraction...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extract Lab Values with AI</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Verification & Manual Correction Table */}
      {isExtracted && (
        <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Extraction Complete - Verify & Edit
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Review Structured Lab Data
              </h2>
            </div>

            <button
              onClick={() => setIsExtracted(false)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
            >
              ← Upload Different File
            </button>
          </div>

          {/* PII Scrubbed Verification Badge */}
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
              <span>PII Scrubbed: Patient names, IDs, and addresses removed before AI analysis.</span>
            </div>
          </div>

          {/* Missing Test Date Warning Prompt */}
          {(!testDate || isDateMissing) && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3 backdrop-blur-md">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 animate-bounce" />
              <div>
                <span className="font-bold block text-sm">Action Required: Enter Test Date</span>
                <span className="text-amber-700 dark:text-amber-300 text-[11px]">
                  No valid test date was detected in the lab report. Please select or enter the date of this test in the field below before saving.
                </span>
              </div>
            </div>
          )}

          {/* Editable Metadata Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md p-4 rounded-2xl border border-white/30 dark:border-white/10 text-xs">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">Report Title</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#121418] border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1 flex items-center justify-between">
                <span>Test Date</span>
                {(!testDate || isDateMissing) && (
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px]">REQUIRED</span>
                )}
              </label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => {
                  setTestDate(e.target.value);
                  if (e.target.value) setIsDateMissing(false);
                }}
                className={`w-full bg-slate-50 dark:bg-[#121418] border rounded-lg p-2 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 ${
                  !testDate || isDateMissing 
                    ? 'border-amber-500 ring-2 ring-amber-500/40 font-bold' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">Laboratory Name</label>
              <input
                type="text"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#121418] border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* AI Executive Summary Card */}
          {aiSummary && (
            <div className="bg-white/10 dark:bg-[#121418]/15 p-4 rounded-xl border border-white/10 dark:border-white/5 backdrop-blur-sm text-xs space-y-2">
              <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> AI Summary Preview
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {aiSummary.overview}
              </p>
            </div>
          )}

          {/* Extracted Data Correction Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Extracted Biomarkers ({extractedItems.length})
              </h3>

              <button
                onClick={handleAddRow}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/40 dark:bg-black/30 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200/60 dark:border-white/10 backdrop-blur-md">
                  <tr>
                    <th className="p-2.5">Test Name</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Value</th>
                    <th className="p-2.5">Unit</th>
                    <th className="p-2.5">Ref Range</th>
                    <th className="p-2.5">Flag</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {extractedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.testName}
                          onChange={(e) => handleItemChange(item.id, 'testName', e.target.value)}
                          className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded p-1 font-semibold text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.category}
                          onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                          className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-700 dark:text-slate-300"
                        />
                      </td>
                      <td className="p-2 w-20">
                        <input
                          type="number"
                          step="any"
                          value={item.value}
                          onChange={(e) => handleItemChange(item.id, 'value', Number(e.target.value))}
                          className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded p-1 font-bold text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="p-2 w-20">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                          className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-600 dark:text-slate-400"
                        />
                      </td>
                      <td className="p-2 w-28">
                        <input
                          type="text"
                          value={item.referenceRange}
                          onChange={(e) => handleItemChange(item.id, 'referenceRange', e.target.value)}
                          className="w-full bg-transparent border border-slate-200 dark:border-slate-700 rounded p-1 text-slate-600 dark:text-slate-400"
                        />
                      </td>
                      <td className="p-2 w-28">
                        <select
                          value={item.flag}
                          onChange={(e) => handleItemChange(item.id, 'flag', e.target.value)}
                          className={`w-full border rounded p-1 font-semibold ${
                            item.flag === 'high' ? 'bg-rose-100 text-rose-700 border-rose-300' :
                            item.flag === 'low' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                            'bg-emerald-100 text-emerald-700 border-emerald-300'
                          }`}
                        >
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="low">Low</option>
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Commit Save & Discard Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleDiscardDraft}
              disabled={saving}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 shrink-0"
              title="Discard this report draft and start fresh"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Discard Draft</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#ec003f] hover:bg-[#ff2b66] text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md shadow-[#ec003f]/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Encrypted Record...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save to Personal Health Record</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
