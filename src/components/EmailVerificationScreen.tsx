import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, RefreshCw, LogOut, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export const EmailVerificationScreen: React.FC = () => {
  const { user, logout, resendVerificationEmail, checkEmailVerificationStatus } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setResending(true);
    setMessage(null);
    try {
      await resendVerificationEmail();
      setMessage({ type: 'success', text: 'Verification email has been resent successfully. Please check your inbox and spam folder.' });
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to resend verification email. Please try again later.' });
    } finally {
      setResending(false);
    }
  };

  const handleCheckStatus = async () => {
    if (checking) return;
    setChecking(true);
    setMessage(null);
    try {
      await checkEmailVerificationStatus();
      // If verification status hasn't updated yet, notify user
      if (user && !user.emailVerified) {
        setMessage({ type: 'error', text: 'Email not yet verified. Please click the link in your email and try again.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to refresh verification status.' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div id="email-verification-screen" className="relative min-h-screen flex items-center justify-center p-6 text-slate-900 dark:text-slate-100">
      {/* Decorative background and soft glowing circles */}
      <div className="fixed inset-0 bg-gradient-to-tr from-slate-100 via-rose-50/30 to-rose-100/20 dark:from-[#121418] dark:via-[#16181c] dark:to-[#121418] pointer-events-none z-0" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#ec003f]/20 to-[#f43f5e]/15 dark:from-[#ec003f]/25 dark:to-[#f43f5e]/15 blur-[120px] animate-heartbeat-glow" />
        <div className="absolute bottom-[10%] left-[-15%] w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-rose-500/15 to-rose-600/15 dark:from-rose-900/20 dark:to-rose-950/20 blur-[130px] animate-heartbeat-glow-delayed" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#1a1d24] border border-slate-200/80 dark:border-slate-800/80 shadow-xl rounded-2xl p-8 text-center flex flex-col items-center space-y-6">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-full text-rose-600 dark:text-rose-400">
          <Mail className="w-10 h-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
            Verify Your Email
          </h1>
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Security & Privacy Guard
          </p>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-400 space-y-4">
          <p>
            An activation and verification link has been sent to your registered email address:
          </p>
          <div className="bg-slate-50 dark:bg-[#15171d] border border-slate-200/50 dark:border-slate-800/50 rounded-lg py-2.5 px-4 font-mono text-xs font-bold select-all text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-nowrap">
            {user?.email}
          </div>
          <p className="leading-relaxed">
            Please click the link inside the email to complete your registration and unlock your secure personal health record.
          </p>
        </div>

        {message && (
          <div className={`w-full flex items-start gap-3 p-3.5 rounded-xl text-xs text-left leading-relaxed ${
            message.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50' 
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="w-full flex flex-col gap-3 pt-2">
          <button
            id="btn-check-verification"
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:bg-rose-600/50 text-white transition-colors duration-150 shadow-md cursor-pointer disabled:cursor-not-allowed"
          >
            {checking ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            I have verified my email
          </button>

          <button
            id="btn-resend-verification"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 disabled:opacity-50 text-slate-800 dark:text-slate-200 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed border border-slate-200/50 dark:border-slate-700/50"
          >
            <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
          </button>

          <div className="w-full h-px bg-slate-200/60 dark:bg-slate-800/60 my-2" />

          <button
            id="btn-verification-logout"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log out of this account
          </button>
        </div>
      </div>
    </div>
  );
};
