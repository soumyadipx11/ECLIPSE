import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Trash2, 
  Eye, 
  FileText, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuditLogEntry } from '../types';

interface PrivacyCenterProps {
  auditLogs: AuditLogEntry[];
  onClearAllData: () => Promise<void>;
}

export const PrivacyCenter: React.FC<PrivacyCenterProps> = ({
  auditLogs,
  onClearAllData
}) => {
  const { userProfile, updateConsent } = useAuth();
  const [clearing, setClearing] = useState(false);
  const [showPiiDemo, setShowPiiDemo] = useState(false);
  const [showConfirmWipeModal, setShowConfirmWipeModal] = useState(false);
  const [wipeSuccess, setWipeSuccess] = useState(false);

  const handleToggleConsent = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await updateConsent(e.target.checked);
  };

  const executeWipeAllData = async () => {
    setClearing(true);
    try {
      await onClearAllData();
      setWipeSuccess(true);
      setShowConfirmWipeModal(false);
    } catch (e) {
      console.error("Delete error:", e);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#ec003f] dark:text-rose-400" />
            Privacy, Security & Audit Logs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Privacy by Design: isolated user storage, automatic PII scrubbing, explicit consent controls, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md px-3.5 py-2 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>256-Bit Encrypted Data Isolation</span>
        </div>
      </div>

      {/* Grid: Consent & Data Deletion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Explicit Consent Settings */}
        <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-[#ec003f]" />
            AI Processing Consent & Privacy
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Your personal health records are completely isolated in your account. No patient data is ever used for model training.
          </p>

          <div className="p-4 bg-white/10 dark:bg-slate-950/15 rounded-2xl border border-white/10 dark:border-white/5 backdrop-blur-sm space-y-3 text-xs">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={userProfile?.privacyConsent ?? true}
                onChange={handleToggleConsent}
                className="mt-0.5 rounded border-slate-700 text-[#ec003f] focus:ring-[#ec003f]"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  Explicit AI Report Analysis Consent
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                  Allows server-side extraction and trend analysis on scrubbed lab report data.
                </span>
              </div>
            </label>
          </div>

          <button
            onClick={() => setShowPiiDemo(!showPiiDemo)}
            className="text-xs text-[#ec003f] dark:text-rose-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            {showPiiDemo ? 'Hide PII Scrubbing Example' : 'View PII Scrubbing Demonstration'}
          </button>

          {showPiiDemo && (
            <div className="p-3.5 bg-slate-950/90 text-slate-300 rounded-2xl text-[11px] space-y-2 border border-slate-800/80 font-mono backdrop-blur-md">
              <div>
                <span className="text-rose-400 font-bold block">Raw Input (Before Scrubbing):</span>
                <span className="text-slate-400">"Patient: John Doe, DOB: 1985-04-12, MRN: 948102, Lab: Quest. Test: Fasting Blood Sugar: 98 mg/dL"</span>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-rose-400 font-bold block">Sent to AI Model (After PII Removal):</span>
                <span className="text-rose-300">"[PII REMOVED] Lab: Quest. Test: Fasting Blood Sugar: 98 mg/dL (70-99)"</span>
              </div>
            </div>
          )}
        </div>

        {/* Permanent Data Deletion */}
        <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Permanent Account Data Wipe
          </h2>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Complying with India's <strong>DPDP Act, 2023</strong> (Digital Personal Data Protection Act) and the <strong>ABDM Health Data Guidelines</strong>, you have full authority to permanently delete all stored health records and audit logs at any time.
          </p>

          <div className="p-4 bg-rose-500/10 border border-rose-500/20 backdrop-blur-md rounded-2xl text-xs text-rose-700 dark:text-rose-300 space-y-2">
            <span className="font-bold flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Irreversible Action
            </span>
            <p className="text-[11px] leading-relaxed">
              Clicking below will delete all uploaded lab reports, extracted values, and historical trend points permanently from Firestore.
            </p>
          </div>

          {wipeSuccess && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#ec003f]" />
              <span>All personal health reports, extracted biomarker metrics, and audit logs have been wiped successfully.</span>
            </div>
          )}

          <button
            onClick={() => {
              setWipeSuccess(false);
              setShowConfirmWipeModal(true);
            }}
            disabled={clearing}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-2xl text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {clearing ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Delete All Reports & Health Records</span>
          </button>
        </div>
      </div>

      {/* Wipe All Data Modal */}
      {showConfirmWipeModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white/90 dark:bg-slate-950/90 border border-white/20 dark:border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Permanent Account Data Wipe?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">DPDP Act, 2023 & ABDM Health Data Rights</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action will permanently delete <strong className="text-slate-900 dark:text-white">ALL uploaded lab reports, extracted biomarker values, smart alerts, and audit logs</strong>. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmWipeModal(false)}
                disabled={clearing}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeWipeAllData}
                disabled={clearing}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {clearing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Wiping All Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Everything</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Append-Only Audit Log Stream */}
      <div className="bg-white/30 dark:bg-slate-950/25 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-[#ec003f]" />
              Append-Only Security & Privacy Audit Logs
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable activity log tracking uploads, edits, AI analyses, and deletions.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/50 backdrop-blur-md px-3 py-1 rounded-xl">
            {auditLogs.length} Log Entries
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No audit logs recorded yet. Upload a report or run AI analysis to generate audit events.
          </div>
        ) : (
          <div className="overflow-x-auto border border-white/10 dark:border-white/5 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-white/10 dark:bg-slate-950/20 text-slate-600 dark:text-slate-300 font-bold border-b border-white/10 dark:border-white/5">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 text-slate-500 font-mono text-[11px]">{log.timestamp}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'UPLOAD_REPORT' ? 'bg-rose-100 text-rose-700' :
                        log.action === 'DELETE_REPORT' ? 'bg-amber-100 text-amber-700' :
                        log.action === 'AI_ANALYSIS' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
