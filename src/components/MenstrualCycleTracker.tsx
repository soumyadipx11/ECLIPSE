import React, { useState } from 'react';
import { 
  Heart, 
  Calendar, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Clock, 
  Activity, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Droplet,
  Info,
  Sliders,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRecovery } from '../context/RecoveryContext';
import { 
  FLOW_LEVEL_CONFIG, 
  MENSTRUAL_SYMPTOMS_LIST, 
  formatCycleDate 
} from '../utils/menstrualCycle';
import { MenstrualFlowLevel, MenstrualPeriodEntry } from '../types';

interface MenstrualCycleTrackerProps {
  compact?: boolean;
}

export const MenstrualCycleTracker: React.FC<MenstrualCycleTrackerProps> = ({ compact = false }) => {
  const { 
    isFemaleUser, 
    isPeriodActive, 
    menstrualState, 
    cycleAnalysis, 
    activatePeriodMode, 
    endPeriodMode, 
    logMenstrualEntry, 
    deleteMenstrualEntry,
    toggleMenstrualTracking
  } = useRecovery();

  const [showOnsetModal, setShowOnsetModal] = useState(false);
  const [showOffsetModal, setShowOffsetModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLogPastModal, setShowLogPastModal] = useState(false);

  // Onset Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [onsetDate, setOnsetDate] = useState(todayStr);
  const [flowLevel, setFlowLevel] = useState<MenstrualFlowLevel>('medium');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['cramps', 'fatigue']);
  const [onsetNotes, setOnsetNotes] = useState('');

  // Offset Form State
  const [offsetDate, setOffsetDate] = useState(todayStr);
  const [offsetNotes, setOffsetNotes] = useState('');

  // Past Log Form State
  const [pastOnset, setPastOnset] = useState(todayStr);
  const [pastOffset, setPastOffset] = useState(todayStr);
  const [pastFlow, setPastFlow] = useState<MenstrualFlowLevel>('medium');
  const [pastSymptoms, setPastSymptoms] = useState<string[]>(['cramps']);
  const [pastNotes, setPastNotes] = useState('');

  if (!isFemaleUser) {
    return null;
  }

  const handleToggleSymptom = (id: string, isPast = false) => {
    if (isPast) {
      setPastSymptoms(prev => 
        prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      );
    } else {
      setSelectedSymptoms(prev => 
        prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      );
    }
  };

  const handleConfirmStartPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    activatePeriodMode(onsetDate, flowLevel, selectedSymptoms, onsetNotes);
    setShowOnsetModal(false);
  };

  const handleConfirmEndPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    endPeriodMode(offsetDate, offsetNotes);
    setShowOffsetModal(false);
  };

  const handleConfirmPastLog = (e: React.FormEvent) => {
    e.preventDefault();
    logMenstrualEntry({
      onsetDate: pastOnset,
      offsetDate: pastOffset,
      flowLevel: pastFlow,
      symptoms: pastSymptoms,
      notes: pastNotes
    });
    setShowLogPastModal(false);
  };

  return (
    <div className="bg-white dark:bg-[#121418] border border-rose-200/80 dark:border-rose-900/30 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-100 dark:border-rose-900/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Droplet className="w-5 h-5 fill-rose-500/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Menstrual Cycle & Wellness
              </h3>
              {isPeriodActive ? (
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500 text-white shadow-xs animate-pulse">
                  🌸 Period Active
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Day {cycleAnalysis.currentCycleDay || 1} • {cycleAnalysis.currentCyclePhase.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isPeriodActive 
                ? 'Special Menstrual Mode active. Daily goal targets are reduced to protect pelvic energy & maintain your streak.'
                : 'Tracks cycle regularity, predicts next period onset, and adapts recovery goals during active bleeding.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isPeriodActive ? (
            <button
              onClick={() => setShowOffsetModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 dark:text-rose-600" />
              <span>Mark Period End (Offset)</span>
            </button>
          ) : (
            <button
              onClick={() => setShowOnsetModal(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Droplet className="w-3.5 h-3.5 fill-white/30" />
              <span>Mark Period Onset (Start)</span>
            </button>
          )}

          <button
            onClick={() => setShowHistoryModal(true)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            title="View Period History & Logs"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cycle Regularity Status Banner */}
      <div className={`p-4 rounded-xl border ${
        !cycleAnalysis.isRegular 
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200' 
          : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/30 text-slate-800 dark:text-slate-200'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 p-2 rounded-lg ${
              !cycleAnalysis.isRegular 
                ? 'bg-amber-500 text-white' 
                : 'bg-rose-500 text-white'
            }`}>
              {!cycleAnalysis.isRegular ? <AlertCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">Cycle Regularity Status</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  !cycleAnalysis.isRegular 
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' 
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {cycleAnalysis.isRegular ? '✅ Regular Cycle' : '⚠️ Irregularity Alert'}
                </span>
              </div>
              <p className="text-xs font-semibold mt-0.5">
                {cycleAnalysis.irregularityReason}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Length / Duration</span>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400">
              {cycleAnalysis.averageCycleLength} days <span className="text-xs font-normal text-slate-500">({cycleAnalysis.averagePeriodDuration}d period)</span>
            </span>
          </div>
        </div>

        {/* Prediction & Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-rose-200/40 dark:border-rose-900/20 text-xs">
          {cycleAnalysis.nextPredictedOnset && !isPeriodActive && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Next predicted period onset: <strong className="text-slate-900 dark:text-white">{formatCycleDate(cycleAnalysis.nextPredictedOnset)}</strong></span>
            </div>
          )}

          {cycleAnalysis.clinicalInsights.length > 0 && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 col-span-1 md:col-span-2">
              <Info className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span><strong>Clinical Insight:</strong> {cycleAnalysis.clinicalInsights[0]}</span>
            </div>
          )}
        </div>
      </div>

      {/* Menstrual Mode Goal Reduction Highlights */}
      {isPeriodActive && (
        <motion.div 
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/30 border border-rose-200 dark:border-rose-900/40 p-3.5 rounded-xl text-xs space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-rose-500" />
              Adjusted Restorative Targets Active
            </span>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-white/80 dark:bg-black/30 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
              🌸 Maintain streak with Rose Squares
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className="bg-white/60 dark:bg-black/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/20">
              <span className="block text-slate-400 text-[10px]">Movement</span>
              <strong className="text-rose-700 dark:text-rose-300">4,000 steps</strong>
              <span className="block text-[9px] text-slate-500">Low-impact walking</span>
            </div>
            <div className="bg-white/60 dark:bg-black/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/20">
              <span className="block text-slate-400 text-[10px]">Cardio / Workout</span>
              <strong className="text-rose-700 dark:text-rose-300">15 mins</strong>
              <span className="block text-[9px] text-slate-500">Restorative yoga</span>
            </div>
            <div className="bg-white/60 dark:bg-black/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/20">
              <span className="block text-slate-400 text-[10px]">Sleep</span>
              <strong className="text-rose-700 dark:text-rose-300">8.5 hrs</strong>
              <span className="block text-[9px] text-slate-500">+0.5h cellular repair</span>
            </div>
            <div className="bg-white/60 dark:bg-black/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/20">
              <span className="block text-slate-400 text-[10px]">Hydration</span>
              <strong className="text-rose-700 dark:text-rose-300">2,400 ml</strong>
              <span className="block text-[9px] text-slate-500">Warm teas & fluids</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Modals */}
      {/* 1. Onset Modal */}
      <AnimatePresence>
        {showOnsetModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#121418] border border-rose-200 dark:border-rose-900/50 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Droplet className="w-5 h-5 fill-rose-500/20" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Mark Period Onset</h3>
                    <p className="text-xs text-slate-500">Activates Period Mode and reduces goal targets.</p>
                  </div>
                </div>
                <button onClick={() => setShowOnsetModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmStartPeriod} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Onset Date</label>
                  <input 
                    type="date"
                    value={onsetDate}
                    onChange={(e) => setOnsetDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Flow Intensity</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(FLOW_LEVEL_CONFIG) as MenstrualFlowLevel[]).map(flow => {
                      const cfg = FLOW_LEVEL_CONFIG[flow];
                      const isSelected = flowLevel === flow;
                      return (
                        <button
                          type="button"
                          key={flow}
                          onClick={() => setFlowLevel(flow)}
                          className={`p-2.5 rounded-xl border text-left transition-all text-xs ${
                            isSelected 
                              ? 'border-rose-500 bg-rose-500/10 font-bold text-rose-700 dark:text-rose-300' 
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{cfg.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-rose-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Current Symptoms</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {MENSTRUAL_SYMPTOMS_LIST.map(sym => {
                      const isChecked = selectedSymptoms.includes(sym.id);
                      return (
                        <button
                          type="button"
                          key={sym.id}
                          onClick={() => handleToggleSymptom(sym.id)}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] text-left transition-all flex items-center justify-between ${
                            isChecked
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-700 dark:text-rose-300 font-semibold'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          <span>{sym.label}</span>
                          {isChecked && <Check className="w-3 h-3 text-rose-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes (Optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g. Mild cramps starting in afternoon"
                    value={onsetNotes}
                    onChange={(e) => setOnsetNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOnsetModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Activate Period Mode
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Offset Modal */}
      <AnimatePresence>
        {showOffsetModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#121418] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Mark Period Offset (End)</h3>
                    <p className="text-xs text-slate-500">Restores standard daily goal targets.</p>
                  </div>
                </div>
                <button onClick={() => setShowOffsetModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmEndPeriod} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Offset (End) Date</label>
                  <input 
                    type="date"
                    value={offsetDate}
                    onChange={(e) => setOffsetDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Final Cycle Notes (Optional)</label>
                  <textarea 
                    rows={2}
                    placeholder="e.g. Bleeding fully resolved, energy returning"
                    value={offsetNotes}
                    onChange={(e) => setOffsetNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOffsetModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs"
                  >
                    End Period Mode & Restore Targets
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#121418] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Menstrual Period History</h3>
                    <p className="text-xs text-slate-500">Tracked period entries and regularity logs.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowHistoryModal(false);
                      setShowLogPastModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Past Cycle</span>
                  </button>

                  <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* History List */}
              <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                {menstrualState.periodHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No menstrual history recorded yet. Click "Log Past Cycle" or activate period mode.
                  </div>
                ) : (
                  menstrualState.periodHistory.map(entry => {
                    const flowCfg = FLOW_LEVEL_CONFIG[entry.flowLevel || 'medium'];
                    return (
                      <div 
                        key={entry.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatCycleDate(entry.onsetDate)}
                              {entry.offsetDate ? ` — ${formatCycleDate(entry.offsetDate)}` : ' (Ongoing)'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${flowCfg.badgeBg}`}>
                              {flowCfg.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                            <span>Duration: <strong className="text-slate-700 dark:text-slate-300">{entry.durationDays || 5} days</strong></span>
                            {entry.cycleLengthDays && (
                              <span>Cycle Gap: <strong className="text-slate-700 dark:text-slate-300">{entry.cycleLengthDays} days</strong></span>
                            )}
                          </div>

                          {entry.symptoms && entry.symptoms.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {entry.symptoms.map(s => {
                                const symObj = MENSTRUAL_SYMPTOMS_LIST.find(item => item.id === s);
                                return (
                                  <span key={s} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300">
                                    {symObj?.label || s}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {entry.notes && (
                            <p className="text-[11px] italic text-slate-500 pt-0.5">"{entry.notes}"</p>
                          )}
                        </div>

                        <button
                          onClick={() => deleteMenstrualEntry(entry.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Log Past Modal */}
      <AnimatePresence>
        {showLogPastModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#121418] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Log Past Menstrual Period</h3>
                    <p className="text-xs text-slate-500">Improves regularity prediction accuracy.</p>
                  </div>
                </div>
                <button onClick={() => setShowLogPastModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmPastLog} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Onset Date</label>
                    <input 
                      type="date"
                      value={pastOnset}
                      onChange={(e) => setPastOnset(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Offset (End) Date</label>
                    <input 
                      type="date"
                      value={pastOffset}
                      onChange={(e) => setPastOffset(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Flow Level</label>
                  <select
                    value={pastFlow}
                    onChange={(e) => setPastFlow(e.target.value as MenstrualFlowLevel)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="spotting">Spotting</option>
                    <option value="light">Light Flow</option>
                    <option value="medium">Medium Flow</option>
                    <option value="heavy">Heavy Flow</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
                  <input 
                    type="text"
                    placeholder="e.g. Standard 5-day cycle"
                    value={pastNotes}
                    onChange={(e) => setPastNotes(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLogPastModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
