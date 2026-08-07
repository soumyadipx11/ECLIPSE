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
  EyeOff
} from 'lucide-react';
import { auth } from '../lib/firebase';

export const AuthScreen: React.FC = () => {
  const { loginWithEmail, signupWithEmail, signInWithGoogle, resetPassword } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'signup' && !privacyConsent) {
      setError('You must accept the privacy policy and AI consent statement to create an account.');
      return;
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
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
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
    <div className="min-h-screen bg-[#16181c] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#ec003f]/15 rounded-full blur-[140px] pointer-events-none animate-heartbeat-glow" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#ff2b66]/10 rounded-full blur-[120px] pointer-events-none animate-heartbeat-glow-delayed" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-[#1e2025]/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ec003f] to-[#ff2b66] text-white shadow-lg shadow-[#ec003f]/25 mb-3">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Aroveda<span className="italic font-extrabold text-[#ec003f]">AI</span></h1>
          <p className="text-xs text-slate-400 mt-1">
            Secure Personal Health Record & AI Lab Analysis
          </p>
        </div>

        {/* Mode Selector */}
        {mode !== 'reset' && (
          <div className="grid grid-cols-2 bg-slate-800/80 p-1 rounded-xl mb-4 text-xs font-medium border border-slate-700/50">
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'signin' ? 'bg-[#ec003f] text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'signup' ? 'bg-[#ec003f] text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#ff2b66] shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ec003f] focus:ring-1 focus:ring-[#ec003f] transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ec003f] focus:ring-1 focus:ring-[#ec003f] transition-all"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Password</label>
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ec003f] focus:ring-1 focus:ring-[#ec003f] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Privacy & AI Consent Box for Signup */}
            {mode === 'signup' && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-[#ec003f] focus:ring-[#ec003f] focus:ring-offset-slate-900"
                  />
                  <span className="text-slate-300 leading-tight">
                    I consent to isolated storing of my health records with automatic PII removal before AI analysis.
                  </span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ec003f] hover:bg-[#ff2b66] text-white font-bold py-3 rounded-2xl text-xs transition-all shadow-md shadow-[#ec003f]/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative px-3 bg-slate-900 text-[11px] text-slate-500 uppercase font-semibold">
              or continue with
            </span>
          </div>
        )}

        {/* Google Sign-In */}
        {mode !== 'reset' && (
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
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
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center text-[10px] text-slate-500 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[#ff2b66] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Isolated Cloud Database & Encrypted Auth</span>
          </div>
          <p>
            ArovedaAI is an educational tool and does not provide medical diagnoses or replace physician care.
          </p>
        </div>
      </div>
    </div>
  );
};
