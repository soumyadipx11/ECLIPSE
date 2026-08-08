import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  signInWithPopup, 
  googleProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  firebaseSignOut, 
  sendPasswordResetEmail,
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
  User
} from '../lib/firebase';
import { UserProfile } from '../types';
import { cleanUndefined } from '../utils/sanitize';

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
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
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
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user) {
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
    await sendPasswordResetEmail(auth, email);
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

  const deleteAccount = async () => {
    if (!user) return;
    const uid = user.uid;

    try {
      // 1. Delete user profile document
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      console.error("Failed to delete user profile doc:", e);
    }

    try {
      // 2. Delete user reports collection
      const reportsQuery = query(collection(db, 'reports'), where('userId', '==', uid));
      const reportsSnap = await getDocs(reportsQuery);
      for (const reportDoc of reportsSnap.docs) {
        await deleteDoc(doc(db, 'reports', reportDoc.id));
      }
    } catch (e) {
      console.error("Failed to delete user reports:", e);
    }

    try {
      // 3. Delete auth account
      await deleteUser(user);
    } catch (e) {
      console.error("Failed to delete Auth account (may require recent login):", e);
      await firebaseSignOut(auth);
    }

    try {
      localStorage.removeItem('aroveda_ai_insights');
      localStorage.removeItem('aroveda_doctor_summary');
      localStorage.removeItem('aroveda_custom_reminders');
    } catch (e) {}

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
      deleteAccount
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
