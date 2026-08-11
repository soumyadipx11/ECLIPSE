import React, { useState } from 'react';
import { UserCheck, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface OnboardingModalProps {
  isOpen: boolean;
  onSave: (age: number, gender: string) => Promise<void>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onSave }) => {
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setError('Please enter a valid age between 1 and 120.');
      return;
    }

    if (!gender) {
      setError('Please select a gender option.');
      return;
    }

    setLoading(true);
    try {
      await onSave(parsedAge, gender);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-250">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#16181d] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Personalize Your AI Experience
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Calibrate Gemini for clinical-grade health assessments</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Welcome to <strong className="text-[#ec003f] font-semibold">ArovedaAI</strong>! To generate tailored AI health summaries, identify precise biomarker trends, and establish demographically accurate reference ranges, please share your age and gender.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Age (Years)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              required
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 28"
              className="w-full bg-slate-50 dark:bg-[#121418] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#ec003f] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Biological Gender
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Male', value: 'Male' },
                { label: 'Female', value: 'Female' },
                { label: 'Non-binary', value: 'Non-binary' },
                { label: 'Prefer not to say', value: 'Prefer not to say' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  className={`px-3 py-2.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    gender === opt.value
                      ? 'bg-[#ec003f]/10 border-[#ec003f] text-[#ec003f] dark:text-[#ff2b66]'
                      : 'bg-slate-50 dark:bg-[#121418] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            key={loading ? "btn-loading" : "btn-idle"}
            type="submit"
            disabled={loading}
            className="w-full bg-[#ec003f] hover:bg-[#ff2b66] text-white font-bold py-3 rounded-xl text-xs transition-colors duration-150 shadow-md shadow-[#ec003f]/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              'Save & Initialize AI Insights'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
