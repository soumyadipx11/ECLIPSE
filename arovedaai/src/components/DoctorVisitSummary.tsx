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
import { safeFetchJson } from '../lib/api';
import { normalizeBiomarkerName } from '../utils/biomarkerNormalizer';

// Helper canvas context for normalizing CSS color strings (oklch, oklab, color-mix) to exact RGB/Hex
let colorCanvasCtx: CanvasRenderingContext2D | null = null;
function getCanvasCtx() {
  if (typeof document === 'undefined') return null;
  if (!colorCanvasCtx) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    colorCanvasCtx = canvas.getContext('2d');
  }
  return colorCanvasCtx;
}

function normalizeCssColor(colorStr: string): string {
  if (!colorStr || colorStr === 'transparent' || colorStr === 'rgba(0, 0, 0, 0)') {
    return 'transparent';
  }
  const ctx = getCanvasCtx();
  if (!ctx) return colorStr;
  try {
    ctx.fillStyle = '#000000';
    ctx.fillStyle = colorStr;
    return ctx.fillStyle;
  } catch (e) {
    return colorStr;
  }
}

/**
 * Replace unsupported modern color specifications (oklch, oklab, color-mix, light-dark, color)
 * in CSS strings with standard safe rgba(...) color strings.
 * This is a highly robust workaround for html2canvas crashing on Tailwind CSS v4's modern colors.
 * It uses recursive bracket-matching parsing to perfectly handle nested variables, functions, and calculations.
 */
