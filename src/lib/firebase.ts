import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  EmailAuthProvider,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  updateProfile,
  onAuthStateChanged,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendEmailVerification,
  reload,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
// Firebase client initialization
// Safely reads from environment variables or standard project configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAyRhAJugwMk-dnaBI2BT-SI8PJwkLnP9w",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "aroveda-ai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "aroveda-ai",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "aroveda-ai.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "757883291219",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:757883291219:web:ded93449b09599292de8a6",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const rawDbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "(default)";
const firestoreDbId = (rawDbId && rawDbId !== '(default)' && rawDbId !== '') ? rawDbId : undefined;

// Use the databaseId provisioned by AI Studio or configured via environment
export const db = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  updateProfile,
  onAuthStateChanged,
  deleteUser,
  updatePassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendEmailVerification,
  reload,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  onSnapshot,
  serverTimestamp
};
export type { User };
