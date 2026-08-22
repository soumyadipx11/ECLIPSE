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
import appletConfig from '../../firebase-applet-config.json';

const configJson: Record<string, any> = appletConfig || {};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || configJson.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || configJson.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || configJson.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || configJson.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || configJson.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || configJson.appId || '',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const rawDbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || configJson.firestoreDatabaseId;
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
