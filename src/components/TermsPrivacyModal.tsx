import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, FileText, Lock, Scale, AlertTriangle, Check } from 'lucide-react';

interface TermsPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export const TermsPrivacyModal: React.FC<TermsPrivacyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms'
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  // Sync initialTab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-white/85 dark:bg-[#121418]/90 border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-[#ec003f]">
                {activeTab === 'terms' ? <Scale className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeTab === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ArovedaAI Legal & Compliance Documentation • Last updated: August 2026
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200/80 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-md px-6 pt-3 gap-2">
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 ${
                activeTab === 'terms'
                  ? 'border-[#ec003f] text-[#ec003f] bg-rose-500/10'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Terms & Conditions
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-b-2 ${
                activeTab === 'privacy'
                  ? 'border-[#ec003f] text-[#ec003f] bg-rose-500/10'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Privacy Policy
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-[60vh]">
            {activeTab === 'terms' ? (
              <div className="space-y-5">
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-200 flex items-start gap-3 text-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Medical Disclaimer</span>
                    ArovedaAI is an informational health tracking and lab report analysis tool powered by artificial intelligence. It does NOT provide medical advice, diagnosis, or treatment plans. Always consult a licensed physician or qualified healthcare provider regarding lab results and medical conditions.
                  </div>
                </div>

                <section className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">1. Acceptance of Terms</h4>
                  <p>
                    By creating an account, uploading diagnostic lab reports, or using ArovedaAI ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must refrain from using the Service.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">2. User Account & Responsibilities</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                    <li>You must provide accurate information when registering and ensure you own or have explicit authority to upload submitted medical documentation.</li>
                    <li>You agree not to upload false, deceptive, or malicious files to the platform.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">3. Artificial Intelligence & Automated Analysis</h4>
                  <p>
                    ArovedaAI utilizes Google Gemini AI models to assist with non-identifiable biomarker extraction and trends. AI summaries are intended strictly to facilitate doctor-patient conversations and should never replace formal diagnostic interpretation by a medical specialist.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">4. Account Termination & Data Erasure</h4>
                  <p>
                    You retain full ownership of your data. You may request permanent deletion of your account and all associated lab reports at any time via the Privacy & Security Center. Upon confirmation, your records will be permanently purged from our database.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">5. Limitation of Liability</h4>
                  <p>
                    To the maximum extent permitted by applicable law, ArovedaAI and its affiliates shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the Service or reliance on any AI-generated insights.
                  </p>
                </section>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-200 flex items-start gap-3 text-xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Zero AI Training on Personal Data</span>
                    Your personal health records are stored in isolated cloud database storage. Your private health data is NEVER sold, shared with advertisers, or used to train public machine learning models.
                  </div>
                </div>

                <section className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">1. Information We Collect</h4>
                  <p>We collect only the minimum necessary information to provide lab analytics and personalized health trend tracking:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Account Credentials:</strong> Email address, encrypted authentication tokens, and user profile preferences.</li>
                    <li><strong>Lab Report Data:</strong> Uploaded medical PDFs, images, extracted biomarker values, reference ranges, and test dates.</li>
                    <li><strong>Usage Data:</strong> User consent flags, dark mode preferences, and security audit logs.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">2. PII Scrubbing & AI Transmissions</h4>
                  <p>
                    Before transmitting lab report text to Gemini AI models for structural extraction or summary generation, Personally Identifiable Information (PII)—including names, addresses, phone numbers, patient ID numbers, and clinic names—is scrubbed server-side.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">3. Data Storage & Encryption</h4>
                  <p>
                    All lab records, biomarker trends, and audit logs are bound to your user ID in Firebase Firestore, protected by strictly enforced user ownership security rules. Data in transit is protected via HTTPS/TLS 1.3 encryption.
                  </p>
                </section>

                <section className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">4. Your Data Rights & Consent Controls</h4>
                  <p>You have the right to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Toggle or revoke your explicit AI Processing consent at any time in the Privacy Center.</li>
                    <li>Export your complete health record in JSON/CSV format.</li>
                    <li>Instantly erase all stored lab reports, audit logs, and AI insights.</li>
                  </ul>
                </section>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Compliant with modern data security & user isolation standards</span>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#ec003f] hover:bg-[#f43f5e] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              I Understand
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
