import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  User, 
  Mail, 
  Phone, 
  Heart, 
  Target, 
  ShieldAlert, 
  Save, 
  CheckCircle2, 
  Calendar, 
  Activity,
  FileText,
  Trash2,
  AlertTriangle,
  KeyRound,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth, updatePassword } from '../lib/firebase';
import { cleanUserErrorMessage } from '../utils/sanitize';
import { evaluatePasswordStrength } from '../utils/password';

interface ProfileViewProps {
  totalReportsCount?: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ totalReportsCount = 0 }) => {
  const { user, userProfile, updateProfile, deleteAccount } = useAuth();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [age, setAge] = useState<string>(userProfile?.age !== undefined ? String(userProfile.age) : '');
  const [gender, setGender] = useState(userProfile?.gender || 'Prefer not to say');
  const [bloodGroup, setBloodGroup] = useState(userProfile?.bloodGroup || 'Unknown');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [preExistingConditions, setPreExistingConditions] = useState(userProfile?.preExistingConditions || '');
  const [healthGoals, setHealthGoals] = useState(userProfile?.healthGoals || '');
  const [emergencyContact, setEmergencyContact] = useState(userProfile?.emergencyContact || '');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);

  // Password Change States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const newPasswordEvaluation = evaluatePasswordStrength(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!newPassword) {
      setPasswordError('Please enter a new password.');
      return;
    }

    if (!newPasswordEvaluation.isValid) {
      setPasswordError('Password does not meet required security rules. It must be at least 8 characters long and contain uppercase, lowercase, number, and special symbol.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please verify your password entry.');
      return;
    }

    setPasswordUpdating(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user is currently signed in.');
      }
      await updatePassword(currentUser, newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      console.error("Password update error:", err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError('For security reasons, this operation requires recent authentication. Please sign out, sign back in, and try again.');
      } else {
        setPasswordError(cleanUserErrorMessage(err, 'Failed to update password. Please try again.'));
      }
    } finally {
      setPasswordUpdating(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setAge(userProfile.age !== undefined ? String(userProfile.age) : '');
      setGender(userProfile.gender || 'Prefer not to say');
      setBloodGroup(userProfile.bloodGroup || 'Unknown');
      setPhone(userProfile.phone || '');
      setPreExistingConditions(userProfile.preExistingConditions || '');
      setHealthGoals(userProfile.healthGoals || '');
      setEmergencyContact(userProfile.emergencyContact || '');
    }
  }, [userProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await updateProfile({
        displayName: displayName.trim() || userProfile?.email?.split('@')[0] || 'User',
        age: age ? Number(age) : undefined,
        gender,
        bloodGroup,
        phone: phone.trim(),
        preExistingConditions: preExistingConditions.trim(),
        healthGoals: healthGoals.trim(),
        emergencyContact: emergencyContact.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error("Profile save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    setDeletingProfile(true);
    try {
      await deleteAccount();
    } catch (err) {
      console.error("Delete profile error:", err);
    } finally {
      setDeletingProfile(false);
      setShowDeleteProfileModal(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header Card */}
      <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#ec003f] to-[#f43f5e] flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-[#ec003f]/25">
            {displayName.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {displayName || 'Personal Profile'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#ec003f]" />
              {user?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-rose-50/80 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/40 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block uppercase tracking-wider">Reports Logged</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{totalReportsCount}</span>
          </div>

          <div className="bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-2xl text-center">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase tracking-wider">Privacy Status</span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Isolated
            </span>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
          <span>Personal health profile updated successfully!</span>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Personal Details Card */}
        <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="w-4 h-4 text-[#ec003f]" /> Personal Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name / Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#ec003f] backdrop-blur-md"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Age
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 35"
                className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#ec003f] backdrop-blur-md"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#ec003f] backdrop-blur-md"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#ec003f] backdrop-blur-md"
              >
                <option value="Unknown">Unknown / Unspecified</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 019-2834"
                className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#ec003f] backdrop-blur-md"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Emergency Contact (Name & Number)
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. Jane Doe (+1 555-987-6543)"
                className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#ec003f] backdrop-blur-md"
              />
            </div>
          </div>
        </div>

        {/* Medical & Health Goals Context */}
        <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Heart className="w-4 h-4 text-[#ec003f]" /> Health History & Goals
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pre-existing Conditions / Medical Background
              </label>
              <textarea
                rows={2}
                value={preExistingConditions}
                onChange={(e) => setPreExistingConditions(e.target.value)}
                placeholder="e.g. Essential Hypertension, Thyroid Nodule, Mild Vitamin D Deficiency..."
                className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#ec003f] backdrop-blur-md"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Health & Wellness Goals
              </label>
              <textarea
                rows={2}
                value={healthGoals}
                onChange={(e) => setHealthGoals(e.target.value)}
                placeholder="e.g. Maintain LDL Cholesterol below 100 mg/dL, optimize Fasting Glucose, improve cardiovascular endurance..."
                className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#ec003f] backdrop-blur-md"
              />
            </div>
          </div>
        </div>

        {/* Submit Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#ec003f] hover:bg-[#ff2b66] text-white font-bold py-3.5 rounded-2xl text-xs transition-all shadow-md shadow-[#ec003f]/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving Profile Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Personal Health Profile</span>
            </>
          )}
        </button>
      </form>

      {/* Security & Password Card */}
      <div className="bg-white/30 dark:bg-[#121418]/30 backdrop-blur-md rounded-3xl border border-white/30 dark:border-white/10 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <KeyRound className="w-4 h-4 text-[#ec003f]" /> Security & Password
        </h2>

        {passwordSuccess && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Password updated successfully!</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters with numbers & symbols"
                className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#ec003f] backdrop-blur-md"
              />
              {newPassword.length > 0 && (
                <div className="mt-2 p-2.5 rounded-xl bg-white/40 dark:bg-[#121418]/40 border border-white/20 dark:border-white/10 space-y-2 backdrop-blur-md">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Strength:</span>
                    <span className={`font-bold ${
                      newPasswordEvaluation.score === 1 ? 'text-rose-500' :
                      newPasswordEvaluation.score === 2 ? 'text-amber-500' :
                      newPasswordEvaluation.score === 3 ? 'text-blue-500' : 'text-emerald-500'
                    }`}>
                      {newPasswordEvaluation.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 h-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full rounded-full transition-all duration-200 ${
                          step <= newPasswordEvaluation.score
                            ? newPasswordEvaluation.color
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Password Rule Checklist */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 text-[10px]">
                    <div className={`flex items-center gap-1 ${newPasswordEvaluation.requirements.minLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {newPasswordEvaluation.requirements.minLength ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />}
                      <span>At least 8 chars</span>
                    </div>
                    <div className={`flex items-center gap-1 ${newPasswordEvaluation.requirements.hasUppercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {newPasswordEvaluation.requirements.hasUppercase ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />}
                      <span>Uppercase (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1 ${newPasswordEvaluation.requirements.hasLowercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {newPasswordEvaluation.requirements.hasLowercase ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />}
                      <span>Lowercase (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1 ${newPasswordEvaluation.requirements.hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {newPasswordEvaluation.requirements.hasNumber ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />}
                      <span>Number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1 col-span-2 sm:col-span-1 ${newPasswordEvaluation.requirements.hasSpecialChar ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {newPasswordEvaluation.requirements.hasSpecialChar ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />}
                      <span>Symbol (!@#$)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-white/30 dark:bg-[#121418]/30 border border-white/30 dark:border-white/10 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#ec003f] backdrop-blur-md"
              />
              {confirmPassword.length > 0 && (
                <p className={`text-[10px] mt-2 font-medium flex items-center gap-1 ${
                  newPassword === confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}>
                  {newPassword === confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordUpdating}
            className="bg-[#ec003f] hover:bg-[#ff2b66] text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer text-xs"
          >
            {passwordUpdating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>Update Password</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Danger Zone: Delete Profile */}
      <div className="bg-rose-500/10 dark:bg-rose-950/15 backdrop-blur-md rounded-3xl border border-rose-500/20 dark:border-rose-900/40 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/40 pb-3">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <h2 className="text-sm font-bold text-rose-950 dark:text-rose-200">Delete Profile & Account</h2>
          </div>
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
            Irreversible
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Permanently delete your profile details, health goals, and all associated laboratory reports from ArovedaAI.
        </p>

        <button
          type="button"
          onClick={() => setShowDeleteProfileModal(true)}
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-all shadow-md shadow-rose-600/20 flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete My Profile & Account</span>
        </button>
      </div>

      {/* Delete Profile Confirmation Modal */}
      {showDeleteProfileModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121418] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Profile Permanently?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Account Cleanup & Data Wipe</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete your profile <strong className="text-slate-900 dark:text-white">({user?.email})</strong>? This will wipe your profile settings, pre-existing health conditions, and all linked lab report documents.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteProfileModal(false)}
                disabled={deletingProfile}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProfile}
                disabled={deletingProfile}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {deletingProfile ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting Profile...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete My Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
