import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  ShieldCheck, 
  Lock, 
  Mail, 
  KeyRound, 
  User, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Eye,
  EyeOff,
  Scale,
  Check,
  X
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { TermsPrivacyModal } from './TermsPrivacyModal';
import { evaluatePasswordStrength } from '../utils/password';

export const AuthScreen: React.FC = () => {
  const { loginWithEmail, signupWithEmail, signInWithGoogle, resetPassword } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'terms' | 'privacy' | null>(null);

  const passwordEvaluation = evaluatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'signup') {
      if (!privacyConsent) {
        setError('You must accept the privacy policy and AI consent statement to create an account.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify your password entry.');
        return;
      }

      if (!passwordEvaluation.isValid) {
        setError('Password does not meet required security rules. It must be at least 8 characters long and contain uppercase, lowercase, number, and special symbol.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email, password);
      } else if (mode === 'signup') {
        await signupWithEmail(email, password, name);
      } else if (mode === 'reset') {
        await resetPassword(email);
        setSuccessMsg('Password reset link sent to your email address.');
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/user-not-found' || err.message?.includes('user-not-found') || err.message?.includes('No account found')) {
        msg = 'No account found with this email address. Please check the email or sign up for a new account.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = mode === 'reset' 
          ? 'No account found with this email address. Please check the email or sign up for a new account.' 
          : 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 8 characters with numbers and symbols.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please wait a few minutes or reset your password.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError('Google Sign-In failed or was cancelled.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-100 via-rose-50/30 to-rose-100/20 dark:from-[#121418] dark:via-[#16181c] dark:to-[#121418] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ec003f]/15 rounded-full blur-[140px] pointer-events-none animate-heartbeat-glow" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#f43f5e]/10 rounded-full blur-[120px] pointer-events-none animate-heartbeat-glow-delayed" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ec003f] to-[#f43f5e] text-white shadow-lg shadow-[#ec003f]/25 mb-3">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Aroveda<span className="italic font-extrabold text-[#ec003f]">AI</span></h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Secure Personal Health Record & AI Lab Analysis
          </p>
        </div>

        {/* Mode Selector */}
        {mode !== 'reset' && (
          <div className="grid grid-cols-2 bg-white/40 dark:bg-slate-800/40 p-1 rounded-xl mb-4 text-xs font-medium border border-slate-200/60 dark:border-slate-700/50">
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'signin' ? 'bg-[#ec003f] text-white font-semibold shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'signup' ? 'bg-[#ec003f] text-white font-semibold shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#ff2b66] shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#ec003f] focus:ring-1 focus:ring-[#ec003f] transition-all backdrop-blur-md"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#ec003f] focus:ring-1 focus:ring-[#ec003f] transition-all backdrop-blur-md"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => { setMode('reset'); setError(null); }}
                        className="text-[11px] text-[#ff2b66] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl py-2.5 pl-9 pr-9 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#ec003f] focus:ring-1 focus:ring-[#ec003f] transition-all backdrop-blur-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter & Live Requirements for Signup */}
                  {mode === 'signup' && password.length > 0 && (
                    <div className="mt-2.5 p-3 rounded-xl bg-white/40 dark:bg-[#121418]/40 border border-white/20 dark:border-white/10 text-xs space-y-2 backdrop-blur-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Password Strength:</span>
                        <span className={`text-[11px] font-bold ${
                          passwordEvaluation.score === 1 ? 'text-rose-500' :
                          passwordEvaluation.score === 2 ? 'text-amber-500' :
                          passwordEvaluation.score === 3 ? 'text-blue-500' : 'text-emerald-500'
                        }`}>
                          {passwordEvaluation.label}
                        </span>
                      </div>

                      {/* 4 Segment Progress Bar */}
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`h-full rounded-full transition-all duration-200 ${
                              step <= passwordEvaluation.score
                                ? passwordEvaluation.color
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Requirement Checklist */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10px]">
                        <div className={`flex items-center gap-1 ${passwordEvaluation.requirements.minLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {passwordEvaluation.requirements.minLength ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />}
                          <span>At least 8 chars</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordEvaluation.requirements.hasUppercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {passwordEvaluation.requirements.hasUppercase ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />}
                          <span>Uppercase (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordEvaluation.requirements.hasLowercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {passwordEvaluation.requirements.hasLowercase ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />}
                          <span>Lowercase (a-z)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordEvaluation.requirements.hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {passwordEvaluation.requirements.hasNumber ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />}
                          <span>Number (0-9)</span>
                        </div>
                        <div className={`flex items-center gap-1 col-span-2 sm:col-span-1 ${passwordEvaluation.requirements.hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {passwordEvaluation.requirements.hasSpecialChar ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />}
                          <span>Symbol (!@#$)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password field for Signup */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl py-2.5 pl-9 pr-9 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#ec003f] focus:ring-1 focus:ring-[#ec003f] transition-all backdrop-blur-md"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && (
                      <p className={`text-[10px] mt-1 font-medium flex items-center gap-1 ${
                        password === confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      }`}>
                        {password === confirmPassword ? (
                          <>
                            <Check className="w-3 h-3" /> Passwords match
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" /> Passwords do not match
                          </>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Privacy & AI Consent Box for Signup */}
            {mode === 'signup' && (
              <div className="p-3 bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 space-y-2 backdrop-blur-md">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-[#ec003f] focus:ring-[#ec003f] focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900"
                  />
                  <span className="text-slate-700 dark:text-slate-300 leading-tight">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setModalTab('terms')}
                      className="text-[#ec003f] dark:text-rose-400 font-semibold hover:underline"
                    >
                      Terms & Conditions
                    </button>{' '}
                    and consent to isolated storing of my health records under our{' '}
                    <button
                      type="button"
                      onClick={() => setModalTab('privacy')}
                      className="text-[#ec003f] dark:text-rose-400 font-semibold hover:underline"
                    >
                      Privacy Policy
                    </button>.
                  </span>
                </label>
              </div>
            )}

            <button
              key={loading ? "btn-loading" : mode}
              type="submit"
              disabled={loading}
              className="w-full bg-[#ec003f] hover:bg-[#f43f5e] text-white font-bold py-3 rounded-2xl text-xs transition-colors duration-150 shadow-md shadow-[#ec003f]/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              ) : mode === 'signin' ? (
                'Sign In to Account'
              ) : mode === 'signup' ? (
                'Create Encrypted Account'
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

        {mode === 'reset' && (
          <button
            onClick={() => setMode('signin')}
            className="w-full mt-3 text-xs text-slate-400 hover:text-white py-1 text-center cursor-pointer"
          >
            ← Back to Sign In
          </button>
        )}

        {/* Divider */}
        {mode !== 'reset' && (
          <div className="relative my-6 flex items-center gap-3 text-center">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800/50" />
            <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider whitespace-nowrap">
              or continue with
            </span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-800/50" />
          </div>
        )}

        {/* Google Sign-In */}
        {mode !== 'reset' && (
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full bg-white/60 hover:bg-white/80 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 font-medium py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </button>
        )}

        {/* Security & Medical Footer Disclaimer */}
        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-center text-[10px] text-slate-500 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[#f43f5e] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Isolated Cloud Database & Encrypted Auth</span>
          </div>
          <p>
            ArovedaAI is an educational tool and does not provide medical diagnoses or replace physician care.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1 text-slate-500 dark:text-slate-400 font-medium">
            <button
              onClick={() => setModalTab('terms')}
              className="hover:text-[#ec003f] transition-colors cursor-pointer"
            >
              Terms & Conditions
            </button>
            <span>•</span>
            <button
              onClick={() => setModalTab('privacy')}
              className="hover:text-[#ec003f] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>

      <TermsPrivacyModal
        isOpen={!!modalTab}
        onClose={() => setModalTab(null)}
        initialTab={modalTab || 'terms'}
      />
    </div>
  );
};
