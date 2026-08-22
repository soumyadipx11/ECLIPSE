import React, { useState, useEffect, useRef } from 'react';
import { useRecovery } from '../context/RecoveryContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  X, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Smile, 
  Meh, 
  Frown, 
  ArrowRight, 
  ArrowLeft,
  Flame,
  Wind,
  ArrowUp,
  ArrowDown,
  PauseCircle,
  Clock,
  Check,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { recoveryAudio } from '../utils/audioSynthesis';

type BreathPhaseType = 'inhale' | 'hold' | 'exhale' | 'hold2';
type StepModeType = 'step_prep' | 'step_active' | 'completed';

interface BreathingPatternPreset {
  id: string;
  name: string;
  shortDesc: string;
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
}

const BREATH_PRESETS: BreathingPatternPreset[] = [
  {
    id: 'calm-4-6',
    name: '4-6 Vagal Flow',
    shortDesc: 'Smooth parasympathetic brake',
    inhale: 4,
    hold1: 0,
    exhale: 6,
    hold2: 0
  },
  {
    id: 'box-4-4',
    name: '4-4-4-4 Box Breathing',
    shortDesc: 'Stress & focus stabilization',
    inhale: 4,
    hold1: 4,
    exhale: 4,
    hold2: 4
  },
  {
    id: 'anxiety-4-7-8',
    name: '4-7-8 Deep Calm',
    shortDesc: 'Anxiety relief & down-regulation',
    inhale: 4,
    hold1: 7,
    exhale: 8,
    hold2: 0
  },
  {
    id: 'sigh-4-2-8',
    name: 'Physiological Sigh',
    shortDesc: 'Rapid heart rate & tension deceleration',
    inhale: 4,
    hold1: 2,
    exhale: 8,
    hold2: 0
  }
];

