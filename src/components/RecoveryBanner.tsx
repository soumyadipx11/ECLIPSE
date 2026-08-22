import React from 'react';
import { useRecovery } from '../context/RecoveryContext';
import { ShieldCheck, Sparkles, HeartPulse, Play, Power, ArrowRight, Cloud } from 'lucide-react';
import { motion } from 'motion/react';

interface RecoveryBannerProps {
  onNavigateToRecoveryView?: () => void;
}

export const RecoveryBanner: React.FC<RecoveryBannerProps> = ({ onNavigateToRecoveryView }) => {
  const { state, isCloudSynced, openPlayerModal, exitRecoveryMode } = useRecovery();

  if (!state.isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-gradient-to-r from-teal-900/90 via-emerald-900/90 to-teal-950/90 text-white rounded-3xl p-4 sm:p-5 border border-emerald-500/30 shadow-lg shadow-emerald-950/30 backdrop-blur-md mb-6 relative overflow-hidden"
    >
      {/* Soft ambient background glow */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
            <HeartPulse className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Recovery Mode Active
              </span>
              {isCloudSynced && (
                <span className="bg-teal-500/20 border border-teal-400/30 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-teal-400" /> Saved
                </span>
              )}
              {state.streakShieldActive && (
                <span className="bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" /> {state.currentStreakDays}-Day Streak Safeguarded
                </span>
              )}
            </div>
            <p className="text-xs text-slate-200 mt-0.5 max-w-xl">
              {state.reason ? `Active triage: ${state.reason}. ` : 'High strain detected. '}
              Demanding metrics are simplified and targets are safely reduced.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
          {state.currentPlan && (
            <button
              onClick={openPlayerModal}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/25 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Guided 3-Min Reset
            </button>
          )}

          {onNavigateToRecoveryView && (
            <button
              onClick={onNavigateToRecoveryView}
              className="bg-white/15 hover:bg-white/25 text-white font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition-all border border-white/20 cursor-pointer"
            >
              Recovery Canvas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => exitRecoveryMode()}
            className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all border border-rose-400/40 cursor-pointer"
            title="Turn Off Recovery Mode & restore normal targets"
          >
            <Power className="w-3.5 h-3.5 text-rose-400" />
            Turn Off Recovery Mode
          </button>
        </div>
      </div>
    </motion.div>
  );
};
