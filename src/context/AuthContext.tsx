import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  signInWithPopup, 
  googleProvider, 
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  firebaseSignOut, 
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  deleteUser,
  db,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  sendEmailVerification,
  reload,
  User
} from '../lib/firebase';
import { UserProfile } from '../types';
import { cleanUndefined, cleanUserErrorMessage } from '../utils/sanitize';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  signupWithEmail: (e: string, p: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (e: string) => Promise<void>;
  updateConsent: (consent: boolean) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  deleteAccount: (currentPassword?: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  checkEmailVerificationStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function verifyAuthRateLimit(email: string, action: 'login' | 'signup' | 'reset-password'): Promise<void> {
  try {
    const res = await fetch('/api/auth/check-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action })
    });

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      const retryAfter = data.retryAfterSeconds || 10;
      throw new Error(`Too many authentication attempts. Rate limit & exponential backoff active. Please wait ${retryAfter} seconds before trying again.`);
    }
  } catch (err: any) {
    if (err.message?.includes('exponential backoff') || err.message?.includes('Rate limit')) {
      throw err;
    }
  }
}

async function reportAuthOutcome(email: string, action: 'login' | 'signup' | 'reset-password', success: boolean): Promise<void> {
  try {
    await fetch('/api/auth/report-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, action, success })
    });
  } catch (e) {
    // Silent catch
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Auto-cleanup for stale unverified accounts older than 24 hours
        if (!currentUser.emailVerified && currentUser.metadata.creationTime) {
          const creationMs = new Date(currentUser.metadata.creationTime).getTime();
          const ageMs = Date.now() - creationMs;
          if (ageMs > 24 * 60 * 60 * 1000) {
            console.log("Auto-cleaning stale unverified account:", currentUser.email);
            try {
              await deleteDoc(doc(db, 'users', currentUser.uid)).catch(() => {});
              await deleteUser(currentUser).catch(() => {});
              await firebaseSignOut(auth).catch(() => {});
            } catch (e) {
              console.warn("Auto-cleanup error:", e);
            }
            setUser(null);
            setUserProfile(null);
            setLoading(false);
            return;
          }
        }

        // Fetch or create user profile document
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setUserProfile(userSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
              privacyConsent: true,
              consentDate: new Date().toISOString()
            };
            await setDoc(userDocRef, cleanUndefined(newProfile));
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.error("Error loading user profile:", err);
          // Fallback profile
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'User',
            privacyConsent: true,
            consentDate: new Date().toISOString()
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await verifyAuthRateLimit(email, 'login');
    try {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      const currentUser = credential.user;

      // Auto-cleanup check if unverified and older than 24h
      if (currentUser && !currentUser.emailVerified && currentUser.metadata.creationTime) {
        const creationMs = new Date(currentUser.metadata.creationTime).getTime();
        if (Date.now() - creationMs > 24 * 60 * 60 * 1000) {
          try {
            await deleteDoc(doc(db, 'users', currentUser.uid)).catch(() => {});
            await deleteUser(currentUser);
          } catch (e) {
            console.warn("Auto-cleanup error during login:", e);
          }
          await firebaseSignOut(auth);
          setUser(null);
          setUserProfile(null);
          throw new Error('Your previous unverified account registration expired (older than 24 hours). The stale account has been automatically cleaned up. Please sign up again.');
        }
      }

      await reportAuthOutcome(email, 'login', true);
    } catch (err) {
      await reportAuthOutcome(email, 'login', false);
      throw err;
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    await verifyAuthRateLimit(email, 'signup');
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        // Send email verification link immediately
        await sendEmailVerification(res.user);
        const newProfile: UserProfile = {
          uid: res.user.uid,
          email: res.user.email || email,
          displayName: name || email.split('@')[0],
          privacyConsent: true,
          consentDate: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', res.user.uid), cleanUndefined(newProfile));
        setUserProfile(newProfile);
      }
      await reportAuthOutcome(email, 'signup', true);
    } catch (err: any) {
      await reportAuthOutcome(email, 'signup', false);
      if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use')) {
        throw new Error('This email address is already registered. Please sign in instead.');
      }
      throw err;
    }
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    } else {
      throw new Error("No user is currently signed in.");
    }
  };

  const checkEmailVerificationStatus = async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      // We manually recreate the user object to trigger reactive state updates
      setUser({ ...auth.currentUser });
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('aroveda_ai_insights');
      localStorage.removeItem('aroveda_doctor_summary');
      localStorage.removeItem('aroveda_custom_reminders');
    } catch (e) {}
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await verifyAuthRateLimit(email, 'reset-password');
    try {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length === 0) {
          throw new Error('auth/user-not-found');
        }
      } catch (checkErr: any) {
        if (
          checkErr.message === 'auth/user-not-found' || 
          checkErr.code === 'auth/user-not-found' ||
          checkErr.message?.includes('user-not-found')
        ) {
          throw new Error('No account found with this email address. Please check the email or sign up for a new account.');
        }
      }

      await sendPasswordResetEmail(auth, email);
      await reportAuthOutcome(email, 'reset-password', true);
    } catch (err: any) {
      await reportAuthOutcome(email, 'reset-password', false);
      if (
        err.code === 'auth/user-not-found' || 
        err.message?.includes('user-not-found') ||
        err.message?.includes('ACCOUNT_NOT_FOUND')
      ) {
        throw new Error('No account found with this email address. Please check the email or sign up for a new account.');
      }
      throw err;
    }
  };

  const updateConsent = async (consent: boolean) => {
    if (!user) return;
    const updated = {
      ...userProfile,
      privacyConsent: consent,
      consentDate: new Date().toISOString()
    } as UserProfile;
    setUserProfile(updated);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        privacyConsent: consent,
        consentDate: updated.consentDate
      }, { merge: true });
    } catch (e) {
      console.error("Failed to update consent in Firestore:", e);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated = {
      ...userProfile,
      ...data
    } as UserProfile;
    setUserProfile(updated);
    try {
      await setDoc(doc(db, 'users', user.uid), cleanUndefined(data), { merge: true });
    } catch (e) {
      console.error("Failed to update profile in Firestore:", e);
    }
  };

  const deleteAccount = async (currentPassword?: string) => {
    if (!user) {
      throw new Error("No user is currently signed in.");
    }
    const uid = user.uid;

    const isPasswordUser = user.providerData.some(p => p.providerId === 'password');
    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');

    // Step 1: Re-authenticate if password user
    if (isPasswordUser) {
      if (!currentPassword) {
        throw new Error("Please enter your current account password to confirm account deletion.");
      }
      try {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
      } catch (authErr: any) {
        console.error("Re-authentication error:", authErr);
        if (
          authErr.code === 'auth/wrong-password' || 
          authErr.code === 'auth/invalid-credential' ||
          authErr.message?.includes('invalid-credential') ||
          authErr.message?.includes('wrong-password')
        ) {
          throw new Error("Incorrect password. Please verify your current password and try again.");
        }
        throw new Error(cleanUserErrorMessage(authErr, "Authentication failed. Please verify your password and try again."));
      }
    }

    // Step 2: Delete user data across all Firestore collections BEFORE deleting Auth user
    // (This ensures the request is fully authenticated under Firestore security rules)
    try {
      // User Profile document
      await deleteDoc(doc(db, 'users', uid)).catch((e) => console.warn("Could not delete user profile doc:", e));
      // AI insights & doctor summaries keyed by userId
      await deleteDoc(doc(db, 'ai_insights', uid)).catch((e) => console.warn("Could not delete ai_insights doc:", e));
      await deleteDoc(doc(db, 'doctor_summaries', uid)).catch((e) => console.warn("Could not delete doctor_summaries doc:", e));
      await deleteDoc(doc(db, 'recovery_states', uid)).catch((e) => console.warn("Could not delete recovery_states doc:", e));
    } catch (e) {
      console.error("Error deleting core user docs:", e);
    }

    try {
      // Clean up collection documents linked by userId
      const collectionsToClean = ['reports', 'audit_logs', 'smart_alerts'];
      for (const colName of collectionsToClean) {
        const q = query(collection(db, colName), where('userId', '==', uid));
        const snap = await getDocs(q);
        for (const itemDoc of snap.docs) {
          await deleteDoc(doc(db, colName, itemDoc.id)).catch((e) => console.warn(`Could not delete doc ${itemDoc.id} in ${colName}:`, e));
        }
      }
    } catch (e) {
      console.error("Error deleting user sub-collections:", e);
    }

    // Step 3: FINALLY delete the Auth User from Firebase Auth
    try {
      await deleteUser(user);
    } catch (delErr: any) {
      console.error("Delete user error:", delErr);
      if (delErr.code === 'auth/requires-recent-login' || delErr.message?.includes('requires-recent-login')) {
        if (isGoogleUser) {
          try {
            await reauthenticateWithPopup(user, googleProvider);
            await deleteUser(user);
          } catch (gErr: any) {
            throw new Error("Re-authentication with Google failed. Please sign out and sign back in to delete your account.");
          }
        } else {
          throw new Error("For security, account deletion requires a recent login. Please sign out, sign back in, and try again.");
        }
      } else {
        throw new Error(cleanUserErrorMessage(delErr, "Failed to delete account. Please try again."));
      }
    }

    // Step 4: Local Storage & State cleanup
    try {
      localStorage.removeItem('aroveda_ai_insights');
      localStorage.removeItem('aroveda_doctor_summary');
      localStorage.removeItem('aroveda_custom_reminders');
    } catch (e) {}

    setUser(null);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      signInWithGoogle,
      loginWithEmail,
      signupWithEmail,
      logout,
      resetPassword,
      updateConsent,
      updateProfile,
      deleteAccount,
      resendVerificationEmail,
      checkEmailVerificationStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