export const InteractiveRecoveryPlayer: React.FC = () => {
  const { 
    state, 
    activePlayerModal, 
    closePlayerModal, 
    recordSessionCompleted, 
    exitRecoveryMode 
  } = useRecovery();

  const plan = state.currentPlan;

  // 'step_prep' (read current step instructions, timer paused) -> 'step_active' (countdown & activity) -> 'completed'
  const [stepMode, setStepMode] = useState<StepModeType>('step_prep');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stepTimeRemaining, setStepTimeRemaining] = useState<number>(60);
  const [totalTimeRemaining, setTotalTimeRemaining] = useState<number>(180);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [feedbackRating, setFeedbackRating] = useState<'much_better' | 'slightly_calmer' | 'still_drained' | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');

  // Active custom breathing pattern
  const [customPattern, setCustomPattern] = useState<BreathingPatternPreset | null>(null);

  // Precise breath state machine
  const [breathPhase, setBreathPhase] = useState<BreathPhaseType>('inhale');
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState<number>(4);
  const [phaseTotalSeconds, setPhaseTotalSeconds] = useState<number>(4);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [showInstructionModal, setShowInstructionModal] = useState<boolean>(false);

  // Ref tracking current step and breath state to prevent closure drift
  const currentStep = plan?.steps[currentStepIndex];
  const isBreathingStep = currentStep?.actionType === 'breathing';

  // Resolved active pattern
  const activePattern = customPattern || {
    id: 'default',
    name: 'Targeted Breath Cadence',
    shortDesc: 'Calming rhythm',
    inhale: currentStep?.breathingPattern?.inhale || 4,
    hold1: currentStep?.breathingPattern?.hold1 ?? 0,
    exhale: currentStep?.breathingPattern?.exhale || 6,
    hold2: currentStep?.breathingPattern?.hold2 ?? 0
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const breathStateRef = useRef<{
    phase: BreathPhaseType;
    secondsLeft: number;
    totalSeconds: number;
  }>({
    phase: 'inhale',
    secondsLeft: 4,
    totalSeconds: 4
  });

  // Keep ref synchronized with state
  useEffect(() => {
    breathStateRef.current = {
      phase: breathPhase,
      secondsLeft: phaseSecondsLeft,
      totalSeconds: phaseTotalSeconds
    };
  }, [breathPhase, phaseSecondsLeft, phaseTotalSeconds]);

  // Function to initialize breathing cycle
  const initializeBreathing = (pattern: typeof activePattern) => {
    const startPhase: BreathPhaseType = 'inhale';
    const startSec = pattern.inhale || 4;
    setBreathPhase(startPhase);
    setPhaseSecondsLeft(startSec);
    setPhaseTotalSeconds(startSec);
    breathStateRef.current = {
      phase: startPhase,
      secondsLeft: startSec,
      totalSeconds: startSec
    };
    recoveryAudio.playBreathCue('inhale', startSec);
  };

  // Reset to Step 1 prep mode whenever modal opens
  useEffect(() => {
    if (activePlayerModal && plan) {
      setStepMode('step_prep');
      setCurrentStepIndex(0);
      const firstStepSec = plan.steps[0]?.durationSeconds || 60;
      setStepTimeRemaining(firstStepSec);
      const calculatedTotal = (plan.steps || []).reduce((acc, s) => acc + s.durationSeconds, 0) || 180;
      setTotalTimeRemaining(calculatedTotal);
      setIsPlaying(false);
      setFeedbackRating(null);
      setFeedbackNotes('');
      setCustomPattern(null);
      setCompletedCycles(0);
    } else {
      setIsPlaying(false);
      recoveryAudio.stopSpeaking();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [activePlayerModal]);

  // Action: User clicks "Start Step X"
  const startCurrentStepActivity = () => {
    if (!plan || !currentStep) return;
    setStepTimeRemaining(currentStep.durationSeconds || 60);
    setStepMode('step_active');
    setIsPlaying(true);

    recoveryAudio.playBowlChime(432);
    if (currentStep.guidanceAudioText) {
      recoveryAudio.speakGuidance(currentStep.guidanceAudioText);
    }

    if (currentStep.actionType === 'breathing') {
      const pattern = customPattern || {
        id: 'step_default',
        name: 'Breathing Flow',
        shortDesc: 'Step cadence',
        inhale: currentStep.breathingPattern?.inhale || 4,
        hold1: currentStep.breathingPattern?.hold1 ?? 0,
        exhale: currentStep.breathingPattern?.exhale || 6,
        hold2: currentStep.breathingPattern?.hold2 ?? 0
      };
      initializeBreathing(pattern);
    }
  };

  // Move to a specific step's prep screen
  const goToStepPrep = (stepIndex: number) => {
    if (!plan) return;
    setIsPlaying(false);
    recoveryAudio.stopSpeaking();
    setCurrentStepIndex(stepIndex);
    const targetStep = plan.steps[stepIndex];
    setStepTimeRemaining(targetStep?.durationSeconds || 60);
    setStepMode('step_prep');
  };

  // Unified master clock (ticks every 1000ms only when stepMode is 'step_active' and isPlaying is true)
  useEffect(() => {
    if (stepMode !== 'step_active' || !isPlaying || !plan) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      // 1. Overall Total Session Time Countdown
      setTotalTimeRemaining(prevTotal => {
        if (prevTotal <= 1) {
          return 0;
        }
        return prevTotal - 1;
      });

      // 2. Step Time Countdown & Step Completion
      setStepTimeRemaining(prevStep => {
        if (prevStep <= 1) {
          // When current step ends:
          if (currentStepIndex < plan.steps.length - 1) {
            // Move to next step's preparation card!
            const nextIndex = currentStepIndex + 1;
            setCurrentStepIndex(nextIndex);
            setIsPlaying(false);
            setStepMode('step_prep');
            recoveryAudio.playBowlChime(528);
            return plan.steps[nextIndex]?.durationSeconds || 60;
          } else {
            // All steps finished!
            handleComplete();
            return 0;
          }
        }
        return prevStep - 1;
      });

      // 3. Breathing Pacing Engine (if current step is breathing)
      if (isBreathingStep) {
        const { phase, secondsLeft } = breathStateRef.current;
        
        if (secondsLeft <= 1) {
          // Transition to next phase
          let nextPhase: BreathPhaseType = 'inhale';
          let nextSec = activePattern.inhale;

          if (phase === 'inhale') {
            if (activePattern.hold1 && activePattern.hold1 > 0) {
              nextPhase = 'hold';
              nextSec = activePattern.hold1;
            } else {
              nextPhase = 'exhale';
              nextSec = activePattern.exhale;
            }
          } else if (phase === 'hold') {
            nextPhase = 'exhale';
            nextSec = activePattern.exhale;
          } else if (phase === 'exhale') {
            if (activePattern.hold2 && activePattern.hold2 > 0) {
              nextPhase = 'hold2';
              nextSec = activePattern.hold2;
            } else {
              nextPhase = 'inhale';
              nextSec = activePattern.inhale;
              setCompletedCycles(c => c + 1);
            }
          } else if (phase === 'hold2') {
            nextPhase = 'inhale';
            nextSec = activePattern.inhale;
            setCompletedCycles(c => c + 1);
          }

          setBreathPhase(nextPhase);
          setPhaseSecondsLeft(nextSec);
          setPhaseTotalSeconds(nextSec);
          breathStateRef.current = {
            phase: nextPhase,
            secondsLeft: nextSec,
            totalSeconds: nextSec
          };
          recoveryAudio.playBreathCue(nextPhase, nextSec);
        } else {
          const updatedSec = secondsLeft - 1;
          setPhaseSecondsLeft(updatedSec);
          breathStateRef.current = {
            ...breathStateRef.current,
            secondsLeft: updatedSec
          };
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stepMode, isPlaying, currentStepIndex, isBreathingStep, activePattern, plan]);

  const handleComplete = () => {
    setIsPlaying(false);
    setStepMode('completed');
    recoveryAudio.playBowlChime(639);
    recoveryAudio.speakGuidance("Recovery session complete. Notice the shift in your heart rate and muscle tension. You did wonderfully.");
    recordSessionCompleted(plan?.title || '3-Minute Recovery Activity', 180, undefined);
  };

  const handleRestartExercise = () => {
    if (!plan) return;
    setIsPlaying(false);
    recoveryAudio.stopSpeaking();
    setCurrentStepIndex(0);
    const firstStepDuration = plan.steps[0]?.durationSeconds || 60;
    setStepTimeRemaining(firstStepDuration);
    const totalDuration = plan.steps.reduce((acc, s) => acc + (s.durationSeconds || 60), 0);
    setTotalTimeRemaining(totalDuration);
    setCompletedCycles(0);
    setStepMode('step_prep');
    setFeedbackRating(null);
    setFeedbackNotes('');
    recoveryAudio.playBowlChime(432);
    recoveryAudio.speakGuidance("Starting fresh recovery cycle. Settle in and follow the cadence.");
  };

  const handleFinishFeedback = () => {
    if (feedbackRating) {
      exitRecoveryMode({ rating: feedbackRating, notes: feedbackNotes });
    }
    closePlayerModal();
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    recoveryAudio.setMuted(next);
  };

  const skipStep = () => {
    if (!plan) return;
    if (currentStepIndex < plan.steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      goToStepPrep(nextIndex);
    } else {
      handleComplete();
    }
  };

  const selectPresetPattern = (preset: BreathingPatternPreset) => {
    setCustomPattern(preset);
    if (stepMode === 'step_active') {
      initializeBreathing(preset);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Phase Metadata for Visual Styling & High-Contrast Borders
  const getPhaseMeta = () => {
    switch (breathPhase) {
      case 'inhale':
        return {
          title: 'INHALE DEEPLY',
          sub: 'Expand lower ribs & abdomen smoothly through nose',
          colorClass: 'text-emerald-300',
          badgeBg: 'bg-emerald-500/25 text-emerald-200 border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.35)]',
          orbBorder: 'border-2 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.4)]',
          ringColor: '#34d399',
          glowClass: 'from-emerald-500/40 via-teal-500/25 to-transparent',
          bannerBorder: 'border-2 border-emerald-400/60 bg-emerald-950/40 shadow-emerald-500/10',
          icon: <ArrowUp className="w-3.5 h-3.5" />
        };
      case 'hold':
        return {
          title: 'HOLD GENTLY (FULL)',
          sub: 'Drop shoulders away from ears & soften jaw muscles',
          colorClass: 'text-sky-300',
          badgeBg: 'bg-sky-500/25 text-sky-200 border-2 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.35)]',
          orbBorder: 'border-2 border-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.4)]',
          ringColor: '#38bdf8',
          glowClass: 'from-sky-500/40 via-teal-500/25 to-transparent',
          bannerBorder: 'border-2 border-sky-400/60 bg-sky-950/40 shadow-sky-500/10',
          icon: <PauseCircle className="w-3.5 h-3.5" />
        };
      case 'exhale':
        return {
          title: 'SLOW EXHALE',
          sub: 'Prolonged, warm release through lips to engage vagus nerve',
          colorClass: 'text-indigo-300',
          badgeBg: 'bg-indigo-500/25 text-indigo-200 border-2 border-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.35)]',
          orbBorder: 'border-2 border-indigo-400 shadow-[0_0_30px_rgba(129,140,248,0.4)]',
          ringColor: '#818cf8',
          glowClass: 'from-indigo-500/40 via-purple-500/25 to-transparent',
          bannerBorder: 'border-2 border-indigo-400/60 bg-indigo-950/40 shadow-indigo-500/10',
          icon: <ArrowDown className="w-3.5 h-3.5" />
        };
      case 'hold2':
        return {
          title: 'REST & STILLNESS',
          sub: 'Feel natural stillness before next breath wave begins',
          colorClass: 'text-teal-300',
          badgeBg: 'bg-teal-500/25 text-teal-200 border-2 border-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.35)]',
          orbBorder: 'border-2 border-teal-400 shadow-[0_0_30px_rgba(45,212,191,0.4)]',
          ringColor: '#2dd4bf',
          glowClass: 'from-teal-500/40 via-slate-500/25 to-transparent',
          bannerBorder: 'border-2 border-teal-400/60 bg-teal-950/40 shadow-teal-500/10',
          icon: <PauseCircle className="w-3.5 h-3.5" />
        };
    }
  };

  const phaseMeta = getPhaseMeta();

  // 1. Outer Activity Step Timer Border Calculation
  const stepTotalDuration = currentStep?.durationSeconds || 60;
  const stepTimerProgress = Math.max(0, Math.min(1, stepTimeRemaining / Math.max(1, stepTotalDuration)));
  const outerTimerRadius = 100;
  const outerTimerCircumference = 2 * Math.PI * outerTimerRadius; // ~ 628.32
  const outerTimerDashoffset = outerTimerCircumference * (1 - stepTimerProgress);

  if (!activePlayerModal || !plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-950 text-white w-full max-w-xl sm:max-w-2xl max-h-[96dvh] rounded-2xl sm:rounded-3xl border-2 border-emerald-500/40 shadow-2xl overflow-y-auto relative my-auto p-3 sm:p-5 md:p-6"
      >
        {/* Ambient background glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-44 sm:w-64 h-44 sm:h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Controls Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2 sm:pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/20 shrink-0">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-400 block">
                  Step {currentStepIndex + 1} of {plan.steps.length}
                </span>
                {stepMode === 'step_prep' && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase">
                    Instruction
                  </span>
                )}
                {stepMode === 'step_active' && (
                  <span className="bg-emerald-500 text-slate-950 text-[8px] sm:text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase animate-pulse">
                    Live Activity
                  </span>
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] xs:max-w-xs sm:max-w-md">
                {plan.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={toggleMute}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-slate-300 hover:text-white cursor-pointer"
              title={isMuted ? "Unmute sound & voice cues" : "Mute sound & voice cues"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />}
            </button>
            <button
              onClick={closePlayerModal}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-slate-300 hover:text-white cursor-pointer"
              title="Close Player"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Step Progression Indicators */}
        <div className="relative z-10 flex flex-wrap sm:flex-nowrap items-center justify-between pt-2.5 pb-2 gap-2 border-b border-white/5">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full sm:max-w-[72%] scrollbar-none">
            {plan.steps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => goToStepPrep(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  idx === currentStepIndex
                    ? 'bg-emerald-500/25 border-2 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-500/20'
                    : idx < currentStepIndex
                    ? 'bg-emerald-950/50 border border-emerald-700/50 text-emerald-400'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                }`}
                title={`Jump to Step ${idx + 1}: ${s.title}`}
              >
                {idx < currentStepIndex ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold">
                    {idx + 1}
                  </span>
                )}
                <span className="truncate max-w-[90px] sm:max-w-[120px]">
                  {s.title}
                </span>
              </button>
            ))}
          </div>

          <div className="text-[10px] sm:text-xs text-slate-300 font-mono font-bold flex items-center gap-1.5 bg-slate-900 border border-white/15 px-3 py-1 rounded-xl shrink-0">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Total: {formatTime(totalTimeRemaining)}</span>
          </div>
        </div>

        {/* ========================================================
            STAGE 1: SINGLE STEP PREPARATION (Shows one step, no timer running yet)
           ======================================================== */}
        {stepMode === 'step_prep' && currentStep && (
          <motion.div
            key={`prep-${currentStepIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-10 py-2 sm:py-3 space-y-3 sm:space-y-4"
          >
            {/* Step Hero Card */}
            <div className="bg-gradient-to-b from-emerald-500/15 to-white/5 border-2 border-emerald-500/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-left space-y-2.5 sm:space-y-3.5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-400 text-slate-950 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                      Step {currentStepIndex + 1} of {plan.steps.length}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10 px-2 py-0.5 rounded capitalize">
                      {currentStep.actionType}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white pt-0.5">
                    {currentStep.title}
                  </h3>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-emerald-300 bg-slate-950 border-2 border-emerald-500/40 px-2.5 py-1 rounded-xl block shadow-sm">
                    {currentStep.durationSeconds}s Duration
                  </span>
                </div>
              </div>

              {/* Step Instruction */}
              <div className="bg-slate-950/70 border border-white/15 rounded-xl sm:rounded-2xl p-3 sm:p-3.5 text-slate-200 text-xs sm:text-sm leading-relaxed font-medium">
                {currentStep.instruction}
              </div>

              {/* Tips & Somatic Guide */}
              {currentStep.tips && currentStep.tips.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Physiological Cue:
                  </span>
                  <div className="flex flex-col gap-1 text-[11px] sm:text-xs text-slate-300">
                    {currentStep.tips.map((tip, tIdx) => (
                      <p key={tIdx} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span>{tip}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Breathing Cadence Selector (Only on Breathing Step) */}
            {isBreathingStep && (
              <div className="bg-white/5 border-2 border-white/10 rounded-xl sm:rounded-2xl p-3 text-left space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-emerald-400" />
                    Breathing Cadence Guide:
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                    {activePattern.name} ({activePattern.inhale}s In • {activePattern.exhale}s Out)
                  </span>
                </div>

                {/* Inhale - Hold - Exhale preview border tags */}
                <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                  <div className="border-2 border-emerald-400/80 bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                    <ArrowUp className="w-3 h-3 text-emerald-400" /> Inhale: {activePattern.inhale}s
                  </div>
                  {activePattern.hold1 > 0 && (
                    <div className="border-2 border-sky-400/80 bg-sky-500/20 text-sky-300 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                      <PauseCircle className="w-3 h-3 text-sky-400" /> Hold: {activePattern.hold1}s
                    </div>
                  )}
                  <div className="border-2 border-indigo-400/80 bg-indigo-500/20 text-indigo-300 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                    <ArrowDown className="w-3 h-3 text-indigo-400" /> Exhale: {activePattern.exhale}s
                  </div>
                  {activePattern.hold2 > 0 && (
                    <div className="border-2 border-teal-400/80 bg-teal-500/20 text-teal-300 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                      <PauseCircle className="w-3 h-3 text-teal-400" /> Rest: {activePattern.hold2}s
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                  {BREATH_PRESETS.map((preset) => {
                    const isSelected = activePattern.id === preset.id || (activePattern.inhale === preset.inhale && activePattern.exhale === preset.exhale && activePattern.hold1 === preset.hold1);
                    return (
                      <button
                        key={preset.id}
                        onClick={() => selectPresetPattern(preset)}
                        className={`p-2 rounded-xl text-left border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md shadow-emerald-500/20'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-[10px] font-bold block truncate">{preset.name}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{preset.shortDesc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation & Action Bar */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10">
              <div>
                {currentStepIndex > 0 ? (
                  <button
                    onClick={() => goToStepPrep(currentStepIndex - 1)}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Prev Step
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Get comfortable & begin
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={startCurrentStepActivity}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-98"
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                  Start Step {currentStepIndex + 1} ({currentStep.durationSeconds}s)
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================
            STAGE 2: ACTIVE ACTIVITY (Timer running as Border for the activity)
           ======================================================== */}
        {stepMode === 'step_active' && currentStep && (
          <div className="relative z-10 py-1 sm:py-2 space-y-2.5 sm:space-y-3 text-center">
            {/* Step Heading & Info Bar with Built-in Step Timer */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 bg-slate-900/90 border border-white/15 px-3 sm:px-4 py-2 rounded-2xl text-left shadow-md">
              <div className="flex items-center gap-2 min-w-0 max-w-full sm:max-w-[55%]">
                <span className="bg-emerald-400 text-slate-950 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0">
                  Step {currentStepIndex + 1}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                  {currentStep.title}
                </h4>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {/* Step Timer Badge in Header */}
                <div className="bg-slate-950 border-2 border-emerald-400/80 text-emerald-300 px-2.5 py-0.5 sm:py-1 rounded-xl text-[10px] sm:text-[11px] font-mono font-black shadow-sm flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>{stepTimeRemaining}s step</span>
                </div>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setShowInstructionModal(true);
                  }}
                  className="text-[10px] sm:text-[11px] text-slate-300 hover:text-emerald-300 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-xl cursor-pointer font-semibold flex items-center gap-1 transition-colors"
                  title="View Step Guide & Instructions"
                >
                  <BookOpen className="w-3 h-3 text-emerald-400" />
                  <span>Guide</span>
                </button>
              </div>
            </div>

            {/* Inhale / Hold / Exhale Border Chips Tracker (Only on Breathing Step) */}
            {isBreathingStep && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-md mx-auto py-0.5">
                <div
                  className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold border-2 transition-all flex items-center gap-1 ${
                    breathPhase === 'inhale'
                      ? 'border-emerald-400 bg-emerald-500/25 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.4)] scale-105'
                      : 'border-white/10 bg-white/5 text-slate-500 opacity-60'
                  }`}
                >
                  <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>Inhale ({activePattern.inhale}s)</span>
                </div>

                {activePattern.hold1 > 0 && (
                  <div
                    className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold border-2 transition-all flex items-center gap-1 ${
                      breathPhase === 'hold'
                        ? 'border-sky-400 bg-sky-500/25 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.4)] scale-105'
                        : 'border-white/10 bg-white/5 text-slate-500 opacity-60'
                    }`}
                  >
                    <PauseCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Hold ({activePattern.hold1}s)</span>
                  </div>
                )}

                <div
                  className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold border-2 transition-all flex items-center gap-1 ${
                    breathPhase === 'exhale'
                      ? 'border-indigo-400 bg-indigo-500/25 text-indigo-300 shadow-[0_0_12px_rgba(129,140,248,0.4)] scale-105'
                      : 'border-white/10 bg-white/5 text-slate-500 opacity-60'
                  }`}
                >
                  <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>Exhale ({activePattern.exhale}s)</span>
                </div>

                {activePattern.hold2 > 0 && (
                  <div
                    className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold border-2 transition-all flex items-center gap-1 ${
                      breathPhase === 'hold2'
                        ? 'border-teal-400 bg-teal-500/25 text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.4)] scale-105'
                        : 'border-white/10 bg-white/5 text-slate-500 opacity-60'
                    }`}
                  >
                    <PauseCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Rest ({activePattern.hold2}s)</span>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================
                CENTRAL ACTIVITY STAGE: STATIC OUTER TIMER BORDER & ZOOMING INNER BREATH ORB
               ======================================================== */}
            <div className="relative w-52 h-52 xs:w-56 xs:h-56 sm:w-60 sm:h-60 md:w-64 md:h-64 mx-auto flex items-center justify-center my-1.5 sm:my-2 select-none shrink-0">
              {/* 1. STATIC SVG LAYER: Outer Activity Step Timer Border */}
              <svg viewBox="0 0 240 240" className="absolute inset-0 w-full h-full -rotate-90 transform pointer-events-none overflow-visible">
                <defs>
                  {/* Step Timer Border Gradient */}
                  <linearGradient id="stepTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>

                  {/* Somatic Step Timer Gradient */}
                  <linearGradient id="somaticTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>

                {/* Outer Track Circle (Static) */}
                <circle
                  cx="120"
                  cy="120"
                  r={outerTimerRadius}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="7"
                  fill="transparent"
                />

                {/* Outer Progress Circle (Static Geometry, Drains by Countdown) */}
                <circle
                  cx="120"
                  cy="120"
                  r={outerTimerRadius}
                  stroke={isBreathingStep ? "url(#stepTimerGrad)" : "url(#somaticTimerGrad)"}
                  strokeWidth="7"
                  strokeDasharray={outerTimerCircumference}
                  strokeDashoffset={outerTimerDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-linear shadow-lg"
                />
              </svg>

              {/* 2. INNER CORE: ONLY THE INNER CIRCLE ANIMATES ITS ZOOM */}
              {isBreathingStep ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Layer A: Ambient Expanding / Deflating Glow Wave */}
                  <motion.div
                    key={`bloom-${breathPhase}`}
                    initial={{
                      scale: breathPhase === 'inhale' ? 0.85 : breathPhase === 'exhale' ? 1.25 : 1.2,
                      opacity: breathPhase === 'inhale' ? 0.25 : breathPhase === 'exhale' ? 0.75 : 0.65
                    }}
                    animate={{
                      scale: breathPhase === 'inhale' ? 1.25 : breathPhase === 'hold' ? [1.25, 1.28, 1.25] : breathPhase === 'exhale' ? 0.85 : 0.85,
                      opacity: breathPhase === 'inhale' ? 0.75 : breathPhase === 'hold' ? [0.75, 0.65, 0.75] : breathPhase === 'exhale' ? 0.25 : 0.2
                    }}
                    transition={{
                      duration: phaseTotalSeconds,
                      ease: breathPhase === 'hold' ? "easeInOut" : [0.4, 0.0, 0.2, 1],
                      repeat: breathPhase === 'hold' ? Infinity : 0
                    }}
                    className={`absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr ${phaseMeta.glowClass} blur-2xl pointer-events-none`}
                  />

                  {/* Layer B: Animated Zooming Inner Core Breathing Orb */}
                  <motion.div
                    key={`orb-zoom-${breathPhase}`}
                    initial={{
                      scale: breathPhase === 'inhale' ? 0.84 : breathPhase === 'exhale' ? 1.22 : 1.2
                    }}
                    animate={{
                      scale: breathPhase === 'inhale' ? 1.22 : breathPhase === 'hold' ? [1.22, 1.25, 1.22] : breathPhase === 'exhale' ? 0.84 : 0.84
                    }}
                    transition={{
                      duration: phaseTotalSeconds,
                      ease: breathPhase === 'hold' ? "easeInOut" : [0.4, 0.0, 0.2, 1],
                      repeat: breathPhase === 'hold' ? Infinity : 0
                    }}
                    className={`w-32 h-32 xs:w-36 xs:h-36 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 p-1 flex flex-col items-center justify-center relative ${phaseMeta.orbBorder} transition-colors duration-500 shadow-2xl`}
                  >
                    <div className="w-full h-full rounded-full bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-2">
                      {/* Inhale / Exhale Bordered Phase Badge */}
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md ${phaseMeta.badgeBg}`}>
                        {phaseMeta.icon}
                        {breathPhase === 'inhale' ? 'Inhale' : breathPhase === 'hold' ? 'Hold' : breathPhase === 'exhale' ? 'Exhale' : 'Rest'}
                      </span>

                      {/* Large Countdown Digit */}
                      <div className="relative my-0.5">
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={phaseSecondsLeft}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2 }}
                            className="text-2xl xs:text-3xl sm:text-4xl font-black text-white tracking-tight inline-block font-mono"
                          >
                            {phaseSecondsLeft}
                            <span className="text-xs sm:text-sm text-slate-400 font-normal ml-0.5">s</span>
                          </motion.span>
                        </AnimatePresence>
                      </div>

                      {/* Cycles Counter */}
                      <span className="text-[8px] sm:text-[9px] font-mono font-semibold text-slate-400">
                        Cycle {completedCycles + 1}
                      </span>
                    </div>
                  </motion.div>
                </div>
              ) : (
                /* Non-Breathing Somatic Step Display */
                <div className="w-36 h-36 xs:w-40 xs:h-40 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-emerald-600/30 to-teal-400/20 border-2 border-emerald-400/50 p-2 flex flex-col items-center justify-center shadow-2xl relative shadow-emerald-500/20">
                  <div className="w-full h-full rounded-full bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-3">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-teal-300 border border-teal-400/30 px-2 py-0.5 rounded-full bg-teal-950/40">
                      Step {currentStepIndex + 1} Activity
                    </span>
                    <span className="text-3xl sm:text-4xl font-black text-white mt-1 font-mono tracking-tight">
                      {stepTimeRemaining}s
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5">
                      Remaining
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Breathing Guidance Banner Wrapped in Explicit Accent Border */}
            {isBreathingStep && (
              <div className={`rounded-xl p-2 sm:p-2.5 max-w-md mx-auto transition-all duration-700 shadow-md ${phaseMeta.bannerBorder}`}>
                <p className={`text-[11px] sm:text-xs font-bold tracking-wide transition-colors ${phaseMeta.colorClass}`}>
                  {phaseMeta.sub}
                </p>
              </div>
            )}

            {/* Step Quick Instruction Banner */}
            <div className="bg-white/5 border-2 border-white/10 rounded-xl p-2 sm:p-2.5 max-w-lg mx-auto text-left shadow-sm">
              <p className="text-[11px] sm:text-xs text-slate-300 leading-snug font-medium line-clamp-2 sm:line-clamp-none">
                {currentStep.instruction}
              </p>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-3 pt-0.5">
              <button
                onClick={() => {
                  setStepTimeRemaining(currentStep.durationSeconds || 60);
                  setIsPlaying(true);
                  if (isBreathingStep) {
                    initializeBreathing(activePattern);
                  }
                }}
                className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Restart this step"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30 transition-all cursor-pointer active:scale-95 border-2 border-emerald-300"
                title={isPlaying ? "Pause" : "Resume"}
              >
                {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />}
              </button>

              <button
                onClick={skipStep}
                className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={currentStepIndex < plan.steps.length - 1 ? "Next Step" : "Complete"}
              >
                <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STAGE 3: COMPLETION & FEEDBACK
           ======================================================== */}
        {stepMode === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 py-3 sm:py-4 text-center space-y-3 sm:space-y-4"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 border-2 border-emerald-300">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="space-y-0.5">
              <h3 className="text-lg sm:text-xl font-black text-white">
                3-Minute Reset Complete!
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                "{plan.comfortAffirmation}"
              </p>
            </div>

            {/* Streak Safeguard Celebration Card */}
            <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/40 border-2 border-amber-500/40 rounded-xl p-3 max-w-md mx-auto text-left flex items-center gap-3 shadow-lg shadow-amber-500/10">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 border-2 border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                <Flame className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 14-Day Streak Safeguarded
                </span>
                <p className="text-[10px] sm:text-[11px] text-amber-200/80 mt-0.5">
                  Completing recovery counts towards your daily wellness habits with zero penalty.
                </p>
              </div>
            </div>

            {/* Post-Checkin Rating Form */}
            <div className="space-y-2 max-w-md mx-auto">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                How does your body and head feel right now?
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setFeedbackRating('much_better')}
                  className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center gap-1 text-xs ${
                    feedbackRating === 'much_better'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  <span className="font-bold text-[11px]">Much Better</span>
                </button>

                <button
                  onClick={() => setFeedbackRating('slightly_calmer')}
                  className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center gap-1 text-xs ${
                    feedbackRating === 'slightly_calmer'
                      ? 'bg-teal-500/20 border-teal-400 text-teal-300 shadow-md shadow-teal-500/20'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Meh className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400" />
                  <span className="font-bold text-[11px]">A Bit Calmer</span>
                </button>

                <button
                  onClick={() => setFeedbackRating('still_drained')}
                  className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center gap-1 text-xs ${
                    feedbackRating === 'still_drained'
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-md shadow-rose-500/20'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Frown className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
                  <span className="font-bold text-[11px]">Still Drained</span>
                </button>
              </div>

              <input
                type="text"
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Optional reflection (e.g., headache dropped from 8 to 4)..."
                className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Conditional Repeat Exercise Prompt based on user feedback */}
            {feedbackRating === 'still_drained' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-gradient-to-r from-rose-950/50 via-slate-900/90 to-rose-950/50 border-2 border-rose-500/40 rounded-2xl p-3.5 sm:p-4 max-w-md mx-auto text-left shadow-lg shadow-rose-950/30 space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shrink-0">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-rose-200">
                      Still feeling drained?
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Your nervous system may need an extra 3-minute sequence of somatic pressure and vagal breathing to fully decompress.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    onClick={handleRestartExercise}
                    className="w-full sm:flex-1 bg-rose-500 hover:bg-rose-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-500/25 cursor-pointer border border-rose-300"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Repeat 3-Min Exercise
                  </button>
                  <button
                    onClick={handleFinishFeedback}
                    className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all border border-white/10 cursor-pointer"
                  >
                    Complete & Rest
                  </button>
                </div>
              </motion.div>
            )}

            {feedbackRating === 'much_better' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-gradient-to-r from-emerald-950/50 via-slate-900/90 to-emerald-950/50 border-2 border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 max-w-md mx-auto text-left shadow-lg shadow-emerald-950/30 space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-emerald-300">
                      Great to hear you feel much better!
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Would you like to do another 3-minute round to consolidate this calm and energized state, or save your progress?
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    onClick={handleRestartExercise}
                    className="w-full sm:flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/25 cursor-pointer border border-emerald-300"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Do Another Round
                  </button>
                  <button
                    onClick={handleFinishFeedback}
                    className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all border border-white/10 cursor-pointer"
                  >
                    Log & Return
                  </button>
                </div>
              </motion.div>
            )}

            {/* Standard Return Action Button (when not prompting or for slightly calmer) */}
            {(!feedbackRating || feedbackRating === 'slightly_calmer') && (
              <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleFinishFeedback}
                  className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer border-2 border-emerald-300"
                >
                  Log Feedback & Return <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ========================================================
            IN-EXERCISE INSTRUCTION POPUP MODAL (Paused Overlay)
           ======================================================== */}
        <AnimatePresence>
          {showInstructionModal && currentStep && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-lg bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-emerald-500/20 space-y-4 max-h-[85vh] overflow-y-auto text-left"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        Step {currentStepIndex + 1} of {plan.steps.length}
                      </span>
                      <span className="text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10 px-2 py-0.5 rounded capitalize">
                        {currentStep.actionType}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                        Exercise Paused
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white pt-1">
                      {currentStep.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => setShowInstructionModal(false)}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Instruction Content */}
                <div className="bg-slate-950/80 border border-white/15 rounded-2xl p-4 text-slate-200 text-sm leading-relaxed font-medium">
                  {currentStep.instruction}
                </div>

                {/* Tips & Physiological Guidance */}
                {currentStep.tips && currentStep.tips.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Physiological & Somatic Guidance:
                    </span>
                    <div className="flex flex-col gap-1.5 text-xs text-slate-300 bg-white/5 border border-white/10 rounded-2xl p-3.5">
                      {currentStep.tips.map((tip, tIdx) => (
                        <p key={tIdx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                          <span>{tip}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Breathing Cadence Breakdown (If Breathing step) */}
                {isBreathingStep && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Active Breathing Cadence:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="border-2 border-emerald-400/80 bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                        <ArrowUp className="w-3 h-3 text-emerald-400" /> Inhale: {activePattern.inhale}s
                      </div>
                      {activePattern.hold1 > 0 && (
                        <div className="border-2 border-sky-400/80 bg-sky-500/20 text-sky-300 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                          <PauseCircle className="w-3 h-3 text-sky-400" /> Hold: {activePattern.hold1}s
                        </div>
                      )}
                      <div className="border-2 border-indigo-400/80 bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                        <ArrowDown className="w-3 h-3 text-indigo-400" /> Exhale: {activePattern.exhale}s
                      </div>
                      {activePattern.hold2 > 0 && (
                        <div className="border-2 border-teal-400/80 bg-teal-500/20 text-teal-300 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                          <PauseCircle className="w-3 h-3 text-teal-400" /> Rest: {activePattern.hold2}s
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Modal Footer Controls */}
                <div className="pt-3 flex items-center justify-between gap-3 border-t border-white/10">
                  <button
                    onClick={() => setShowInstructionModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Keep Paused
                  </button>

                  <button
                    onClick={() => {
                      setShowInstructionModal(false);
                      setIsPlaying(true);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-98"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Resume Exercise
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
