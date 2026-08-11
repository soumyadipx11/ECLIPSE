import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar, 
  Building, 
  Trash2, 
  Eye, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  X, 
  ShieldCheck,
  Tag
} from 'lucide-react';
import { LabReport } from '../types';
import { normalizeBiomarkerName } from '../utils/biomarkerNormalizer';

interface ReportTimelineProps {
  reports: LabReport[];
  onDeleteReport: (id: string, title: string) => Promise<void>;
  onNavigateToUpload: () => void;
}

export const ReportTimeline: React.FC<ReportTimelineProps> = ({
  reports,
  onDeleteReport,
  onNavigateToUpload
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedLab, setSelectedLab] = useState('ALL');
  const [selectedFlag, setSelectedFlag] = useState<'ALL' | 'ABNORMAL'>('ALL');

  const [activeReportModal, setActiveReportModal] = useState<LabReport | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const confirmAndDelete = async () => {
    if (!confirmDeleteTarget) return;
    const { id, title } = confirmDeleteTarget;
    setDeletingId(id);
    try {
      await onDeleteReport(id, title);
      if (activeReportModal?.id === id) {
        setActiveReportModal(null);
      }
      setConfirmDeleteTarget(null);
    } catch (err) {
      console.error("Delete report error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Derive unique years & labs
  const years = useMemo(() => {
    const set = new Set<string>();
    reports.forEach(r => {
      if (r.testDate && r.testDate.length >= 4) {
        set.add(r.testDate.slice(0, 4));
      }
    });
    return Array.from(set).sort().reverse();
  }, [reports]);

  const labs = useMemo(() => {
    const set = new Set<string>();
    reports.forEach(r => {
      if (r.labName) set.add(r.labName);
    });
    return Array.from(set).sort();
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchSearch = searchTerm === '' || 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.labName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.extractedData || []).some(b => b.testName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchYear = selectedYear === 'ALL' || (r.testDate && r.testDate.startsWith(selectedYear));
      const matchLab = selectedLab === 'ALL' || r.labName === selectedLab;
      const matchFlag = selectedFlag === 'ALL' || (r.extractedData || []).some(b => b.isAbnormal);

      return matchSearch && matchYear && matchLab && matchFlag;
    });
  }, [reports, searchTerm, selectedYear, selectedLab, selectedFlag]);

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-0.5 bg-rose-600 rounded-full"></span>
            <span className="text-[10px] font-extrabold tracking-widest text-rose-600 dark:text-rose-500 uppercase">
              CHRONOLOGICAL HEALTH ARCHIVE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            Report History <span className="italic font-extrabold text-rose-600 dark:text-rose-500">Timeline</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Chronological archive of all uploaded laboratory reports with real-time search and filter controls.
          </p>
        </div>

        <button
          onClick={onNavigateToUpload}
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-all shadow-md shadow-rose-600/25 shrink-0 cursor-pointer"
        >
          + Upload New Report
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search test, lab, biomarker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-2xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 backdrop-blur-md"
            />
          </div>

          {/* Filter Year */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-2xl p-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-rose-500 backdrop-blur-md"
            >
              <option value="ALL">All Years ({years.length})</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Filter Lab */}
          <div>
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value)}
              className="w-full bg-white/40 dark:bg-[#121418]/40 border border-white/30 dark:border-white/10 rounded-2xl p-2 text-xs text-slate-900 dark:text-white font-medium backdrop-blur-md"
            >
              <option value="ALL">All Laboratories ({labs.length})</option>
              {labs.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Filter Flag */}
          <div>
            <select
              value={selectedFlag}
              onChange={(e) => setSelectedFlag(e.target.value as any)}
              className="w-full bg-white/40 dark:bg-[#121418]/40 border border-white/30 dark:border-white/10 rounded-2xl p-2 text-xs text-slate-900 dark:text-white font-medium backdrop-blur-md"
            >
              <option value="ALL">All Reports</option>
              <option value="ABNORMAL">Reports with Abnormal Flagged Items</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Timeline List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No lab reports matched your search filters
          </p>
          <p className="text-xs text-slate-400">
            Try adjusting search terms or clear filters to view all reports.
          </p>
        </div>
      ) : (
        <div className="space-y-4 relative">
          {/* Vertical Timeline Line */}
          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200/80 dark:bg-slate-800/80 hidden sm:block" />

          {filteredReports.map((report) => {
            const abnormalList = (report.extractedData || []).filter(b => b.isAbnormal);

            return (
              <div
                key={report.id}
                className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-5 shadow-sm hover:border-rose-300 dark:hover:border-rose-900/50 transition-all relative sm:pl-14"
              >
                {/* Timeline Dot */}
                <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border-2 border-white dark:border-slate-900 absolute left-2 top-5 hidden sm:flex items-center justify-center font-bold text-xs shadow-sm">
                  <FileText className="w-4 h-4" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                      {report.labName} • {report.testDate}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {report.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveReportModal(report)}
                      className="bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-rose-200/80 dark:border-rose-900/40 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>

                    <button
                      onClick={() => setConfirmDeleteTarget({ id: report.id, title: report.title })}
                      disabled={deletingId === report.id}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors disabled:opacity-50"
                      title="Delete report"
                    >
                      {deletingId === report.id ? (
                        <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin block" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Content Breakdown */}
                <div className="mt-3 space-y-2">
                  {report.aiSummary && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {report.aiSummary.overview}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Biomarkers ({report.extractedData?.length || 0}):
                    </span>

                    {abnormalList.length > 0 ? (
                      <span className="bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300/60 dark:border-amber-800/50 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {abnormalList.length} Flagged Abnormal
                      </span>
                    ) : (
                      <span className="bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-300/60 dark:border-emerald-800/50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> All Values Normal
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Details Modal */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/95 dark:bg-[#16181c] border border-white/80 dark:border-white/10 backdrop-blur-2xl rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  {activeReportModal.labName} • {activeReportModal.testDate}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {activeReportModal.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmDeleteTarget({ id: activeReportModal.id, title: activeReportModal.title })}
                  disabled={deletingId === activeReportModal.id}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Delete this report"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deletingId === activeReportModal.id ? 'Deleting...' : 'Delete Report'}</span>
                </button>

                <button
                  onClick={() => setActiveReportModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* AI Summary Breakdown */}
            {activeReportModal.aiSummary && (
              <div className="bg-rose-500/5 dark:bg-rose-950/20 rounded-2xl p-4 border border-rose-500/20 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
                  <Sparkles className="w-4 h-4 text-rose-500" /> AI Patient Summary
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {activeReportModal.aiSummary.overview}
                </p>

                {activeReportModal.aiSummary.observations?.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                      Key Observations:
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                      {activeReportModal.aiSummary.observations.map((obs, idx) => (
                        <li key={idx}>{obs}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Full Biomarker Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Laboratory Values Table
              </h3>

              <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-white/40 dark:bg-black/30 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200/60 dark:border-white/10 backdrop-blur-md">
                    <tr>
                      <th className="p-3">Test Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Result Value</th>
                      <th className="p-3">Reference Range</th>
                      <th className="p-3">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {(activeReportModal.extractedData || []).map((b) => (
                      <tr key={b.id} className="hover:bg-rose-50/30 dark:hover:bg-white/5">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{normalizeBiomarkerName(b.testName)}</td>
                        <td className="p-3 text-slate-500">{b.category}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {b.value} <span className="font-normal text-slate-400 text-[10px]">{b.unit}</span>
                        </td>
                        <td className="p-3 text-slate-500">{b.referenceRange}</td>
                        <td className="p-3">
                          {b.flag === 'high' ? (
                            <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-200 dark:border-rose-900/40">
                              HIGH
                            </span>
                          ) : b.flag === 'low' ? (
                            <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-200 dark:border-amber-900/40">
                              LOW
                            </span>
                          ) : (
                            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded text-[10px] border border-emerald-200 dark:border-emerald-900/40">
                              NORMAL
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PII Verification Statement */}
            <div className="p-3 bg-slate-100 dark:bg-[#16181c] text-slate-700 dark:text-slate-400 rounded-2xl text-[11px] flex items-center justify-between border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>Protected Health Record • Patient PII scrubbed from AI logs</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121418] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Lab Report?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Irreversible Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white">"{confirmDeleteTarget.title}"</strong>? All extracted biomarker data and trends associated with this report will be removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteTarget(null)}
                disabled={deletingId !== null}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndDelete}
                disabled={deletingId !== null}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {deletingId ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
