import React, { useState, useEffect, useRef } from 'react';
import { useRecovery, PRESET_SCENARIOS } from '../context/RecoveryContext';
import { 
  HeartPulse, 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Play, 
  ArrowRight,
  RefreshCw,
  Brain,
  AlertTriangle,
  Smile,
  Frown,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EnergyCheckIn } from '../types';

export const CheckInModal: React.FC = () => {
  const { 
    activeCheckInModal, 
    closeCheckInModal, 
    submitCheckIn, 
    isAssessing, 
    openPlayerModal, 
    enterRecoveryMode 
  } = useRecovery();

  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'preset'>('preset');
  const [textInput, setTextInput] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [lastCheckInResult, setLastCheckInResult] = useState<EnergyCheckIn | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!activeCheckInModal) {
      setLastCheckInResult(null);
      setTextInput('');
      setVoiceTranscript('');
      setIsRecording(false);
      setSpeechError(null);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }
  }, [activeCheckInModal]);

  // Handle Speech Recognition
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError("Speech recognition is not supported in this browser. Please type or pick a preset.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setVoiceTranscript(transcript);
        setTextInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setSpeechError("Microphone access was denied. You can type or use one-tap presets.");
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      setIsRecording(false);
    }
  };

  const handlePresetSelect = async (scenarioKey: string) => {
    setInputMode('preset');
    const scenario = PRESET_SCENARIOS[scenarioKey];
    if (!scenario) return;
    setTextInput(scenario.prompt);
    const result = await submitCheckIn(scenario.prompt, 'preset');
    setLastCheckInResult(result);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const result = await submitCheckIn(textInput, inputMode === 'voice' ? 'voice' : 'text');
    setLastCheckInResult(result);
  };

  if (!activeCheckInModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-[#16181c] w-full max-w-2xl max-h-[94dvh] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative my-auto flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 md:p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 bg-gradient-to-r from-teal-50/50 to-emerald-50/30 dark:from-teal-950/20 dark:to-emerald-950/20 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">
                  Quick Energy & Health Check-In
                </h3>
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                  AI Strain Triage
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate sm:line-clamp-2">
                Share how you're feeling right now. ArovedaAI will assess strain, protect your streak, and customize a 3-minute reset.
              </p>
            </div>
          </div>

          <button
            onClick={closeCheckInModal}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {!lastCheckInResult ? (
            <div className="space-y-4 sm:space-y-5">
              {/* Quick Preset Selector */}
              <div>
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  1-Tap Stress & Energy Scenarios
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                  {Object.entries(PRESET_SCENARIOS).map(([key, item]) => {
                    const isHigh = item.strain === 'high';
                    return (
                      <button
                        key={key}
                        onClick={() => handlePresetSelect(key)}
                        disabled={isAssessing}
                        className={`text-left p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all cursor-pointer text-xs flex flex-col justify-between gap-1.5 ${
                          isHigh
                            ? 'bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border-rose-200/60 dark:border-rose-900/40'
                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full gap-1">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-[11px] sm:text-xs truncate">
                            {isHigh ? <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> : <Smile className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            <span className="truncate">{item.title}</span>
                          </span>
                          <span className={`text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                            isHigh ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                          }`}>
                            {item.strain}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          "{item.label}"
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative flex items-center justify-center my-0.5">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="bg-white dark:bg-[#16181c] px-3 text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
                  Or Describe in Your Own Words
                </span>
              </div>

              {/* Custom Input Form */}
              <form onSubmit={handleCustomSubmit} className="space-y-2.5 sm:space-y-3">
                <div className="relative">
                  <textarea
                    rows={2}
                    value={textInput}
                    onChange={(e) => {
                      setTextInput(e.target.value);
                      setInputMode('text');
                    }}
                    placeholder="E.g., Slept only 3 hours, final exam in 2 hours, throbbing headache and feeling overwhelmed..."
                    className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 pb-11 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
                    disabled={isAssessing}
                  />

                  {/* Mic Voice Button */}
                  <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleRecording}
                      disabled={isAssessing}
                      className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs font-semibold ${
                        isRecording
                          ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-500 hover:text-white'
                      }`}
                      title="Dictate with voice"
                    >
                      {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      {isRecording && <span>Listening...</span>}
                    </button>
                  </div>
                </div>

                {speechError && (
                  <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium">
                    {speechError}
                  </p>
                )}

                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-0.5">
                  <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1">
                    <Brain className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    Evaluated securely with Gemini AI
                  </span>

                  <button
                    type="submit"
                    disabled={!textInput.trim() || isAssessing}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    {isAssessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Analyzing Strain...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Run AI Check-In
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* AI Results & Recovery Offer */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 sm:space-y-4"
            >
              {/* Strain Evaluation Card */}
              <div className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border ${
                lastCheckInResult.strainLevel === 'high'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
                  : lastCheckInResult.strainLevel === 'moderate'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
              }`}>
                <div className="flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-2.5">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      lastCheckInResult.strainLevel === 'high' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {lastCheckInResult.strainLevel === 'high' ? <Frown className="w-4 h-4" /> : <Smile className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider opacity-70 block">
                        Assessment
                      </span>
                      <h4 className="text-sm sm:text-base font-extrabold capitalize text-slate-900 dark:text-white">
                        {lastCheckInResult.strainLevel} Strain Level
                      </h4>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[9px] sm:text-[10px] font-bold opacity-70 block">Energy Score</span>
                    <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      {lastCheckInResult.energyScore}<span className="text-xs font-normal opacity-60">/100</span>
                    </span>
                  </div>
                </div>

                {/* AI Empathy & Validation Message */}
                <div className="py-2 sm:py-2.5 space-y-1.5">
                  <p className="text-xs font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                    "{lastCheckInResult.aiEmpathyMessage}"
                  </p>
                  
                  {/* Primary Strain Factors */}
                  {lastCheckInResult.primaryFactors && lastCheckInResult.primaryFactors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {lastCheckInResult.primaryFactors.map((factor, idx) => (
                        <span 
                          key={idx}
                          className="bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        >
                          • {factor}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Streak Shield Notice */}
                {lastCheckInResult.strainLevel === 'high' && (
                  <div className="mt-1.5 p-2.5 bg-amber-500/15 border border-amber-400/30 rounded-xl flex items-center gap-2 text-[11px] sm:text-xs text-amber-900 dark:text-amber-200 font-medium">
                    <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
                    <span>
                      <strong>Streak Shield Activated:</strong> Your daily streak is protected. Resting when fatigued prevents biological burnout.
                    </span>
                  </div>
                )}
              </div>

              {/* 3-Minute Recovery Plan Overview */}
              {lastCheckInResult.recoveryPlan && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {lastCheckInResult.recoveryPlan.title}
                      </h4>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                      3-Min Reset
                    </span>
                  </div>

                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {lastCheckInResult.recoveryPlan.tagline}
                  </p>

                  {/* Steps Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 pt-0.5">
                    {lastCheckInResult.recoveryPlan.steps.map((step, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-2 sm:p-2.5 rounded-xl text-[10px] sm:text-[11px] space-y-0.5">
                        <span className="text-[8px] sm:text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                          Step {idx + 1} • {step.durationSeconds}s
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {step.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 pt-1">
                <button
                  onClick={() => {
                    closeCheckInModal();
                    openPlayerModal();
                  }}
                  className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl sm:rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                  Start 3-Minute Guided Recovery
                </button>

                <button
                  onClick={() => {
                    if (lastCheckInResult.recoveryPlan) {
                      enterRecoveryMode(lastCheckInResult.recoveryPlan, lastCheckInResult.adjustedGoals, lastCheckInResult.primaryFactors?.[0]);
                    }
                    closeCheckInModal();
                  }}
                  className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl sm:rounded-2xl text-xs transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Go to Recovery Canvas
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
