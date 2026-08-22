// Web Audio API & Speech Synthesis utilities for Recovery & Triage Mode

class RecoveryAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Plays a soothing harmonic singing bowl chime for step transitions
  public playBowlChime(freq: number = 432) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      
      // Fundamental oscillator
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      
      // Harmonic overtone oscillator
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 1.5, now); // 5th harmonic

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.08);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.exponentialRampToValueAtTime(0.08, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

      osc1.connect(gain1);
      osc2.connect(gain2);

      gain1.connect(ctx.destination);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + 3.0);
      osc2.stop(now + 3.0);
    } catch (e) {
      // Graceful fallback
    }
  }

  // Plays a gentle breath cue tone (rising for inhale, holding chime, falling for exhale)
  public playBreathCue(type: 'inhale' | 'hold' | 'exhale' | 'hold2', durationSec: number = 4) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';

      if (type === 'inhale') {
        // Smooth gentle rise from 220Hz (A3) to 349Hz (F4)
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(349, now + Math.min(durationSec, 2.5));
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.4);
        gain.gain.linearRampToValueAtTime(0.001, now + Math.min(durationSec, 2.8));
      } else if (type === 'hold' || type === 'hold2') {
        // Sustained warm chime at 432Hz (harmonic tranquility)
        osc.frequency.setValueAtTime(432, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.15);
        gain.gain.linearRampToValueAtTime(0.001, now + 1.2);
      } else {
        // Exhale: Smooth grounded descent from 349Hz to 196Hz (G3)
        osc.frequency.setValueAtTime(349, now);
        osc.frequency.exponentialRampToValueAtTime(196, now + Math.min(durationSec, 3.0));
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.4);
        gain.gain.linearRampToValueAtTime(0.001, now + Math.min(durationSec, 3.2));
      }

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 3.5);
    } catch (e) {
      // Graceful fallback
    }
  }

  // Speaks guidance instruction using browser Text-to-Speech
  public speakGuidance(text: string) {
    if (this.isMuted) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85; // Calmer, slower pace
      utterance.pitch = 0.95; // Gentle pitch
      
      const voices = window.speechSynthesis.getVoices();
      const calmVoice = voices.find(v => 
        (v.name.includes('Natural') || v.name.includes('Female') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en')
      );
      if (calmVoice) {
        utterance.voice = calmVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // Silent catch
    }
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }
}

export const recoveryAudio = new RecoveryAudioEngine();