function replaceUnsupportedColors(cssText: string): string {
  if (!cssText) return '';
  let result = cssText;
  
  const prefixes = ['oklab(', 'oklch(', 'color-mix(', 'light-dark(', 'color('];
  
  for (const fn of prefixes) {
    let index = result.indexOf(fn);
    let loopCount = 0;
    while (index !== -1 && loopCount < 5000) {
      loopCount++;
      let bracketCount = 1;
      let closingIndex = -1;
      
      for (let i = index + fn.length; i < result.length; i++) {
        if (result[i] === '(') {
          bracketCount++;
        } else if (result[i] === ')') {
          bracketCount--;
          if (bracketCount === 0) {
            closingIndex = i;
            break;
          }
        }
      }
      
      if (closingIndex !== -1) {
        const innerContent = result.substring(index + fn.length, closingIndex);
        let safeColor = 'rgba(100, 116, 139, 1)'; // default slate fallback
        
        try {
          if (fn === 'color-mix(') {
            if (innerContent.includes('transparent') && (innerContent.includes('rose') || innerContent.includes('red'))) {
              safeColor = 'rgba(255, 241, 242, 0.5)';
            } else if (innerContent.includes('rose-50') || innerContent.includes('50%')) {
              safeColor = 'rgba(255, 241, 242, 0.6)';
            } else if (innerContent.includes('rose-100') || innerContent.includes('100')) {
              safeColor = 'rgba(254, 226, 226, 1)';
            } else if (innerContent.includes('rose-200') || innerContent.includes('200')) {
              safeColor = 'rgba(254, 205, 211, 1)';
            } else if (innerContent.includes('rose-800') || innerContent.includes('800') || innerContent.includes('rose-900')) {
              safeColor = 'rgba(159, 18, 57, 1)';
            } else if (innerContent.includes('rose') || innerContent.includes('red')) {
              safeColor = 'rgba(225, 29, 72, 1)';
            } else if (innerContent.includes('slate') || innerContent.includes('gray')) {
              safeColor = 'rgba(15, 23, 42, 1)';
            } else {
              safeColor = 'rgba(241, 245, 249, 1)';
            }
          } else if (fn === 'oklch(' || fn === 'oklab(') {
            const parts = innerContent.trim().split(/[\s/]+/);
            let l = parseFloat(parts[0]);
            if (!isNaN(l)) {
              if (parts[0].includes('%')) {
                l = l / 100;
              }
              const cOrA = parseFloat(parts[1]);
              const hOrB = parseFloat(parts[2]);
              let alpha = 1;
              if (parts[3]) {
                alpha = parseFloat(parts[3]);
                if (parts[3].includes('%')) alpha = alpha / 100;
              }
              
              if (fn === 'oklch(') {
                const c = isNaN(cOrA) ? 0 : cOrA;
                const h = isNaN(hOrB) ? 0 : hOrB;
                if (c < 0.04) {
                  const v = Math.round(l * 255);
                  safeColor = `rgba(${v}, ${v}, ${v}, ${alpha})`;
                } else {
                  let r = 128, g = 128, b = 128;
                  if (h >= 340 || h < 50) {
                    r = Math.round(l * 225); g = Math.round(l * 29); b = Math.round(l * 72);
                  } else if (h >= 50 && h < 110) {
                    r = Math.round(l * 234); g = Math.round(l * 179); b = Math.round(l * 8);
                  } else if (h >= 110 && h < 190) {
                    r = Math.round(l * 34); g = Math.round(l * 197); b = Math.round(l * 94);
                  } else if (h >= 190 && h < 270) {
                    r = Math.round(l * 59); g = Math.round(l * 130); b = Math.round(l * 246);
                  } else {
                    r = Math.round(l * 168); g = Math.round(l * 85); b = Math.round(l * 247);
                  }
                  safeColor = `rgba(${Math.min(255, Math.max(0, r))}, ${Math.min(255, Math.max(0, g))}, ${Math.min(255, Math.max(0, b))}, ${alpha})`;
                }
              } else {
                const aVal = isNaN(cOrA) ? 0 : cOrA;
                const bVal = isNaN(hOrB) ? 0 : hOrB;
                const base = l * 255;
                const r = Math.round(base + aVal * 150);
                const g = Math.round(base - aVal * 50 - bVal * 50);
                const b = Math.round(base + bVal * 150);
                safeColor = `rgba(${Math.min(255, Math.max(0, r))}, ${Math.min(255, Math.max(0, g))}, ${Math.min(255, Math.max(0, b))}, ${alpha})`;
              }
            }
          }
        } catch (e) {
          safeColor = 'rgba(100, 116, 139, 1)';
        }
        
        result = result.substring(0, index) + safeColor + result.substring(closingIndex + 1);
        index = result.indexOf(fn, index + safeColor.length);
      } else {
        break;
      }
    }
  }
  
  return result;
}

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
      const resData = await safeFetchJson('/api/doctor-summary-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportHistory: reports })
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
        keyTrends: Array.isArray(rawData.keyTrends) ? rawData.keyTrends : []
      };

      setSummaryData(formattedSummary);
    } catch (err: any) {
      console.error("Doctor summary error:", err);
      setErrorMsg(err.message || "Failed to generate doctor visit summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Download PDF using html2canvas & jsPDF
  const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    setErrorMsg(null);
    setDownloading(true);

    let cloneContainer: HTMLDivElement | null = null;
    const styleElements = Array.from(document.querySelectorAll('style')) as HTMLStyleElement[];
    const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];

    const originalStyleTexts = styleElements.map(el => el.textContent || '');
    const disabledLinks: HTMLLinkElement[] = [];
    const linkReplacements: HTMLStyleElement[] = [];

    try {
      // 1. Convert unsupported colors in inline <style> elements to safe RGBA color strings
      styleElements.forEach(el => {
        if (el.textContent) {
          el.textContent = replaceUnsupportedColors(el.textContent);
        }
      });

      // 2. Fetch and convert unsupported colors in loaded stylesheet <link> tags, replacing them temporarily with safe style blocks
      for (const link of linkElements) {
        try {
          const response = await fetch(link.href);
          if (response.ok) {
            let cssText = await response.text();
            cssText = replaceUnsupportedColors(cssText);
            
            const tempStyle = document.createElement('style');
            tempStyle.textContent = cssText;
            document.head.appendChild(tempStyle);
            linkReplacements.push(tempStyle);
            
            link.disabled = true;
            disabledLinks.push(link);
          }
        } catch (err) {
          console.warn("Failed to fetch link stylesheet for oklch cleaning:", err);
        }
      }

      const originalEl = printableRef.current;

      // Create an offscreen wrapper with a fixed desktop-standard width (800px)
      // so mobile viewport scaling does not compress or distort the PDF layout
      cloneContainer = document.createElement('div');
      cloneContainer.style.position = 'absolute';
      cloneContainer.style.left = '-9999px';
      cloneContainer.style.top = '0px';
      cloneContainer.style.width = '800px';
      cloneContainer.style.backgroundColor = '#ffffff';
      cloneContainer.style.zIndex = '-9999';

      const clone = originalEl.cloneNode(true) as HTMLDivElement;
      clone.style.width = '800px';
      clone.style.maxWidth = 'none';
      clone.style.margin = '0';
      clone.style.boxSizing = 'border-box';
      clone.style.padding = '32px';

      // Ensure any table inside clone takes full width without scrollbars
      const cloneTables = clone.querySelectorAll('table');
      cloneTables.forEach((tbl) => {
        (tbl as HTMLElement).style.minWidth = '100%';
        (tbl as HTMLElement).style.width = '100%';
      });

      cloneContainer.appendChild(clone);
      document.body.appendChild(cloneContainer);

      // Short delay to ensure browser layout engine settles
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          // 1. Sanitize all style elements in clonedDoc
          const clonedStyles = Array.from(clonedDoc.querySelectorAll('style'));
          clonedStyles.forEach(s => {
            if (s.textContent) {
              s.textContent = replaceUnsupportedColors(s.textContent);
            }
          });

          // 2. Sanitize all element inline style attributes in clonedDoc
          const allClonedElements = Array.from(clonedDoc.querySelectorAll('*')) as HTMLElement[];
          allClonedElements.forEach(el => {
            if (el.style && el.style.cssText) {
              if (
                el.style.cssText.includes('okl') ||
                el.style.cssText.includes('color-mix') ||
                el.style.cssText.includes('light-dark') ||
                el.style.cssText.includes('color(')
              ) {
                el.style.cssText = replaceUnsupportedColors(el.style.cssText);
              }
            }
          });

          // 3. Convert target elements' computed styles to explicit safe RGB inline styles
          if (printableRef.current) {
            const origNodes = [printableRef.current, ...Array.from(printableRef.current.querySelectorAll('*'))] as HTMLElement[];
            const clonedRoot = clonedDoc.querySelector('[data-pdf-printable-root="true"]') as HTMLElement || clonedDoc.querySelector('div');
            
            if (clonedRoot) {
              const clonedNodes = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll('*'))] as HTMLElement[];
              
              origNodes.forEach((origEl, i) => {
                const cloneEl = clonedNodes[i];
                if (origEl && cloneEl && cloneEl.style) {
                  try {
                    const comp = window.getComputedStyle(origEl);
                    if (comp.color) {
                      const safeColor = normalizeCssColor(comp.color);
                      if (safeColor && safeColor !== 'transparent') {
                        cloneEl.style.color = safeColor;
                      }
                    }
                    if (comp.backgroundColor && comp.backgroundColor !== 'rgba(0, 0, 0, 0)' && comp.backgroundColor !== 'transparent') {
                      const safeBg = normalizeCssColor(comp.backgroundColor);
                      if (safeBg) {
                        cloneEl.style.backgroundColor = safeBg;
                      }
                    }
                    if (comp.borderColor && comp.borderColor !== 'rgba(0, 0, 0, 0)' && comp.borderColor !== 'transparent') {
                      const safeBorder = normalizeCssColor(comp.borderColor);
                      if (safeBorder) {
                        cloneEl.style.borderColor = safeBorder;
                      }
                    }
                  } catch (e) {
                    // ignore
                  }
                }
              });
            }
          }

          // 4. Force clean inline-block display & vertical alignment for icons, text, and badges
          const clonedRootEl = (clonedDoc.querySelector('[data-pdf-printable-root="true"]') as HTMLElement) || clonedDoc.body;
          if (clonedRootEl) {
            clonedRootEl.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

            // Override Tailwind preflight display:block on svg and img elements in PDF clone
            const mediaEls = Array.from(clonedRootEl.querySelectorAll('svg, img')) as HTMLElement[];
            mediaEls.forEach(el => {
              el.style.display = 'inline-block';
              el.style.verticalAlign = 'middle';
              el.style.position = 'static';
              el.style.top = '0px';
              el.style.transform = 'none';
            });

            // Ensure flex headers center icons and text alignment cleanly
            const flexHeaders = Array.from(clonedRootEl.querySelectorAll('.flex, [class*="flex"]')) as HTMLElement[];
            flexHeaders.forEach(f => {
              f.style.display = 'flex';
              f.style.alignItems = 'center';
            });

            // Table headers and cells vertical centering
            const cells = Array.from(clonedRootEl.querySelectorAll('th, td')) as HTMLElement[];
            cells.forEach(cell => {
              cell.style.verticalAlign = 'middle';
              cell.style.lineHeight = '1.25';
            });

            // Headings and paragraphs line-height
            const textEls = Array.from(clonedRootEl.querySelectorAll('h1, h2, h3, p, span')) as HTMLElement[];
            textEls.forEach(el => {
              if (!el.getAttribute('data-flag-badge')) {
                el.style.lineHeight = '1.25';
              }
            });

            // Flag badges alignment
            const flagBadges = Array.from(clonedRootEl.querySelectorAll('[data-flag-badge="true"]')) as HTMLElement[];
            flagBadges.forEach(badge => {
              badge.style.display = 'inline-block';
              badge.style.verticalAlign = 'middle';
              badge.style.lineHeight = '1.2';
              badge.style.padding = '2px 6px';
              badge.style.margin = '0';
              badge.style.position = 'static';
              if (badge.parentElement) {
                badge.parentElement.style.verticalAlign = 'middle';
              }
            });
          }
        }
      });

      // Remove offscreen container
      if (document.body.contains(cloneContainer)) {
        document.body.removeChild(cloneContainer);
        cloneContainer = null;
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      // A4 dimensions: 210mm x 297mm
      const margin = 10; // 10mm side and top/bottom margins
      const pdfWidth = 210 - margin * 2; // 190mm printable width
      const pdfPageHeight = 297 - margin * 2; // 277mm printable height per page

      const scaledImgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = scaledImgHeight;
      let position = margin;

      // First page rendering with 10mm margins
      pdf.addImage(imgData, 'PNG', margin, position, pdfWidth, scaledImgHeight);
      heightLeft -= pdfPageHeight;

      // Handle multi-page documents if content exceeds single page height
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (scaledImgHeight - heightLeft);
        pdf.addImage(imgData, 'PNG', margin, position, pdfWidth, scaledImgHeight);
        heightLeft -= pdfPageHeight;
      }

      const fileName = `ArovedaAI_Doctor_Visit_Summary_${new Date().toISOString().split('T')[0]}.pdf`;

      // Attempt primary download method
      try {
        pdf.save(fileName);
      } catch (saveErr) {
        console.warn("Primary pdf.save failed, attempting fallback blob link:", saveErr);
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (err: any) {
      console.error("PDF generation error:", err);
      setErrorMsg("Failed to export PDF file: " + (err?.message || "Please try again."));
    } finally {
      // 3. Restore all original styles and clean up temporary tags
      styleElements.forEach((el, index) => {
        el.textContent = originalStyleTexts[index];
      });

      disabledLinks.forEach(link => {
        link.disabled = false;
      });

      linkReplacements.forEach(tempStyle => {
        if (tempStyle.parentNode) {
          tempStyle.parentNode.removeChild(tempStyle);
        }
      });

      if (cloneContainer && document.body.contains(cloneContainer)) {
        document.body.removeChild(cloneContainer);
      }
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
                  <thead className="bg-rose-100 text-rose-900 font-bold" style={{ backgroundColor: '#ffe4e6', color: '#881337' }}>
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
